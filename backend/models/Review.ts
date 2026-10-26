import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  restaurant: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  booking?: mongoose.Types.ObjectId;
  rating: number; // 1 to 5
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

// Prevent a customer from leaving multiple reviews for the same restaurant/booking if desired
reviewSchema.index({ restaurant: 1, customer: 1 }, { unique: true });

export const Review = mongoose.model<IReview>("Review", reviewSchema);
