import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware.js";
import Booking from "../models/Booking.js";
import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";

const LIMIT = 200;

export const getAdminStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      customers,
      owners,
      restaurants,
      totalBookings,
      pending,
      confirmed,
      rejected,
      cancelled,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "restaurant" }),
      Restaurant.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({ status: "rejected" }),
      Booking.countDocuments({ status: "cancelled" }),
    ]);

    return res.status(200).json({
      stats: {
        users: { total: totalUsers, customers, owners },
        restaurants,
        bookings: {
          total: totalBookings,
          pending,
          confirmed,
          rejected,
          cancelled,
        },
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getAllUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(LIMIT);

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Admin users error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getAllRestaurants = async (_req: AuthRequest, res: Response) => {
  try {
    const restaurants = await Restaurant.find()
      .populate("owner", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(LIMIT);

    return res.status(200).json({ restaurants });
  } catch (error) {
    console.error("Admin restaurants error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getAllBookings = async (_req: AuthRequest, res: Response) => {
  try {
    const bookings = await Booking.find()
      .populate("customer", "firstName lastName phone")
      .populate("restaurant", "name city")
      .sort({ createdAt: -1 })
      .limit(LIMIT);

    return res.status(200).json({ bookings });
  } catch (error) {
    console.error("Admin bookings error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const setRestaurantActive = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid restaurant id" });
    }
    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ message: "isActive must be true or false" });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    ).populate("owner", "firstName lastName email");

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    return res.status(200).json({
      message: isActive ? "Restaurant activated" : "Restaurant disabled",
      restaurant,
    });
  } catch (error) {
    console.error("Set restaurant active error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const toggleFeatured = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Toggle boolean value
    restaurant.isFeatured = !restaurant.isFeatured;
    await restaurant.save();

    return res.status(200).json({
      success: true,
      message: `Restaurant is now ${restaurant.isFeatured ? "Featured" : "Unfeatured"}`,
      data: restaurant,
    });
  } catch (error) {
    console.error("Set restaurant is Featured :", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
