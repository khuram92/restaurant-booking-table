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
import { authorize, protect } from "../middleware/authMiddleware.js";
const router = Router();
// Owner-specific protected route (Must come before /:id in Express execution)
router.get("/mine", protect, authorize("restaurant", "admin"), getMyRestaurant);
// Public Routes
router.get("/featured", getFeaturedRestaurants);
router.get("/", getAllRestaurants);
router.get("/:id", getRestaurantById);
// Admin / Owner protected routes
router.post("/", protect, authorize("restaurant", "admin"), createRestaurant);
router.put("/:id", protect, authorize("restaurant", "admin"), updateRestaurant);
router.delete(
  "/:id",
  protect,
  authorize("restaurant", "admin"),
  deleteRestaurant,
);

export default router;
