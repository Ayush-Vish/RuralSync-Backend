import mongoose, { Schema, Document } from "mongoose";
import { pointSchema } from './booking.model';
import { generateEmbedding } from "../utils/ai.helper";

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
  embeddings: number[]; // 👈 Store AI vectors here
}

const serviceSchema = new Schema<IService>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  basePrice: { type: Number, required: true },
  estimatedDuration: { type: String, required: true },
  category: { type: String, required: true },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  availability: [{
    day: { type: String, required: true },
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
  isActive: { type: Boolean, default: true },
  embeddings: { type: [Number], default: [] } // 👈 New vector field
}, { timestamps: true });

// Text index for standard keyword fallback
serviceSchema.index({ name: 'text', description: 'text', tags: 'text' });

/**
 * AI Middleware: Automatically generate embeddings on save/update
 */
serviceSchema.pre('save', async function (next) {
  if (this.isModified('description') || this.isModified('name') || this.isModified('category')) {
    const textToEmbed = `${this.name} ${this.description} ${this.category} ${this.tags.join(' ')}`;
    this.embeddings = await generateEmbedding(textToEmbed);
  }
});

export const Service = mongoose.model<IService>('Service', serviceSchema);
