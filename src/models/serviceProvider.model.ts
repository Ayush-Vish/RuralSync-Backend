import mongoose from 'mongoose';
import { hash } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { pointSchema } from './booking.model';
// import { pointSchema } from './booking'
const { Schema } = mongoose;

const serviceProviderSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  ip: { type: String },
  price: { type: Number },
  serviceCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCompany',
    // required: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  location: {
    type: pointSchema,
    index: '2dsphere',
  },
  clients: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
  agents: [{ type: Schema.Types.ObjectId, ref: 'Agent' }],
  booking: [{ type: Schema.Types.ObjectId, ref: 'Booking' }],
  service: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
  serviceItems: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceItem',
    },
  ],
  // category:[{
  //   type:String,
  // }],
  services: [{ type: String }],
  refreshToken: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Pre-save hook to hash the password
serviceProviderSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  this.password = await hash(this.password, 10);
});

// Method to sign JWT token
serviceProviderSchema.method('signToken', function () {
  return sign(
    {
      id: this._id,
      email: this.email,
      name: this.name,
      role: 'SERVICE_PROVIDER',
    },
    'SOME_SECRET'
  );
});

const ServiceProvider = mongoose.model(
  'ServiceProvider',
  serviceProviderSchema
);

export { ServiceProvider };
