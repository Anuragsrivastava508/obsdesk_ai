import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

let app;
let mongo;

const JWT_SECRET = 'test-jwt-secret-opsdesk';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.NODE_ENV = 'test';
  process.env.CORS_ORIGINS = 'http://localhost:5173';

  const { connectDB } = await import('../src/config/db.js');
  await connectDB();
  app = (await import('../src/app.js')).default;

  const { Organization } = await import('../src/models/Organization.js');
  const { User } = await import('../src/models/User.js');
  const { SLAPolicy } = await import('../src/models/SLAPolicy.js');
  const { DEFAULT_SLA_MINUTES } = await import('../src/utils/constants.js');

  const orgA = await Organization.create({ name: 'Org A', slug: 'org-a' });
  const orgB = await Organization.create({ name: 'Org B', slug: 'org-b' });

  for (const priority of Object.keys(DEFAULT_SLA_MINUTES)) {
    await SLAPolicy.create({
      organization: orgA._id,
      priority,
      resolutionMinutes: DEFAULT_SLA_MINUTES[priority],
    });
  }

  await User.create({
    name: 'Admin A',
    email: 'admin-a@test.com',
    password: 'Admin@12345',
    role: 'ADMIN',
    organization: orgA._id,
  });
  await User.create({
    name: 'Admin B',
    email: 'admin-b@test.com',
    password: 'Admin@12345',
    role: 'ADMIN',
    organization: orgB._id,
  });
  await User.create({
    name: 'Agent A',
    email: 'agent-a@test.com',
    password: 'Agent@12345',
    role: 'AGENT',
    organization: orgA._id,
  });
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('OpsDesk smoke', () => {
  let tokenA;
  let tokenB;
  let tokenAgent;
  let agentId;
  let ticketAId;

  test('CORS allows configured origins and rejects unapproved origins', async () => {
    const allowed = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const rejected = await request(app)
      .get('/health')
      .set('Origin', 'https://unapproved.example.com');
    expect(rejected.status).toBe(403);
  });

  test('login works', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin-a@test.com', password: 'Admin@12345' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();
    tokenA = res.body.data.accessToken;

    const resB = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin-b@test.com', password: 'Admin@12345' });
    tokenB = resB.body.data.accessToken;

    const agentRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'agent-a@test.com', password: 'Agent@12345' });
    tokenAgent = agentRes.body.data.accessToken;
    agentId = agentRes.body.data.user._id;
  });

  test('protected route rejects missing token', async () => {
    const res = await request(app).get('/api/v1/tickets');
    expect(res.status).toBe(401);
  });

  test('ticket create persists', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        subject: 'Smoke test hotel issue',
        description: 'Hotel confirmation missing for guest',
        category: 'HOTEL',
        priority: 'HIGH',
        source: 'MANUAL',
        agency: 'Test Agency',
        bookingReference: 'SMK-001',
        customerName: 'Smoke Guest',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.ticket.ticketNumber).toMatch(/^OPS-\d{4}-\d{5}$/);
    expect(res.body.data.ticket.assignedTeam).toBe('HOTEL_OPERATIONS');
    expect(res.body.data.ticket.slaDeadline).toBeTruthy();
    ticketAId = res.body.data.ticket._id;
  });

  test('assigned agent can read a populated ticket', async () => {
    const assignRes = await request(app)
      .patch(`/api/v1/tickets/${ticketAId}/assign`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ assignedTo: agentId });
    expect(assignRes.status).toBe(200);

    const ticketRes = await request(app)
      .get(`/api/v1/tickets/${ticketAId}`)
      .set('Authorization', `Bearer ${tokenAgent}`);
    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.data.ticket.assignedTo._id).toBe(agentId);
  });

  test('agent can read a ticket they created with a populated creator', async () => {
    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({
        subject: 'Agent created ticket',
        description: 'Validate visibility of a ticket created by its agent.',
        category: 'OTHER',
      });
    expect(createRes.status).toBe(201);

    const ticketRes = await request(app)
      .get(`/api/v1/tickets/${createRes.body.data.ticket._id}`)
      .set('Authorization', `Bearer ${tokenAgent}`);
    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.data.ticket.createdBy._id).toBe(agentId);
  });

  test('org isolation blocks cross-org ticket read', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });
});
