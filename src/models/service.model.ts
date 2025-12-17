import mongoose, { Schema } from "mongoose";

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  }
});
const extraTaskSchema = new Schema({
  description: { type: String, required: true },
  extraPrice: { type: Number, required: true },
  timeAdded: { type: String },
});

const serviceSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  basePrice: { type: Number, required: true },
  estimatedDuration: { type: String, required: true },
  category: { type: String, required: true },
  serviceProvider: { type: Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
  serviceCompany: { type: Schema.Types.ObjectId, ref: 'ServiceCompany', required: true },
  availability: {
    type: [{ day: String, startTime: String, endTime: String }],
    required: true,
  },
  finalPrice: { type: Number, default: null },
  additionalTasks: [extraTaskSchema],
  ratings: { 
    average: { type: Number, default: 4 },
    count: { type: Number, default: 0 }
  },
images  : [{ type: String }],
  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
  assignedAgents: [{ type: Schema.Types.ObjectId, ref: 'Agent' }],
  location: {
    type: pointSchema,
    index: '2dsphere'
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  tags: [String], // For additional categorization or features (e.g., "24/7", "emergency", "best-rated")
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Text index for improved text search
serviceSchema.index({ name: 'text', description: 'text', 'address.city': 'text', 'address.state': 'text', tags: 'text' });

const Service = mongoose.model('Service', serviceSchema);

export { Service };