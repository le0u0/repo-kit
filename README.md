# @le0u0/release-workflows

## Description

An npm CLI that installs and updates local GitHub Actions release workflows.

## How it works

The generated release job runs after your required checks succeed on `main`.
Conventional Commits determine versions: `fix` = patch, `feat` = minor, breaking change = major.
Each repository gets independent version tags and GitHub releases with generated notes.
The first qualifying release is `v1.0.0`; existing release tags set the baseline.

CI uses the installed npm package; it does not fetch workflows or tooling from this repository.
Caller releases never publish to npm, edit version fields, or comment/label issues and PRs.
Remove existing semantic-release configuration before adopting this package.

## Install and set up

Requires Node.js 24.10+ (24.x), npm, and a published package version.

```sh
npm install --save-dev --save-exact @le0u0/release-workflows
npx release-workflows setup --needs checks
```

This updates `.github/workflows/ci.yml`, preserving other jobs.
Replace `checks` with your required job IDs; use `--workflow path` for another file.
Existing YAML requires confirmation before replacement; the default answer is no.

To create a new workflow, supply your check commands:

```sh
npx release-workflows setup --check "npm run lint && npm test && npm run build"
```

To upgrade:

```sh
npm install --save-dev --save-exact @le0u0/release-workflows@latest
npx release-workflows setup
```

Commit `package.json`, `package-lock.json`, and the workflow. The release job uses
`GITHUB_TOKEN` with `contents: write`; repository rules must permit release tags.

## License

MIT. See [LICENSE](LICENSE).

## References

- [semantic-release](https://semantic-release.gitbook.io/semantic-release/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions](https://docs.github.com/en/actions)
