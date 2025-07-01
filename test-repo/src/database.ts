import mongoose from "mongoose";
import { logger } from "./utils/logger";

const DEFAULT_DB_URL = "mongodb://localhost:27017/test-app";
const DB_URL = process.env.DATABASE_URL || DEFAULT_DB_URL;

export async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(DB_URL, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info("Connected to MongoDB successfully");
  } catch (error) {
    logger.error("Database connection failed:", error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  } catch (error) {
    logger.error("Database disconnection failed:", error);
    throw error;
  }
}

// Handle connection events
mongoose.connection.on("error", (error) => {
  logger.error("MongoDB connection error:", error);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected");
});
