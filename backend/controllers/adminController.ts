import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware.js";
import Booking from "../models/Booking.js";
import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";
import { getParam, parsePaging } from "../utils/validation.js";

// Same cap as before (200) but now pageable: ?page=2&limit=50
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 200;

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
      completed,
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
      Booking.countDocuments({ status: "completed" }),
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
          completed,
        },
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = parsePaging(req.query, DEFAULT_LIMIT, MAX_LIMIT);

    const [users, total] = await Promise.all([
      User.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    return res
      .status(200)
      .json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin users error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getAllRestaurants = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = parsePaging(req.query, DEFAULT_LIMIT, MAX_LIMIT);

    const [restaurants, total] = await Promise.all([
      Restaurant.find()
        .populate("owner", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Restaurant.countDocuments(),
    ]);

    return res
      .status(200)
      .json({ restaurants, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin restaurants error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getAllBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = parsePaging(req.query, DEFAULT_LIMIT, MAX_LIMIT);

    const [bookings, total] = await Promise.all([
      Booking.find()
        .populate("customer", "firstName lastName phone")
        .populate("restaurant", "name city")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(),
    ]);

    return res
      .status(200)
      .json({ bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin bookings error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const setRestaurantActive = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const { isActive } = req.body ?? {};

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
    const id = getParam(req.params.id);
    const { isFeatured } = req.body ?? {}; // target state from the frontend

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid restaurant id" });
    }
    if (isFeatured !== undefined && typeof isFeatured !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isFeatured must be true or false" });
    }

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Use the provided value if there is one, otherwise flip it
    restaurant.isFeatured =
      isFeatured !== undefined ? isFeatured : !restaurant.isFeatured;
    await restaurant.save();

    return res.status(200).json({
      success: true,
      message: `Restaurant is now ${restaurant.isFeatured ? "Featured" : "Unfeatured"}`,
      restaurant,
    });
  } catch (error) {
    console.error("Toggle featured error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};