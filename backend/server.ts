import cors from "cors";
import "dotenv/config";
import express, { Request, Response } from "express";
import connectDB from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import notifictionRoutes from "./routes/notificationRoutes.js";
import restaurantRoutes from "./routes/restaurantRouters.js";
import uploadRoutes from "./routes/uploadRoutes.js"
import favoriteRoutes from "./routes/favoriteRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();

// DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// APIs
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notifictionRoutes);
app.use("/api/reviews", reviewRoutes);
const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Server is Live!");
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
