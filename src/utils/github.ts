import { Octokit } from "@octokit/rest";
import { config } from "../config/index.js";
import { FileChange, PullRequestChange } from "../types/index.js";

const octokit = new Octokit({
  auth: config.github.privateKey,
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

  return mergedPRs.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    mergedAt: pr.merged_at!,
    author: pr.user?.login || "unknown",
  }));
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
