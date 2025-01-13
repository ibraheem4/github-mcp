# GitHub PR Management Service

A scalable SaaS service that provides advanced GitHub Pull Request management capabilities through a REST API. Built on top of the Model Context Protocol (MCP) server.

## Features

- 🔄 Advanced PR Management
  - Create PRs with structured templates
  - List and filter PRs
  - Update PR status and content
- 👥 User Management
  - Authentication & Authorization
  - Role-based access control
- 📊 Usage Tracking
  - Per-user usage metrics
  - Monthly usage history
  - Endpoint-specific analytics
- 💳 Subscription Tiers
  - Free tier: 50 operations/month
  - Developer tier: 500 operations/month
  - Team tier: 2000 operations/month
  - Enterprise tier: Unlimited operations

## Prerequisites

- Node.js 18+
- AWS Account with appropriate permissions
- GitHub OAuth App credentials
- Stripe account for billing

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# AWS Configuration
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# GitHub Configuration
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Clerk Configuration
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_ID_DEVELOPER=your_developer_price_id
STRIPE_PRICE_ID_TEAM=your_team_price_id
STRIPE_PRICE_ID_ENTERPRISE=your_enterprise_price_id

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Authentication

This service uses [Clerk](https://clerk.dev) for authentication and user management. To set up authentication:

1. Create a Clerk application at https://dashboard.clerk.dev
2. Configure your application settings
3. Add the Clerk environment variables to your `.env` file
4. Users will be automatically assigned the "free" tier upon signup
5. Use the Clerk Dashboard to manage users and assign different tiers

### User Tiers

User tiers are stored in Clerk's user metadata with the following structure:

```json
{
  "tier": "free | developer | team | enterprise"
}
```

You can update a user's tier through the Clerk Dashboard or using the Clerk Admin API.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/github-pr-service.git
   cd github-pr-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Start the server:
   ```bash
   npm start
   ```

For development:
```bash
npm run dev
```

## API Documentation

### Authentication

All API endpoints require a valid Clerk session token in the Authorization header:

```
Authorization: Bearer your_clerk_session_token
```

You can obtain this token using Clerk's frontend SDKs or the Clerk API.

### Endpoints

#### Pull Requests

- POST `/api/v1/pull-requests/create`
  - Create a new PR
  - Body:
    ```json
    {
      "owner": "string",
      "repo": "string",
      "title": "string",
      "head": "string",
      "base": "string",
      "overview": "string",
      "keyChanges": ["string"],
      "codeHighlights": ["string"],
      "testing": ["string"],
      "links": [{"title": "string", "url": "string"}],
      "additionalNotes": "string",
      "issueIds": ["string"]
    }
    ```

- GET `/api/v1/pull-requests/list`
  - List PRs
  - Query params: `owner`, `repo`, `state`

- PATCH `/api/v1/pull-requests/:pullNumber`
  - Update PR
  - Body: `{ owner, repo, title?, body?, state? }`

#### Usage & Billing

- GET `/api/v1/usage/metrics`
  - Get usage metrics for current user

- GET `/api/v1/usage/billing`
  - Get billing information

## AWS Infrastructure

The service uses the following AWS services:

- API Gateway: REST API endpoints
- Lambda: Serverless functions
- DynamoDB: User data, usage tracking
- CloudWatch: Monitoring and logging
- IAM: Access management
- S3: Static assets and backups

## Development

### Directory Structure

```
src/
├── api/
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── usage.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── pullRequests.ts
│   │   └── usage.ts
│   └── index.ts
├── config/
│   └── index.ts
└── types/
    └── index.ts
```

### Adding New Features

1. Define types in `src/types/index.ts`
2. Add configuration in `src/config/index.ts`
3. Create new routes in `src/api/routes/`
4. Update tests and documentation

## Deployment

1. Set up AWS infrastructure using Terraform:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. Configure CI/CD pipeline (GitHub Actions example provided)

3. Deploy to production:
   ```bash
   npm run deploy:prod
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
