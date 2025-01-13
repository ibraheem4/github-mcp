import { Request } from "express";
import { ClerkRequest } from "@clerk/clerk-sdk-node";

export type Tier = "free" | "developer" | "team" | "enterprise";

// Extend Express Request with Clerk types
declare global {
  namespace Express {
    interface Request extends ClerkRequest {}
  }
}

export interface UsageRecord {
  userId: string;
  timestamp: number;
  endpoint: string;
  tier: string;
  operation: string;
}

export interface BillingRecord {
  userId: string;
  tier: string;
  status: "active" | "inactive" | "past_due";
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

// API Request Types
export interface CreatePRBody {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  head: string;
  base: string;
  overview?: string;
  keyChanges?: string[];
  codeHighlights?: string[];
  testing?: string[];
  links?: Array<{ title: string; url: string }>;
  additionalNotes?: string;
  issueIds?: string[];
}

// API Response Types
export interface APIResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
  error?: string;
}

export interface UsageMetrics {
  currentUsage: number;
  usageLimit: number;
  remainingUsage: number;
  usageByEndpoint: { [key: string]: number };
  monthlyHistory: { [key: string]: number };
  tier: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  tier: string;
  metadata?: Record<string, any>;
}

// Constants
export const TIER_LIMITS: Record<Tier, number> = {
  free: 50,
  developer: 500,
  team: 2000,
  enterprise: Infinity,
};
