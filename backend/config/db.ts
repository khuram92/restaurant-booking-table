import "dotenv/config"; // so MONGO_URI is set no matter what order files are imported in
import mongoose from "mongoose";

let listenersAttached = false;

const attachListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  // After the first connect, drops and errors would otherwise go unnoticed.
  mongoose.connection.on("error", (error) =>
    console.error("MongoDB error:", error),
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("MongoDB disconnected"),
  );
  mongoose.connection.on("reconnected", () =>
    console.log("MongoDB reconnected"),
  );

  // Close the connection cleanly when the process is stopped or redeployed.
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, closing MongoDB connection`);
    await mongoose.connection.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
};

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error("MONGO_URI is not defined in .env");
    }

    attachListeners();

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10_000, // fail fast on a wrong URI / blocked IP
      maxPoolSize: 10,
    });

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;