#!/usr/bin/env node
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import {
  createBranch,
  createPR,
  analyzeChanges,
  getExistingPR,
  updatePR,
  getBranchDiff,
  generatePRTitle,
  getFileContents,
  createOrUpdateFile,
  listCommits,
  getIssue,
  createIssue,
  listIssues,
  getPullRequest,
  listPullRequests,
  searchCode,
  searchRepositories,
} from "./utils/github.js";
import {
  getLinearIssue,
  generateFeaturePRDescription,
  generateReleasePRDescription,
} from "./utils/linear.js";
import { CreateFeaturePrInput, CreateReleasePrInput } from "./types/index.js";

// Load .env file from the project root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN environment variable is required");
}

class GitHubServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "github-pr",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {
            // Existing PR tools
            create_feature_pr: {},
            create_release_pr: {},
            update_pr: {},
            // Basic GitHub API tools
            get_file_contents: {},
            create_or_update_file: {},
            list_commits: {},
            get_issue: {},
            create_issue: {},
            list_issues: {},
            get_pull_request: {},
            list_pull_requests: {},
            search_code: {},
            search_repositories: {},
          },
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "create_feature_pr",
          description: "Create a feature PR from Linear issue",
          inputSchema: {
            type: "object",
            properties: {
              owner: {
                type: "string",
                description: "Repository owner",
              },
              repo: {
                type: "string",
                description: "Repository name",
              },
              linearIssueId: {
                type: "string",
                description: "Linear issue ID (e.g., 'ARC-119')",
              },
              base: {
                type: "string",
                description: "Base branch (default: 'dev')",
              },
              title: {
                type: "string",
                description: "Optional PR title override",
              },
              description: {
                type: "string",
                description: "Optional PR description override",
              },
            },
            required: ["owner", "repo", "linearIssueId"],
          },
        },
        {
          name: "create_release_pr",
          description: "Create a release PR from dev to main",
          inputSchema: {
            type: "object",
            properties: {
              owner: {
                type: "string",
                description: "Repository owner",
              },
              repo: {
                type: "string",
                description: "Repository name",
              },
              head: {
                type: "string",
                description: "Head branch (default: 'dev')",
              },
              base: {
                type: "string",
                description: "Base branch (default: 'main')",
              },
              title: {
                type: "string",
                description: "Optional PR title override",
              },
            },
            required: ["owner", "repo"],
          },
        },
        {
          name: "update_pr",
          description: "Update an existing pull request",
          inputSchema: {
            type: "object",
            properties: {
              owner: {
                type: "string",
                description: "Repository owner",
              },
              repo: {
                type: "string",
                description: "Repository name",
              },
              prNumber: {
                type: "number",
                description: "Pull request number",
              },
              title: {
                type: "string",
                description: "New PR title",
              },
              description: {
                type: "string",
                description: "New PR description in markdown format",
              },
            },
            required: ["owner", "repo", "prNumber"],
          },
        },
        // Basic GitHub API tools
        {
          name: "get_file_contents",
          description: "Get contents of a file or directory from a repository",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              path: { type: "string", description: "File or directory path" },
              ref: { type: "string", description: "Git reference (branch, tag, or SHA)" },
            },
            required: ["owner", "repo", "path"],
          },
        },
        {
          name: "create_or_update_file",
          description: "Create or update a single file in a repository",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              path: { type: "string", description: "File path" },
              message: { type: "string", description: "Commit message" },
              content: { type: "string", description: "File content" },
              branch: { type: "string", description: "Branch name" },
              sha: { type: "string", description: "File SHA if updating existing file" },
            },
            required: ["owner", "repo", "path", "message", "content"],
          },
        },
        {
          name: "list_commits",
          description: "Get a list of commits from a repository",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              sha: { type: "string", description: "Branch name, tag, or commit SHA" },
              path: { type: "string", description: "Only commits containing this file path" },
              page: { type: "number", description: "Page number for pagination" },
              perPage: { type: "number", description: "Results per page (default: 30)" },
            },
            required: ["owner", "repo"],
          },
        },
        {
          name: "get_issue",
          description: "Get details of a specific issue",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              issue_number: { type: "number", description: "Issue number" },
            },
            required: ["owner", "repo", "issue_number"],
          },
        },
        {
          name: "create_issue",
          description: "Create a new issue in a repository",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              title: { type: "string", description: "Issue title" },
              body: { type: "string", description: "Issue body content" },
              assignees: { type: "array", items: { type: "string" }, description: "Usernames to assign" },
              labels: { type: "array", items: { type: "string" }, description: "Labels to apply" },
            },
            required: ["owner", "repo", "title"],
          },
        },
        {
          name: "list_issues",
          description: "List and filter repository issues",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              state: { type: "string", enum: ["open", "closed", "all"], description: "Filter by state" },
              labels: { type: "array", items: { type: "string" }, description: "Labels to filter by" },
              sort: { type: "string", enum: ["created", "updated", "comments"], description: "Sort by" },
              direction: { type: "string", enum: ["asc", "desc"], description: "Sort direction" },
              page: { type: "number", description: "Page number" },
              perPage: { type: "number", description: "Results per page" },
            },
            required: ["owner", "repo"],
          },
        },
        {
          name: "get_pull_request",
          description: "Get details of a specific pull request",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              pull_number: { type: "number", description: "Pull request number" },
            },
            required: ["owner", "repo", "pull_number"],
          },
        },
        {
          name: "list_pull_requests",
          description: "List and filter repository pull requests",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              state: { type: "string", enum: ["open", "closed", "all"], description: "PR state" },
              sort: { type: "string", enum: ["created", "updated", "popularity"], description: "Sort field" },
              direction: { type: "string", enum: ["asc", "desc"], description: "Sort direction" },
              page: { type: "number", description: "Page number" },
              perPage: { type: "number", description: "Results per page" },
            },
            required: ["owner", "repo"],
          },
        },
        {
          name: "search_code",
          description: "Search for code across GitHub repositories",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              sort: { type: "string", enum: ["indexed"], description: "Sort field" },
              order: { type: "string", enum: ["asc", "desc"], description: "Sort order" },
              page: { type: "number", description: "Page number" },
              perPage: { type: "number", description: "Results per page" },
            },
            required: ["query"],
          },
        },
        {
          name: "search_repositories",
          description: "Search for GitHub repositories",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              sort: { type: "string", enum: ["stars", "forks", "help-wanted-issues", "updated"], description: "Sort field" },
              order: { type: "string", enum: ["asc", "desc"], description: "Sort order" },
              page: { type: "number", description: "Page number" },
              perPage: { type: "number", description: "Results per page" },
            },
            required: ["query"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "create_feature_pr": {
            const args = request.params
              .arguments as unknown as CreateFeaturePrInput;
            const issue = await getLinearIssue(args.linearIssueId);

            // Create feature branch
            await createBranch(
              args.owner,
              args.repo,
              issue.branchName,
              args.base || "dev"
            );

            // Create PR
            const pr = await createPR({
              owner: args.owner,
              repo: args.repo,
              title: args.title || `feat: ${issue.title}`,
              body: args.description || generateFeaturePRDescription(issue),
              head: issue.branchName,
              base: args.base || "dev",
              draft: true,
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      url: pr.html_url,
                      number: pr.number,
                      branch: issue.branchName,
                      linearIssue: {
                        id: issue.id,
                        title: issue.title,
                        url: issue.url,
                      },
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "create_release_pr": {
            const args = request.params
              .arguments as unknown as CreateReleasePrInput;
            const head = args.head || "dev";
            const base = args.base || "main";

            // Get diff analysis and changes
            const [diff, changes] = await Promise.all([
              getBranchDiff(args.owner, args.repo, base, head),
              analyzeChanges(args.owner, args.repo, base, head),
            ]);
            const title = args.title || generatePRTitle(diff, changes.prs);

            // Check for existing PR
            const existingPR = await getExistingPR(
              args.owner,
              args.repo,
              head,
              base
            );

            let pr;
            if (existingPR) {
              // Update existing PR
              pr = await updatePR(args.owner, args.repo, existingPR.number, {
                title,
                body: generateReleasePRDescription(changes.prs),
              });
            } else {
              // Create new PR
              pr = await createPR({
                owner: args.owner,
                repo: args.repo,
                title,
                body: generateReleasePRDescription(changes.prs),
                head,
                base,
              });
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      url: pr.html_url,
                      number: pr.number,
                      changes: {
                        files: changes.files.length,
                        prs: changes.prs.length,
                      },
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "update_pr": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              prNumber: number;
              title?: string;
              description?: string;
            };

            const pr = await updatePR(args.owner, args.repo, args.prNumber, {
              title: args.title,
              body: args.description,
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      url: pr.html_url,
                      number: pr.number,
                      title: pr.title,
                      updated: true,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "get_file_contents": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              path: string;
              ref?: string;
            };
            const result = await getFileContents(args.owner, args.repo, args.path, args.ref);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          }

          case "create_or_update_file": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              path: string;
              message: string;
              content: string;
              branch?: string;
              sha?: string;
            };
            const result = await createOrUpdateFile(args);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          }

          case "list_commits": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              sha?: string;
              path?: string;
              page?: number;
              perPage?: number;
            };
            const result = await listCommits(args);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          }

          case "get_issue": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              issue_number: number;
            };
            const result = await getIssue(args.owner, args.repo, args.issue_number);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          }

          case "create_issue": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              title: string;
              body?: string;
              assignees?: string[];
              labels?: string[];
            };
            const result = await createIssue(args);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          }

          case "list_issues": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              state?: "open" | "closed" | "all";
              labels?: string[];
              sort?: "created" | "updated" | "comments";
              direction?: "asc" | "desc";
              page?: number;
              perPage?: number;
            };
            const result = await listIssues(args);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          }

          case "get_pull_request": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              pull_number: number;
            };
            const result = await getPullRequest(args.owner, args.repo, args.pull_number);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          }

          case "list_pull_requests": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              state?: "open" | "closed" | "all";
              sort?: "created" | "updated" | "popularity";
              direction?: "asc" | "desc";
              page?: number;
              perPage?: number;
            };
            const result = await listPullRequests(args);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          }

          case "search_code": {
            const args = request.params.arguments as {
              query: string;
              sort?: "indexed";
              order?: "asc" | "desc";
              page?: number;
              perPage?: number;
            };
            const result = await searchCode(args);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          }

          case "search_repositories": {
            const args = request.params.arguments as {
              query: string;
              sort?: "stars" | "forks" | "help-wanted-issues" | "updated";
              order?: "asc" | "desc";
              page?: number;
              perPage?: number;
            };
            const result = await searchRepositories(args);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error: unknown) {
        if (error instanceof McpError) throw error;

        const message = error instanceof Error ? error.message : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `GitHub API error: ${message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("GitHub PR MCP server running on stdio");
  }
}

const server = new GitHubServer();
server.run().catch(console.error);
