import { Router } from "express";
import {
  createRestaurant,
  deleteRestaurant,
  getAllRestaurants,
  getFeaturedRestaurants,
  getMyRestaurant,
  getRestaurantById,
  updateRestaurant,
} from "../controllers/restaurantController.js";
import {
  authorize,
  optionalAuth,
  protect,
} from "../middleware/authMiddleware.js";

const router = Router();

router.get("/mine", protect, authorize("restaurant", "admin"), getMyRestaurant);

// Public routes
router.get("/featured", getFeaturedRestaurants);
router.get("/", getAllRestaurants);

router.get("/:id", optionalAuth, getRestaurantById);

router.post("/", protect, authorize("restaurant", "admin"), createRestaurant);

router.put("/:id", protect, authorize("restaurant", "admin"), updateRestaurant);
router.delete(
  "/:id",
  protect,
  authorize("restaurant", "admin"),
  deleteRestaurant,
);

export default router;
