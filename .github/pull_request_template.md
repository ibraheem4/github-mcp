## Overview

Summarize the purpose of this PR in one or two sentences. Highlight the problem it solves, the feature it introduces, or the improvement it delivers.

**Example:**

- Introduces automated deployment scripts for staging and production environments.
- Fixes a bug in the state management logic affecting API calls during user login.

---

## Key Changes

List the most critical changes made in this PR. Use concise bullet points for clarity.

**Examples:**

- Refactored state management logic in `auth.ts` to optimize API performance.
- Added a new workflow (`ci-pipeline.yml`) for automated testing and deployment.
- Replaced `lodash` with `native JavaScript functions` to reduce bundle size.

---

## Code Highlights

Identify specific sections of the code or configurations worth extra attention. These are areas where review feedback is especially important.

**Examples:**

- Introduced new models (e.g., `UserPreferencesModel`) in `models.ts`.
- Updated Dockerfile with multi-stage builds for production optimization.
- Adjusted state handling logic in `Redux` to include error handling for edge cases.

---

## Testing

Outline how the changes were tested and any relevant test results. Specify the test environment (e.g., local, staging).

**Examples:**

- Unit tests added for `auth.ts`, covering all API response scenarios.
- End-to-end tests verified successful user sign-in and profile update workflows.
- Staging environment tests confirmed workflow automation for CI/CD.

---

## Checklist

- [ ] Code adheres to project conventions.
- [ ] Relevant tests are included, and all pass successfully.
- [ ] Documentation updated (if applicable).
- [ ] Changes verified in a staging or test environment.
- [ ] Screenshots, diagrams, or videos attached (if relevant).

---

## Links

Include relevant links for review, such as environment previews, design documentation, or related issues.

**Examples:**

- [Staging Environment](https://example-staging.myapp.com)
- [Related Design Document](https://design-docs.example.com/new-feature)

---

## Attachments

Attach any supporting materials like screenshots, videos, or diagrams to enhance the reviewer's understanding of the changes.

**Examples:**

<!-- <img width="800" alt="Screenshot 1" src="https://example.com/screenshots/screenshot1.png"> -->
<!-- <img width="600" alt="Diagram 1" src="https://example.com/diagrams/diagram1.svg"> -->

---

## Additional Notes

Provide any extra details or context for the reviewer, such as known limitations, technical debt, or pending tasks.

---

### Issue Tagging (Optional)

For integrations like Linear, Jira, or GitHub Issues, include tags to auto-link issues.

**Format:** `fixes {ISSUE_ID}` or `closes {ISSUE_ID}`.

**Examples:**

- `fixes ENG-321`
- `closes BUG-101`

---
