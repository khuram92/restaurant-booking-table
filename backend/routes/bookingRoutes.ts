// routes/bookingRoutes.ts
import { Router } from "express";
import {
  cancelBooking,
  createBooking,
  deleteBookingByOwner,
  getBookingById,
  getMyBookings,
  getRestaurantBookings,
  updateBookingStatus,
} from "../controllers/bookingController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();


router.post("/", protect, createBooking);
router.get("/", protect, getMyBookings);
router.patch("/:id/cancel", protect, cancelBooking);


router.get("/restaurant", protect, authorize("restaurant", "admin"), getRestaurantBookings);
router.patch("/:id/status", protect, authorize("restaurant", "admin"), updateBookingStatus);
router.delete("/:id", protect, authorize("restaurant", "admin"), deleteBookingByOwner);

// Keep this LAST: "/:id" would otherwise swallow "/restaurant"
router.get("/:id", protect, getBookingById);

export default router;