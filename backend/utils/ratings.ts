import mongoose from "mongoose";
import Review from "../models/Review.js";
import Restaurant from "../models/Restaurant.js";

export const recalculateRestaurantRating = async (
  restaurantId: mongoose.Types.ObjectId | string,
) => {
  const id = new mongoose.Types.ObjectId(String(restaurantId)); // aggregate doesn't cast ids

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
    rating: stats ? Math.round(stats.average * 10) / 10 : 0, // one decimal, e.g. 4.3
    reviewCount: stats ? stats.count : 0,
  });
};