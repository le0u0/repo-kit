#!/usr/bin/env bash
# Usage: setup/apply.sh owner/repo
set -euo pipefail

repo=${1:?usage: apply.sh owner/repo}
dir=$(cd "$(dirname "$0")" && pwd)

id=$(gh api "repos/$repo/rulesets" --jq '.[] | select(.name == "protected-main") | .id')
if [ -n "$id" ]; then
  gh api -X PUT "repos/$repo/rulesets/$id" --input "$dir/protected-main.json" --silent
else
  gh api -X POST "repos/$repo/rulesets" --input "$dir/protected-main.json" --silent
fi

gh api -X PUT "repos/$repo/actions/permissions/workflow" \
  -F can_approve_pull_request_reviews=true --silent

echo "applied to $repo"
