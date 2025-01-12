#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";
import { createTokenAuth } from "@octokit/auth-token";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN environment variable is required");
}

interface CreatePullRequestArgs {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  head: string;
  base: string;
}

interface ListPullRequestsArgs {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
}

interface UpdatePullRequestArgs {
  owner: string;
  repo: string;
  pull_number: number;
  title?: string;
  body?: string;
  state?: "open" | "closed";
}

class GitHubServer {
  private server: Server;
  private octokit: Octokit;

  constructor() {
    this.server = new Server(
      {
        name: "github-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.octokit = new Octokit({
      authStrategy: createTokenAuth,
      auth: GITHUB_TOKEN,
    });

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
          name: "create_pull_request",
          description: "Create a new pull request",
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
              title: {
                type: "string",
                description: "Pull request title",
              },
              body: {
                type: "string",
                description: "Pull request description",
              },
              head: {
                type: "string",
                description:
                  "The name of the branch where your changes are implemented",
              },
              base: {
                type: "string",
                description:
                  "The name of the branch you want the changes pulled into",
              },
            },
            required: ["owner", "repo", "title", "head", "base"],
          },
        },
        {
          name: "list_pull_requests",
          description: "List pull requests in a repository",
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
              state: {
                type: "string",
                enum: ["open", "closed", "all"],
                description: "State of pull requests to list",
              },
            },
            required: ["owner", "repo"],
          },
        },
        {
          name: "update_pull_request",
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
              pull_number: {
                type: "number",
                description: "Pull request number",
              },
              title: {
                type: "string",
                description: "New title for the pull request",
              },
              body: {
                type: "string",
                description: "New description for the pull request",
              },
              state: {
                type: "string",
                enum: ["open", "closed"],
                description: "State of the pull request",
              },
            },
            required: ["owner", "repo", "pull_number"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "create_pull_request": {
            const args = request.params
              .arguments as unknown as CreatePullRequestArgs;
            const response = await this.octokit.pulls.create({
              owner: args.owner,
              repo: args.repo,
              title: args.title,
              body: args.body,
              head: args.head,
              base: args.base,
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(response.data, null, 2),
                },
              ],
            };
          }

          case "list_pull_requests": {
            const args = request.params
              .arguments as unknown as ListPullRequestsArgs;
            const response = await this.octokit.pulls.list({
              owner: args.owner,
              repo: args.repo,
              state: args.state || "open",
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(response.data, null, 2),
                },
              ],
            };
          }

          case "update_pull_request": {
            const args = request.params
              .arguments as unknown as UpdatePullRequestArgs;
            const response = await this.octokit.pulls.update({
              owner: args.owner,
              repo: args.repo,
              pull_number: args.pull_number,
              title: args.title,
              body: args.body,
              state: args.state,
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(response.data, null, 2),
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
    console.error("GitHub MCP server running on stdio");
  }
}

const server = new GitHubServer();
server.run().catch(console.error);
