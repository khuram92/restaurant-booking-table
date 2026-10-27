import { Router } from "express";
import {
  getAdminStats,
  getAllBookings,
  getAllRestaurants,
  getAllUsers,
  setRestaurantActive,
  toggleFeatured,
} from "../controllers/adminController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

// Everything below is admin-only
router.use(protect, authorize("admin"));

router.get("/stats", getAdminStats);
router.get("/users", getAllUsers);
router.get("/restaurants", getAllRestaurants);
router.get("/bookings", getAllBookings);
router.patch("/restaurants/:id/active", setRestaurantActive);
router.patch("/:id/featured", toggleFeatured);

export default router;
