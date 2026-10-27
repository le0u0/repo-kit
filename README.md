# repo-kit

Shared GitHub setup for my repositories. One Claude Code skill applies all of it to a repo:

- **Release workflow**: a reusable workflow that turns Conventional Commits on `main` into a version-bump pull request, then into a tag and GitHub release once you merge that PR. Nothing is ever pushed to `main` directly.
- **Repository settings**: the `protected-main` ruleset and the Actions permission the release workflow needs, applied by `setup/apply.sh`.
- **Skill** `setup-repo`: checks what the repo already has, applies the missing settings, and opens a PR with the release workflow.

## How it works

```
setup-repo skill in the target repo
        │
        ├─ settings already match ──▶ skipped
        ├─ settings missing ────────▶ setup/apply.sh applies them
        └─ release.yml missing ─────▶ PR adds the caller file
```

## Release workflow

### Flow

```
feature PR merged to main
        │
        ▼
Release workflow runs on push to main
        │
        ▼
release-please reads commits since the last release
        │
        ├─ no feat/fix/breaking commits ──▶ nothing happens
        │
        ▼
opens (or updates) one "release PR"
  - bumps the version
  - updates CHANGELOG.md
        │
        ▼
you review and merge the release PR
        │
        ▼
release-please creates the tag (vX.Y.Z) and the GitHub release
```

The version bump comes from the commit types since the last release:

| Commit | Bump |
| --- | --- |
| `fix: ...` | patch (1.0.0 → 1.0.1) |
| `feat: ...` | minor (1.0.0 → 1.1.0) |
| `feat!: ...` or a `BREAKING CHANGE:` footer | major (1.0.0 → 2.0.0) |
| `docs:`, `chore:`, `refactor:`, `ci:`, ... | no release |

If you squash-merge, the **PR title** becomes the commit message, so it must follow this format. A title like `Update stuff` produces no release and no error.

The shared logic lives in this repository. Each repository that uses it contains only a short caller file that points here at `@main`, so a change merged here applies to every repository on its next run. It runs [release-please](https://github.com/googleapis/release-please-action) under the hood.

## Set up a repository

Ask the `setup-repo` skill (see [Skill](#skill)), or do these steps by hand in every repository that should use the Release workflow.

1. **Allow Actions to open PRs.** Settings → Actions → General → turn on "Allow GitHub Actions to create and approve pull requests".

2. **Add the caller file** `.github/workflows/release.yml`:

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
       uses: le0u0/repo-kit/.github/workflows/release.yml@main
       with:
         release-type: node # optional, default: node
   ```

3. **Commit it to `main`** through a normal PR.

## Use it day to day

1. Merge PRs to `main` with conventional titles (`feat: ...`, `fix: ...`).
2. After each merge, release-please opens or updates the release PR. It collects every releasable change since the last release.
3. When you want to ship, review the release PR (version and changelog) and merge it.
4. The tag and GitHub release are created automatically.

## Options

| Input | Default | Description |
| --- | --- | --- |
| `release-type` | `node` | release-please release type, such as `node`, `python`, `simple`. It decides which files get the version bump. Ignored when `config-file` is set. |
| `config-file` | none | Path to the release-please config, such as `.github/release-please-config.json`. Set it for repos with several independently versioned packages. |
| `manifest-file` | none | Path to the release-please manifest, such as `.github/release-please-manifest.json`. Set it together with `config-file`. |

## Several packages in one repository

A repository with several folders that each have their own version (a monorepo) can version them independently. Every package gets its own release PR, changelog, and tag (`<package>-vX.Y.Z`), and only commits that touch its folder count toward its version.

Add two files under `.github/`. This example has two Node packages, `package-a` and `package-b`. Package keys are folder paths relative to the repository root.

`.github/release-please-config.json`
```json
{
  "packages": {
    "package-a": { "release-type": "node" },
    "package-b": { "release-type": "node" }
  }
}
```

`.github/release-please-manifest.json` holds each package's current version:
```json
{
  "package-a": "1.0.0",
  "package-b": "1.2.3"
}
```

To bump a version stored in another file, such as a JSON manifest, use `simple` and list the file under `extra-files`:

```json
"package-a": {
  "release-type": "simple",
  "package-name": "package-a",
  "extra-files": [
    { "type": "json", "path": "config/info.json", "jsonpath": "$.version" }
  ]
}
```

`simple` packages need `package-name` to get a per-package tag (`package-a-vX.Y.Z`). Without it the tag is a bare `vX.Y.Z`, and two `simple` packages collide.

Then point the caller at both files:

```yaml
jobs:
  release:
    uses: le0u0/repo-kit/.github/workflows/release.yml@main
    with:
      config-file: .github/release-please-config.json
      manifest-file: .github/release-please-manifest.json
```

Add one entry to `packages` for each new folder. The `simple` type also writes a `version.txt` inside each package folder.

## Troubleshooting

- **No release PR appears.** No `feat`, `fix`, or breaking commit since the last release, or the merged PR title was not conventional.
- **Workflow fails with a permission error opening the PR.** Turn on the repository setting in step 1.
- **"workflow not found" in the caller.** This repository's Actions access does not allow other repositories to use its workflows.

## Repository setup

`setup/apply.sh` applies the standard GitHub settings to a repository:

```sh
setup/apply.sh owner/repo
```

- Ruleset `protected-main` on `main`: restrict deletion, block force pushes, require a pull request before merging (`setup/protected-main.json`).
- Actions: allow GitHub Actions to create and approve pull requests.

Safe to run again: it updates the existing ruleset in place and the Actions setting is just set to the same value. A `protected-main` ruleset you customized in a repo is overwritten, so check it first. Requires `gh` with admin access to the repository.

"Auto-close issues with merged linked pull requests" is on by default and has no API field, so the script does not touch it.

## Skill

`skills/setup-repo` is a Claude Code skill that applies the settings and the Release workflow to a repository. See its [README](skills/setup-repo/README.md).

## License

MIT. See [LICENSE](LICENSE).
