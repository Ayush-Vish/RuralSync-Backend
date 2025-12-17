import mongoose from 'mongoose';

// Define the schema for an extra task

// Define a point schema for location data
export const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  }
});

// Define the schema for a booking
const bookingSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  serviceProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider',
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
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
    enum: ['Pending', 'In Progress', 'Completed', "Not Assigned"],
    default: 'Not Assigned',
  },
  totalPrice: {
    type: Number,
    min: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid',
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: false,
  },
  extraTasks: [{
    description:{
      type:String
    }, 
    extraPrice:{
      type:String
    } 
  }], // Include extra tasks in the booking
  location: { // Include location of the service (if applicable)
    type: pointSchema,
    index: '2dsphere',
  },
  address:{
    type:String
  }
}, { timestamps: true });

// Export the Booking model
export const Booking = mongoose.model('Booking', bookingSchema);
