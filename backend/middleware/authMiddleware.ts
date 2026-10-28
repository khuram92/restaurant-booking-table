import "dotenv/config";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Single, unified interface extending Express Request
export interface AuthRequest extends Request {
  userId?: string;
  role?: string;
}

// Fail at startup instead of turning every request into "invalid token".
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

const getToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
};

/** Verifies the token and returns the user's id, or null if it is not valid. */
const verifyToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as { userId?: unknown };
    return typeof decoded.userId === "string" ? decoded.userId : null;
  } catch {
    return null;
  }
};

/**
 * Requires a valid token AND an existing user.
 * The role is read from the database, not the token, so deleted users and
 * role changes (e.g. an admin demoted) take effect immediately.
 */
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }

  try {
    const user = await User.findById(userId).select("role");
    if (!user) {
      return res
        .status(401)
        .json({ message: "Not authorized, account no longer exists" });
    }

    req.userId = userId;
    req.role = user.role;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * For public routes that behave differently for logged-in users
 * (e.g. GET /restaurants/:id lets the owner or an admin see a disabled one).
 * Never blocks: with no token or a bad token the request continues as anonymous.
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const token = getToken(req);
  const userId = token ? verifyToken(token) : null;

  if (userId) {
    try {
      const user = await User.findById(userId).select("role");
      if (user) {
        req.userId = userId;
        req.role = user.role;
      }
    } catch (error) {
      console.error("Optional auth error:", error);
    }
  }
  next();
};

/** Use after protect: router.use(protect, authorize("admin")) */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (!req.role || !roles.includes(req.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};