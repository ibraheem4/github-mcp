import { Octokit } from "@octokit/rest";
import {
  FileChange,
  PullRequestChange,
  BranchDiff,
  DiffAnalysis,
} from "../types/index.js";
import { LinearIssue, LinearAttachment } from "../types/linear.js";

interface PRTemplateSection {
  name: string;
  content: string;
}

interface FormattedPRBody {
  overview: string;
  keyChanges: string[];
  codeHighlights: string[];
  testing: string[];
  links: string[];
  attachments: string[];
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN environment variable is required");
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

export async function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = "dev"
): Promise<void> {
  // Get the SHA of the source branch
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${fromBranch}`,
  });

  // Create new branch
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha,
  });
}

export async function getExistingPR(
  owner: string,
  repo: string,
  head: string,
  base: string
) {
  const { data: prs } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
    head: `${owner}:${head}`,
    base,
  });
  return prs[0];
}

export async function updatePR(
  owner: string,
  repo: string,
  prNumber: number,
  params: {
    title?: string;
    body?: string;
  }
) {
  const { data: pr } = await octokit.pulls.update({
    owner,
    repo,
    pull_number: prNumber,
    ...params,
  });
  return pr;
}

async function getPRTemplate(
  owner: string,
  repo: string
): Promise<string | null> {
  try {
    // Try to get the pull request template from different common locations
    const templatePaths = [
      ".github/pull_request_template.md",
      ".github/PULL_REQUEST_TEMPLATE.md",
      "docs/pull_request_template.md",
      "PULL_REQUEST_TEMPLATE.md",
    ];

    for (const path of templatePaths) {
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path,
        });

        if ("content" in data) {
          return Buffer.from(data.content, "base64").toString();
        }
      } catch (error) {
        continue; // Try next path if this one fails
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching PR template:", error);
    return null;
  }
}

function formatLinearIssueForPR(issue: LinearIssue): FormattedPRBody {
  const formatted: FormattedPRBody = {
    overview: issue.description || "",
    keyChanges: [],
    codeHighlights: [],
    testing: [],
    links: [`[Linear Issue ${issue.id}](${issue.url})`],
    attachments: [],
  };

  // Extract key changes from description using bullet points
  const bulletPoints = issue.description?.match(/[-*]\s+([^\n]+)/g) || [];
  formatted.keyChanges = bulletPoints.map((point: string) => point.trim());

  // Add any attachments/images from Linear
  if (issue.attachments?.length) {
    formatted.attachments = issue.attachments.map(
      (img: LinearAttachment) =>
        `<img width="758" alt="${img.title || "Screenshot"}" src="${img.url}">`
    );
  }

  return formatted;
}

function fillPRTemplate(template: string, formatted: FormattedPRBody): string {
  let filledTemplate = template;

  // Fill Overview section
  filledTemplate = filledTemplate.replace(
    /## Overview.*?(?=## |$)/s,
    `## Overview\n\n${formatted.overview}\n\n`
  );

  // Fill Key Changes section
  const keyChangesContent = formatted.keyChanges.length
    ? formatted.keyChanges.map((change) => `- ${change}`).join("\n")
    : "- Initial implementation";
  filledTemplate = filledTemplate.replace(
    /## Key Changes.*?(?=## |$)/s,
    `## Key Changes\n\n${keyChangesContent}\n\n`
  );

  // Fill Testing section
  const testingContent = formatted.testing.length
    ? formatted.testing.join("\n")
    : "- [ ] Tested locally\n- [ ] Unit tests added/updated\n- [ ] Integration tests added/updated";
  filledTemplate = filledTemplate.replace(
    /## Testing.*?(?=## |$)/s,
    `## Testing\n\n${testingContent}\n\n`
  );

  // Fill Links section
  const linksContent = formatted.links.join("\n");
  filledTemplate = filledTemplate.replace(
    /## Links.*?(?=## |$)/s,
    `## Links\n\n${linksContent}\n\n`
  );

  // Fill Attachments section
  if (formatted.attachments.length) {
    const attachmentsContent = formatted.attachments.join("\n");
    filledTemplate = filledTemplate.replace(
      /## Attachments.*?(?=## |$)/s,
      `## Attachments\n\n${attachmentsContent}\n\n`
    );
  }

  return filledTemplate;
}

export async function createPR(params: {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
  linearIssue?: LinearIssue;
}) {
  let body = params.body;

  // If we have a Linear issue and no specific body provided, try to use PR template
  if (params.linearIssue && !params.body) {
    const template = await getPRTemplate(params.owner, params.repo);
    if (template) {
      const formatted = formatLinearIssueForPR(params.linearIssue);
      body = fillPRTemplate(template, formatted);
    }
  }

  const { data: pr } = await octokit.pulls.create({
    ...params,
    body,
    maintainer_can_modify: true,
  });

  return pr;
}

async function getPRDetails(owner: string, repo: string, number: number) {
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: number,
  });

  // Get PR body to check for referenced issues
  const bodyMatches = pr.body?.match(/\b([A-Z]+-\d+)\b/g) || [];
  const titleMatches = pr.title.match(/\b([A-Z]+-\d+)\b/g) || [];

  // Combine and deduplicate Linear issues
  const linearIssues = [...new Set([...titleMatches, ...bodyMatches])];

  return {
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    mergedAt: pr.merged_at!,
    author: pr.user?.login || "unknown",
    body: pr.body || "",
    linearIssues,
  };
}

export async function getMergedPRs(
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<PullRequestChange[]> {
  // Get comparison between base and head
  const { data: comparison } = await octokit.repos.compareCommits({
    owner,
    repo,
    base,
    head,
  });

  // Get all PRs merged between these commits
  const { data: prs } = await octokit.pulls.list({
    owner,
    repo,
    state: "closed",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  });

  // Filter PRs that were merged between the comparison range
  const mergedPRs = prs.filter((pr) => {
    return (
      pr.merged_at &&
      pr.merge_commit_sha &&
      comparison.commits.some((commit) => commit.sha === pr.merge_commit_sha)
    );
  });

  // Get detailed information for each PR including referenced Linear issues
  const prDetails = await Promise.all(
    mergedPRs.map((pr) => getPRDetails(owner, repo, pr.number))
  );

  return prDetails;
}

export async function analyzeChanges(
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<{
  files: FileChange[];
  prs: PullRequestChange[];
}> {
  const [{ data: comparison }, prs] = await Promise.all([
    octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    }),
    getMergedPRs(owner, repo, base, head),
  ]);

  const files =
    comparison.files?.map((file) => ({
      filePath: file.filename,
      additions: file.additions,
      deletions: file.deletions,
    })) || [];

  return {
    files,
    prs,
  };
}

export async function getBranchDiff(
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<BranchDiff> {
  const { files } = await analyzeChanges(owner, repo, base, head);

  const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
  const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);

  // Group files by directory for better analysis
  const filesByDir = files.reduce((acc, file) => {
    const dir = file.filePath.split("/")[0];
    if (!acc[dir]) acc[dir] = [];
    acc[dir].push(file);
    return acc;
  }, {} as Record<string, FileChange[]>);

  // Generate summary based on changes
  const dirChanges = Object.entries(filesByDir).map(([dir, files]) => {
    const adds = files.reduce((sum, f) => sum + f.additions, 0);
    const dels = files.reduce((sum, f) => sum + f.deletions, 0);
    return `${dir} (${files.length} files, +${adds} -${dels})`;
  });

  const analysis: DiffAnalysis = {
    changedFiles: files,
    totalAdditions,
    totalDeletions,
    summary: `Changed ${files.length} files across ${
      Object.keys(filesByDir).length
    } directories: ${dirChanges.join(", ")}`,
  };

  return {
    files,
    analysis,
  };
}

export function generatePRTitle(
  diff: BranchDiff,
  prs: PullRequestChange[]
): string {
  // Analyze PR types (feat, fix, etc.)
  const prTypes = prs.reduce((acc: Record<string, number>, pr) => {
    const type = pr.title
      .split(":")[0]
      .replace(/^\[.*\]\s*/, "")
      .trim();
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const mainTypes = Object.entries(prTypes)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([type]) => type);

  // Get main components changed
  const { analysis } = diff;
  const mainDirs = Object.entries(
    analysis.changedFiles.reduce(
      (acc: Record<string, number>, file: FileChange) => {
        const dir = file.filePath.split("/")[0];
        if (!acc[dir]) acc[dir] = 0;
        acc[dir]++;
        return acc;
      },
      {} as Record<string, number>
    )
  )
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 2)
    .map(([dir]) => dir);

  // Generate descriptive title based on PR content
  const typeStr = mainTypes.length > 0 ? mainTypes.join("/") : "chore";

  // Extract key changes from PR titles
  const prSummaries = prs.map((pr) => {
    const [, ...summary] = pr.title.split(":").map((s) => s.trim());
    return summary
      .join(":")
      .replace(/^\[.*\]\s*/, "")
      .replace(/:+$/, "");
  });

  // Use the most significant PR summary or fallback to components
  const summary =
    prSummaries.length > 0
      ? prSummaries[0]
      : `update ${mainDirs.join(" and ")} components`;

  return `release: ${typeStr} ${summary}`;
}
