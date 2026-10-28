import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBooking extends Document {
  customer: mongoose.Types.ObjectId;
  restaurant: mongoose.Types.ObjectId;
  date: Date;
  time: string;
  guests: number;
  seatingType: string;
  request?: string;
  floor: string;

  status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
}

const bookingSchema = new Schema<IBooking>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    guests: { type: Number, required: true, min: 1, max: 50 },
    seatingType: { type: String, required: true },
    request: { type: String, maxlength: 500 },
    floor: { type: String }, // enforced in createBooking; older bookings may lack it

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// "My bookings" (getMyBookings)
bookingSchema.index({ customer: 1, date: -1, createdAt: -1 });
// Owner lists, status filters, and the per-slot seat count in createBooking
bookingSchema.index({ restaurant: 1, date: 1, time: 1, status: 1 });

const Booking: Model<IBooking> = mongoose.model<IBooking>(
  "Booking",
  bookingSchema,
);

export default Booking;