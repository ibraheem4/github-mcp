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
