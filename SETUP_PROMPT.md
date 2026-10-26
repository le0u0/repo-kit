Copy everything below the line into your coding agent, from the root of the repository to set up.

---

Set up automated releases in this repository by following
https://raw.githubusercontent.com/le0u0/workflows/main/README.md (section "Set up a repository").

Adapt it to this repo:
- Use the repo's default branch in `on.push.branches`.
- Set `release-type` from the repo: `node` if there is a `package.json`, otherwise `simple` (see Options in the README).
- Look for existing release automation (`.releaserc*`, `release.config.*`, a `release` key in `package.json`, `release-please-config.json`, other `release*.yml`). Show me what you find and ask before replacing it.

Work on a new branch, commit with `ci: add release workflow`, and open a PR with the same title.

Done when the PR is open and you have told me which repository setting I must turn on myself.
