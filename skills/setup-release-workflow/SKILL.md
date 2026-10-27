---
name: setup-release-workflow
description: Add automated releases (version bump, changelog, tags) to the current GitHub repo with the shared le0u0/repo-kit release workflow. Use for "set up version bump", "automate releases", "add release workflow", release-please, semantic versioning.
---

# Setup release workflow

The README at `le0u0/repo-kit` is the source of truth and changes over time. Fetch it fresh each run.

## Steps

1. Fetch the README: `gh api repos/le0u0/repo-kit/contents/README.md -H "Accept: application/vnd.github.raw"`. Follow section "Set up a repository". Done when you can name each value the workflow file needs.
2. Fill the values from the repo:
   - `on.push.branches`: the repo's default branch.
   - `release-type`: `node` when `package.json` exists, else `simple` (README "Options").
   - Several independently versioned packages (e.g. one folder per package): follow README section "Several packages in one repository" instead of setting `release-type`.
   - Several plugins in one repo (more than one folder containing `.claude-plugin/plugin.json`, or one per entry in `.claude-plugin/marketplace.json`): treat each plugin folder as a package. A single-package setup bumps every plugin when any one changes. Use `release-type: simple` with `package-name` set to the plugin name and `extra-files` pointing at `<folder>/.claude-plugin/plugin.json` with `jsonpath: $.version`. Seed the manifest with each plugin's current `version`.
3. Inventory existing release automation: `.releaserc*`, `release.config.*`, a `release` key in `package.json`, `release-please-config.json`, other `release*.yml`. Done when every match is shown to the user, or "none found" is stated. Replace a match only after the user agrees, since it may be their working release process.
4. Branch from the default branch, commit `ci: add release workflow`, open a PR with the same title.
5. Report the repository setting the user must turn on themselves (the README names it). Also tell them releases come only from conventional commit or PR titles (`feat:`, `fix:`). Done when the PR is open and the setting is reported.
