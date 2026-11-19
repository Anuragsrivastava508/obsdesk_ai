import mongoose from 'mongoose';
import { MESSAGE_TYPES, APPROVAL_STATUSES } from '../utils/constants.js';

const conversationSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    type: { type: String, enum: MESSAGE_TYPES, required: true },
    body: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'PENDING',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

conversationSchema.index({ ticket: 1, createdAt: 1 });

conversationSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const Conversation = mongoose.model('Conversation', conversationSchema);
