/**
 * End-to-end MVP verification using mongodb-memory-server.
 * Run: node scripts/verify-mvp.js
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

const results = [];
const log = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const main = async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = 'verify-jwt-secret-opsdesk';
  process.env.NODE_ENV = 'development';
  process.env.JWT_EXPIRES_IN = '1h';

  const { connectDB } = await import('../src/config/db.js');
  await connectDB();
  const app = (await import('../src/app.js')).default;

  const { Organization } = await import('../src/models/Organization.js');
  const { User } = await import('../src/models/User.js');
  const { SLAPolicy } = await import('../src/models/SLAPolicy.js');
  const { Ticket } = await import('../src/models/Ticket.js');
  const { Conversation } = await import('../src/models/Conversation.js');
  const { DEFAULT_SLA_MINUTES } = await import('../src/utils/constants.js');
  const { suggestTeam } = await import('../src/services/routingService.js');
  const { nextTicketNumber } = await import('../src/services/ticketNumberService.js');
  const { computeSlaDeadline } = await import('../src/services/slaService.js');

  const orgA = await Organization.create({ name: 'VoyageX', slug: 'voyagex' });
  const orgB = await Organization.create({ name: 'Acme', slug: 'acme' });

  for (const org of [orgA, orgB]) {
    for (const priority of Object.keys(DEFAULT_SLA_MINUTES)) {
      await SLAPolicy.create({
        organization: org._id,
        priority,
        resolutionMinutes: DEFAULT_SLA_MINUTES[priority],
      });
    }
  }

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@voyagex.demo',
    password: 'Admin@12345',
    role: 'ADMIN',
    organization: orgA._id,
  });
  const manager = await User.create({
    name: 'Manager',
    email: 'manager@voyagex.demo',
    password: 'Manager@12345',
    role: 'MANAGER',
    organization: orgA._id,
  });
  const agent = await User.create({
    name: 'Agent',
    email: 'agent@voyagex.demo',
    password: 'Agent@12345',
    role: 'AGENT',
    organization: orgA._id,
  });
  const adminB = await User.create({
    name: 'Admin B',
    email: 'admin@acme.demo',
    password: 'Admin@12345',
    role: 'ADMIN',
    organization: orgB._id,
  });
  await User.create({
    name: 'Inactive',
    email: 'inactive@voyagex.demo',
    password: 'Admin@12345',
    role: 'AGENT',
    organization: orgA._id,
    isActive: false,
  });

  // Health
  {
    const res = await request(app).get('/health');
    log('GET /health', res.status === 200 && res.body.success === true, String(res.status));
  }

  // Login success
  let tokenAdmin;
  let tokenAgent;
  let tokenManager;
  let tokenAdminB;
  {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@voyagex.demo', password: 'Admin@12345' });
    tokenAdmin = res.body?.data?.accessToken;
    log(
      'Login admin',
      res.status === 200 && !!tokenAdmin && !res.body.data.user.password,
      String(res.status)
    );
  }
  {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@voyagex.demo', password: 'wrong' });
    log('Wrong password → 401', res.status === 401, String(res.status));
  }
  {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'inactive@voyagex.demo', password: 'Admin@12345' });
    log('Inactive user → 401', res.status === 401, String(res.status));
  }
  {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'agent@voyagex.demo', password: 'Agent@12345' });
    tokenAgent = res.body?.data?.accessToken;
    log('Login agent', res.status === 200 && !!tokenAgent, String(res.status));
  }
  {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@voyagex.demo', password: 'Manager@12345' });
    tokenManager = res.body?.data?.accessToken;
  }
  {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@acme.demo', password: 'Admin@12345' });
    tokenAdminB = res.body?.data?.accessToken;
  }

  // Protected
  {
    const res = await request(app).get('/api/v1/auth/me');
    log('Protected without token → 401', res.status === 401, String(res.status));
  }
  {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer bad.token');
    log('Invalid token → 401', res.status === 401, String(res.status));
  }
  {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    log('GET /auth/me', res.status === 200 && res.body.data.user.email === 'admin@voyagex.demo');
  }
  {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    log('POST /auth/logout', res.status === 200, String(res.status));
  }

  // RBAC
  {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({
        name: 'X',
        email: 'x@test.com',
        password: 'Password1',
        role: 'AGENT',
      });
    log('AGENT create user → 403', res.status === 403, String(res.status));
  }

  // Create ticket
  let ticketId;
  let ticketNumber;
  {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        subject: 'Dubai hotel booking unconfirmed',
        description: 'Reservation not confirmed by supplier for tonight check-in',
        category: 'HOTEL',
        priority: 'HIGH',
        source: 'EMAIL',
        agency: 'Gulf Horizons',
        bookingReference: 'BK-DXB-77821',
        customerName: 'Aisha',
      });
    const t = res.body?.data?.ticket;
    ticketId = t?._id;
    ticketNumber = t?.ticketNumber;
    const persisted = await Ticket.findById(ticketId);
    log(
      'Create ticket + ticketNumber/team/sla',
      res.status === 201 &&
        /^OPS-\d{4}-\d{5}$/.test(ticketNumber) &&
        t.assignedTeam === 'HOTEL_OPERATIONS' &&
        !!t.slaDeadline &&
        !!persisted,
      `${ticketNumber} team=${t?.assignedTeam}`
    );
  }

  // Related sibling
  {
    const num = await nextTicketNumber(orgA._id);
    await Ticket.create({
      ticketNumber: num,
      subject: 'Critical booking issue with check-in approaching',
      description: 'Hotel voucher missing booking reference mismatch',
      category: 'BOOKING',
      priority: 'CRITICAL',
      status: 'OPEN',
      source: 'WHATSAPP',
      agency: 'Gulf Horizons',
      bookingReference: 'BK-DXB-77821',
      customerName: 'Aisha',
      assignedTeam: suggestTeam('BOOKING'),
      organization: orgA._id,
      slaDeadline: computeSlaDeadline(new Date(), 30),
      createdBy: manager._id,
    });
  }

  // Assign
  {
    const res = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${tokenManager}`)
      .send({ assignedTo: agent._id.toString() });
    log('Assign ticket', res.status === 200 && res.body.data.ticket.assignedTo._id === agent._id.toString());
  }
  {
    const res = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({ assignedTo: agent._id.toString() });
    log('AGENT assign → 403', res.status === 403, String(res.status));
  }
  {
    const res = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ assignedTo: adminB._id.toString() });
    log('Assign other-org user fails', res.status === 400, String(res.status));
  }

  // Status
  {
    const res = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({ status: 'IN_PROGRESS' });
    log('Agent change status on assigned', res.status === 200, String(res.status));
  }

  // Org isolation
  {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${tokenAdminB}`);
    log('Org B cannot read Org A ticket → 404', res.status === 404, String(res.status));
  }
  {
    const res = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${tokenAdminB}`);
    const leaked = (res.body?.data?.items || []).some((t) => t._id === ticketId);
    log('Org B list does not include Org A tickets', res.status === 200 && !leaked);
  }

  // Invalid ObjectId / body
  {
    const res = await request(app)
      .get('/api/v1/tickets/not-an-id')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    log('Invalid ObjectId → 400', res.status === 400, String(res.status));
  }
  {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subject: 'x' });
    log('Invalid body → 400', res.status === 400, String(res.status));
  }

  // Dashboard
  {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    const s = res.body?.data?.summary;
    const dbTotal = await Ticket.countDocuments({ organization: orgA._id });
    log('Dashboard summary matches DB total', res.status === 200 && s?.total === dbTotal, `summary=${s?.total} db=${dbTotal}`);
  }
  {
    const res = await request(app)
      .get('/api/v1/dashboard/analytics')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    log('Dashboard analytics', res.status === 200 && !!res.body.data.analytics?.byCategory);
  }
  {
    const res = await request(app)
      .get('/api/v1/dashboard/agent-workload')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    log('Agent workload', res.status === 200 && Array.isArray(res.body.data.workload));
  }

  // Conversations
  let draftId;
  {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketId}/conversations`)
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({ type: 'INTERNAL_NOTE', body: 'Called hotel night desk' });
    log('Add internal note', res.status === 201, String(res.status));
  }
  {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketId}/conversations`)
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({
        type: 'SUPPLIER_DRAFT',
        body: 'Please confirm BK-DXB-77821',
      });
    draftId = res.body?.data?.conversation?._id;
    log(
      'Add supplier draft (not sent)',
      res.status === 201 && res.body.data.conversation.approvalStatus === 'PENDING',
      String(res.status)
    );
  }
  {
    const res = await request(app)
      .patch(`/api/v1/conversations/${draftId}/approve`)
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({ decision: 'APPROVED' });
    log('AGENT approve draft → 403', res.status === 403, String(res.status));
  }
  {
    const res = await request(app)
      .patch(`/api/v1/conversations/${draftId}/approve`)
      .set('Authorization', `Bearer ${tokenManager}`)
      .send({ decision: 'APPROVED' });
    const c = await Conversation.findById(draftId);
    log(
      'Approve draft updates status only',
      res.status === 200 && c.approvalStatus === 'APPROVED' && !!c.approvedAt,
      c?.approvalStatus
    );
  }
  {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketId}/conversations`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    log('List conversations oldest-first', res.status === 200 && res.body.data.items.length >= 2);
  }

  // SLA
  {
    const res = await request(app)
      .get('/api/v1/sla/overview')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    log('SLA overview', res.status === 200 && res.body.data.overview !== undefined);
  }
  {
    const res = await request(app)
      .get('/api/v1/sla/breached')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    log('SLA breached list', res.status === 200 && Array.isArray(res.body.data.items));
  }

  // Related
  {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketId}/related`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    const related = res.body?.data?.related || [];
    log(
      'Related tickets rule-based',
      res.status === 200 &&
        related.length >= 1 &&
        related[0].matchType === 'RULE_BASED' &&
        related[0].score >= 50,
      `count=${related.length} top=${related[0]?.score}`
    );
  }

  // Users
  {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    log('List users', res.status === 200 && res.body.data.total >= 3);
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n---');
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);
  if (failed.length) {
    console.log('Failures:');
    failed.forEach((f) => console.log(`  - ${f.name}`));
  }

  await mongoose.disconnect();
  await mongo.stop();
  process.exit(failed.length ? 1 : 0);
};

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
