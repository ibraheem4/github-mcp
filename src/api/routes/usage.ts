import express, { Request, Response } from "express";
import { DynamoDB } from "aws-sdk";
import { config } from "../../config/index.js";
import { TIER_LIMITS, Tier, UsageMetrics } from "../../types/index.js";

export const router = express.Router();
const dynamoDB = new DynamoDB.DocumentClient();

// Get usage metrics for the current user
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const userId = req.auth.userId;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Not authenticated",
      });
    }

    // Get current month's usage
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const usageParams = {
      TableName: "pr-service-usage",
      KeyConditionExpression: "userId = :userId AND #ts >= :start",
      ExpressionAttributeNames: {
        "#ts": "timestamp",
      },
      ExpressionAttributeValues: {
        ":userId": userId,
        ":start": monthStart.getTime(),
      },
    };

    const usageData = await dynamoDB.query(usageParams).promise();
    const monthlyUsage = usageData.Items || [];

    // Get user's tier from Clerk metadata
    const userTier = (req.auth.sessionClaims?.metadata?.tier as Tier) || "free";
    const usageLimit = TIER_LIMITS[userTier];

    // Calculate usage by endpoint
    const usageByEndpoint = monthlyUsage.reduce(
      (acc: { [key: string]: number }, item: any) => {
        const endpoint = item.endpoint;
        acc[endpoint] = (acc[endpoint] || 0) + 1;
        return acc;
      },
      {}
    );

    // Get usage history (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const historyParams = {
      TableName: "pr-service-usage",
      KeyConditionExpression: "userId = :userId AND #ts >= :start",
      ExpressionAttributeNames: {
        "#ts": "timestamp",
      },
      ExpressionAttributeValues: {
        ":userId": userId,
        ":start": sixMonthsAgo.getTime(),
      },
    };

    const historyData = await dynamoDB.query(historyParams).promise();
    const usageHistory = historyData.Items || [];

    // Group history by month
    const monthlyHistory = usageHistory.reduce(
      (acc: { [key: string]: number }, item: any) => {
        const date = new Date(item.timestamp);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        acc[monthKey] = (acc[monthKey] || 0) + 1;
        return acc;
      },
      {}
    );

    const metrics: UsageMetrics = {
      currentUsage: monthlyUsage.length,
      usageLimit,
      remainingUsage: Math.max(usageLimit - monthlyUsage.length, 0),
      usageByEndpoint,
      monthlyHistory,
      tier: userTier,
    };

    res.json({
      status: "success",
      data: metrics,
    });
  } catch (error) {
    console.error("Error fetching usage metrics:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch usage metrics",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Get billing information from Clerk organization metadata
router.get("/billing", async (req: Request, res: Response) => {
  try {
    const userId = req.auth.userId;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Not authenticated",
      });
    }

    // Get organization data from Clerk session claims
    const orgId = req.auth.sessionClaims?.org_id;
    if (!orgId) {
      return res.status(404).json({
        status: "error",
        message: "No organization found",
      });
    }

    // Get subscription data from organization metadata
    const subscriptionData = req.auth.sessionClaims?.org_metadata?.subscription;
    if (!subscriptionData) {
      return res.status(404).json({
        status: "error",
        message: "No subscription data found",
      });
    }

    res.json({
      status: "success",
      data: {
        subscription: subscriptionData,
      },
    });
  } catch (error) {
    console.error("Error fetching billing information:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch billing information",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
