import mongoose, { Schema } from 'mongoose';
import { pointSchema } from './booking.model';

const orgSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
  name: { type: String, required: true },
  description: { type: String },
  address: { type: String },
  phone: { type: String },
  website: { type: String },
  logo: { type: String },
  images: [{ type: String }],
  location: { type: pointSchema, index: '2dsphere' },
  services: [{ type: Schema.Types.ObjectId, ref: 'Service', required: false }],
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
  categories:[
    {type:String}
  ],
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const Org = mongoose.model('ServiceCompany', orgSchema);

export { Org };
