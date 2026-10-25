# Shared release workflow

Conventional Commits produce independent caller version tags and GitHub releases with generated notes.

- **Here:** reusable workflow, semantic-release configuration, locked release dependencies.
- **Callers:** build, lint, tests, deployment. No semantic-release dependencies needed;
  remove existing caller-side release configuration.

Releases use the caller's full Git history, only on pushes to its `main` branch.
Only `GITHUB_TOKEN` with `contents: write` is required; no `secrets: inherit` needed.
No npm publishing, version-bump commits, package version edits, issue/PR comments, or labels.

## Use

Add `.github/workflows/ci.yml` to the caller. Adapt checks and Node version to the project.
List every required check job in `release.needs`; failed or skipped checks block release.
Do not add `always()` to the release condition.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6.1.0
      - uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6.5.0
        with:
          node-version: '24'
          package-manager-cache: false
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  release:
    needs: [checks]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: write
    uses: le0u0/workflows/.github/workflows/release.yml@main
    with:
      tooling-ref: main
```

After setup merges, replace **both** `@main` and `tooling-ref: main` with the **same full
commit SHA** or published shared-workflow tag. A SHA is immutable; tags can move.
No shared-workflow tag exists yet. Both references are needed for the separate tooling checkout.

Releases are serialized per caller. Avoid the same concurrency group in caller workflows.
Keep deployment in caller jobs: tags/releases created with `GITHUB_TOKEN` do not trigger
other Actions workflows.

## Versions

- `fix:` produces a patch: `1.2.3` to `1.2.4`.
- `feat:` produces a minor: `1.2.3` to `1.3.0`.
- Any type with `!` or a `BREAKING CHANGE:` footer produces a major: `1.2.3` to `2.0.0`.
- Non-release changes such as `docs:` and `chore:` alone produce no release. Highest bump wins.

Squash merges must preserve the Conventional Commit subject and breaking-change footer.
Without existing release tags, all reachable commits are analyzed; the first warranted
release is **`v1.0.0`**. Otherwise nothing is published. Existing reachable `vX.Y.Z` tags
set the baseline; later releases analyze commits since the last applicable tag.

`package.json` and lockfile versions stay unchanged. Caller tags/releases own version history.

## Access

Keep this tooling repository **public**; public and private callers are supported.
Private/internal workflow-sharing access alone does not let a caller's `GITHUB_TOKEN`
read the separate tooling checkout. Private tooling needs a different authentication design.

Caller Actions policies must allow this workflow, `actions/checkout`, and `actions/setup-node`.
Organization policies must permit `contents: write`; tag rules must allow release-tag creation.

## Validate

With Node.js 24.10+ (24.x), run:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

Tests use disposable local remotes and dry runs, without credentials or the GitHub plugin.
They verify versions, notes, branch exclusion, and unchanged files/refs. Live GitHub execution
and token/tag-rule access remain unverified. Preset 9.3.1 matches the notes generator's writer 8.

References: [semantic-release](https://semantic-release.gitbook.io/semantic-release/usage/configuration),
[GitHub plugin](https://github.com/semantic-release/github#options),
[reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows).
