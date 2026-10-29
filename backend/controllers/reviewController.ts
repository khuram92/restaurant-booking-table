import type { Request, Response } from "express";
import mongoose from "mongoose";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Booking from "../models/Booking.js";
import Restaurant from "../models/Restaurant.js";
import Review from "../models/Review.js";
import { recalculateRestaurantRating } from "../utils/ratings.js";
import {
  notifyReviewCreated,
  notifyReviewReply,
} from "../utils/reviewNotifications.js";

const MAX_TEXT = 1000;

const parseRating = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

const badText = (value: unknown) =>
  typeof value !== "string" || value.trim().length > MAX_TEXT;

// "Ali Khan" -> "Ali K."  (full surnames are not shown publicly)
const displayName = (c?: { firstName?: string; lastName?: string } | null) => {
  if (!c) return "Former customer";
  const first = c.firstName?.trim() ?? "";
  const initial = c.lastName?.trim().charAt(0).toUpperCase();
  return `${first}${initial ? ` ${initial}.` : ""}`.trim() || "Customer";
};

const toPublic = (r: any) => {
  const c = r.customer && typeof r.customer === "object" ? r.customer : null;

  return {
    _id: r._id,
    rating: r.rating,
    comment: r.comment ?? "",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    reply: r.reply?.text
      ? { text: r.reply.text, repliedAt: r.reply.repliedAt }
      : null,
    customer: { name: displayName(c), avatar: c?.avatar ?? null },
  };
};

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const stars = parseRating(rating);
    if (stars === null) {
      return res
        .status(400)
        .json({ message: "Rating must be a whole number from 1 to 5" });
    }

    if (comment !== undefined && badText(comment)) {
      return res.status(400).json({
        message: `Comment must be text of up to ${MAX_TEXT} characters`,
      });
    }

    // The booking must be the caller's own, and finished
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: req.userId,
    });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.status !== "completed") {
      return res
        .status(400)
        .json({ message: "You can only review a completed booking" });
    }

    const restaurant = await Restaurant.findById(booking.restaurant).select(
      "owner",
    );
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    if (restaurant.owner?.toString() === req.userId) {
      return res
        .status(400)
        .json({ message: "You can't review your own restaurant" });
    }

    const review = await Review.create({
      restaurant: booking.restaurant,
      customer: req.userId,
      booking: booking._id,
      rating: stars,
      comment: comment?.trim() || undefined,
    });

    await recalculateRestaurantRating(booking.restaurant);
    void notifyReviewCreated(review);

    return res.status(201).json({ message: "Review added", review });
  } catch (error: any) {
    if (error?.code === 11000) {
      if (error.keyPattern && "booking" in error.keyPattern) {
        return res
          .status(409)
          .json({ message: "You have already reviewed this booking" });
      }
      console.error("Unexpected duplicate key on reviews:", error.keyPattern);
    } else {
      console.error("Create review error:", error);
    }
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Public: a restaurant's reviews, with the average and a 1-5 star breakdown
export const getRestaurantReviews = async (req: Request, res: Response) => {
  try {
    const restaurantId = Array.isArray(req.params.restaurantId)
      ? (req.params.restaurantId[0] ?? "")
      : req.params.restaurantId;
    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant id" });
    }

    const id = new mongoose.Types.ObjectId(restaurantId);
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10),
    );

    const [reviews, rows] = await Promise.all([
      Review.find({ restaurant: id })
        .populate("customer", "firstName lastName avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Review.aggregate([
        { $match: { restaurant: id } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ]),
    ]);

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const row of rows as { _id: number; count: number }[]) {
      distribution[row._id] = row.count;
    }

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    const weighted = Object.entries(distribution).reduce(
      (sum, [stars, n]) => sum + Number(stars) * n,
      0,
    );

    return res.status(200).json({
      summary: {
        average: total ? Math.round((weighted / total) * 10) / 10 : 0,
        count: total,
        distribution,
      },
      reviews: reviews.map(toPublic),
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get restaurant reviews error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// The caller's own reviews. The app uses the booking ids to show "Rate" or "Rated"
export const getMyReviews = async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await Review.find({ customer: req.userId })
      .populate("restaurant", "name city images")
      .sort({ createdAt: -1 });

    return res.status(200).json({ reviews });
  } catch (error) {
    console.error("Get my reviews error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid review id" });
    }

    const { rating, comment } = req.body;
    if (rating === undefined && comment === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    // Only the author can edit
    const review = await Review.findOne({ _id: id, customer: req.userId });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (rating !== undefined) {
      const stars = parseRating(rating);
      if (stars === null) {
        return res
          .status(400)
          .json({ message: "Rating must be a whole number from 1 to 5" });
      }
      review.rating = stars;
    }

    if (comment !== undefined) {
      if (badText(comment)) {
        return res.status(400).json({
          message: `Comment must be text of up to ${MAX_TEXT} characters`,
        });
      }
      review.comment = comment.trim(); // empty text clears it
    }

    await review.save();
    await recalculateRestaurantRating(review.restaurant);

    return res.status(200).json({ message: "Review updated", review });
  } catch (error) {
    console.error("Update review error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid review id" });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // The author, or an admin
    if (review.customer.toString() !== req.userId && req.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    await review.deleteOne();
    await recalculateRestaurantRating(review.restaurant);

    return res.status(200).json({ message: "Review deleted" });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// The restaurant's owner replies to a review. Empty text removes the reply.
export const replyToReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid review id" });
    }

    const { text } = req.body;
    if (text !== undefined && badText(text)) {
      return res.status(400).json({
        message: `Reply must be text of up to ${MAX_TEXT} characters`,
      });
    }
    const reply = typeof text === "string" ? text.trim() : "";

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Only the owner of the reviewed restaurant
    const restaurant = await Restaurant.findOne({
      _id: review.restaurant,
      owner: req.userId,
    });
    if (!restaurant) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (reply) {
      review.reply = { text: reply, repliedAt: new Date() };
    } else {
      review.set("reply", undefined);
    }
    await review.save();

    if (reply) void notifyReviewReply(review);

    return res.status(200).json({
      message: reply ? "Reply saved" : "Reply removed",
      review,
    });
  } catch (error) {
    console.error("Reply to review error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
