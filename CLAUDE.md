# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Running
- `npm run build` - Compile TypeScript to /build directory and make executable
- `npm run watch` - Development mode with auto-rebuild on file changes
- `npm run dev` - Development server with nodemon watching src/**/*.ts files
- `npm start` - Production server (runs compiled build/api/index.js)
- `npm run inspector` - Launch MCP inspector for testing tools locally

### Environment Setup
Copy `.env.example` to `.env` and configure:
- `GITHUB_TOKEN` - GitHub Personal Access Token with repo scope (required)
- `LINEAR_API_KEY` - Linear API Key for issue integration (required)

## Architecture Overview

This is an enhanced GitHub PR MCP (Model Context Protocol) server that integrates GitHub and Linear APIs for streamlined pull request workflows.

### Core Components

**MCP Server** (`src/index.ts`):
- Main MCP server implementation using @modelcontextprotocol/sdk
- Provides 3 primary tools: `create_feature_pr`, `create_release_pr`, `update_pr`
- Handles stdio transport for MCP client communication
- Entry point for CLI usage

**Express API Server** (`src/api/index.ts`):
- Separate HTTP API server for direct API access
- Express.js with security middleware (cors, helmet, rate limiting)
- Runs on port 3000 by default
- Health check endpoint at `/health`

**GitHub Integration** (`src/utils/github.ts`):
- Octokit client for GitHub API operations
- Branch creation, PR creation/updates, diff analysis
- Automatic PR title generation from commit analysis
- File change tracking and diff processing

**Linear Integration** (`src/utils/linear.ts`):
- Linear SDK client for issue management
- Feature PR description generation from Linear issues
- Release PR description generation from merged PRs
- Issue metadata extraction and formatting

### Data Flow

1. **Feature PRs**: Linear Issue → Branch Creation → PR with Generated Description
2. **Release PRs**: Diff Analysis → PR List → Formatted Release Notes
3. **PR Updates**: Direct GitHub API calls with structured content

### TypeScript Configuration

- ES2022 target with Node16 modules
- Strict mode enabled with comprehensive type checking
- Path mapping for clean imports from src/types/
- Source maps and declarations generated for debugging
- Executable binary creation post-build

### Key Design Patterns

- **Dual Server Architecture**: MCP server for Claude integration + Express API for direct access
- **Environment-based Configuration**: All API keys via environment variables
- **Type-safe API Contracts**: Comprehensive TypeScript interfaces in src/types/
- **Error Handling**: MCP-compliant error responses with proper error codes
- **Modular Utilities**: Separated GitHub and Linear logic for maintainability

### Package Distribution

- Published to npm as `@ibraheem4/github-mcp`
- Executable binary at `build/index.js` (chmod 755)
- ES module package with strict Node.js 18+ requirement
- Includes only /build directory in published package