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
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  draft?: boolean;
  maintainer_can_modify?: boolean;
  labels?: string[];
  reviewers?: string[];
  assignees?: string[];
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

interface GeneratePrDescriptionArgs {
  owner: string;
  repo: string;
  pull_number: number;
}

interface FileChange {
  filePath: string;
  additions: number;
  deletions: number;
}

function generatePrBody(args: CreatePullRequestArgs): string {
  let template = fs.readFileSync(
    path.join(__dirname, "../.github/pull_request_template.md"),
    "utf8"
  );

  // Replace Overview section
  if (args.overview) {
    template = template.replace(
      /## Overview\n\nSummarize.*?\n\n---/s,
      `## Overview\n\n${args.overview}\n\n---`
    );
  }

  // Replace Key Changes section
  if (args.keyChanges?.length) {
    const changes = args.keyChanges.map((change) => `- ${change}`).join("\n");
    template = template.replace(
      /## Key Changes\n\nList.*?\n\n---/s,
      `## Key Changes\n\n${changes}\n\n---`
    );
  }

  // Replace Code Highlights section
  if (args.codeHighlights?.length) {
    const highlights = args.codeHighlights
      .map((highlight) => `- ${highlight}`)
      .join("\n");
    template = template.replace(
      /## Code Highlights\n\nIdentify.*?\n\n---/s,
      `## Code Highlights\n\n${highlights}\n\n---`
    );
  }

  // Replace Testing section
  if (args.testing?.length) {
    const tests = args.testing.map((test) => `- ${test}`).join("\n");
    template = template.replace(
      /## Testing\n\nOutline.*?\n\n---/s,
      `## Testing\n\n${tests}\n\n---`
    );
  }

  // Update Checklist section
  if (args.checklist) {
    const checklistItems = [
      [
        "Code adheres to project conventions.",
        args.checklist.adhereToConventions,
      ],
      [
        "Relevant tests are included, and all pass successfully.",
        args.checklist.testsIncluded,
      ],
      [
        "Documentation updated (if applicable).",
        args.checklist.documentationUpdated,
      ],
      [
        "Changes verified in a staging or test environment.",
        args.checklist.changesVerified,
      ],
      [
        "Screenshots, diagrams, or videos attached (if relevant).",
        args.checklist.screenshotsAttached,
      ],
    ];
    const checklistText = checklistItems
      .map(([text, checked]) => `- [${checked ? "x" : " "}] ${text}`)
      .join("\n");
    template = template.replace(
      /## Checklist\n\n-.*?\n\n---/s,
      `## Checklist\n\n${checklistText}\n\n---`
    );
  }

  // Replace Links section
  if (args.links?.length) {
    const links = args.links
      .map((link) => `- [${link.title}](${link.url})`)
      .join("\n");
    template = template.replace(
      /## Links\n\nInclude.*?\n\n---/s,
      `## Links\n\n${links}\n\n---`
    );
  }

  // Replace Attachments section
  if (args.attachments?.length) {
    const attachments = args.attachments
      .map((attachment) => {
        const width = attachment.width ? ` width="${attachment.width}"` : "";
        return `<img${width} alt="${attachment.alt}" src="${attachment.url}">`;
      })
      .join("\n");
    template = template.replace(
      /## Attachments\n\nAttach.*?\n\n---/s,
      `## Attachments\n\n${attachments}\n\n---`
    );
  }

  // Replace Additional Notes section
  if (args.additionalNotes) {
    template = template.replace(
      /## Additional Notes\n\nProvide.*?\n\n---/s,
      `## Additional Notes\n\n${args.additionalNotes}\n\n---`
    );
  }

  // Add issue tags if provided
  if (args.issueIds?.length) {
    const issueTags = args.issueIds.map((id) => `- fixes ${id}`).join("\n");
    template = template.replace(
      /### Issue Tagging.*?---\n\n$/s,
      `### Issue Tagging\n\n${issueTags}\n\n---\n`
    );
  }

  return template;
}

class GitHubServer {
  private server: Server;
  private octokit: Octokit;

  constructor() {
    this.server = new Server(
      {
        name: "github-pr",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {
            create_pull_request: {},
            list_pull_requests: {},
            update_pull_request: {},
            generate_pr_description: {},
          },
        },
      }
    );

    this.octokit = new Octokit({
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
            required: ["owner", "repo", "title", "head", "base"],
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
                description:
                  "Pull request description (optional, will use template if not provided)",
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
              overview: {
                type: "string",
                description: "Brief overview of the PR's purpose",
              },
              keyChanges: {
                type: "array",
                items: { type: "string" },
                description: "List of key changes made in this PR",
              },
              codeHighlights: {
                type: "array",
                items: { type: "string" },
                description: "List of important code sections to review",
              },
              testing: {
                type: "array",
                items: { type: "string" },
                description: "List of testing details and results",
              },
              links: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["title", "url"],
                },
                description: "Related links for review",
              },
              additionalNotes: {
                type: "string",
                description: "Extra context or notes for reviewers",
              },
              issueIds: {
                type: "array",
                items: { type: "string" },
                description: "List of issue IDs to reference (e.g., 'ENG-123')",
              },
              checklist: {
                type: "object",
                properties: {
                  adhereToConventions: { type: "boolean" },
                  testsIncluded: { type: "boolean" },
                  documentationUpdated: { type: "boolean" },
                  changesVerified: { type: "boolean" },
                  screenshotsAttached: { type: "boolean" },
                },
                description: "PR checklist items",
              },
              attachments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["image", "video", "diagram"],
                    },
                    alt: { type: "string" },
                    url: { type: "string" },
                    width: { type: "number" },
                  },
                  required: ["type", "alt", "url"],
                },
                description: "Media attachments for the PR",
              },
              draft: {
                type: "boolean",
                description: "Create PR as draft",
              },
              maintainer_can_modify: {
                type: "boolean",
                description: "Whether maintainers can modify the pull request",
              },
              labels: {
                type: "array",
                items: { type: "string" },
                description: "Labels to add to the PR",
              },
              reviewers: {
                type: "array",
                items: { type: "string" },
                description: "GitHub usernames to request reviews from",
              },
              assignees: {
                type: "array",
                items: { type: "string" },
                description: "GitHub usernames to assign to the PR",
              },
            },
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
        {
          name: "generate_pr_description",
          description: "Generate a PR description based on the diff",
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
            const body = args.body || generatePrBody(args);

            try {
              // Create the pull request
              const response = await this.octokit.pulls.create({
                owner: args.owner,
                repo: args.repo,
                title: args.title,
                body: body,
                head: args.head,
                base: args.base,
                draft: args.draft,
                maintainer_can_modify: args.maintainer_can_modify,
              });

              const prNumber = response.data.number;

              // Add labels if provided
              if (args.labels?.length) {
                await this.octokit.issues.addLabels({
                  owner: args.owner,
                  repo: args.repo,
                  issue_number: prNumber,
                  labels: args.labels,
                });
              }

              // Add reviewers if provided
              if (args.reviewers?.length) {
                await this.octokit.pulls.requestReviewers({
                  owner: args.owner,
                  repo: args.repo,
                  pull_number: prNumber,
                  reviewers: args.reviewers,
                });
              }

              // Add assignees if provided
              if (args.assignees?.length) {
                await this.octokit.issues.addAssignees({
                  owner: args.owner,
                  repo: args.repo,
                  issue_number: prNumber,
                  assignees: args.assignees,
                });
              }

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(response.data, null, 2),
                  },
                ],
              };
            } catch (error: any) {
              // Handle specific GitHub API errors
              if (error.status === 404) {
                throw new McpError(
                  ErrorCode.InvalidRequest,
                  "Repository not found or insufficient access"
                );
              }
              if (error.status === 422) {
                throw new McpError(
                  ErrorCode.InvalidRequest,
                  "Invalid branch name or other validation error"
                );
              }
              if (
                error.status === 403 &&
                error.response?.headers["x-ratelimit-remaining"] === "0"
              ) {
                throw new McpError(
                  ErrorCode.InvalidRequest,
                  "GitHub API rate limit exceeded"
                );
              }
              throw error;
            }
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

          case "generate_pr_description": {
            const args = request.params
              .arguments as unknown as GeneratePrDescriptionArgs;

            // Get the PR diff
            const { data: diffText } = await this.octokit.request<string>(
              "GET /repos/{owner}/{repo}/pulls/{pull_number}",
              {
                owner: args.owner,
                repo: args.repo,
                pull_number: args.pull_number,
                mediaType: {
                  format: "diff",
                },
              }
            );

            // Get the PR details for additional context
            const { data: pr } = await this.octokit.pulls.get({
              owner: args.owner,
              repo: args.repo,
              pull_number: args.pull_number,
            });

            // Parse diff to extract file changes
            const files = (diffText as string).split("diff --git").slice(1);
            const fileChanges: FileChange[] = files.map((file: string) => {
              const lines = file.split("\n");
              const filePath = lines[0].match(/b\/(.*)/)?.[1] || "";
              const additions = lines.filter((line: string) =>
                line.startsWith("+")
              ).length;
              const deletions = lines.filter((line: string) =>
                line.startsWith("-")
              ).length;
              return { filePath, additions, deletions };
            });

            // Generate key changes based on file analysis
            const keyChanges = fileChanges.map((file: FileChange) => {
              const changeType =
                file.additions && file.deletions
                  ? "Modified"
                  : file.additions
                  ? "Added"
                  : file.deletions
                  ? "Removed"
                  : "Changed";
              return `${changeType} \`${file.filePath}\` (${file.additions} additions, ${file.deletions} deletions)`;
            });

            // Generate code highlights based on significant changes
            const codeHighlights = fileChanges
              .filter(
                (file: FileChange) => file.additions + file.deletions > 10
              )
              .map(
                (file: FileChange) =>
                  `Significant changes in \`${file.filePath}\``
              );

            // Determine PR type based on changes
            const getType = () => {
              const newFiles = fileChanges.some(
                (f: FileChange) => f.additions && !f.deletions
              );
              const onlyDocs = fileChanges.every((f: FileChange) =>
                /\.(md|txt|doc)$/.test(f.filePath)
              );
              const hasTests = fileChanges.some(
                (f: FileChange) =>
                  f.filePath.includes("test") || f.filePath.includes("spec")
              );

              if (onlyDocs) return "docs";
              if (hasTests && !newFiles) return "test";
              if (newFiles) return "feat";
              return "fix";
            };

            const prArgs: CreatePullRequestArgs = {
              owner: args.owner,
              repo: args.repo,
              title: pr.title,
              head: pr.head.ref,
              base: pr.base.ref,
              overview: pr.title,
              keyChanges,
              codeHighlights,
              testing: ["Automated tests included", "Manual testing performed"],
              checklist: {
                adhereToConventions: true,
                testsIncluded: true,
                documentationUpdated: fileChanges.some((f: FileChange) =>
                  f.filePath.includes(".md")
                ),
                changesVerified: true,
                screenshotsAttached: false,
              },
            };

            // Generate PR body using the analyzed content
            const body = generatePrBody(prArgs);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      type: getType(),
                      title: `${getType()}(${args.repo}): ${pr.title}`,
                      body,
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
