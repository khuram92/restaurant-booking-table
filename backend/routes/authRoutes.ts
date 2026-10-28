// routes/authRoutes.ts
import { Router } from "express";
import {
  deleteAccount,
  forgotPassword,
  getMe,
  login,
  resetPassword,
  signup,
  updateAccount,
  verifyOtp,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  loginLimiter,
  signupLimiter,
} from "../middleware/limiterMiddleware.js";
const router = Router();
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateAccount);
router.delete("/me", protect, deleteAccount);

export default router;
