import mongoose, { Document, Schema } from 'mongoose';
import { pointSchema } from './booking.model';

// 1. Define the Interface
export interface IOrganization extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  logo?: string;
  images: string[];
  location?: {
    type: "Point";
    coordinates: number[];
  };
  services: mongoose.Types.ObjectId[];
  agents: mongoose.Types.ObjectId[];
  clients: mongoose.Types.ObjectId[];
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  businessHours?: {
    [key: string]: { start: string; end: string }; // Index signature for days
  };
  categories: string[];
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define the Schema
const orgSchema = new Schema<IOrganization>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
  name: { type: String, required: true },
  description: { type: String },
  address: { type: String },
  phone: { type: String },
  website: { type: String },
  logo: { type: String },
  images: [{ type: String }],
  location: { type: pointSchema, index: '2dsphere' },
  services: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
  agents: [{ type: Schema.Types.ObjectId, ref: 'Agent' }],
  clients: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
  socialMedia: {
    facebook: { type: String },
    twitter: { type: String },
    instagram: { type: String },
    linkedin: { type: String },
  },
  businessHours: {
    Monday: { start: String, end: String },
    Tuesday: { start: String, end: String },
    Wednesday: { start: String, end: String },
    Thursday: { start: String, end: String },
    Friday: { start: String, end: String },
    Saturday: { start: String, end: String },
    Sunday: { start: String, end: String },
  },
  categories: [{ type: String }],
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 3. Export the Model
export const Organization = mongoose.model<IOrganization>('Organization', orgSchema);
