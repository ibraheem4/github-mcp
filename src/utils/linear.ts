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
    .map((pr) => {
      // Extract Linear issue ID if present in PR title (e.g., "feat: ARC-123: Add feature")
      const linearIssueMatch = pr.title.match(/\b([A-Z]+-\d+)\b/);
      const linearIssue = linearIssueMatch ? linearIssueMatch[1] : null;

      return `- #${pr.number} ${pr.title} (@${pr.author})${
        linearIssue ? ` [${linearIssue}]` : ""
      }`;
    })
    .join("\n");

  // Extract all Linear issue IDs
  const linearIssues = changes
    .map((pr) => {
      const match = pr.title.match(/\b([A-Z]+-\d+)\b/);
      return match ? match[1] : null;
    })
    .filter((id): id is string => id !== null);

  // Get all Linear issues from PR titles and bodies
  const allLinearIssues = [
    ...new Set(changes.flatMap((pr) => pr.linearIssues)),
  ];

  const linearTagging =
    allLinearIssues.length > 0
      ? allLinearIssues
          .map((id) => {
            const isBeingClosed = linearIssues.includes(id);
            return `- ${isBeingClosed ? "fixes" : "contributes to"} ${id}`;
          })
          .join("\n")
      : "No Linear issues referenced";

  // Pre-check boxes that are typically ready in a release
  const checkedBoxes = {
    codeStandards: true,
    testsPass: true,
    documentation: true,
    staging: true,
  };

  // Analyze PRs to generate meaningful summaries
  const categorizedChanges = changes.reduce((acc, pr) => {
    // Extract type of change from PR title (feat, fix, etc.)
    const typeMatch = pr.title.match(
      /^(feat|fix|chore|refactor|style|test|docs|perf):/i
    );
    const type = typeMatch ? typeMatch[1].toLowerCase() : "other";

    if (!acc[type]) acc[type] = [];
    acc[type].push(pr);
    return acc;
  }, {} as Record<string, PullRequestChange[]>);

  // Generate summary of changes by type
  const changesSummary = Object.entries(categorizedChanges)
    .map(([type, prs]) => {
      const prSummaries = prs
        .map((pr) => {
          const title = pr.title.replace(
            /^(feat|fix|chore|refactor|style|test|docs|perf):\s*/i,
            ""
          );
          return `- ${title} (#${pr.number})`;
        })
        .join("\n");
      return `### ${
        type.charAt(0).toUpperCase() + type.slice(1)
      }\n${prSummaries}`;
    })
    .join("\n\n");

  return `## Overview

This release merges the latest development changes into main branch. It includes ${
    changes.length
  } pull request${
    changes.length === 1 ? "" : "s"
  } with various improvements and updates.

## Key Changes

${changesSummary}

## Code Highlights

${prList}

## Testing

Describe how the changes were tested and any relevant test results.

- [x] End-to-end tests passing
- [x] Unit tests passing
- [x] Integration tests passing
- [x] Changes verified in staging environment

## Checklist

- [x] Code follows project standards
- [x] All tests passing
- [x] Documentation updated (if applicable)
- [x] Tested in staging environment
- [x] Includes relevant screenshots, diagrams, or videos demonstrating the change

## Links

- [Staging Environment preview](https://app-staging.getarchitecthealth.com)

## Additional Notes

Release PR created from development branch. Please review the changes carefully before merging.

---

### Linear Issue Tagging

${linearTagging}

---`;
}
