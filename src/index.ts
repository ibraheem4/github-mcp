#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { createBranch, createPR, analyzeChanges } from "./utils/github.js";
import {
  getLinearIssue,
  generateFeaturePRDescription,
  generateReleasePRDescription,
} from "./utils/linear.js";
import { CreateFeaturePrInput, CreateReleasePrInput } from "./types/index.js";

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

            // Analyze changes between branches
            const changes = await analyzeChanges(
              args.owner,
              args.repo,
              base,
              head
            );

            // Create PR
            const pr = await createPR({
              owner: args.owner,
              repo: args.repo,
              title:
                args.title ||
                `release: ${new Date().toISOString().split("T")[0]}`,
              body: generateReleasePRDescription(changes.prs),
              head,
              base,
            });

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
