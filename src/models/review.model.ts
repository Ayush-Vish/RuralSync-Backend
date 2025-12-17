import mongoose, { Schema } from 'mongoose';

const reviewSchema = new Schema({
  serviceProvider: { type: Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 }, // Rating between 1 to 5
  comment: { type: String, required: false }, // Optional comment
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

reviewSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Review = mongoose.model('Review', reviewSchema);

export { Review };
