---
name: setup-repo
description: Set up the current GitHub repo with the shared le0u0/repo-kit standards - the protected-main ruleset, Actions permission to create PRs, and the automated release workflow (version bump, changelog, tags). Use for "set up this repo", "apply my repo settings", "add ruleset", "automate releases", "add release workflow", release-please, semantic versioning.
---

# Setup repo

The README at `le0u0/repo-kit` is the source of truth and changes over time. Fetch it fresh each run.

## Steps

1. Fetch the README: `gh api repos/le0u0/repo-kit/contents/README.md -H "Accept: application/vnd.github.raw"`. Follow sections "Repository setup" and "Set up a repository". Done when you can name each value the workflow file needs.
2. Settings. Fetch `setup/apply.sh` and `setup/protected-main.json` from `le0u0/repo-kit` into one temp directory.
   - Read the current state first: `gh api repos/<owner>/<repo>/rulesets` and `gh api repos/<owner>/<repo>/actions/permissions/workflow`.
   - Already matching: skip, say so.
   - A ruleset named `protected-main` that differs from the template: show the difference and overwrite only after the user agrees.
   - Otherwise run `apply.sh <owner>/<repo>`. Done when each setting is reported as applied or already present.
3. Release workflow. Skip when `.github/workflows/release.yml` already calls `le0u0/repo-kit`. Otherwise fill the values from the repo:
   - `on.push.branches`: the repo's default branch.
   - `release-type`: `node` when `package.json` exists, else `simple` (README "Options").
   - Several independently versioned packages (e.g. one folder per package): follow README section "Several packages in one repository" instead of setting `release-type`.
   - Several plugins in one repo (more than one folder containing `.claude-plugin/plugin.json`, or one per entry in `.claude-plugin/marketplace.json`): treat each plugin folder as a package. A single-package setup bumps every plugin when any one changes. Use `release-type: simple` with `package-name` set to the plugin name and `extra-files` pointing at `<folder>/.claude-plugin/plugin.json` with `jsonpath: $.version`. Seed the manifest with each plugin's current `version`.
4. Inventory existing release automation: `.releaserc*`, `release.config.*`, a `release` key in `package.json`, `release-please-config.json`, other `release*.yml`. Done when every match is shown to the user, or "none found" is stated. Replace a match only after the user agrees, since it may be their working release process.
5. Branch from the default branch, commit `ci: add release workflow`, open a PR with the same title. Settings from step 2 are already live; the ruleset applies to this PR too.
6. Tell the user releases come only from conventional commit or PR titles (`feat:`, `fix:`). Done when the PR is open and the settings are reported.
