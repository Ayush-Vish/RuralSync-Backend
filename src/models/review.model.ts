import mongoose, { Schema, Document } from 'mongoose';

// 1. Define the Interface
export interface IReview extends Document {
  serviceProvider: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId; // Standardized to 'client' (not customer)
  service: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define the Schema
const reviewSchema = new Schema<IReview>({
  serviceProvider: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceProvider',
    required: true
  },
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
});

// 3. Pre-save Hook (Update timestamp)
reviewSchema.pre<IReview>('save', function (next) {
  this.updatedAt = new Date();
});

// 4. Export the Model
export const Review = mongoose.model<IReview>('Review', reviewSchema);
