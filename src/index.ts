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
            create_feature_pr: {},
            create_release_pr: {},
            update_pr: {},
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
