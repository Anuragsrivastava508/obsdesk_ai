import mongoose from 'mongoose';
import { TICKET_PRIORITIES } from '../utils/constants.js';

const slaPolicySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    priority: { type: String, enum: TICKET_PRIORITIES, required: true },
    resolutionMinutes: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

slaPolicySchema.index({ organization: 1, priority: 1 }, { unique: true });

export const SLAPolicy = mongoose.model('SLAPolicy', slaPolicySchema);
