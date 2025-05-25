import { LinearClient } from "@linear/sdk";
import { config } from "../config/index.js";
import { 
  PullRequestChange, 
  CreateIssueInput, 
  TriageDecision, 
  HybridIssueResult,
  AgentReadyIssue,
  GitHubIssue
} from "../types/index.js";
import { LinearIssue } from "../types/linear.js";
import { createGitHubIssue } from "./github.js";

const linearClient = new LinearClient({
  apiKey: config.linear.apiKey,
});

export interface LinearIssueSimple {
  id: string;
  title: string;
  description: string;
  url: string;
  branchName: string;
}

export async function getLinearIssue(issueId: string): Promise<LinearIssueSimple> {
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

// === NEW ISSUE TRIAGE AND MANAGEMENT FUNCTIONS ===

export async function getLinearIssueDetails(issueId: string): Promise<LinearIssue> {
  const issue = await linearClient.issue(issueId);
  
  if (!issue) {
    throw new Error(`Linear issue ${issueId} not found`);
  }

  try {
    const state = await issue.state;
    const assignee = await issue.assignee;

    return {
      id: issueId,
      title: issue.title,
      description: issue.description || "",
      url: issue.url,
      status: state?.name,
      priority: issue.priority,
      assignee: assignee ? {
        id: assignee.id,
        name: assignee.name,
        email: assignee.email,
      } : undefined,
      labels: [], // Simplified for now
      createdAt: issue.createdAt?.toISOString(),
      updatedAt: issue.updatedAt?.toISOString(),
    };
  } catch (error) {
    // Fallback to basic info if advanced fields fail
    return {
      id: issueId,
      title: issue.title,
      description: issue.description || "",
      url: issue.url,
      labels: [],
    };
  }
}

export async function listLinearIssues(teamId?: string, limit: number = 50): Promise<LinearIssue[]> {
  const issuesQuery = teamId 
    ? await linearClient.issues({ filter: { team: { id: { eq: teamId } } }, first: limit })
    : await linearClient.issues({ first: limit });
    
  const issues = await issuesQuery;
  
  return Promise.all(issues.nodes.map(async (issue: any) => {
    try {
      const state = await issue.state;
      const assignee = await issue.assignee;
      
      return {
        id: issue.id,
        title: issue.title,
        description: issue.description || "",
        url: issue.url,
        status: state?.name,
        priority: issue.priority,
        assignee: assignee ? {
          id: assignee.id,
          name: assignee.name,
          email: assignee.email,
        } : undefined,
        labels: [], // Simplified for now
        createdAt: issue.createdAt?.toISOString(),
        updatedAt: issue.updatedAt?.toISOString(),
      };
    } catch (error) {
      // Fallback to basic info
      return {
        id: issue.id,
        title: issue.title,
        description: issue.description || "",
        url: issue.url,
        labels: [],
      };
    }
  }));
}

export async function createLinearIssue(input: CreateIssueInput): Promise<LinearIssue> {
  if (!input.teamId) {
    throw new Error("teamId is required for creating Linear issues");
  }

  const issueInput = {
    title: input.title,
    description: input.description,
    teamId: input.teamId,
    priority: input.priority,
    assigneeId: input.assignee,
  };

  const issuePayload = await linearClient.createIssue(issueInput);
  const createdIssue = await issuePayload.issue;

  if (!createdIssue) {
    throw new Error("Failed to create Linear issue");
  }

  try {
    const state = await createdIssue.state;
    const assignee = await createdIssue.assignee;

    return {
      id: createdIssue.id,
      title: createdIssue.title,
      description: createdIssue.description || "",
      url: createdIssue.url,
      status: state?.name,
      priority: createdIssue.priority,
      assignee: assignee ? {
        id: assignee.id,
        name: assignee.name,
        email: assignee.email,
      } : undefined,
      labels: [], // Simplified for now
      createdAt: createdIssue.createdAt?.toISOString(),
      updatedAt: createdIssue.updatedAt?.toISOString(),
    };
  } catch (error) {
    // Fallback to basic info
    return {
      id: createdIssue.id,
      title: createdIssue.title,
      description: createdIssue.description || "",
      url: createdIssue.url,
      labels: [],
    };
  }
}

export async function listLinearTeams() {
  const teams = await linearClient.teams();
  return teams.nodes.map(team => ({
    id: team.id,
    name: team.name,
    key: team.key,
    description: team.description,
  }));
}

export function triageIssue(title: string, description: string, labels: string[] = []): TriageDecision {
  const text = `${title} ${description}`.toLowerCase();
  const labelText = labels.join(" ").toLowerCase();
  
  // Lucitra-specific engineering keywords (GitHub)
  const engineeringKeywords = [
    // Code changes required
    'bug', 'error', 'crash', 'fix', 'code', 'debug', 'debugging',
    'feature', 'implement', 'enhancement', 'refactor', 'refactoring',
    
    // Technical infrastructure  
    'api', 'endpoint', 'database', 'sql', 'schema', 'migration',
    'server', 'client', 'infrastructure', 'devops', 'deployment',
    'terraform', 'docker', 'ci/cd', 'pipeline', 'build',
    
    // Security and performance
    'security', 'vulnerability', 'patch', 'ssl', 'certificate',
    'performance', 'optimization', 'memory', 'cpu', 'load', 'scale',
    
    // Development stack
    'javascript', 'typescript', 'react', 'node', 'python', 'golang',
    'frontend', 'backend', 'web', 'mobile', 'responsive',
    'authentication', 'authorization', 'oauth', 'jwt',
    
    // Testing and quality
    'test', 'testing', 'unit test', 'integration test', 'qa',
    'review', 'pull request', 'merge', 'branch',
    
    // Dependencies and libraries
    'dependency', 'library', 'package', 'version', 'update', 'upgrade',
    
    // ReefHR specific technical terms
    'reefhr', 'payroll', 'integration', 'clover', 'payment processing'
  ];
  
  // Lucitra-specific business keywords (Linear)
  const businessKeywords = [
    // Product strategy
    'strategy', 'roadmap', 'planning', 'product', 'vision',
    'requirements', 'specification', 'analysis', 'research',
    
    // Market and customer
    'market', 'customer', 'user', 'client', 'feedback',
    'competitive', 'positioning', 'value proposition',
    
    // Design and UX (non-implementation)
    'design', 'ux', 'user experience', 'wireframe', 'mockup',
    'prototype', 'user flow', 'user journey', 'persona',
    
    // Business operations
    'budget', 'revenue', 'pricing', 'cost', 'roi', 'profit',
    'sales', 'marketing', 'campaign', 'promotion', 'branding',
    
    // Compliance and legal
    'compliance', 'legal', 'gdpr', 'privacy', 'policy',
    'regulation', 'audit', 'certification', 'standard',
    
    // People and process
    'hr', 'hiring', 'recruiting', 'onboarding', 'training',
    'process', 'workflow', 'procedure', 'documentation',
    'meeting', 'discussion', 'decision', 'approval',
    
    // Partnerships and vendors
    'partnership', 'vendor', 'supplier', 'contract', 'procurement',
    'negotiation', 'relationship', 'agreement'
  ];

  // Hybrid indicators (both platforms needed)
  const hybridKeywords = [
    'large feature', 'epic', 'project launch', 'major release',
    'compliance implementation', 'security initiative', 
    'platform migration', 'system overhaul', 'integration project'
  ];

  let engineeringScore = 0;
  let businessScore = 0;
  let hybridScore = 0;

  // Check for engineering keywords with weighted scoring
  engineeringKeywords.forEach(keyword => {
    if (text.includes(keyword) || labelText.includes(keyword)) {
      // Higher weight for definitive technical terms
      if (['bug', 'error', 'crash', 'api', 'database', 'deployment'].includes(keyword)) {
        engineeringScore += 3;
      } else if (keyword.length > 8) {
        engineeringScore += 2;
      } else {
        engineeringScore += 1;
      }
    }
  });

  // Check for business keywords with weighted scoring
  businessKeywords.forEach(keyword => {
    if (text.includes(keyword) || labelText.includes(keyword)) {
      // Higher weight for definitive business terms
      if (['strategy', 'roadmap', 'compliance', 'budget', 'customer'].includes(keyword)) {
        businessScore += 3;
      } else if (keyword.length > 8) {
        businessScore += 2;
      } else {
        businessScore += 1;
      }
    }
  });

  // Check for hybrid indicators
  hybridKeywords.forEach(keyword => {
    if (text.includes(keyword) || labelText.includes(keyword)) {
      hybridScore += 4;
    }
  });

  // Lucitra-specific special cases
  if (text.includes('copilot') || text.includes('ai agent') || text.includes('automation')) {
    engineeringScore += 5; // Strong indicator for GitHub
  }

  if (text.includes('agent/available') || text.includes('agent-ready')) {
    engineeringScore += 5; // Definitely engineering
  }

  if (text.includes('customer request') || text.includes('business requirement')) {
    businessScore += 4;
  }

  // Determine classification
  const totalScore = engineeringScore + businessScore + hybridScore;
  let platform: "github" | "linear" | "hybrid";
  let isEngineering: boolean;
  let confidence: number;

  if (hybridScore > 0 && hybridScore >= Math.max(engineeringScore, businessScore)) {
    platform = "hybrid";
    isEngineering = false; // Will create both
    confidence = hybridScore / totalScore;
  } else if (engineeringScore > businessScore) {
    platform = "github";
    isEngineering = true;
    confidence = totalScore > 0 ? engineeringScore / totalScore : 0.5;
  } else {
    platform = "linear";
    isEngineering = false;
    confidence = totalScore > 0 ? businessScore / totalScore : 0.5;
  }

  // Generate Lucitra-standard labels
  let suggestedLabels: string[] = [];
  
  if (platform === "github" || platform === "hybrid") {
    // GitHub MCP labels
    suggestedLabels.push('mcp/agent-ready');
    
    if (text.includes('bug') || text.includes('error')) {
      suggestedLabels.push('type/bug');
    } else if (text.includes('feature') || text.includes('implement')) {
      suggestedLabels.push('type/feature');
    } else if (text.includes('security')) {
      suggestedLabels.push('type/security');
    } else if (text.includes('infrastructure') || text.includes('devops')) {
      suggestedLabels.push('type/infrastructure');
    }
    
    // Component labels
    if (text.includes('api')) suggestedLabels.push('component/api');
    if (text.includes('web') || text.includes('frontend')) suggestedLabels.push('component/web');
    if (text.includes('database')) suggestedLabels.push('component/database');
    
    // Add agent-available label
    suggestedLabels.push('agent/available');
  }
  
  if (platform === "linear" || platform === "hybrid") {
    // Linear labels
    if (text.includes('product')) suggestedLabels.push('Product Strategy');
    if (text.includes('business')) suggestedLabels.push('Business Requirements');
    if (text.includes('design') || text.includes('ux')) suggestedLabels.push('UX/Design');
    if (text.includes('customer')) suggestedLabels.push('Customer Feedback');
    if (text.includes('compliance')) suggestedLabels.push('Compliance');
    if (text.includes('marketing')) suggestedLabels.push('Marketing');
  }

  const detectedKeywords = [
    ...engineeringKeywords.filter(k => text.includes(k) || labelText.includes(k)),
    ...businessKeywords.filter(k => text.includes(k) || labelText.includes(k)),
    ...hybridKeywords.filter(k => text.includes(k) || labelText.includes(k))
  ];

  let reasoning: string;
  if (platform === "hybrid") {
    reasoning = `Hybrid issue detected requiring both business and technical work. Keywords: ${detectedKeywords.join(', ') || 'complex project indicators'}. Will create coordinated issues in both GitHub (for engineering) and Linear (for business coordination).`;
  } else if (platform === "github") {
    reasoning = `Engineering issue detected - requires code changes. Keywords: ${detectedKeywords.join(', ') || 'technical indicators'}. Best managed on GitHub for Copilot agent integration and technical collaboration.`;
  } else {
    reasoning = `Business/product issue detected - strategic or operational focus. Keywords: ${detectedKeywords.join(', ') || 'business indicators'}. Best managed on Linear for product workflow and business coordination.`;
  }

  return {
    platform: platform as "github" | "linear", // Cast for backward compatibility
    reasoning,
    confidence: Math.min(confidence * 1.1, 1.0), // Slight confidence boost, cap at 1.0
    suggestedLabels,
    isEngineering,
    githubLabels: platform === "github" || platform === "hybrid" ? 
      suggestedLabels.filter(l => l.startsWith('type/') || l.startsWith('component/') || l.includes('agent')) : undefined,
    linearLabels: platform === "linear" || platform === "hybrid" ? 
      suggestedLabels.filter(l => !l.includes('/') && !l.includes('agent')) : undefined,
    mcpLabels: platform === "github" || platform === "hybrid" ? 
      suggestedLabels.filter(l => l.startsWith('mcp/')) : undefined,
  };
}

// === LUCITRA-SPECIFIC MCP FUNCTIONS ===

export async function createHybridIssue(input: CreateIssueInput): Promise<HybridIssueResult> {
  if (input.platform !== "hybrid") {
    throw new Error("createHybridIssue requires platform to be 'hybrid'");
  }

  if (!input.owner || !input.repo) {
    throw new Error("GitHub owner and repo required for hybrid issues");
  }

  if (!input.teamId) {
    throw new Error("Linear teamId required for hybrid issues");
  }

  // Create GitHub issue with technical focus
  const githubIssue = await createGitHubIssue({
    ...input,
    platform: "github",
    title: `[Tech] ${input.title}`,
    description: `${input.description}\n\n---\n**MCP Bridge**: This is the technical implementation part of a hybrid issue. Business coordination tracked in Linear.`,
    labels: [...(input.labels || []), 'mcp/synced', 'agent/available', 'type/hybrid'],
  });

  // Create Linear issue with business focus
  const linearIssue = await createLinearIssue({
    ...input,
    platform: "linear",
    title: `[Business] ${input.title}`,
    description: `${input.description}\n\n---\n**MCP Bridge**: This is the business coordination part of a hybrid issue. Technical implementation tracked in GitHub.\n\nLinked GitHub Issue: ${githubIssue.url}`,
  });

  // Cross-reference the issues
  // Note: In a real implementation, you'd update the GitHub issue with the Linear URL
  // For now, we'll return the information for the caller to handle

  return {
    githubIssue,
    linearIssue,
    crossReferenced: true,
    platform: "hybrid",
  };
}

export function prepareAgentReadyIssue(issue: GitHubIssue): AgentReadyIssue {
  const title = issue.title.toLowerCase();
  const body = issue.body.toLowerCase();
  const text = `${title} ${body}`;

  // Assess agent compatibility
  const agentIncompatibleKeywords = [
    'requires human decision', 'needs stakeholder approval', 'complex architecture',
    'requires domain expertise', 'customer interaction', 'legal review',
    'multiple team coordination', 'breaking change'
  ];

  const agentCompatible = !agentIncompatibleKeywords.some(keyword => 
    text.includes(keyword)
  );

  // Determine complexity level
  let complexityLevel: "simple" | "moderate" | "complex" = "simple";
  let estimatedHours = 2;

  const complexityIndicators = {
    simple: ['bug fix', 'typo', 'update text', 'add field', 'simple validation'],
    moderate: ['new endpoint', 'feature enhancement', 'integration', 'refactor'],
    complex: ['architecture', 'migration', 'security', 'performance optimization', 'multi-component']
  };

  if (complexityIndicators.complex.some(indicator => text.includes(indicator))) {
    complexityLevel = "complex";
    estimatedHours = 16;
  } else if (complexityIndicators.moderate.some(indicator => text.includes(indicator))) {
    complexityLevel = "moderate";
    estimatedHours = 8;
  }

  // Identify prerequisites
  const prerequisites: string[] = [];
  if (text.includes('database')) prerequisites.push('Database access required');
  if (text.includes('test')) prerequisites.push('Test environment setup');
  if (text.includes('api')) prerequisites.push('API documentation review');
  if (text.includes('security')) prerequisites.push('Security requirements review');

  return {
    issue,
    agentCompatible,
    complexityLevel,
    estimatedHours,
    prerequisities: prerequisites.length > 0 ? prerequisites : undefined,
  };
}

export function generateMCPLabels(issue: { title: string; body: string }, platform: "github" | "linear"): string[] {
  const text = `${issue.title} ${issue.body}`.toLowerCase();
  const labels: string[] = [];

  if (platform === "github") {
    // Standard MCP GitHub labels
    labels.push('mcp/agent-ready');
    
    if (text.includes('sync') || text.includes('linear')) {
      labels.push('mcp/synced');
    }
    
    if (text.includes('human') || text.includes('decision') || text.includes('approval')) {
      labels.push('mcp/needs-human');
    }
    
    if (text.includes('business') || text.includes('product') || text.includes('strategy')) {
      labels.push('mcp/business-input');
    }

    // Agent availability assessment
    const agentReady = prepareAgentReadyIssue(issue as GitHubIssue);
    if (agentReady.agentCompatible) {
      labels.push('agent/available');
      labels.push(`complexity/${agentReady.complexityLevel}`);
    }
  }

  if (platform === "linear") {
    // Linear MCP labels
    if (text.includes('implement') || text.includes('code') || text.includes('technical')) {
      labels.push('Technical Implementation');
    }
    
    if (text.includes('agent') || text.includes('copilot')) {
      labels.push('Agent Available');
    }
    
    if (text.includes('research') || text.includes('analysis') || text.includes('investigate')) {
      labels.push('Research Required');
    }
  }

  return labels;
}

export async function syncCrossPlatformStatus(githubIssue: GitHubIssue, linearIssueId?: string): Promise<any> {
  // This would typically check status across platforms and return sync information
  // For now, return a placeholder implementation
  return {
    githubIssue: {
      number: githubIssue.number,
      state: githubIssue.state,
      lastUpdated: githubIssue.updatedAt,
    },
    linearIssue: linearIssueId ? {
      id: linearIssueId,
      status: "Unknown", // Would fetch from Linear API
      lastUpdated: new Date().toISOString(),
    } : undefined,
    syncStatus: "synced",
    lastSyncTime: new Date().toISOString(),
  };
}
