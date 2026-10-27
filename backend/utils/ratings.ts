import mongoose from "mongoose";
import Restaurant from "../models/Restaurant.js";
import Review from "../models/Review.js";

export const recalculateRestaurantRating = async (
  restaurantId: mongoose.Types.ObjectId | string,
) => {
  const id = new mongoose.Types.ObjectId(String(restaurantId));
  const [stats] = await Review.aggregate([
    { $match: { restaurant: id } },
    {
      $group: {
        _id: "$restaurant",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  await Restaurant.findByIdAndUpdate(id, {
    rating: stats ? Math.round(stats.average * 10) / 10 : 0, 
    reviewCount: stats ? stats.count : 0,
  });
};
