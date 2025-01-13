interface Config {
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  clerk: {
    secretKey: string;
    publishableKey: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
    priceIds: {
      developer: string;
      team: string;
      enterprise: string;
    };
  };
  github: {
    appId: string;
    privateKey: string;
    webhookSecret: string;
  };
}

// In production, these would be loaded from environment variables
export const config: Config = {
  aws: {
    region: process.env.AWS_REGION || "us-west-2",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY || "",
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    priceIds: {
      developer: process.env.STRIPE_PRICE_ID_DEVELOPER || "",
      team: process.env.STRIPE_PRICE_ID_TEAM || "",
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || "",
    },
  },
  github: {
    appId: process.env.GITHUB_APP_ID || "",
    privateKey: process.env.GITHUB_PRIVATE_KEY || "",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
  },
};
