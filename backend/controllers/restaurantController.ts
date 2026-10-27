import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Restaurant from "../models/Restaurant.js";

export const createRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      cuisines,
      city,
      province,
      address,
      phone,
      description,
      images,
      openingTime,
      closingTime,
      floorNumbers,
      availableSeats,
      seatingTypes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Restaurant name is required" });
    }

    const ownerId = req.userId;

    if (!ownerId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const existingRestaurant = await Restaurant.findOne({ owner: ownerId });

    if (existingRestaurant) {
      return res.status(409).json({
        message: "An owner can only register one restaurant account",
      });
    }

    const newRestaurant = new Restaurant({
      owner: ownerId,
      name: name.trim(),
      cuisines,
      city,
      province,
      address,
      phone,
      description,
      images: images || [],
      openingTime,
      closingTime,
      floorNumbers: floorNumbers || [],
      availableSeats: availableSeats ?? 0,
      seatingTypes: seatingTypes || [],
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

    if (city) {
      query.city = { $regex: new RegExp(city as string, "i") };
    }

    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search as string, "i") } },
        { cuisines: { $regex: new RegExp(search as string, "i") } },
      ];
    }

    const restaurants = await Restaurant.find(query).sort({ rating: -1 });

    return res.status(200).json({
      count: restaurants.length,
      restaurants,
    });
  } catch (error) {
    console.error("Get All Restaurants Error:", error);
    return res.status(500).json({ message: "Error fetching restaurants" });
  }
};

export const getRestaurantById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id).populate(
      "owner",
      "name email phone ",
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    if (
      restaurant.isActive === false &&
      req.role !== "admin" &&
      String((restaurant.owner as any)?._id ?? restaurant.owner) !== req.userId
    ) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    return res.status(200).json({ restaurant });
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
    const { id } = req.params;

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

    const allowed = [
      "name",
      "cuisines",
      "city",
      "province",
      "address",
      "phone",
      "description",
      "images",
      "openingTime",
      "closingTime",
      "floorNumbers",
      "availableSeats",
      "seatingTypes",
      "isFeatured",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
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
    const { id } = req.params;

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

    await Restaurant.findByIdAndDelete(id);

    return res.status(200).json({ message: "Restaurant removed successfully" });
  } catch (error) {
    console.error("Delete Restaurant Error:", error);
    return res.status(500).json({ message: "Error deleting restaurant" });
  }
};

export const getFeaturedRestaurants = async (req: AuthRequest, res: Response) => {
  try {
    const restaurants = await Restaurant.find({
      isFeatured: true,
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    });
    return res.status(200).json({
      success: true,
      restaurants,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Error fetching featured restaurants",
    });
  }
};
