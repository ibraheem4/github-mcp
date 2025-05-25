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

This is a **focused Linear-GitHub bridge MCP server** with a minimal toolset designed for efficient Linear-to-GitHub workflows.

### Core Principles

**Single Purpose Design**: 
- Bridges Linear project management with GitHub repositories
- Focuses exclusively on Linear-GitHub integration workflows
- Does NOT duplicate basic GitHub API functionality
- Works alongside `@modelcontextprotocol/server-github` for complete GitHub coverage

**Minimal Toolset**:
- `create_feature_pr` - Create feature PRs from Linear issues
- `create_release_pr` - Create release PRs with change analysis  
- `update_pr` - Update existing pull requests

### Core Components

**MCP Server** (`src/index.ts`):
- Main MCP server implementation using @modelcontextprotocol/sdk
- Provides exactly 3 focused tools for Linear-GitHub workflows
- Handles stdio transport for MCP client communication
- Server name: `linear-github-bridge`

**GitHub Integration** (`src/utils/github.ts`):
- Minimal Octokit client for essential GitHub operations only:
  - Branch creation
  - PR creation/updates
  - Diff analysis for releases
  - Change categorization
- **Note**: Basic GitHub operations delegated to standard GitHub MCP server

**Linear Integration** (`src/utils/linear.ts`):
- Linear SDK client for issue management
- Feature PR description generation from Linear issues
- Release PR description generation from merged PRs
- Issue metadata extraction and branch name generation

### Data Flow

1. **Feature PRs**: Linear Issue → Branch Creation → Rich PR with Generated Description
2. **Release PRs**: Branch Diff Analysis → PR Categorization → Formatted Release Notes
3. **PR Updates**: Direct GitHub API calls with structured content

### TypeScript Configuration

- ES2022 target with Node16 modules
- Strict mode enabled with comprehensive type checking
- Path mapping for clean imports from src/types/
- Source maps and declarations generated for debugging
- Executable binary creation post-build

### Key Design Patterns

- **Focused Architecture**: Single-purpose server with minimal tool surface area
- **Environment-based Configuration**: All API keys via environment variables
- **Type-safe Contracts**: Comprehensive TypeScript interfaces in src/types/
- **Error Handling**: MCP-compliant error responses with proper error codes
- **Modular Utilities**: Separated GitHub and Linear logic for maintainability

### Integration Strategy

This server is designed to work **alongside** other MCP servers:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "..." }
    },
    "linear-github-bridge": {
      "command": "npx", 
      "args": ["-y", "@ibraheem4/github-mcp"],
      "env": { 
        "GITHUB_TOKEN": "...",
        "LINEAR_API_KEY": "..."
      }
    }
  }
}
```

**Usage Pattern**:
- Use `github` server for: File operations, issue management, basic GitHub API calls
- Use `linear-github-bridge` server for: Linear-specific workflows, structured PR creation

### Package Distribution

- Published to npm as `@ibraheem4/github-mcp`
- Executable binary at `build/index.js` (chmod 755)
- ES module package with strict Node.js 18+ requirement
- Includes only /build directory in published package

### Development Guidelines

**When adding new features**:
1. Ensure the feature relates specifically to Linear-GitHub integration
2. Avoid duplicating functionality available in standard GitHub MCP server
3. Focus on workflow enhancement rather than basic API coverage
4. Maintain the minimal toolset philosophy

**Code Quality**:
- Strict TypeScript with comprehensive error handling
- Modular architecture with clear separation of concerns
- Environment-based configuration for security
- MCP-compliant tool interfaces and error responses