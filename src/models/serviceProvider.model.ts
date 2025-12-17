import mongoose, { Document, Schema } from 'mongoose';
import { hash } from 'bcryptjs'; // Changed to bcryptjs for consistency
import { sign } from 'jsonwebtoken';
import { pointSchema } from './booking.model';

// 1. Define the Interface
export interface IServiceProvider extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  ip?: string;
  price?: number;
  serviceCompany?: mongoose.Types.ObjectId;
  isVerified: boolean;
  location?: {
    type: "Point";
    coordinates: number[];
  };
  clients: mongoose.Types.ObjectId[];
  agents: mongoose.Types.ObjectId[];
  booking: mongoose.Types.ObjectId[];
  service: mongoose.Types.ObjectId[];
  serviceItems: mongoose.Types.ObjectId[];
  services: string[];
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  signToken(): string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 2. Define the Schema
const serviceProviderSchema = new Schema<IServiceProvider>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false }, // Hide password by default
  phone: { type: String },
  address: { type: String },
  ip: { type: String },
  price: { type: Number },
  serviceCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization', // Assuming 'ServiceCompany' is actually 'Organization' now?
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
  services: [{ type: String }],
  refreshToken: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// 3. Pre-save Hook (Hash Password)
serviceProviderSchema.pre<IServiceProvider>('save', async function (next) {
  if (!this.isModified('password')) {
    return
  }
  this.password = await hash(this.password, 10);
});

// 4. Instance Methods
serviceProviderSchema.methods.signToken = function () {
  return sign(
    {
      id: this._id,
      email: this.email,
      name: this.name,
      role: 'SERVICE_PROVIDER',
    },
    process.env.JWT_SECRET || 'SOME_SECRET',
    { expiresIn: '30d' }
  );
};

serviceProviderSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await import('bcryptjs').then(bcrypt => bcrypt.compare(candidatePassword, this.password));
};

// 5. Export the Model
export const ServiceProvider = mongoose.model<IServiceProvider>(
  'ServiceProvider',
  serviceProviderSchema
);
