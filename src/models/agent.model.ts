import { hash } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import mongoose, { Document } from 'mongoose'
import { pointSchema } from './booking.model';
export interface IAgent extends Document {
  name: string;
  email: string;
  status: "BUSY" | "FREE" | "OFFLINE";
  password: string;
  phoneNumber?: string;
  serviceCompany: string[];
  address?: string;
  location?: {
    type: "Point";
    coordinates: number[];
  };
  services: string[];
  serviceArea?: string;
  availability?: string;
  serviceProviderId?: mongoose.Types.ObjectId;
  rating: number;
  feedback: string[];
  currentBookings: mongoose.Types.ObjectId[];
  completedBookings: mongoose.Types.ObjectId[];
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;

  signToken(): string;
}

// Define the schema for the Agent
const agentSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    default: "FREE",
    enum: ["BUSY", "FREE", "OFFLINE"]
  },
  password: { type: String, required: true },
  phoneNumber: {
    type: String,
  },
  serviceCompany: [{
    type: String
  }],
  address: {
    type: String,
  },
  location: {
    type: pointSchema,
    index: '2dsphere',
  },
  services: {
    type: [String], // Array of services like coolerRepair, washingMachineRepair
  },
  serviceArea: {
    type: String,
  },
  availability: {
    type: String,
  },
  serviceProviderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider',
    // required: true
  },

  rating: {
    type: Number,
    default: 0
  },
  feedback: [{
    type: String
  }],
  currentBookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  completedBookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

agentSchema.pre<IAgent>('save', async function () {
  this.updatedAt = new Date();
});
agentSchema.pre<IAgent>('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  this.password = await hash(this.password, 10);
});

agentSchema.method<IAgent>('signToken', function () {
  return sign(
    {
      id: this._id,
      email: this.email,
      name: this.name,
      role: 'AGENT',
    },
    'SOME_SECRET'
  );
});

// Create the Agent model using the schema
export const Agent = mongoose.model<IAgent>('Agent', agentSchema);
