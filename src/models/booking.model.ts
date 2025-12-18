import mongoose, { Schema, Document } from 'mongoose';

// Exporting reusable Point Schema
export const pointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number], // [Longitude, Latitude]
    required: true
  }
}, { _id: false });

export interface IBooking extends Document {
  client: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  agent?: mongoose.Types.ObjectId;
  bookingDate: Date;
  bookingTime: string;
  status: "PENDING" | "CONFIRMED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  totalPrice: number;
  paymentStatus: 'PAID' | 'UNPAID';
  extraTasks: { description: string; price: number }[];
  location: { type: string; coordinates: number[] };
  address: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client', // Matches your Client model name
    required: true,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization', // Matches your Organization model name
    required: true
  },
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  agent: {
    type: Schema.Types.ObjectId,
    ref: 'Agent',
  },
  bookingDate: {
    type: Date,
    required: true,
  },
  bookingTime: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
  },
  totalPrice: {
    type: Number,
    min: 0,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['PAID', 'UNPAID'],
    default: 'UNPAID',
  },
  extraTasks: [{
    description: { type: String, required: true },
    price: { type: Number, required: true } // ✅ Fixed: Price must be Number
  }],
  location: {
    type: pointSchema,
    index: '2dsphere',
  },
  address: { type: String, required: true },
  notes: { type: String }
}, { timestamps: true });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
