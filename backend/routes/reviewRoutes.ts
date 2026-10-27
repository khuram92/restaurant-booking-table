import { Router } from "express";
import {
  createReview,
  deleteReview,
  getMyReviews,
  getRestaurantReviews,
  replyToReview,
  updateReview,
} from "../controllers/reviewController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

// Public: anyone can read a restaurant's reviews
router.get("/restaurant/:restaurantId", getRestaurantReviews);

// Everything below needs a login
router.use(protect);

router.get("/mine", getMyReviews);
router.post("/", createReview);
router.patch("/:id", updateReview);
router.put("/:id/reply", authorize("restaurant", "admin"), replyToReview);
router.delete("/:id", deleteReview);

export default router;