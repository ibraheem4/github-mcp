# GitHub PR MCP Server

An enhanced GitHub Pull Request management server built on the Model Context Protocol (MCP). This server extends the base @modelcontextprotocol/server-github functionality with rich PR creation features, providing a more structured and comprehensive pull request workflow.

## Overview

This MCP server enhances GitHub pull request management by providing:
- Structured PR templates with predefined sections
- Rich media attachment support
- Automated quality checklists
- Advanced issue linking and tracking
- Seamless integration with existing GitHub workflows

## Features

- 🔄 Complete Base Server Compatibility
  - Create PRs with required fields (owner, repo, title, head, base)
  - Optional fields support (body, draft, maintainer_can_modify)
  - List and update PRs with matching schemas

- 🚀 Enhanced PR Creation
  - Structured PR templates with sections:
    - Overview
    - Key Changes
    - Code Highlights
    - Testing Details
  - Checklist items for PR quality
  - Media attachments support
  - Labels, reviewers, and assignees management
  - Issue linking and tagging

## Prerequisites

- Node.js 18+
- GitHub Personal Access Token with repo scope
- Pull request template file at `.github/pull_request_template.md` (example below)

### Example PR Template

Create `.github/pull_request_template.md` with sections that match the enhanced PR features:

```markdown
## Overview

Summarize the purpose and scope of this PR.

---

## Key Changes

List the key changes made in this PR.

---

## Code Highlights

Identify important code sections that reviewers should focus on.

---

## Testing

Outline testing approach and results.

---

## Links

Include relevant links and references.

---

## Additional Notes

Provide any extra context or notes for reviewers.

---

### Issue Tagging

Link related issues here.

---
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cline-github-mcp.git
   cd cline-github-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Required for GitHub API access
GITHUB_TOKEN=your_github_personal_access_token
```

## Usage

### Running the Server

Start the MCP server:
```bash
npm start
```

For development:
```bash
npm run dev
```

### MCP Server Configuration

This enhanced GitHub PR server can run alongside the base GitHub server in various environments. Here's how to configure each:

#### Claude Desktop

1. Open Claude Desktop settings:
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Add both servers to the configuration:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_TOKEN": "your_github_personal_access_token"
         }
       },
       "github-pr": {
         "command": "node",
         "args": ["/path/to/cline-github-mcp/build/index.js"],
         "env": {
           "GITHUB_TOKEN": "your_github_personal_access_token"
         }
       }
     }
   }
   ```

#### VSCode (Cline Extension)

1. Open VSCode settings:
   - Mac: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Windows: `%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Linux: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

2. Add both servers to the configuration:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_TOKEN": "your_github_personal_access_token"
         }
       },
       "github-pr": {
         "command": "node",
         "args": ["/path/to/cline-github-mcp/build/index.js"],
         "env": {
           "GITHUB_TOKEN": "your_github_personal_access_token"
         }
       }
     }
   }
   ```

#### VSCode (Roo Cline Extension)

1. Open Roo Cline settings:
   - Mac: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
   - Windows: `%APPDATA%/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
   - Linux: `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

2. Add both servers to the configuration:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_TOKEN": "your_github_personal_access_token"
         }
       },
       "github-pr": {
         "command": "node",
         "args": ["/path/to/cline-github-mcp/build/index.js"],
         "env": {
           "GITHUB_TOKEN": "your_github_personal_access_token"
         }
       }
     }
   }
   ```

3. Restart your application after making changes

Note: Both servers can run simultaneously in all environments. The base `github` server provides standard GitHub operations, while the `github-pr` server adds enhanced PR creation features. You can use either server based on your needs - use the base server for simple operations or the enhanced server when you need rich PR features.

### Available Tools

#### create_pull_request
Create a new pull request with enhanced features
```typescript
{
  // Required fields (base compatibility)
  owner: string;
  repo: string;
  title: string;
  head: string;
  base: string;

  // Optional fields (base compatibility)
  body?: string;
  draft?: boolean;
  maintainer_can_modify?: boolean;

  // Enhanced features
  overview?: string;
  keyChanges?: string[];
  codeHighlights?: string[];
  testing?: string[];
  links?: Array<{ title: string; url: string }>;
  additionalNotes?: string;
  issueIds?: string[];
  checklist?: {
    adhereToConventions?: boolean;
    testsIncluded?: boolean;
    documentationUpdated?: boolean;
    changesVerified?: boolean;
    screenshotsAttached?: boolean;
  };
  attachments?: Array<{
    type: "image" | "video" | "diagram";
    alt: string;
    url: string;
    width?: number;
  }>;
  labels?: string[];
  reviewers?: string[];
  assignees?: string[];
}
```

#### list_pull_requests
List pull requests in a repository
```typescript
{
  owner: string;    // Required
  repo: string;     // Required
  state?: "open" | "closed" | "all";
}
```

#### update_pull_request
Update an existing pull request
```typescript
{
  owner: string;       // Required
  repo: string;       // Required
  pull_number: number; // Required
  title?: string;
  body?: string;
  state?: "open" | "closed";
}
```

## Development

### Directory Structure

```
src/
├── index.ts           # Main MCP server implementation
├── api/              # API routes and middleware
├── config/           # Configuration
└── types/            # TypeScript type definitions
```

### Adding New Features

1. Define types in `src/types/index.ts`
2. Update server implementation in `src/index.ts`
3. Add new tool handlers in the GitHubServer class
4. Update documentation

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- GitHub account with personal access token

### Local Development
1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Run tests:
```bash
npm test
```

### Testing
- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:integration`
- Test coverage: `npm run test:coverage`

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your GitHub token has the required permissions
   - Ensure the token is correctly set in your environment
   - Check token expiration date

2. **Build Issues**
   - Clear the build directory: `rm -rf build/`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`
   - Verify TypeScript version compatibility

3. **Runtime Errors**
   - Check logs for detailed error messages
   - Verify all required environment variables are set
   - Ensure compatible Node.js version

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=github-pr-mcp:* npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Create a Pull Request

## License

MIT License - see LICENSE file for details
