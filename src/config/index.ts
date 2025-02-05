interface Config {
  github: {
    appId: string;
    privateKey: string;
    webhookSecret: string;
  };
  linear: {
    apiKey: string;
  };
}

// In production, these would be loaded from environment variables
export const config: Config = {
  github: {
    appId: process.env.GITHUB_APP_ID || "",
    privateKey: process.env.GITHUB_PRIVATE_KEY || "",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
  },
  linear: {
    apiKey: process.env.LINEAR_API_KEY || "",
  },
};
