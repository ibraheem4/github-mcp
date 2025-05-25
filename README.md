# Linear-GitHub Bridge MCP Server

A comprehensive MCP (Model Context Protocol) server that bridges Linear project management with GitHub repositories, providing intelligent issue triage, bidirectional synchronization, and seamless pull request workflows.

## Overview

This server provides a sophisticated interface between Linear issues and GitHub repositories, with intelligent triage to ensure engineering issues go to GitHub (for Copilot agent integration) while business/product issues stay in Linear for optimal workflow management.

## Core Philosophy

- **Intelligent Triage**: Automatically categorize issues as engineering vs business/product
- **Copilot Optimization**: Engineering issues on GitHub for AI agent integration
- **Workflow Focused**: Optimized for feature development, release management, and issue management
- **Bidirectional Sync**: Seamless issue synchronization between platforms
- **Comprehensive Toolset**: Full issue lifecycle management across both platforms

## Features

### 🔗 Linear Integration
- **Issue Management**: Full CRUD operations for Linear issues
- **Team Management**: List and work with Linear teams
- **Rich Metadata**: Support for priorities, assignees, labels, and status tracking

### 🐙 GitHub Integration  
- **Issue Management**: Complete GitHub issue lifecycle management
- **Repository Integration**: Work with any GitHub repository
- **Label & Assignee Support**: Full metadata synchronization

### 🧠 Intelligent Triage
- **Automatic Classification**: AI-powered analysis of issue content
- **Engineering Detection**: Identifies code, bugs, features, performance issues
- **Business Detection**: Recognizes strategy, design, process, customer issues
- **Confidence Scoring**: Provides reasoning and confidence levels
- **Label Suggestions**: Recommends appropriate labels for each platform

### 🔄 Bidirectional Synchronization
- **Cross-Platform Sync**: Create corresponding issues on either platform
- **Context Preservation**: Maintains links between synchronized issues
- **Flexible Sync Modes**: One-way or bidirectional synchronization
- **Metadata Mapping**: Intelligent translation of labels and assignees

### 🚀 Pull Request Management
- **Feature PR Creation**: Automatically create feature branches and PRs from Linear issues
- **Release PR Creation**: Generate release PRs with change summaries from dev to main
- **Rich PR Descriptions**: Generate comprehensive PR descriptions from Linear issue details
- **Linear Issue Tracking**: Identify and link all Linear issues addressed in releases

## Prerequisites

- Node.js 18+
- GitHub Personal Access Token with repo scope
- Linear API Key

## Installation

### NPX (Recommended)
```bash
# Set required environment variables
export GITHUB_TOKEN=your_github_personal_access_token
export LINEAR_API_KEY=your_linear_api_key

# Run the server
npx @ibraheem4/github-mcp
```

### Local Development
```bash
git clone https://github.com/ibraheem4/github-mcp.git
cd github-mcp
npm install
npm run build
```

## Configuration

### Claude Desktop
Add to your `claude_desktop_config.json`:

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
    "linear-github-bridge": {
      "command": "npx", 
      "args": ["-y", "@ibraheem4/github-mcp"],
      "env": {
        "GITHUB_TOKEN": "your_github_personal_access_token",
        "LINEAR_API_KEY": "your_linear_api_key"
      }
    }
  }
}
```

### Environment Variables
```env
# Required for GitHub API access
GITHUB_TOKEN=your_github_personal_access_token

# Required for Linear API access  
LINEAR_API_KEY=your_linear_api_key
```

## Available Tools

### Issue Triage Tools

#### 1. triage_issue
Analyze an issue and determine the optimal platform (GitHub for engineering, Linear for business).

```typescript
{
  title: string;        // Issue title
  description: string;  // Issue description  
  labels?: string[];    // Existing labels (optional)
}
```

**Example Usage:**
```json
{
  "title": "API endpoint returning 500 error",
  "description": "The /api/users endpoint is consistently returning 500 errors when fetching user data. This needs debugging and fixing."
}
```

**Returns:**
```json
{
  "platform": "github",
  "reasoning": "Engineering issue detected. Keywords: api, error, debugging, fix. Best managed on GitHub for Copilot agent integration.",
  "confidence": 0.9,
  "suggestedLabels": ["bug", "backend"],
  "isEngineering": true
}
```

### Issue Management Tools

#### 2. create_issue
Create an issue on GitHub or Linear based on triage decision.

```typescript
{
  title: string;           // Issue title
  description: string;     // Issue description
  platform: "github" | "linear";  // Target platform
  owner?: string;          // GitHub repo owner (required for GitHub)
  repo?: string;           // GitHub repo name (required for GitHub)  
  teamId?: string;         // Linear team ID (required for Linear)
  labels?: string[];       // Labels to apply
  assignee?: string;       // Assignee username/ID
  priority?: number;       // Priority (0-4, Linear only)
}
```

#### 3. get_linear_issue / get_github_issue
Get detailed information about a specific issue.

```typescript
// Linear
{ issueId: string }

// GitHub  
{ owner: string; repo: string; issueNumber: number }
```

#### 4. list_linear_issues / list_github_issues
List issues with optional filtering.

```typescript
// Linear
{ teamId?: string; limit?: number }

// GitHub
{ owner: string; repo: string; state?: "open" | "closed" | "all"; limit?: number }
```

#### 5. update_github_issue
Update a GitHub issue with new information.

```typescript
{
  owner: string;           // Repository owner
  repo: string;            // Repository name
  issueNumber: number;     // Issue number
  title?: string;          // New title
  body?: string;           // New description
  state?: "open" | "closed"; // New state
  labels?: string[];       // New labels
  assignees?: string[];    // New assignees
}
```

### Synchronization Tools

#### 6. sync_issue
Synchronize an issue between GitHub and Linear platforms.

```typescript
{
  sourceplatform: "github" | "linear";  // Source platform
  sourceId: string;                     // Source issue ID/number
  targetOwner?: string;                 // Target GitHub repo owner
  targetRepo?: string;                  // Target GitHub repo name
  targetTeamId?: string;                // Target Linear team ID
  syncMode?: "one-way" | "bidirectional"; // Sync mode
}
```

### Utility Tools

#### 7. list_linear_teams
List all available Linear teams for issue creation.

```typescript
{} // No parameters required
```

### Pull Request Tools (Original)

#### 8. create_feature_pr
Create a feature PR from a Linear issue.

```typescript
{
  owner: string;           // Repository owner
  repo: string;            // Repository name  
  linearIssueId: string;   // Linear issue ID (e.g., 'ARC-119')
  base?: string;           // Base branch (default: 'dev')
  title?: string;          // Override PR title
  description?: string;    // Override PR description
}
```

#### 9. create_release_pr
Create a release PR with change analysis.

```typescript
{
  owner: string;     // Repository owner
  repo: string;      // Repository name
  head?: string;     // Head branch (default: 'dev') 
  base?: string;     // Base branch (default: 'main')
  title?: string;    // Override PR title
}
```

#### 10. update_pr
Update an existing pull request.

```typescript
{
  owner: string;         // Repository owner
  repo: string;          // Repository name
  prNumber: number;      // Pull request number
  title?: string;        // New PR title
  description?: string;  // New PR description
}
```

## Workflow Examples

### Issue Triage Workflow
1. **Receive Issue**: New issue comes in via any channel
2. **Triage Analysis**: Use `triage_issue` to analyze content
3. **Create Issue**: Use `create_issue` with recommended platform
4. **Copilot Ready**: Engineering issues on GitHub are ready for AI agents

```bash
# Example: Bug report
triage_issue: "Login API crashes" + "500 error on /auth/login endpoint"
→ Result: GitHub (engineering issue, confidence: 0.95)
→ create_issue: platform=github, labels=["bug", "backend"]
```

### Cross-Platform Sync Workflow
1. **Engineering Issue in Linear**: Business team creates technical issue in Linear
2. **Sync to GitHub**: Use `sync_issue` to move to GitHub for development
3. **Development**: Copilot agents work on GitHub issue
4. **Status Updates**: Sync progress back to Linear stakeholders

### Feature Development Workflow (Enhanced)
1. **Product Planning**: Create feature requirements in Linear
2. **Engineering Breakdown**: Sync or create specific technical issues in GitHub
3. **Feature PR**: Use `create_feature_pr` from GitHub issue
4. **Development**: AI agents assist with GitHub issue
5. **Release**: Use `create_release_pr` to package features

## Integration Strategy

This server works alongside other MCP servers for complete coverage:

- **Use `@modelcontextprotocol/server-github`** for: Basic Git operations, file management, repository management
- **Use `@ibraheem4/github-mcp`** for: Issue triage, Linear-GitHub workflows, cross-platform synchronization

## Triage Algorithm

The intelligent triage system uses keyword analysis and context understanding:

### Engineering Indicators
- **Technical**: `bug`, `error`, `crash`, `api`, `database`, `performance`
- **Development**: `code`, `feature`, `implement`, `test`, `deployment`
- **Infrastructure**: `server`, `security`, `build`, `ci/cd`, `scale`
- **Special**: `copilot`, `ai agent`, `automation` (strong GitHub indicators)

### Business Indicators  
- **Strategy**: `roadmap`, `planning`, `budget`, `revenue`, `partnership`
- **Product**: `design`, `user experience`, `customer`, `workflow`
- **Process**: `policy`, `compliance`, `training`, `documentation`
- **Operations**: `marketing`, `sales`, `hr`, `procurement`

### Confidence Scoring
- Higher confidence for longer, more specific keywords
- Boost for Copilot/AI-related terms (GitHub preference)
- Balanced scoring prevents false classifications

## Development

### Project Structure
```
src/
├── index.ts           # Main MCP server implementation  
├── utils/
│   ├── github.ts      # GitHub API integration + issue management
│   └── linear.ts      # Linear API integration + triage logic
├── config/            # Configuration management
└── types/             # TypeScript type definitions + triage types
```

### Local Development
```bash
npm run dev          # Development server with hot reload
npm run build        # Build for production
npm run inspector    # Launch MCP inspector for testing
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive triage and sync functionality
4. Add tests for new issue management features  
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Perfect for teams using both Linear and GitHub**: This server intelligently routes engineering work to GitHub (for Copilot integration) while keeping business discussions in Linear, with seamless synchronization between platforms.