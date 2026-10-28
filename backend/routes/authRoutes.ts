// routes/authRoutes.ts
import { Router } from "express";
import {
  deleteAccount,
  getMe,
  login,
  signup,
  updateAccount,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { loginLimiter, signupLimiter } from "../middleware/limiterMiddleware.js";
;

const router = Router();

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateAccount);
router.delete("/me", protect, deleteAccount);

export default router; 