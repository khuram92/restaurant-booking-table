import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10, // 10 login attempts / 15 min / IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10, // 10 signups / hour / IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many signup attempts. Please try again later." },
});