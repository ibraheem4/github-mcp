import express from "express";
import { Octokit } from "@octokit/rest";
import { config } from "../../config/index.js";

export const router = express.Router();

interface CreatePRBody {
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

const getDiffContent = async (
  owner: string,
  repo: string,
  pullNumber: number
) => {
  const octokit = new Octokit({
    auth: config.github.privateKey,
  });

  const { data: comparison } = await octokit.repos.compareCommits({
    owner,
    repo,
    base: "main",
    head: "dev",
  });

  return (
    comparison.files?.map((file) => ({
      file: file.filename,
      additions: file.additions,
      deletions: file.deletions,
      changes:
        file.patch
          ?.split("\n")
          .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
          .map((line) => line.substring(1)) || [],
    })) || []
  );
};

const formatPRDescription = async (
  owner: string,
  repo: string,
  pullNumber: number,
  data: CreatePRBody
): Promise<string> => {
  const template = `## Overview

Provide a high-level summary of the purpose of this PR. Mention the problem it solves or the feature it introduces.

## Key Changes

${
  data.keyChanges?.map((change) => `- ${change}`).join("\n") ||
  "Summarize the important changes made in this PR. Use bullet points for clarity."
}

## Code Highlights

${
  data.codeHighlights?.map((highlight) => `- ${highlight}`).join("\n") ||
  "Mention specific code changes or configurations that are worth noting. This helps reviewers focus on critical areas."
}

## Testing

${
  data.testing?.map((test) => `- ${test}`).join("\n") ||
  "Describe how the changes were tested and any relevant test results. Ensure the PR includes all necessary tests and indicate the environment where tests were performed."
}

## Checklist

- [ ] Code follows project standards
- [ ] All tests passing
- [ ] Documentation updated (if applicable)
- [ ] Tested in staging environment
- [ ] Includes relevant screenshots, diagrams, or videos demonstrating the change

## Links

- [Staging Environment preview](https://app-staging.getarchitecthealth.com/)${
    data.links?.length
      ? "\n" +
        data.links.map((link) => `- [${link.title}](${link.url})`).join("\n")
      : ""
  }

## Attachments

<!-- Screenshots will be added during review if needed -->

## Additional Notes

${
  data.additionalNotes ||
  "Add any additional information that the reviewer might need to know. Mention pending tasks or technical debt, if any."
}

---

### Linear Issue Tagging

${
  data.issueIds?.length
    ? data.issueIds.map((id) => `fixes ${id}`).join("\n")
    : "**Format:** Use `fixes {LINEAR_ISSUE_ID}` or `closes {LINEAR_ISSUE_ID}` to automatically link and close issues on Linear when the PR is merged."
}`;

  return template;
};

// Create a new PR
router.post("/create", async (req, res) => {
  try {
    const prData: CreatePRBody = req.body;
    const octokit = new Octokit({
      auth: config.github.privateKey,
    });

    const description = await formatPRDescription(
      prData.owner,
      prData.repo,
      0,
      prData
    );

    const response = await octokit.pulls.create({
      owner: prData.owner,
      repo: prData.repo,
      title: prData.title,
      body: description || prData.body,
      head: prData.head,
      base: prData.base,
    });

    res.json({
      status: "success",
      data: response.data,
    });
  } catch (error) {
    console.error("Error creating PR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create pull request",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// List PRs
router.get("/list", async (req, res) => {
  try {
    const { owner, repo, state = "open" } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({
        status: "error",
        message: "Owner and repo parameters are required",
      });
    }

    const octokit = new Octokit({
      auth: config.github.privateKey,
    });

    const response = await octokit.pulls.list({
      owner: owner as string,
      repo: repo as string,
      state: state as "open" | "closed" | "all",
    });

    res.json({
      status: "success",
      data: response.data,
    });
  } catch (error) {
    console.error("Error listing PRs:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to list pull requests",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Update PR
router.patch("/:pullNumber", async (req, res) => {
  try {
    const { owner, repo, title, body, state } = req.body;
    const pullNumber = parseInt(req.params.pullNumber);

    if (!owner || !repo) {
      return res.status(400).json({
        status: "error",
        message: "Owner and repo parameters are required",
      });
    }

    const octokit = new Octokit({
      auth: config.github.privateKey,
    });

    // If no body provided, generate one from diff
    // Get PR details to get head and base
    const { data: prDetails } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    const description =
      body ||
      (await formatPRDescription(owner, repo, pullNumber, {
        owner,
        repo,
        title,
        head: prDetails.head.ref,
        base: prDetails.base.ref,
      }));

    const response = await octokit.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
      title,
      body: description,
      state,
    });

    res.json({
      status: "success",
      data: response.data,
    });
  } catch (error) {
    console.error("Error updating PR:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update pull request",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
