import { hash } from 'bcryptjs'; // Using bcryptjs for consistency with your Auth module
import { sign } from 'jsonwebtoken';
import mongoose, { Document, Schema } from 'mongoose';
import { pointSchema } from './booking.model';

// 1. Define the Interface
export interface IClient extends Document {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  address?: string;
  location?: {
    type: "Point";
    coordinates: number[];
  };
  profileImage?: string;
  bookings: mongoose.Types.ObjectId[];
  reviews: mongoose.Types.ObjectId[]; // Reviews written by client
  preferences?: {
    language?: string;
    notifications?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  refreshToken?: string;

  signToken(): string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 2. Define the Schema
const clientSchema = new Schema<IClient>({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    select: false // Do not return password by default
  },
  phoneNumber: {
    type: String
  },
  address: {
    type: String
  },
  location: {
    type: pointSchema,
    index: '2dsphere'
  },
  profileImage: {
    type: String
  },
  bookings: [{
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  reviews: [{
    type: Schema.Types.ObjectId,
    ref: 'Review'
  }],
  preferences: {
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 3. Pre-save Hooks (Password Hashing)
clientSchema.pre<IClient>('save', async function (next) {
  this.updatedAt = new Date();
  if (!this.isModified('password')) {
    return
  }
  this.password = await hash(this.password, 10);

});

// 4. Instance Methods
clientSchema.methods.signToken = function () {
  return sign(
    {
      id: this._id,
      email: this.email,
      name: this.name,
      role: 'CLIENT',
    },
    process.env.JWT_SECRET || 'SOME_SECRET',
    { expiresIn: '7d' }
  );
};

// Helper to check password (useful for login)
clientSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await import('bcryptjs').then(bcrypt => bcrypt.compare(candidatePassword, this.password));
};

// 5. Export the Model
export const Client = mongoose.model<IClient>('Client', clientSchema);
