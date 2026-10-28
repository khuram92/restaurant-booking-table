import type { Response } from "express";
import mongoose from "mongoose";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Restaurant from "../models/Restaurant.js";
import { deleteRestaurantCascade } from "../utils/cascade.js";
import {
  escapeRegex,
  getParam,
  parsePaging,
  sanitizeRestaurantInput,
} from "../utils/validation.js";

export const createRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.userId;

    if (!ownerId) {
      return res.status(401).json({ message: "Not authorized" });
    }
    // The route also enforces this with authorize("restaurant", "admin")
    if (req.role !== "restaurant" && req.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only restaurant or admin accounts can create a restaurant" });
    }

    const result = sanitizeRestaurantInput(req.body ?? {}, true);
    if ("error" in result) {
      return res.status(400).json({ message: result.error });
    }

    const existingRestaurant = await Restaurant.findOne({ owner: ownerId });

    if (existingRestaurant) {
      return res.status(409).json({
        message: "An owner can only register one restaurant account",
      });
    }

    const newRestaurant = new Restaurant({
      images: [],
      floorNumbers: [],
      seatingTypes: [],
      availableSeats: 0,
      ...result.data,
      owner: ownerId,
    });

    await newRestaurant.save();

    return res.status(201).json({
      message: "Restaurant created successfully",
      restaurant: newRestaurant,
    });
  } catch (error: any) {
    console.error("Create Restaurant Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Restaurant already registered for this owner",
      });
    }

    return res.status(500).json({
      message: "Internal server error while creating restaurant",
    });
  }
};

export const getAllRestaurants = async (req: AuthRequest, res: Response) => {
  try {
    const { city, search } = req.query;

    const query: Record<string, any> = { isActive: { $ne: false } };

    // Only accept plain strings (?city=a&city=b is an array) and escape them.
    if (typeof city === "string" && city.trim()) {
      query.city = {
        $regex: escapeRegex(city.trim().slice(0, 100)),
        $options: "i",
      };
    }

    if (typeof search === "string" && search.trim()) {
      const pattern = escapeRegex(search.trim().slice(0, 100));
      query.$or = [
        { name: { $regex: pattern, $options: "i" } },
        { cuisines: { $regex: pattern, $options: "i" } },
      ];
    }

    const { page, limit, skip } = parsePaging(req.query, 50, 100);

    const [restaurants, total] = await Promise.all([
      Restaurant.find(query).sort({ rating: -1, _id: 1 }).skip(skip).limit(limit),
      Restaurant.countDocuments(query),
    ]);

    return res.status(200).json({
      count: restaurants.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      restaurants,
    });
  } catch (error) {
    console.error("Get All Restaurants Error:", error);
    return res.status(500).json({ message: "Error fetching restaurants" });
  }
};

export const getRestaurantById = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid restaurant id" });
    }

    const restaurant = await Restaurant.findById(id).populate(
      "owner",
      "firstName lastName email phone",
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const ownerId = String((restaurant.owner as any)?._id ?? restaurant.owner);
    const isPrivileged = req.role === "admin" || ownerId === req.userId;

    if (restaurant.isActive === false && !isPrivileged) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const data: any = restaurant.toJSON();
    // Public visitors only see the owner's name, never their email or phone.
    if (!isPrivileged && data.owner && typeof data.owner === "object") {
      data.owner = {
        _id: data.owner._id,
        firstName: data.owner.firstName,
        lastName: data.owner.lastName,
      };
    }

    return res.status(200).json({ restaurant: data });
  } catch (error) {
    console.error("Get Restaurant By ID Error:", error);
    return res
      .status(500)
      .json({ message: "Error fetching restaurant details" });
  }
};

export const getMyRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.userId });

    if (!restaurant) {
      return res
        .status(404)
        .json({ message: "No restaurant profile found for this owner" });
    }

    return res.status(200).json({ restaurant });
  } catch (error) {
    console.error("Get My Restaurant Error:", error);
    return res
      .status(500)
      .json({ message: "Error fetching your restaurant profile" });
  }
};

export const updateRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid restaurant id" });
    }

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Verify ownership (Admin can override)
    if (restaurant.owner?.toString() !== req.userId && req.role !== "admin") {
      return res.status(403).json({
        message: "You are not authorized to update this restaurant",
      });
    }

    const body = req.body ?? {};
    const result = sanitizeRestaurantInput(body, false, restaurant.images ?? []);
    if ("error" in result) {
      return res.status(400).json({ message: result.error });
    }
    const updates = result.data;

    // Only admins can feature a restaurant. For owners the field is ignored.
    if (req.role === "admin" && body.isFeatured !== undefined) {
      if (typeof body.isFeatured !== "boolean") {
        return res
          .status(400)
          .json({ message: "isFeatured must be true or false" });
      }
      updates.isFeatured = body.isFeatured;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      message: "Restaurant details updated successfully",
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    console.error("Update Restaurant Error:", error);
    return res
      .status(500)
      .json({ message: "Error updating restaurant details" });
  }
};

export const deleteRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid restaurant id" });
    }

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Verify ownership (Admin can override)
    if (restaurant.owner?.toString() !== req.userId && req.role !== "admin") {
      return res.status(403).json({
        message: "You are not authorized to delete this restaurant",
      });
    }

    // Removes its bookings, reviews and favorites too, then the restaurant.
    await deleteRestaurantCascade(restaurant._id);

    return res.status(200).json({ message: "Restaurant removed successfully" });
  } catch (error) {
    console.error("Delete Restaurant Error:", error);
    return res.status(500).json({ message: "Error deleting restaurant" });
  }
};

export const getFeaturedRestaurants = async (
  _req: AuthRequest,
  res: Response,
) => {
  try {
    const restaurants = await Restaurant.find({
      isFeatured: true,
      isActive: { $ne: false },
    });
    return res.status(200).json({
      success: true,
      restaurants,
    });
  } catch (error) {
    console.error("Get Featured Restaurants Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching featured restaurants",
    });
  }
};