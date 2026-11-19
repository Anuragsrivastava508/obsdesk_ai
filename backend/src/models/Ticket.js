import mongoose from 'mongoose';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_SOURCES,
  TEAMS,
} from '../utils/constants.js';

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: TICKET_CATEGORIES, required: true },
    priority: { type: String, enum: TICKET_PRIORITIES, required: true, default: 'MEDIUM' },
    status: { type: String, enum: TICKET_STATUSES, required: true, default: 'OPEN' },
    source: { type: String, enum: TICKET_SOURCES, required: true, default: 'MANUAL' },
    agency: { type: String, trim: true, default: '' },
    bookingReference: { type: String, trim: true, default: '' },
    customerName: { type: String, trim: true, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedTeam: { type: String, enum: TEAMS, required: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    slaDeadline: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ticketSchema.index({ organization: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ organization: 1, status: 1 });
ticketSchema.index({ organization: 1, priority: 1 });
ticketSchema.index({ organization: 1, bookingReference: 1 });
ticketSchema.index({ organization: 1, assignedTo: 1 });
ticketSchema.index({ organization: 1, slaDeadline: 1 });

ticketSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const Ticket = mongoose.model('Ticket', ticketSchema);
