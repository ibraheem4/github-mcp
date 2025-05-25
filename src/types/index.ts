import { LinearIssue } from "./linear.js";

// API Request Types
export interface CreatePRBody {
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
}

export interface CreateFeaturePrInput {
  owner: string;
  repo: string;
  linearIssueId: string;
  base?: string;
  title?: string;
  description?: string;
}

export interface CreateReleasePrInput {
  owner: string;
  repo: string;
  head?: string;
  base?: string;
  title?: string;
  generateTitle?: boolean;
}

export interface DiffAnalysis {
  changedFiles: FileChange[];
  totalAdditions: number;
  totalDeletions: number;
  summary: string;
}

export interface BranchDiff {
  files: FileChange[];
  analysis: DiffAnalysis;
}

// API Response Types
export interface APIResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
  error?: string;
}

export interface FileChange {
  filePath: string;
  additions: number;
  deletions: number;
}

export interface PullRequestChange {
  number: number;
  title: string;
  url: string;
  mergedAt: string;
  author: string;
  body: string;
  linearIssues: string[];
}

// Issue Triage Types
export interface IssueTriageInput {
  title: string;
  description: string;
  labels?: string[];
  assignee?: string;
  priority?: "low" | "medium" | "high" | "urgent";
}

export interface TriageDecision {
  platform: "github" | "linear" | "hybrid";
  reasoning: string;
  confidence: number; // 0-1
  suggestedLabels?: string[];
  isEngineering: boolean;
  githubLabels?: string[]; // Labels for GitHub issue
  linearLabels?: string[]; // Labels for Linear issue
  mcpLabels?: string[]; // MCP-specific labels
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: Array<{ name: string; color: string }>;
  assignee?: {
    login: string;
    id: number;
  };
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueSync {
  githubIssue?: GitHubIssue;
  linearIssue?: string; // Linear issue ID
  syncDirection: "github-to-linear" | "linear-to-github" | "bidirectional";
  lastSynced: string;
}

export interface CreateIssueInput {
  title: string;
  description: string;
  platform: "github" | "linear" | "hybrid";
  owner?: string; // GitHub repo owner
  repo?: string; // GitHub repo name
  teamId?: string; // Linear team ID
  labels?: string[];
  assignee?: string;
  priority?: number; // Linear priority (0-4)
  mcpLabels?: string[]; // MCP-specific labels
}

export interface HybridIssueResult {
  githubIssue?: GitHubIssue;
  linearIssue?: LinearIssue;
  crossReferenced: boolean;
  platform: "hybrid";
}

export interface AgentReadyIssue {
  issue: GitHubIssue;
  agentCompatible: boolean;
  complexityLevel: "simple" | "moderate" | "complex";
  estimatedHours?: number;
  prerequisities?: string[];
}

export interface CrossPlatformStatus {
  githubIssue?: {
    number: number;
    state: "open" | "closed";
    lastUpdated: string;
  };
  linearIssue?: {
    id: string;
    status: string;
    lastUpdated: string;
  };
  syncStatus: "synced" | "drift" | "conflict";
  lastSyncTime: string;
}
