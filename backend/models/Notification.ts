import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType =
  | "booking_request"
  | "booking_new"
  | "booking_confirmed"
  | "booking_rejected"
  | "booking_cancelled"
  | "booking_updated" 
  | "booking_completed"
  | "review_new"
  | "review_reply";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  booking?: mongoose.Types.ObjectId;
  isRead: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    booking: { type: Schema.Types.ObjectId, ref: "Booking" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Fast "my newest notifications" lookups
notificationSchema.index({ user: 1, createdAt: -1 });
// Housekeeping: MongoDB deletes notifications after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const Notification: Model<INotification> = mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);

export default Notification;