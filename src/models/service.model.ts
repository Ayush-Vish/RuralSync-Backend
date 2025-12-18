import mongoose, { Schema, Document } from "mongoose";
import { pointSchema } from './booking.model';

export interface IService extends Document {
  name: string;
  description: string;
  basePrice: number;
  estimatedDuration: string;
  category: string;
  organization: mongoose.Types.ObjectId;
  availability: { day: string; startTime: string; endTime: string }[];
  location?: { type: string; coordinates: number[] };
  images: string[];
  reviews: mongoose.Types.ObjectId[];
  assignedAgents: mongoose.Types.ObjectId[];
  rating: number;
  tags: string[];
  isActive: boolean;
}

const serviceSchema = new Schema<IService>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  basePrice: { type: Number, required: true },
  estimatedDuration: { type: String, required: true },
  category: { type: String, required: true },

  // Link to the Organization (Company)
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },

  availability: [{
    day: { type: String, required: true }, // e.g., "Monday"
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  }],

  rating: { type: Number, default: 0 },

  images: [{ type: String }],
  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
  assignedAgents: [{ type: Schema.Types.ObjectId, ref: 'Agent' }],
  location: {
    type: pointSchema,
    index: '2dsphere'
  },
  tags: [String],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

serviceSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Service = mongoose.model<IService>('Service', serviceSchema);
