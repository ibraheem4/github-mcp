import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";
import { trackUsage } from "./middleware/usage.js";
import * as pullRequestRoutes from "./routes/pullRequests.js";
import * as usageRoutes from "./routes/usage.js";

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Clerk authentication middleware
app.use(ClerkExpressWithAuth());

// Routes with authentication and usage tracking
app.use("/api/v1/pull-requests", trackUsage, pullRequestRoutes.router);
app.use("/api/v1/usage", trackUsage, usageRoutes.router);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
