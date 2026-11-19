import dotenv from 'dotenv';
dotenv.config();

if (process.env.NODE_ENV === 'production') {
  console.error('Seed refused: NODE_ENV=production');
  process.exit(1);
}

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error('Seed requires MONGODB_URI and JWT_SECRET');
  process.exit(1);
}

import mongoose from 'mongoose';
import { Organization } from '../src/models/Organization.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { Conversation } from '../src/models/Conversation.js';
import { SLAPolicy } from '../src/models/SLAPolicy.js';
import { Counter } from '../src/models/Counter.js';
import { suggestTeam } from '../src/services/routingService.js';
import { DEFAULT_SLA_MINUTES } from '../src/utils/constants.js';

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
const MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD || 'Manager@12345';
const AGENT_PASSWORD = process.env.SEED_AGENT_PASSWORD || 'Agent@12345';

const upsertUser = async ({ name, email, password, role, organization, isActive = true }) => {
  let user = await User.findOne({ email }).select('+password');
  if (!user) {
    user = await User.create({ name, email, password, role, organization, isActive });
    console.log(`Created user ${email}`);
    return user;
  }
  user.name = name;
  user.role = role;
  user.organization = organization;
  user.isActive = isActive;
  if (password) {
    user.password = password;
  }
  await user.save();
  console.log(`Updated user ${email}`);
  return user;
};

const upsertTicket = async (data) => {
  const existing = await Ticket.findOne({
    organization: data.organization,
    subject: data.subject,
  });
  if (existing) {
    Object.assign(existing, {
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.status,
      source: data.source,
      agency: data.agency,
      bookingReference: data.bookingReference,
      customerName: data.customerName,
      assignedTo: data.assignedTo ?? existing.assignedTo,
      assignedTeam: data.assignedTeam,
      slaDeadline: data.slaDeadline,
      createdBy: data.createdBy,
    });
    if (data.createdAt) existing.createdAt = data.createdAt;
    await existing.save();
    console.log(`Updated ticket: ${existing.ticketNumber} – ${existing.subject}`);
    return existing;
  }

  const year = new Date().getFullYear();
  const key = `ticket:${data.organization.toString()}:${year}`;
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const ticketNumber = `OPS-${year}-${String(counter.seq).padStart(5, '0')}`;

  const ticket = await Ticket.create({ ...data, ticketNumber });
  console.log(`Created ticket: ${ticket.ticketNumber} – ${ticket.subject}`);
  return ticket;
};

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected for seeding');

  const org = await Organization.findOneAndUpdate(
    { slug: 'voyagex-demo' },
    { name: 'VoyageX Demo Ops', slug: 'voyagex-demo', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const otherOrg = await Organization.findOneAndUpdate(
    { slug: 'acme-travel' },
    { name: 'Acme Travel Isolation', slug: 'acme-travel', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  for (const priority of Object.keys(DEFAULT_SLA_MINUTES)) {
    await SLAPolicy.findOneAndUpdate(
      { organization: org._id, priority },
      { organization: org._id, priority, resolutionMinutes: DEFAULT_SLA_MINUTES[priority] },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const admin = await upsertUser({
    name: 'Demo Admin',
    email: 'admin@voyagex.demo',
    password: ADMIN_PASSWORD,
    role: 'ADMIN',
    organization: org._id,
  });

  const manager = await upsertUser({
    name: 'Demo Manager',
    email: 'manager@voyagex.demo',
    password: MANAGER_PASSWORD,
    role: 'MANAGER',
    organization: org._id,
  });

  const agent = await upsertUser({
    name: 'Demo Agent',
    email: 'agent@voyagex.demo',
    password: AGENT_PASSWORD,
    role: 'AGENT',
    organization: org._id,
  });

  await upsertUser({
    name: 'Acme Admin',
    email: 'admin@acme.demo',
    password: ADMIN_PASSWORD,
    role: 'ADMIN',
    organization: otherOrg._id,
  });

  const now = new Date();
  const minutesAgo = (m) => new Date(now.getTime() - m * 60 * 1000);
  const minutesFromNow = (m) => new Date(now.getTime() + m * 60 * 1000);

  const ticketDefs = [
    {
      subject: 'Dubai hotel booking unconfirmed',
      description: 'Guest arriving tonight; Marriott Downtown Dubai reservation still unconfirmed by supplier.',
      category: 'HOTEL',
      priority: 'HIGH',
      status: 'OPEN',
      source: 'EMAIL',
      agency: 'Gulf Horizons',
      bookingReference: 'BK-DXB-77821',
      customerName: 'Aisha Rahman',
      assignedTo: agent._id,
      createdBy: manager._id,
      createdAt: minutesAgo(90),
      slaDeadline: minutesFromNow(30),
    },
    {
      subject: 'Flight cancellation DXB-LHR',
      description: 'Airline cancelled evening flight; passengers need rebooking and hotel overnight.',
      category: 'FLIGHT',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      source: 'PHONE',
      agency: 'SkyBridge Agency',
      bookingReference: 'BK-FLT-99102',
      customerName: 'James Okoro',
      assignedTo: agent._id,
      createdBy: admin._id,
      createdAt: minutesAgo(40),
      slaDeadline: minutesFromNow(5),
    },
    {
      subject: 'Refund pending for cancelled tour',
      description: 'Customer paid via card; refund not reflected after 7 business days.',
      category: 'REFUND',
      priority: 'MEDIUM',
      status: 'WAITING_FOR_SUPPLIER',
      source: 'PORTAL',
      agency: 'Desert Trails',
      bookingReference: 'BK-RFD-44011',
      customerName: 'Priya Nair',
      assignedTo: null,
      createdBy: manager._id,
      createdAt: minutesAgo(200),
      slaDeadline: minutesFromNow(280),
    },
    {
      subject: 'Supplier confirmation delay for villa stay',
      description: 'Villa supplier has not confirmed availability for weekend stay in Santorini.',
      category: 'HOTEL',
      priority: 'HIGH',
      status: 'WAITING_FOR_SUPPLIER',
      source: 'EMAIL',
      agency: 'Gulf Horizons',
      bookingReference: 'BK-VIL-22045',
      customerName: 'Elena Costa',
      assignedTo: agent._id,
      createdBy: admin._id,
      createdAt: minutesAgo(150),
      slaDeadline: minutesAgo(20),
    },
    {
      subject: 'Critical booking issue with check-in approaching',
      description: 'Family of four landing in 3 hours; no hotel voucher issued and booking reference mismatch.',
      category: 'BOOKING',
      priority: 'CRITICAL',
      status: 'OPEN',
      source: 'WHATSAPP',
      agency: 'SkyBridge Agency',
      bookingReference: 'BK-FLT-99102',
      customerName: 'James Okoro',
      assignedTo: null,
      createdBy: manager._id,
      createdAt: minutesAgo(25),
      slaDeadline: minutesFromNow(5),
    },
    {
      subject: 'Payment gateway timeout on package purchase',
      description: 'Customer charged twice after payment timeout on portal checkout.',
      category: 'PAYMENT',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      source: 'PORTAL',
      agency: 'Desert Trails',
      bookingReference: 'BK-PAY-88331',
      customerName: 'Omar Farouk',
      assignedTo: agent._id,
      createdBy: admin._id,
      createdAt: minutesAgo(60),
      slaDeadline: minutesFromNow(60),
    },
    {
      subject: 'Voluntary cancellation within free window',
      description: 'Traveler requests cancellation of Bali package within free cancellation period.',
      category: 'CANCELLATION',
      priority: 'LOW',
      status: 'RESOLVED',
      source: 'MANUAL',
      agency: 'Island Escapes',
      bookingReference: 'BK-BAL-11009',
      customerName: 'Sophia Lee',
      assignedTo: agent._id,
      createdBy: manager._id,
      createdAt: minutesAgo(1440),
      slaDeadline: minutesFromNow(0),
    },
    {
      subject: 'Other inquiry about visa support letter',
      description: 'Agency asks for hotel confirmation letter template for Schengen visa file.',
      category: 'OTHER',
      priority: 'MEDIUM',
      status: 'OPEN',
      source: 'EMAIL',
      agency: 'Gulf Horizons',
      bookingReference: 'BK-VIS-55001',
      customerName: 'Agency Desk',
      assignedTo: null,
      createdBy: admin._id,
      createdAt: minutesAgo(30),
      slaDeadline: minutesFromNow(450),
    },
  ];

  const createdTickets = [];
  for (const def of ticketDefs) {
    const ticket = await upsertTicket({
      ...def,
      assignedTeam: suggestTeam(def.category),
      organization: org._id,
    });
    createdTickets.push(ticket);

    await Conversation.findOneAndUpdate(
      {
        ticket: ticket._id,
        organization: org._id,
        type: 'SYSTEM_EVENT',
        body: `Ticket seeded: ${ticket.subject}`,
      },
      {
        ticket: ticket._id,
        organization: org._id,
        type: 'SYSTEM_EVENT',
        body: `Ticket seeded: ${ticket.subject}`,
        author: admin._id,
        approvalStatus: 'PENDING',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const dubai = createdTickets[0];
  await Conversation.findOneAndUpdate(
    { ticket: dubai._id, organization: org._id, type: 'INTERNAL_NOTE', body: 'Called hotel ops; awaiting night manager callback.' },
    {
      ticket: dubai._id,
      organization: org._id,
      type: 'INTERNAL_NOTE',
      body: 'Called hotel ops; awaiting night manager callback.',
      author: agent._id,
      approvalStatus: 'PENDING',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Conversation.findOneAndUpdate(
    {
      ticket: dubai._id,
      organization: org._id,
      type: 'SUPPLIER_DRAFT',
      body: 'Please confirm booking BK-DXB-77821 for Aisha Rahman, check-in tonight.',
    },
    {
      ticket: dubai._id,
      organization: org._id,
      type: 'SUPPLIER_DRAFT',
      body: 'Please confirm booking BK-DXB-77821 for Aisha Rahman, check-in tonight.',
      author: agent._id,
      approvalStatus: 'PENDING',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const refund = createdTickets[2];
  await Conversation.findOneAndUpdate(
    {
      ticket: refund._id,
      organization: org._id,
      type: 'SUPPLIER_DRAFT',
      body: 'Kindly process refund for BK-RFD-44011 within 48 hours.',
    },
    {
      ticket: refund._id,
      organization: org._id,
      type: 'SUPPLIER_DRAFT',
      body: 'Kindly process refund for BK-RFD-44011 within 48 hours.',
      author: manager._id,
      approvalStatus: 'APPROVED',
      approvedBy: admin._id,
      approvedAt: now,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertTicket({
    subject: 'Acme-only sample ticket',
    description: 'Isolation test ticket for second organization.',
    category: 'OTHER',
    priority: 'LOW',
    status: 'OPEN',
    source: 'MANUAL',
    agency: 'Acme Desk',
    bookingReference: 'ACM-001',
    customerName: 'Acme Guest',
    assignedTeam: suggestTeam('OTHER'),
    organization: otherOrg._id,
    slaDeadline: minutesFromNow(1400),
    createdBy: admin._id,
    createdAt: now,
  });

  console.log('\nSeed complete.');
  console.log('DEV CREDENTIALS (never use in production):');
  console.log(`  admin@voyagex.demo / ${ADMIN_PASSWORD}`);
  console.log(`  manager@voyagex.demo / ${MANAGER_PASSWORD}`);
  console.log(`  agent@voyagex.demo / ${AGENT_PASSWORD}`);
  console.log(`  admin@acme.demo / ${ADMIN_PASSWORD} (other org)`);

  await mongoose.disconnect();
};

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
