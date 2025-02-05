import { LinearClient } from "@linear/sdk";
import { config } from "../config/index.js";
import { PullRequestChange } from "../types/index.js";

const linearClient = new LinearClient({
  apiKey: config.linear.apiKey,
});

export interface LinearIssue {
  id: string;
  title: string;
  description: string;
  url: string;
  branchName: string;
}

export async function getLinearIssue(issueId: string): Promise<LinearIssue> {
  const issue = await linearClient.issue(issueId);
  const issueData = await issue;

  if (!issueData) {
    throw new Error(`Linear issue ${issueId} not found`);
  }

  // Create a branch name from the issue ID and title
  const branchName = `feature/${issueId.toLowerCase()}-${issueData.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;

  return {
    id: issueId,
    title: issueData.title,
    description: issueData.description || "",
    url: `https://linear.app/issue/${issueId}`,
    branchName,
  };
}

export function generateFeaturePRDescription(issue: LinearIssue): string {
  return `## Overview
${issue.description}

---

## Key Changes
- Initial implementation for ${issue.title}

---

## Code Highlights
- Implementation details will be added during development

---

## Testing
- [ ] Changes tested locally
- [ ] Automated tests added/updated
- [ ] UI changes verified

---

### Issue Tagging
Fixes ${issue.id}`;
}

export function generateReleasePRDescription(
  changes: PullRequestChange[]
): string {
  const prList = changes
    .map((pr) => `- #${pr.number} ${pr.title} (@${pr.author})`)
    .join("\n");

  return `## Overview
Merge latest development changes into main branch

---

## Included Pull Requests
${prList}

---

## Testing
- [ ] All changes tested in dev
- [ ] All tests passing
- [ ] Documentation updated`;
}
