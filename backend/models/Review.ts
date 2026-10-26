import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReview extends Document {
  restaurant: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  reply?: { text?: string; repliedAt?: Date };
}

const reviewSchema = new Schema<IReview>(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },

    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
    reply: {
      text: { type: String, trim: true, maxlength: 1000 },
      repliedAt: { type: Date },
    },
  },
  { timestamps: true },
);

// Newest reviews of a restaurant first
reviewSchema.index({ restaurant: 1, createdAt: -1 });
reviewSchema.index({ customer: 1, createdAt: -1 });

const Review: Model<IReview> = mongoose.model<IReview>("Review", reviewSchema);

export default Review;