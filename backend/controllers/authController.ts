import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Booking from "../models/Booking.js";
import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";
import {
  EMAIL_REGEX,
  PAKISTANI_PHONE_REGEX,
  PASSWORD_MESSAGE,
  PASSWORD_REGEX,
  normalizePhone,
  parseDob,
} from "../utils/validation.js";
import { deleteUserCascade } from "../utils/cascade.js";

const createToken = (userId: string, role: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");

  return jwt.sign({ userId, role }, secret, { expiresIn: "7d" });
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, dob, phone, address, password } =
      req.body;
    const requestedRole = req.body.role ?? "customer";

    if (!firstName || !lastName || !email || !dob || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email address" });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!PAKISTANI_PHONE_REGEX.test(normalizedPhone)) {
      return res.status(400).json({
        message: "Please enter a valid Pakistani phone number",
      });
    }

    if (typeof password !== "string" || !PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ message: PASSWORD_MESSAGE });
    }

    if (!["customer", "restaurant", "admin"].includes(requestedRole)) {
      return res.status(400).json({ message: "Invalid account role" });
    }

    const parsedDob = parseDob(dob);
    if (!parsedDob) {
      return res.status(400).json({
        message:
          "Date of birth must be a valid date in YYYY-MM-DD or DD-MM-YYYY format",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (existingUser?.email === normalizedEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }
    if (existingUser && String(existingUser.phone) === normalizedPhone) {
      return res
        .status(409)
        .json({ message: "Phone number already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      dob: parsedDob,
      phone: normalizedPhone,
      role: requestedRole,
      address: address,
      password: hashedPassword,
    });

    const { password: _password, ...safeUser } = user.toObject();

    return res.status(201).json({
      message: "Account created successfully",
      user: safeUser,
    });
  } catch (error: any) {
    console.error("Signup error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Email or phone number already registered",
      });
    }

    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken(user._id.toString(), user.role);
    const { password: _password, ...safeUser } = user.toObject();
    const restaurantExists = await Restaurant.findOne({ owner: user._id });
    return res.status(200).json({
      message: "Login successful",
      token,
      user: safeUser,
      hasRestaurant: !!restaurantExists,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateAccount = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      firstName,
      lastName,
      phone,
      address,
      dob,
      currentPassword,
      newPassword,
      avatar,
    } = req.body;

    // Simple profile fields
    if (firstName !== undefined) {
      if (typeof firstName !== "string" || !firstName.trim()) {
        return res.status(400).json({ message: "First name cannot be empty" });
      }
      user.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (typeof lastName !== "string" || !lastName.trim()) {
        return res.status(400).json({ message: "Last name cannot be empty" });
      }
      user.lastName = lastName.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return res.status(400).json({ message: "Phone cannot be empty" });
      }
      user.phone = phone.trim();
    }

    if (address !== undefined) {
      user.address = String(address).trim();
    }

    if (dob !== undefined) {
      const date = new Date(dob);
      if (Number.isNaN(date.getTime()) || date > new Date()) {
        return res.status(400).json({ message: "Invalid date of birth" });
      }
      user.dob = date;
    }

    const changingPassword = newPassword !== undefined;

    if (changingPassword) {
      if (!currentPassword || !(await user.comparePassword(currentPassword))) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }
    }

    if (changingPassword) {
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return res
          .status(400)
          .json({ message: "New password must be at least 8 characters" });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }
    if (avatar !== undefined) {
      const prefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;

      if (avatar === "") {
        user.set("avatar", undefined);
      } else if (typeof avatar !== "string" || !avatar.startsWith(prefix)) {
        return res.status(400).json({ message: "Invalid profile image" });
      } else {
        user.avatar = avatar;
      }
    }

    await user.save();

    const { password: _password, ...safeUser } = user.toObject();
    return res.status(200).json({ message: "Account updated", user: safeUser });
  } catch (error: any) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern ?? {})[0] ?? "field";
      return res
        .status(409)
        .json({ message: `That ${field} is already in use` });
    }
    console.error("Update account error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
 
    if (!password || typeof password !== "string") {
      return res
        .status(400)
        .json({ message: "Password is required to delete your account" });
    }
 
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
 
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Incorrect password" });
    }
 
    if (user.role === "restaurant") {
      const owned = await Restaurant.countDocuments({ owner: user._id });
      if (owned > 0) {
        return res.status(400).json({
          message: "Remove your restaurants before deleting your account",
        });
      }
    }
 
    // Bookings, reviews (ratings recalculated) and notifications.
    // Favorites live on the user document, so they go with it.
    await deleteUserCascade(user._id);
    await user.deleteOne();
 
    return res.status(200).json({ message: "Account deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
