import mongoose, { Schema, Document } from "mongoose";

export interface IServiceItem extends Document {
  bookingId: mongoose.Types.ObjectId;
  description: string;
  cost: number;
  imageUrl?: string;
  addedBy?: mongoose.Types.ObjectId;
}

const serviceItemSchema = new Schema<IServiceItem>({
  bookingId: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  cost: {
    type: Number,
    required: true, // ✅ Fixed: Must be required
    min: 0
  },
  imageUrl: {
    type: String,
    default: null,
  },
  addedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Agent' // Good to track who added the extra item
  }
}, { timestamps: true });

export const ServiceItem = mongoose.model<IServiceItem>('ServiceItem', serviceItemSchema);
