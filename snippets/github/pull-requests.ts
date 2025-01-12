/**
 * Example snippets for using the GitHub MCP tools to manage pull requests
 */

/**
 * Create a new pull request
 */
export const createPullRequest = {
  name: "Create Pull Request",
  description:
    "Create a new pull request with specified title, description, and branches",
  code: `use_mcp_tool({
  server_name: "github",
  tool_name: "create_pull_request",
  arguments: {
    owner: "username",
    repo: "repository",
    title: "Feature: Add new component",
    body: "Implements the new component with tests and documentation",
    head: "feature/new-component",
    base: "main",
  },
});`,
};

/**
 * List pull requests in a repository
 */
export const listPullRequests = {
  name: "List Pull Requests",
  description:
    "List all pull requests in a repository with optional state filter",
  code: `use_mcp_tool({
  server_name: "github",
  tool_name: "list_pull_requests",
  arguments: {
    owner: "username",
    repo: "repository",
    state: "open", // "closed" or "all"
  },
});`,
};

/**
 * Update an existing pull request
 */
export const updatePullRequest = {
  name: "Update Pull Request",
  description: "Update a pull request's title, description, or state",
  code: `use_mcp_tool({
  server_name: "github",
  tool_name: "update_pull_request",
  arguments: {
    owner: "username",
    repo: "repository",
    pull_number: 123,
    title: "Updated: Add new component",
    body: "Updated implementation with review feedback",
    state: "closed", // or "open"
  },
});`,
};

/**
 * Common PR workflows
 */
export const workflows = {
  name: "Common PR Workflows",
  description: "Example workflows combining multiple PR operations",
  examples: [
    {
      name: "Create and Track PR",
      description: "Create a PR and monitor its status",
      code: `// Create the PR
const createResponse = await use_mcp_tool({
  server_name: "github",
  tool_name: "create_pull_request",
  arguments: {
    owner: "username",
    repo: "repository",
    title: "Feature: New feature implementation",
    body: "Implements new feature with tests",
    head: "feature/new-feature",
    base: "main",
  },
});

// Get PR number from response
const prNumber = createResponse.number;

// Check PR status
const statusResponse = await use_mcp_tool({
  server_name: "github",
  tool_name: "list_pull_requests",
  arguments: {
    owner: "username",
    repo: "repository",
    state: "open",
  },
});

// Find our PR in the list
const ourPR = statusResponse.find(pr => pr.number === prNumber);
console.log(\`PR Status: \${ourPR.state}\`);`,
    },
    {
      name: "Update PR After Review",
      description: "Update PR title and description after review feedback",
      code: `use_mcp_tool({
  server_name: "github",
  tool_name: "update_pull_request",
  arguments: {
    owner: "username",
    repo: "repository",
    pull_number: 123,
    title: "[Updated] Feature: New feature implementation",
    body: "Updates based on review feedback:\\n\\n" +
          "- Improved error handling\\n" +
          "- Added more test cases\\n" +
          "- Updated documentation",
  },
});`,
    },
  ],
};
