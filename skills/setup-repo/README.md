# setup-repo

Claude Code skill that sets up a GitHub repository with the standards in this repository: the `protected-main` ruleset, the Actions permission to create pull requests, and the automated release workflow.

## What it does

1. Reads the root `README.md` of this repository for the current setup steps.
2. Checks the repo's current ruleset and Actions permission. Settings that already match are skipped. A differing `protected-main` ruleset is overwritten only after you agree.
3. Adds the release caller workflow unless the repo already has it, filling default branch and release type from the target repo.
4. Lists existing release automation and replaces it only with your agreement.
5. Opens a PR named `ci: add release workflow`.

## Repositories with several packages or plugins

If the repo has several independently versioned packages, or several plugin folders (each with `.claude-plugin/plugin.json`), the skill sets up the multi-package config. Each package is versioned on its own. A single-package setup would bump every plugin when any one changes.

## Install

```sh
npx skills add le0u0/repo-kit
```

## Use

Ask Claude Code in the target repository: "set up this repo", "apply my repo settings", or "automate releases".
