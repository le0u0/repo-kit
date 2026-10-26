Copy everything below the line into your coding agent, from the root of the repository you want to set up.

---

Set up automated releases in this repository using the shared workflow `le0u0/workflows` (https://github.com/le0u0/workflows). It runs release-please: after Conventional Commits are merged to the default branch, it opens a release PR that bumps the version and changelog, and merging that PR creates the tag and GitHub release.

Do the following, in order:

1. Inspect the repository.
   - Find the default branch.
   - Decide the release type: `node` if there is a `package.json`, `python` for a Python package, otherwise `simple`.
   - Look for existing release automation: `.github/workflows/release*.yml`, `.releaserc*`, `release.config.*`, a `release` key in `package.json`, `release-please-config.json`, or semantic-release in `package.json`. If any exist, tell me what you found and ask before changing or removing them.

2. Create `.github/workflows/release.yml` with this content. Use the detected release type and default branch. If a file with that name already exists, do not overwrite it without asking.

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
       uses: le0u0/workflows/.github/workflows/release.yml@main
       with:
         release-type: node
   ```

3. Check that the YAML parses.

4. Do not push to the default branch. Create a branch, commit the file with the message `ci: add release workflow`, push it, and open a pull request with the same title.

5. Tell me what I must do myself, because it is a repository setting and not a file:
   - Settings, Actions, General: turn on "Allow GitHub Actions to create and approve pull requests". Do not change the setting yourself unless I ask.

6. Remind me of the rules once the PR is open:
   - Merge PRs with conventional titles such as `feat: ...` or `fix: ...`. Squash merges use the PR title as the commit message, and other types such as `chore:` or `docs:` produce no release.
   - The first release PR appears after the first `feat:` or `fix:` merge. I approve and merge it to create the tag and release.

Do not invent files, settings, or results. If something does not match these instructions, stop and ask.
