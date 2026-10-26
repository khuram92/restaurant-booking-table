import { Router } from "express";
import {
  createReview,
  getRestaurantReviews,
} from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();


router.get("/restaurant/:restaurantId", getRestaurantReviews);
router.post("/", protect, createReview);

export const reviewRoutes = router;
