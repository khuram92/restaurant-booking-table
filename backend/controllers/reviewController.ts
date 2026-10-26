import { Request, Response } from "express";
import Restaurant from "../models/Restaurant.js";
import { Review } from "../models/Review.js";


const updateRestaurantRatingStats = async (restaurantId: string) => {
  const stats = await Review.aggregate([
    { $match: { restaurant: restaurantId } },
    {
      $group: {
        _id: "$restaurant",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Restaurant.findByIdAndUpdate(restaurantId, {
      rating: Number(stats[0].avgRating.toFixed(1)),
      reviewCount: stats[0].count,
    });
  } else {
    await Restaurant.findByIdAndUpdate(restaurantId, {
      rating: 0,
      reviewCount: 0,
    });
  }
};

export const getRestaurantReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    
    const reviews = await Review.find({ restaurant: restaurantId })
      .populate({
        path: "customer",
        select: "firstName lastName avatar", 
      })
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch reviews" });
  }
};


export const createReview = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    
    const authUser = (req as any).user;
    const userId = authUser?._id || authUser?.id || authUser?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized: User ID missing from token" });
      return;
    }

    const { restaurantId, rating, comment, bookingId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ message: "Rating must be between 1 and 5" });
      return;
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      res.status(404).json({ message: "Restaurant not found" });
      return;
    }

    // Pass explicit customer field into the update query as well
    const review = await Review.findOneAndUpdate(
      { restaurant: restaurantId, customer: userId },
      { customer: userId, rating, comment, booking: bookingId },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    await updateRestaurantRatingStats(restaurantId);

    res.status(201).json({ message: "Review submitted successfully", review });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: error.message || "Failed to submit review" });
  }
};
