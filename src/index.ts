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
  getGitHubIssue,
  listGitHubIssues,
  createGitHubIssue,
  updateGitHubIssue,
} from "./utils/github.js";
import {
  getLinearIssue,
  generateFeaturePRDescription,
  generateReleasePRDescription,
  getLinearIssueDetails,
  listLinearIssues,
  createLinearIssue,
  listLinearTeams,
  triageIssue,
  createHybridIssue,
  prepareAgentReadyIssue,
  generateMCPLabels,
  syncCrossPlatformStatus,
} from "./utils/linear.js";
import { 
  CreateFeaturePrInput, 
  CreateReleasePrInput, 
  IssueTriageInput,
  CreateIssueInput,
} from "./types/index.js";

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
        name: "linear-github-bridge",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {
            // Linear-GitHub Bridge Tools (Original)
            create_feature_pr: {},
            create_release_pr: {},
            update_pr: {},
            // Issue Triage and Management Tools
            triage_issue: {},
            create_issue: {},
            create_hybrid_issue: {},
            get_linear_issue: {},
            list_linear_issues: {},
            list_linear_teams: {},
            get_github_issue: {},
            list_github_issues: {},
            update_github_issue: {},
            sync_issue: {},
            // Lucitra-specific MCP Tools
            prepare_agent_ready: {},
            generate_mcp_labels: {},
            sync_cross_platform: {},
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
        // === NEW ISSUE TRIAGE AND MANAGEMENT TOOLS ===
        {
          name: "triage_issue",
          description: "Analyze an issue and determine if it should go to GitHub (engineering) or Linear (business/product)",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Issue title" },
              description: { type: "string", description: "Issue description" },
              labels: { type: "array", items: { type: "string" }, description: "Existing labels (optional)" },
            },
            required: ["title", "description"],
          },
        },
        {
          name: "create_issue",
          description: "Create an issue on GitHub or Linear based on triage decision",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Issue title" },
              description: { type: "string", description: "Issue description" },
              platform: { type: "string", enum: ["github", "linear"], description: "Target platform" },
              owner: { type: "string", description: "GitHub repo owner (required for GitHub)" },
              repo: { type: "string", description: "GitHub repo name (required for GitHub)" },
              teamId: { type: "string", description: "Linear team ID (required for Linear)" },
              labels: { type: "array", items: { type: "string" }, description: "Labels to apply" },
              assignee: { type: "string", description: "Assignee username/ID" },
              priority: { type: "number", description: "Priority (0-4, Linear only)" },
            },
            required: ["title", "description", "platform"],
          },
        },
        {
          name: "get_linear_issue",
          description: "Get details of a specific Linear issue",
          inputSchema: {
            type: "object",
            properties: {
              issueId: { type: "string", description: "Linear issue ID" },
            },
            required: ["issueId"],
          },
        },
        {
          name: "list_linear_issues",
          description: "List Linear issues, optionally filtered by team",
          inputSchema: {
            type: "object",
            properties: {
              teamId: { type: "string", description: "Filter by team ID (optional)" },
              limit: { type: "number", description: "Maximum number of issues to return (default: 50)" },
            },
          },
        },
        {
          name: "list_linear_teams",
          description: "List all Linear teams",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_github_issue",
          description: "Get details of a specific GitHub issue",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              issueNumber: { type: "number", description: "Issue number" },
            },
            required: ["owner", "repo", "issueNumber"],
          },
        },
        {
          name: "list_github_issues",
          description: "List GitHub issues in a repository",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              state: { type: "string", enum: ["open", "closed", "all"], description: "Issue state (default: open)" },
              limit: { type: "number", description: "Maximum number of issues to return (default: 50)" },
            },
            required: ["owner", "repo"],
          },
        },
        {
          name: "update_github_issue",
          description: "Update a GitHub issue",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              issueNumber: { type: "number", description: "Issue number" },
              title: { type: "string", description: "New title (optional)" },
              body: { type: "string", description: "New body/description (optional)" },
              state: { type: "string", enum: ["open", "closed"], description: "New state (optional)" },
              labels: { type: "array", items: { type: "string" }, description: "New labels (optional)" },
              assignees: { type: "array", items: { type: "string" }, description: "New assignees (optional)" },
            },
            required: ["owner", "repo", "issueNumber"],
          },
        },
        {
          name: "sync_issue",
          description: "Sync an issue between GitHub and Linear (create corresponding issue on other platform)",
          inputSchema: {
            type: "object",
            properties: {
              sourceplatform: { type: "string", enum: ["github", "linear"], description: "Source platform" },
              sourceId: { type: "string", description: "Source issue ID/number" },
              targetOwner: { type: "string", description: "Target GitHub repo owner (if syncing to GitHub)" },
              targetRepo: { type: "string", description: "Target GitHub repo name (if syncing to GitHub)" },
              targetTeamId: { type: "string", description: "Target Linear team ID (if syncing to Linear)" },
              syncMode: { type: "string", enum: ["one-way", "bidirectional"], description: "Sync mode (default: one-way)" },
            },
            required: ["sourceplatform", "sourceId"],
          },
        },
        // === LUCITRA-SPECIFIC MCP TOOLS ===
        {
          name: "create_hybrid_issue",
          description: "Create coordinated issues in both GitHub (technical) and Linear (business) for complex projects",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Issue title" },
              description: { type: "string", description: "Issue description" },
              owner: { type: "string", description: "GitHub repo owner" },
              repo: { type: "string", description: "GitHub repo name" },
              teamId: { type: "string", description: "Linear team ID" },
              labels: { type: "array", items: { type: "string" }, description: "Labels to apply to both issues" },
              assignee: { type: "string", description: "Assignee username/ID" },
              priority: { type: "number", description: "Priority (0-4, Linear only)" },
            },
            required: ["title", "description", "owner", "repo", "teamId"],
          },
        },
        {
          name: "prepare_agent_ready",
          description: "Analyze a GitHub issue and prepare it for Copilot agent work",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              issueNumber: { type: "number", description: "Issue number" },
            },
            required: ["owner", "repo", "issueNumber"],
          },
        },
        {
          name: "generate_mcp_labels",
          description: "Generate Lucitra-standard MCP labels for an issue",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Issue title" },
              body: { type: "string", description: "Issue body/description" },
              platform: { type: "string", enum: ["github", "linear"], description: "Target platform" },
            },
            required: ["title", "body", "platform"],
          },
        },
        {
          name: "sync_cross_platform",
          description: "Check and sync status between linked GitHub and Linear issues",
          inputSchema: {
            type: "object",
            properties: {
              githubOwner: { type: "string", description: "GitHub repository owner" },
              githubRepo: { type: "string", description: "GitHub repository name" },
              githubIssueNumber: { type: "number", description: "GitHub issue number" },
              linearIssueId: { type: "string", description: "Linear issue ID (optional)" },
            },
            required: ["githubOwner", "githubRepo", "githubIssueNumber"],
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

          // === NEW ISSUE TRIAGE AND MANAGEMENT HANDLERS ===

          case "triage_issue": {
            const args = request.params.arguments as {
              title: string;
              description: string;
              labels?: string[];
            };
            
            const decision = triageIssue(args.title, args.description, args.labels);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(decision, null, 2),
                },
              ],
            };
          }

          case "create_issue": {
            const args = request.params.arguments as unknown as CreateIssueInput;
            
            let result;
            if (args.platform === "github") {
              result = await createGitHubIssue(args);
            } else {
              result = await createLinearIssue(args);
            }
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_linear_issue": {
            const args = request.params.arguments as {
              issueId: string;
            };
            
            const issue = await getLinearIssueDetails(args.issueId);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(issue, null, 2),
                },
              ],
            };
          }

          case "list_linear_issues": {
            const args = request.params.arguments as {
              teamId?: string;
              limit?: number;
            };
            
            const issues = await listLinearIssues(args.teamId, args.limit);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(issues, null, 2),
                },
              ],
            };
          }

          case "list_linear_teams": {
            const teams = await listLinearTeams();
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(teams, null, 2),
                },
              ],
            };
          }

          case "get_github_issue": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              issueNumber: number;
            };
            
            const issue = await getGitHubIssue(args.owner, args.repo, args.issueNumber);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(issue, null, 2),
                },
              ],
            };
          }

          case "list_github_issues": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              state?: "open" | "closed" | "all";
              limit?: number;
            };
            
            const issues = await listGitHubIssues(args.owner, args.repo, args.state, args.limit);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(issues, null, 2),
                },
              ],
            };
          }

          case "update_github_issue": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              issueNumber: number;
              title?: string;
              body?: string;
              state?: "open" | "closed";
              labels?: string[];
              assignees?: string[];
            };
            
            const { owner, repo, issueNumber, ...updates } = args;
            const issue = await updateGitHubIssue(owner, repo, issueNumber, updates);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(issue, null, 2),
                },
              ],
            };
          }

          case "sync_issue": {
            const args = request.params.arguments as {
              sourceplatform: "github" | "linear";
              sourceId: string;
              targetOwner?: string;
              targetRepo?: string;
              targetTeamId?: string;
              syncMode?: "one-way" | "bidirectional";
            };
            
            let sourceIssue;
            let targetIssue;
            
            // Get source issue
            if (args.sourceplatform === "github") {
              if (!args.targetOwner || !args.targetRepo) {
                throw new Error("targetOwner and targetRepo required when source is GitHub");
              }
              sourceIssue = await getGitHubIssue(args.targetOwner, args.targetRepo, parseInt(args.sourceId));
              
              // Create corresponding Linear issue
              if (!args.targetTeamId) {
                throw new Error("targetTeamId required when syncing GitHub issue to Linear");
              }
              
              targetIssue = await createLinearIssue({
                title: sourceIssue.title,
                description: `Synced from GitHub: ${sourceIssue.url}\n\n${sourceIssue.body}`,
                platform: "linear",
                teamId: args.targetTeamId,
                labels: sourceIssue.labels.map(l => l.name),
              });
            } else {
              sourceIssue = await getLinearIssueDetails(args.sourceId);
              
              // Create corresponding GitHub issue
              if (!args.targetOwner || !args.targetRepo) {
                throw new Error("targetOwner and targetRepo required when syncing Linear issue to GitHub");
              }
              
              targetIssue = await createGitHubIssue({
                title: sourceIssue.title,
                description: `Synced from Linear: ${sourceIssue.url}\n\n${sourceIssue.description}`,
                platform: "github",
                owner: args.targetOwner,
                repo: args.targetRepo,
                labels: sourceIssue.labels?.map(l => l.name) || [],
              });
            }
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    source: sourceIssue,
                    target: targetIssue,
                    syncMode: args.syncMode || "one-way",
                    synced: true,
                  }, null, 2),
                },
              ],
            };
          }

          // === LUCITRA-SPECIFIC MCP HANDLERS ===

          case "create_hybrid_issue": {
            const args = request.params.arguments as unknown as CreateIssueInput & {
              owner: string;
              repo: string;
              teamId: string;
            };
            
            const hybridInput = {
              ...args,
              platform: "hybrid" as const,
            };
            
            const result = await createHybridIssue(hybridInput);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "prepare_agent_ready": {
            const args = request.params.arguments as {
              owner: string;
              repo: string;
              issueNumber: number;
            };
            
            const githubIssue = await getGitHubIssue(args.owner, args.repo, args.issueNumber);
            const agentReady = prepareAgentReadyIssue(githubIssue);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(agentReady, null, 2),
                },
              ],
            };
          }

          case "generate_mcp_labels": {
            const args = request.params.arguments as {
              title: string;
              body: string;
              platform: "github" | "linear";
            };
            
            const labels = generateMCPLabels(
              { title: args.title, body: args.body },
              args.platform
            );
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ labels, platform: args.platform }, null, 2),
                },
              ],
            };
          }

          case "sync_cross_platform": {
            const args = request.params.arguments as {
              githubOwner: string;
              githubRepo: string;
              githubIssueNumber: number;
              linearIssueId?: string;
            };
            
            const githubIssue = await getGitHubIssue(
              args.githubOwner,
              args.githubRepo,
              args.githubIssueNumber
            );
            
            const syncStatus = await syncCrossPlatformStatus(githubIssue, args.linearIssueId);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(syncStatus, null, 2),
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
    console.error("Linear-GitHub Bridge MCP server running on stdio");
  }
}

const server = new GitHubServer();
server.run().catch(console.error);
