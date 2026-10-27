import type { Types } from "mongoose";
import Notification from "../models/Notification.js";
import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";

type Id = string | Types.ObjectId;

type ReviewInfo = {
  restaurant: Id;
  customer: Id;
  booking: Id;
  rating: number;
};

// // A customer reviewed: tell the restaurant's owner
// export const notifyReviewCreated = async (review: ReviewInfo) => {
//   try {
//     const [restaurant, customer] = await Promise.all([
//       Restaurant.findById(review.restaurant).select("name owner"),
//       User.findById(review.customer).select("firstName lastName"),
//     ]);
//     if (!restaurant?.owner) return;

//     const who =
//       `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim() ||
//       "A customer";

//     await Notification.create({
//       user: restaurant.owner,
//       type: "review_new",
//       title: "New Review",
//       message: `${who} rated ${restaurant.name} ${review.rating}/5.`,
//       booking: review.booking,
//     });
//   } catch (error) {
//     console.error("Notification error (review):", error);
//   }
// };

// // The owner replied: tell the customer
// export const notifyReviewReply = async (review: ReviewInfo) => {
//   try {
//     const restaurant = await Restaurant.findById(review.restaurant).select("name");

//     await Notification.create({
//       user: review.customer,
//       type: "review_reply",
//       title: "Restaurant Replied",
//       message: `${restaurant?.name ?? "The restaurant"} replied to your review.`,
//       booking: review.booking,
//     });
//   } catch (error) {
//     console.error("Notification error (reply):", error);
//   }
// };