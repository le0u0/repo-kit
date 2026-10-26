# le0u0/workflows

## Description

Reusable GitHub Actions workflows shared across repositories.

## Release

`.github/workflows/release.yml` runs [release-please](https://github.com/googleapis/release-please-action)
on pushes to `main`. It reads Conventional Commits and opens a release PR that bumps the version
and changelog: `fix` = patch, `feat` = minor, breaking change (`!` or `BREAKING CHANGE:`) = major.
Merging that PR creates the tag and GitHub release. Other commit types (`docs`, `chore`, ...) make no release.
Squash-merge PR titles become the commit message, so they must be conventional.

Add this to `.github/workflows/release.yml` in each repository:

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    uses: le0u0/workflows/.github/workflows/release.yml@v1
    with:
      release-type: node # optional, default node
    secrets:
      token: ${{ secrets.RELEASE_TOKEN }} # optional
```

Requirements:

- Repository setting: Settings > Actions > General > "Allow GitHub Actions to create and approve pull requests".
- PRs opened with the default `GITHUB_TOKEN` do not trigger other workflows, so required checks will not
  run on the release PR. Pass a PAT or GitHub App token as `RELEASE_TOKEN` to fix this.
- This repository must be public, or its Actions access must allow other repositories to use it.

Callers follow the `@v1` tag; moving it updates every repository. Pin `@v1.2.3` to upgrade manually.

## License

MIT. See [LICENSE](LICENSE).
