# Publishing setup

This repository publishes the npm tool and its GitHub release after checks pass on `main`.
Caller repositories publish only their own tags and GitHub releases.

Before merging:

1. Confirm ownership and availability of `@le0u0/release-workflows` on npm.
2. Complete npm package creation and configure a GitHub Actions trusted publisher:
   user `le0u0`, repository `workflows`, workflow filename `ci.yml`.
3. Allow direct `npm publish`; stage-only permission does not support this pipeline.

The publisher uses OIDC (`id-token: write`) and `GITHUB_TOKEN` (`contents: write`).
Caller workflows need only `contents: write`.

`0.0.0-development` is a source placeholder. semantic-release sets the published package's
version in CI without pushing version-bump commits. Initial qualifying release: `1.0.0`.

Package ownership, registry availability, trusted publishing, and live releases remain unverified.
Local validation uses tests and `npm pack`; it never publishes.

Reference: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
