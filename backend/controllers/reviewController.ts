import type { Response } from "express";
import mongoose from "mongoose";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Booking from "../models/Booking.js";
import Restaurant from "../models/Restaurant.js";
import Review from "../models/Review.js";

const syncRestaurantRating = async (restaurantId: mongoose.Types.ObjectId) => {
  const [summary] = await Review.aggregate<{ average: number; count: number }>([
    { $match: { restaurant: restaurantId } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  await Restaurant.updateOne(
    { _id: restaurantId },
    {
      $set: {
        rating: summary ? Math.round(summary.average * 10) / 10 : 0,
        reviewCount: summary?.count ?? 0,
      },
    },
  );
};

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, rating, comment } = req.body;
    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }
    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });
    }
    if (comment !== undefined && typeof comment !== "string") {
      return res.status(400).json({ message: "Comment must be text" });
    }
    if (typeof comment === "string" && comment.trim().length > 2000) {
      return res.status(400).json({ message: "Comment cannot exceed 2000 characters" });
    }

    const booking = await Booking.findOne({ _id: bookingId, customer: req.userId });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "Only completed bookings can be reviewed" });
    }
    if (await Review.exists({ booking: booking._id })) {
      return res.status(409).json({ message: "This booking has already been reviewed" });
    }

    const review = await Review.create({
      customer: booking.customer,
      restaurant: booking.restaurant,
      booking: booking._id,
      rating: score,
      ...(typeof comment === "string" && comment.trim() ? { comment: comment.trim() } : {}),
    });
    await syncRestaurantRating(booking.restaurant);
    const populated = await review.populate("customer", "firstName lastName");
    return res.status(201).json({ message: "Review submitted", review: populated });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      return res.status(409).json({ message: "This booking has already been reviewed" });
    }
    console.error("Create review error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getRestaurantReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId } = req.params;
    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant id" });
    }
    if (!(await Restaurant.exists({ _id: restaurantId }))) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
    const parsedPage = Number(req.query.page);
    const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const [reviews, total] = await Promise.all([
      Review.find({ restaurant: restaurantId })
        .populate("customer", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments({ restaurant: restaurantId }),
    ]);
    return res.status(200).json({ reviews, page, limit, total });
  } catch (error) {
    console.error("Fetch restaurant reviews error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getMyReviews = async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await Review.find({ customer: req.userId })
      .populate("restaurant", "name images city")
      .populate("booking", "date time")
      .sort({ createdAt: -1 });
    return res.status(200).json({ reviews });
  } catch (error) {
    console.error("Fetch my reviews error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid review id" });
    if (rating === undefined && comment === undefined) {
      return res.status(400).json({ message: "Provide a rating or comment to update" });
    }
    const updates: { rating?: number; comment?: string } = {};
    if (rating !== undefined) {
      const score = Number(rating);
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });
      }
      updates.rating = score;
    }
    if (comment !== undefined) {
      if (typeof comment !== "string" || comment.trim().length > 2000) {
        return res.status(400).json({ message: "Comment must be text up to 2000 characters" });
      }
      updates.comment = comment.trim();
    }
    const review = await Review.findOneAndUpdate(
      { _id: id, customer: req.userId },
      { $set: updates, ...(updates.comment === "" ? { $unset: { comment: 1 } } : {}) },
      { new: true, runValidators: true },
    ).populate("customer", "firstName lastName");
    if (!review) return res.status(404).json({ message: "Review not found" });
    await syncRestaurantRating(review.restaurant);
    return res.status(200).json({ message: "Review updated", review });
  } catch (error) {
    console.error("Update review error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid review id" });
    const review = await Review.findOneAndDelete({ _id: id, customer: req.userId });
    if (!review) return res.status(404).json({ message: "Review not found" });
    await syncRestaurantRating(review.restaurant);
    return res.status(200).json({ message: "Review deleted" });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
