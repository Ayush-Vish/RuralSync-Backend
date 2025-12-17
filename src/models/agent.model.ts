import { hash } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import mongoose from 'mongoose'
import { pointSchema } from './booking.model';
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
  status:{
    type: String,
    default: "FREE", 
    enum: ["BUSY", "FREE" , "OFFLINE"]
  },
  password: { type: String, required: true },
  phoneNumber: {
    type: String,
  },
  serviceCompany:[{
    type :String
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

// Create a pre-save middleware to update the updatedAt field
agentSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
  });
  // Method to sign JWT token
  agentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
      return next();
    }
    this.password = await hash(this.password, 10);
    return next();
  });
  
agentSchema.method('signToken', function () {
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
 export const Agent = mongoose.model('Agent', agentSchema);
