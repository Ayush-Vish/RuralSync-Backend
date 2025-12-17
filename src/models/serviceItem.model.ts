import mongoose from "mongoose";

// Define the ServiceItem Schema
const serviceItemSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  cost: {
    type: Number,
    // required: true,  
  },
  imageUrl: {
    type: String, 
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to update `updatedAt` on save
serviceItemSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Export the ServiceItem model
export const ServiceItem = mongoose.model('ServiceItem', serviceItemSchema);


