# setup-release-workflow

Claude Code skill that adds automated releases (version bump, changelog, tags) to a GitHub repository using the shared release workflow in this repository.

## What it does

1. Reads the root `README.md` of this repository for the current setup steps.
2. Fills the caller workflow from the target repo: default branch and release type.
3. Lists existing release automation and replaces it only with your agreement.
4. Opens a PR named `ci: add release workflow`.
5. Tells you the repository setting you must turn on yourself.

## Repositories with several packages or plugins

If the repo has several independently versioned packages, or several plugin folders (each with `.claude-plugin/plugin.json`), the skill sets up the multi-package config. Each package is versioned on its own. A single-package setup would bump every plugin when any one changes.

## Install

Clone this repository and link the skill into your personal skills folder:

```sh
git clone https://github.com/le0u0/repo-kit.git
ln -s "$PWD/repo-kit/skills/setup-release-workflow" ~/.claude/skills/setup-release-workflow
```

Restart Claude Code. Pull the clone to update the skill.

## Use

Ask Claude Code in the target repository: "set up release workflow", "automate releases", or "add version bump".
