
// Cleanup when a restaurant or user is removed, so nothing is left orphaned.

import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import Restaurant from "../models/Restaurant.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import { recalculateRestaurantRating } from "./ratings.js";
 
const toId = (id: unknown) => new mongoose.Types.ObjectId(String(id));
 
export const deleteRestaurantCascade = async (restaurantId: unknown) => {
  const id = toId(restaurantId);
 
  const bookingIds = (await Booking.find({ restaurant: id }).select("_id")).map(
    (b) => b._id,
  );
 
  await Promise.all([
    // Notifications (owner + customers) that point at these bookings
    bookingIds.length
      ? Notification.deleteMany({ booking: { $in: bookingIds } })
      : Promise.resolve(),
    Booking.deleteMany({ restaurant: id }),
    Review.deleteMany({ restaurant: id }),
    User.updateMany({ favorites: id }, { $pull: { favorites: id } }),
  ]);
 
  // Delete the restaurant last so a failed cleanup can simply be retried.
  await Restaurant.findByIdAndDelete(id);
};
 
export const deleteUserCascade = async (userId: unknown) => {
  const uid = toId(userId);
 
  const [reviews, bookings] = await Promise.all([
    Review.find({ customer: uid }).select("restaurant"),
    Booking.find({ customer: uid }).select("_id"),
  ]);
  const affectedRestaurants = [...new Set(reviews.map((r) => String(r.restaurant)))];
  const bookingIds = bookings.map((b) => b._id);
 
  await Promise.all([
    // The user's own notifications, plus owners' notifications about their bookings
    Notification.deleteMany({
      $or: [{ user: uid }, { booking: { $in: bookingIds } }],
    }),
    Booking.deleteMany({ customer: uid }),
    Review.deleteMany({ customer: uid }),
  ]);
 
  for (const restaurantId of affectedRestaurants) {
    await recalculateRestaurantRating(toId(restaurantId));
  }
};