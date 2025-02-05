# GitHub Pull Request Workflows

This document outlines the complete PR workflow system for managing changes from Linear issues through to production releases.

## Overview

The workflow system consists of two main paths:
1. Linear Issue → Feature Branch → Dev (feature development)
2. Dev → Main (releases)

## Quick Start

### 1. Feature Development (Linear → Dev)
```typescript
// Convert Linear issue to PR
<use_mcp_tool>
<server_name>github-pr-ibraheem4</server_name>
<tool_name>create_feature_pr</tool_name>
<arguments>
{
  "owner": "getarchitecthealth",
  "repo": "architect-frontend",
  "linearIssueId": "ARC-119"
}
</arguments>
</use_mcp_tool>
```

### 2. Release (Dev → Main)
```typescript
// Create release PR
<use_mcp_tool>
<server_name>github-pr-ibraheem4</server_name>
<tool_name>create_release_pr</tool_name>
<arguments>
{
  "owner": "getarchitecthealth",
  "repo": "architect-frontend"
}
</arguments>
</use_mcp_tool>
```

## Feature Development Workflow

### Process
1. Start with Linear issue ID
2. Create feature branch with standardized naming
3. Implement changes
4. Create PR into dev
5. Link back to Linear issue

### PR Template
```markdown
## Overview
[Linear issue description]

---

## Key Changes
- Change 1
- Change 2

---

## Code Highlights
- Implementation detail 1
- Implementation detail 2

---

## Testing
- [ ] Changes tested locally
- [ ] Automated tests added/updated
- [ ] UI changes verified

---

### Issue Tagging
Fixes [LINEAR-ID]
```

## Release Workflow

### Process
1. Review changes in dev branch
2. Create release PR to main
3. Include all merged PRs since last release
4. Review and merge

### PR Template
```markdown
## Overview
Merge latest development changes into main branch

---

## Key Changes
- Change 1 (PR #XX)
- Change 2 (PR #YY)

---

## Included Pull Requests
[Automatically generated list of PRs]

---

## Testing
- [ ] All changes tested in dev
- [ ] All tests passing
- [ ] Documentation updated
```

## Additional Examples

### 1. Update PR After Review
```typescript
// Update PR with review feedback
<use_mcp_tool>
<server_name>github-pr-ibraheem4</server_name>
<tool_name>create_feature_pr</tool_name>
<arguments>
{
  "owner": "getarchitecthealth",
  "repo": "architect-frontend",
  "linearIssueId": "ARC-119",
  "title": "[Updated] Feature implementation",
  "description": "Updates based on review feedback:\n\n" +
                "- Improved error handling\n" +
                "- Added more test cases\n" +
                "- Updated documentation"
}
</arguments>
</use_mcp_tool>
```

### 2. Create and Track PR Status
```typescript
// Create feature PR and monitor status
const createResponse = await use_mcp_tool({
  server_name: "github-pr-ibraheem4",
  tool_name: "create_feature_pr",
  arguments: {
    owner: "getarchitecthealth",
    repo: "architect-frontend",
    linearIssueId: "ARC-119"
  }
});

// PR details are in the response
console.log(`PR URL: ${createResponse.url}`);
console.log(`PR Number: ${createResponse.number}`);
console.log(`Branch: ${createResponse.branch}`);
console.log(`Linear Issue: ${createResponse.linearIssue.url}`);
```

## Implementation

### Location
GitHub PR MCP server at `/Users/ibraheem/Projects/github-mcp/`

### New Tools

1. **create_feature_pr**
```typescript
interface CreateFeaturePrInput {
  owner: string;
  repo: string;
  linearIssueId: string;
  base?: string;
  title?: string;
  description?: string;
}
```

2. **create_release_pr**
```typescript
interface CreateReleasePrInput {
  owner: string;
  repo: string;
  head?: string;
  base?: string;
  title?: string;
}
```

### Implementation Steps

1. Add Tool Definitions:
```typescript
// src/tools/index.ts
export const tools = {
  create_feature_pr: {
    name: 'create_feature_pr',
    description: 'Create a feature PR from Linear issue',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        linearIssueId: { type: 'string' },
        base: { type: 'string', default: 'dev' },
        title: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['owner', 'repo', 'linearIssueId']
    }
  },
  create_release_pr: {
    name: 'create_release_pr',
    description: 'Create a release PR from dev to main',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        head: { type: 'string', default: 'dev' },
        base: { type: 'string', default: 'main' },
        title: { type: 'string' }
      },
      required: ['owner', 'repo']
    }
  }
};
```

2. Add Handlers:
```typescript
// src/handlers/createFeaturePr.ts
export async function handleCreateFeaturePr(input: CreateFeaturePrInput) {
  const issue = await getLinearIssue(input.linearIssueId);
  const branchName = await createFeatureBranch(input.linearIssueId, issue.title);
  const description = input.description || generatePRDescription(issue);

  const pr = await createPR({
    ...input,
    head: branchName,
    base: input.base || 'dev',
    title: input.title || generatePRTitle(issue),
    body: description
  });

  return {
    url: pr.html_url,
    number: pr.number,
    branch: branchName,
    linearIssue: {
      id: issue.id,
      title: issue.title,
      url: issue.url
    }
  };
}

// src/handlers/createReleasePr.ts
export async function handleCreateReleasePr(input: CreateReleasePrInput) {
  const changes = await analyzeChanges(
    input.owner,
    input.repo,
    input.base || 'main',
    input.head || 'dev'
  );

  const description = generatePRDescription(changes);

  const pr = await createPR({
    ...input,
    body: description
  });

  return {
    url: pr.html_url,
    number: pr.number,
    changes
  };
}
```

3. Register Tools:
```typescript
// src/index.ts
import { tools } from './tools';
import { handleCreateFeaturePr } from './handlers/createFeaturePr';
import { handleCreateReleasePr } from './handlers/createReleasePr';

export function registerTools(server: Server) {
  server.registerTool('create_feature_pr', handleCreateFeaturePr);
  server.registerTool('create_release_pr', handleCreateReleasePr);
}
```

## Benefits

1. **Automation**
   - Standardized branch naming
   - Automatic PR generation
   - Linear issue integration

2. **Consistency**
   - Uniform PR formats
   - Proper issue linking
   - Clear documentation

3. **Efficiency**
   - Reduced manual steps
   - Automated change tracking
   - Streamlined releases

## Example Usage

### Feature Development
```bash
# User provides Linear issue ID
Can you read ARC-119 from Linear using MCP and then make the necessary fixes?

# Cline:
# 1. Reads Linear issue
# 2. Creates feature branch
# 3. Makes changes
# 4. Creates PR to dev
```

### Release
```bash
# User requests release
Create a PR from dev to main

# Cline:
# 1. Analyzes changes since last release
# 2. Creates comprehensive PR
# 3. Links all included PRs
```

## Testing

1. Feature PR Creation:
```typescript
// Test creating feature PR
const result = await createFeaturePr({
  owner: "getarchitecthealth",
  repo: "architect-frontend",
  linearIssueId: "ARC-119"
});

// Verify:
// - Branch created
// - PR created
// - Linear issue linked
```

2. Release PR Creation:
```typescript
// Test creating release PR
const result = await createReleasePr({
  owner: "getarchitecthealth",
  repo: "architect-frontend"
});

// Verify:
// - All changes included
// - PRs properly linked
// - Description formatted correctly
```

## Maintenance

1. Regular Tasks:
   - Review and update PR templates
   - Monitor Linear integration
   - Update documentation

2. Error Handling:
   - Linear API issues
   - GitHub API rate limits
   - Branch conflicts

3. Updates:
   - Keep dependencies current
   - Monitor API changes
   - Update templates as needed
