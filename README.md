# Cline GitHub MCP

A Model Context Protocol (MCP) server that provides GitHub integration for Cline, enabling automated pull request management and other GitHub operations.

## Features

- Create pull requests
- List pull requests with filtering
- Update pull request details
- More features coming soon (Issues, Actions, Deployments)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Build the server:

```bash
npm run build
```

## Configuration

Add the server to your Cline MCP settings (`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["path/to/cline-github-mcp/build/index.js"],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}
```

Required GitHub token permissions:

- Pull requests (create/manage PRs)
- Contents (repository content access)
- Actions (manage workflows/runs)
- Issues (track tasks/bugs)
- Deployments (manage deployments)
- Commit statuses (CI/build status)
- Metadata (mandatory)

## Usage

### Create a Pull Request

```typescript
use_mcp_tool({
  server_name: "github",
  tool_name: "create_pull_request",
  arguments: {
    owner: "username",
    repo: "repository",
    title: "Feature: Add new component",
    body: "Implements the new component with tests",
    head: "feature/new-component",
    base: "main",
  },
});
```

### List Pull Requests

```typescript
use_mcp_tool({
  server_name: "github",
  tool_name: "list_pull_requests",
  arguments: {
    owner: "username",
    repo: "repository",
    state: "open", // or "closed" or "all"
  },
});
```

### Update a Pull Request

```typescript
use_mcp_tool({
  server_name: "github",
  tool_name: "update_pull_request",
  arguments: {
    owner: "username",
    repo: "repository",
    pull_number: 123,
    title: "Updated: Add new component",
    state: "closed",
  },
});
```

## Development

To add new features or make improvements:

1. Make your changes in `src/`
2. Build the server:

```bash
npm run build
```

3. Update your Cline MCP settings to point to the built server
4. Restart Cline to load the changes

## License

MIT
