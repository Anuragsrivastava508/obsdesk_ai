import { Counter } from '../models/Counter.js';

export const nextTicketNumber = async (organizationId) => {
  const year = new Date().getFullYear();
  const key = `ticket:${organizationId.toString()}:${year}`;

  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seq = String(counter.seq).padStart(5, '0');
  return `OPS-${year}-${seq}`;
};
