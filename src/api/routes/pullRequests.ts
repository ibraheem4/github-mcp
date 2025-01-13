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

const formatPRDescription = (data: CreatePRBody): string => {
  const sections = [
    data.overview && `## Overview\n${data.overview}`,
    data.keyChanges?.length &&
      `## Key Changes\n${data.keyChanges
        .map((change) => `- ${change}`)
        .join("\n")}`,
    data.codeHighlights?.length &&
      `## Code Highlights\n${data.codeHighlights
        .map((highlight) => `- ${highlight}`)
        .join("\n")}`,
    data.testing?.length &&
      `## Testing\n${data.testing.map((test) => `- ${test}`).join("\n")}`,
    data.links?.length &&
      `## Related Links\n${data.links
        .map((link) => `- [${link.title}](${link.url})`)
        .join("\n")}`,
    data.additionalNotes && `## Additional Notes\n${data.additionalNotes}`,
    data.issueIds?.length &&
      `## Related Issues\n${data.issueIds.map((id) => `- ${id}`).join("\n")}`,
  ].filter(Boolean);

  return sections.join("\n\n");
};

// Create a new PR
router.post("/create", async (req, res) => {
  try {
    const prData: CreatePRBody = req.body;
    const octokit = new Octokit({
      auth: config.github.privateKey,
    });

    const description = formatPRDescription(prData);

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

    const response = await octokit.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
      title,
      body,
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
