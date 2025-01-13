import { Request, Response, NextFunction } from "express";
import { DynamoDB } from "aws-sdk";
import { config } from "../../config/index.js";
import { TIER_LIMITS, Tier } from "../../types/index.js";

const dynamoDB = new DynamoDB.DocumentClient();

interface UsageRecord {
  userId: string;
  timestamp: number;
  endpoint: string;
  tier: string;
  operation: string;
}

export const trackUsage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Add response listener to track after request completes
  res.on("finish", async () => {
    try {
      const userId = req.auth.userId;
      if (!userId) {
        console.warn("No user ID found in request");
        return;
      }

      // Get user's tier from Clerk metadata
      const userTier =
        (req.auth.sessionClaims?.metadata?.tier as Tier) || "free";

      const usageRecord: UsageRecord = {
        userId,
        timestamp: startTime,
        endpoint: req.path,
        tier: userTier,
        operation: req.method,
      };

      await dynamoDB
        .put({
          TableName: "pr-service-usage",
          Item: usageRecord,
        })
        .promise();

      // Check usage limits
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
      const monthlyUsage = usageData.Items?.length || 0;

      const usageLimit = TIER_LIMITS[userTier];

      if (monthlyUsage >= usageLimit) {
        console.warn(
          `User ${userId} has exceeded their ${userTier} tier limit`
        );
        // You might want to notify the user or take other actions
      }
    } catch (error) {
      console.error("Error tracking usage:", error);
      // Don't fail the request if usage tracking fails
    }
  });

  next();
};
