// controllers/bookingController.ts
import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware.js";
import Booking from "../models/Booking.js";
import Restaurant from "../models/Restaurant.js";
import { notifyAdminsOfNewBooking } from "../utils/bookingEmails.js";
import {
  notifyBookingCancelled,
  notifyBookingCreated,
  notifyBookingDecision,
} from "../utils/bookingNotifications.js";
import {
  getBookingStart,
  getCalendarDay,
  getDayRange,
  isWithinOpeningHours,
  parseTimeToMinutes,
  toDayStart,
} from "../utils/bookingTime.js";
import { getParam } from "../utils/validation.js";

const MAX_GUESTS = 500;
const MAX_REQUEST_LENGTH = 1000;

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId, date, time, guests, seatingType, request, floor } =
      req.body;

    // floor can legitimately be 0 (ground floor), so don't use !floor
    const hasFloor =
      floor !== undefined && floor !== null && String(floor).trim() !== "";

    if (!date || !time || !guests || !seatingType || !hasFloor) {
      return res.status(400).json({
        message: "Date, time, guests, floor, and seating type are required",
      });
    }
    if (typeof date !== "string" || typeof time !== "string") {
      return res.status(400).json({ message: "Invalid date or time" });
    }
    if (parseTimeToMinutes(time) === null) {
      return res
        .status(400)
        .json({ message: "Time must look like 19:30 or 7:30 PM" });
    }
    if (typeof seatingType !== "string" || !seatingType.trim()) {
      return res.status(400).json({ message: "Invalid seating type" });
    }
    if (
      request !== undefined &&
      (typeof request !== "string" || request.length > MAX_REQUEST_LENGTH)
    ) {
      return res.status(400).json({
        message: `Request must be text of up to ${MAX_REQUEST_LENGTH} characters`,
      });
    }

    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return res
        .status(400)
        .json({ message: "Guests must be a whole number of at least 1" });
    }
    if (guestCount > MAX_GUESTS) {
      return res
        .status(400)
        .json({ message: `Guests can't be more than ${MAX_GUESTS}` });
    }

    const day = getCalendarDay(date);
    if (!day) {
      return res.status(400).json({ message: "Invalid date" });
    }

    if (!restaurantId || !mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant id" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    if (restaurant.isActive === false) {
      return res
        .status(400)
        .json({ message: "This restaurant is not accepting bookings" });
    }

    // Opening hours
    if (
      !isWithinOpeningHours(
        time,
        restaurant.openingTime,
        restaurant.closingTime,
      )
    ) {
      return res.status(400).json({
        message: `Restaurant is open ${restaurant.openingTime} to ${restaurant.closingTime}`,
      });
    }

    // Must be in the future (after-midnight slots count as the next day)
    const start = getBookingStart(date, time, {
      opening: restaurant.openingTime,
      closing: restaurant.closingTime,
    });
    if (!start || start.getTime() <= Date.now()) {
      return res
        .status(400)
        .json({ message: "Booking must be for a future date and time" });
    }

    // Floor and seating type must be ones this restaurant actually offers
    const floors = ((restaurant.floorNumbers as unknown[]) ?? []).map(String);
    if (floors.length && !floors.includes(String(floor))) {
      return res
        .status(400)
        .json({ message: "Invalid floor for this restaurant" });
    }
    const seatings = ((restaurant.seatingTypes as unknown[]) ?? []).map((s) =>
      String(s).toLowerCase(),
    );
    if (
      seatings.length &&
      !seatings.includes(seatingType.trim().toLowerCase())
    ) {
      return res
        .status(400)
        .json({ message: "Invalid seating type for this restaurant" });
    }

    // Per time-slot capacity (0 / unset availableSeats = no limit, as before)
    const bookingDate = toDayStart(day);
    const bookingTime = time.trim();

    if (restaurant.availableSeats) {
      if (guestCount > restaurant.availableSeats) {
        return res.status(400).json({
          message: `Only ${restaurant.availableSeats} seats available`,
        });
      }

      const { from, to } = getDayRange(day);
      const [taken] = await Booking.aggregate([
        {
          $match: {
            restaurant: restaurant._id,
            date: { $gte: from, $lt: to },
            time: bookingTime,
            status: { $in: ["pending", "confirmed"] },
          },
        },
        { $group: { _id: null, guests: { $sum: "$guests" } } },
      ]);

      const remaining = restaurant.availableSeats - (taken?.guests ?? 0);
      if (guestCount > remaining) {
        return res.status(400).json({
          message:
            remaining > 0
              ? `Only ${remaining} seats left for this time`
              : "This time is fully booked",
        });
      }
    }

    const booking = await Booking.create({
      customer: req.userId,
      restaurant: restaurant._id,
      date: bookingDate,
      time: bookingTime,
      guests: guestCount,
      seatingType: seatingType.trim(),
      floor: String(floor).trim(),
      request: request?.trim() || undefined,
    });
    void notifyBookingCreated({
      _id: booking._id,
      customer: req.userId as string,
      restaurant: restaurant._id,
      date: bookingDate,
      time: bookingTime,
      guests: guestCount,
    });
    const populated = await booking.populate(
      "restaurant",
      "name city province images address phone",
    );

    void notifyAdminsOfNewBooking({
      booking,
      restaurantName: restaurant.name,
      customerId: req.userId,
    });

    return res
      .status(201)
      .json({ message: "Booking created", booking: populated });
  } catch (error) {
    console.error("Booking error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await Booking.find({ customer: req.userId })
      .populate("restaurant", "name city province images address phone")
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({ bookings });
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// One of the logged-in customer's own bookings
export const getBookingById = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findOne({
      _id: id,
      customer: req.userId,
    }).populate("restaurant", "name city province images address phone");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json({ booking });
  } catch (error) {
    console.error("Fetch booking error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findOne({ _id: id, customer: req.userId });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "pending" && booking.status !== "confirmed") {
      return res
        .status(400)
        .json({ message: `Booking is already ${booking.status}` });
    }

    booking.status = "cancelled";
    await booking.save();
    void notifyBookingCancelled(booking);
    return res.status(200).json({ message: "Booking cancelled", booking });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// All bookings for restaurants owned by the logged-in user
export const getRestaurantBookings = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const owned = await Restaurant.find({ owner: req.userId }).select("_id");
    const restaurantIds = owned.map((r) => r._id);

    const filter: Record<string, unknown> = {
      restaurant: { $in: restaurantIds },
    };

    const allowed = [
      "pending",
      "confirmed",
      "rejected",
      "cancelled",
      "completed",
    ];
    if (
      typeof req.query.status === "string" &&
      allowed.includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .populate("customer", "firstName lastName phone")
      .populate("restaurant", "name")
      .sort({ date: 1, createdAt: -1 });

    return res.status(200).json({ bookings });
  } catch (error) {
    console.error("Restaurant bookings error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const OWNER_STATUSES = ["confirmed", "rejected", "completed"];

// What an owner may move a booking to, from its current status
const OWNER_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "rejected"],
  confirmed: ["completed"],
};

export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const { status } = req.body ?? {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }
    if (!OWNER_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be confirmed, rejected or completed" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Only the restaurant's owner may respond
    const restaurant = await Restaurant.findOne({
      _id: booking.restaurant,
      owner: req.userId,
    });
    if (!restaurant) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!OWNER_TRANSITIONS[booking.status]?.includes(status)) {
      return res.status(400).json({
        message: `A ${booking.status} booking can't be marked ${status}`,
      });
    }

    // A meal that hasn't happened yet can't be completed (it would unlock reviews).
    if (status === "completed") {
      const start = getBookingStart(booking.date, booking.time, {
        opening: restaurant.openingTime,
        closing: restaurant.closingTime,
      });
      if (start && start.getTime() > Date.now()) {
        return res.status(400).json({
          message: "A booking can't be completed before its start time",
        });
      }
    }

    booking.status = status;
    await booking.save();

    void notifyBookingDecision(booking, status);

    return res.status(200).json({ message: `Booking ${status}`, booking });
  } catch (error) {
    console.error("Update booking status error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Owner deletes a rejected or cancelled booking made at their restaurant
export const deleteBookingByOwner = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Only the restaurant's owner may delete it
    const restaurant = await Restaurant.findOne({
      _id: booking.restaurant,
      owner: req.userId,
    });
    if (!restaurant) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (booking.status !== "rejected" && booking.status !== "cancelled") {
      return res.status(400).json({
        message: "Only rejected or cancelled bookings can be deleted",
      });
    }

    await booking.deleteOne();

    return res.status(200).json({ message: "Booking deleted" });
  } catch (error) {
    console.error("Delete booking error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
