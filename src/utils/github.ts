import { Octokit } from "@octokit/rest";
import { FileChange, PullRequestChange } from "../types/index.js";

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

export async function createPR(params: {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
}) {
  const { data: pr } = await octokit.pulls.create({
    ...params,
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
