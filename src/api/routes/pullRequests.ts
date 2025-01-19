import express from "express";
import { Octokit } from "@octokit/rest";
import { config } from "../../config/index.js";
import { LinearClient } from "@linear/sdk";

const linearClient = new LinearClient({
  apiKey: config.linear.apiKey,
});

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

const formatPRDescription = async (
  owner: string,
  repo: string,
  pullNumber: number,
  data: CreatePRBody
): Promise<string> => {
  const template = `## Overview

${
  data.overview ||
  "Provide a high-level summary of the purpose of this PR. What problem does it solve or what feature does it add?"
}

## Key Changes

${
  data.keyChanges?.map((change) => `- ${change}`).join("\n") ||
  "List the specific changes made in this PR:"
}

_Example:_
- Implemented new authentication flow
- Added form validation
- Updated API endpoints

## Code Highlights

${
  data.codeHighlights?.map((highlight) => `- ${highlight}`).join("\n") ||
  "Highlight important code changes that reviewers should focus on:"
}

_Example:_
- New middleware implementation in \`auth.ts\`
- Updated database schema in \`models/user.ts\`
- Added validation logic in \`utils/validate.ts\`

## Testing

${
  data.testing?.map((test) => `- ${test}`).join("\n") ||
  "Describe how these changes were tested:"
}

_Example:_
- Added unit tests for auth flow
- Tested form validation with various inputs
- Verified API responses in staging environment

## Checklist

- [ ] Code follows project standards
- [ ] All tests passing
- [ ] Documentation updated (if applicable)
- [ ] Tested in staging environment
- [ ] Screenshots/recordings added for UI changes

## Links

- [Staging Environment](https://app-staging.getarchitecthealth.com/)${
    data.links?.length
      ? "\n" +
        data.links.map((link) => `- [${link.title}](${link.url})`).join("\n")
      : ""
  }

## Attachments

<!-- Add screenshots, videos, or diagrams that help explain the changes -->

## Additional Notes

${
  data.additionalNotes ||
  "Include any additional context, technical debt notes, or follow-up tasks."
}

---

${
  data.issueIds?.length
    ? `## Linear Tickets

${data.issueIds.map((id) => `- fixes ${id}`).join("\n")}`
    : ""
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
