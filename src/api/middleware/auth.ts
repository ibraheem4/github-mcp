import { Request, Response, NextFunction } from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { config } from "../../config/index.js";

// Use Clerk's middleware for authentication
export const authenticateToken = ClerkExpressRequireAuth({
  // Optional configuration
  onError: (err, req, res) => {
    console.error("Clerk Auth Error:", err);
    res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  },
});

// Helper to get user tier from metadata
export const getUserTier = (req: Request): string => {
  const user = req.auth.userId;
  // In production, you would fetch the user's metadata from Clerk
  // to determine their subscription tier
  return "free"; // Default to free tier
};
