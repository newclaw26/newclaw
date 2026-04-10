#!/bin/bash
# Deploy NewClaw Landing Page to GitHub Pages
# Usage: ./scripts/deploy-landing.sh
#
# Deploys docs/landing/index.html to the gh-pages branch as the site root.
# The page is fully self-contained (inline CSS/JS, no external assets).
#
# Prerequisites:
#   - git installed and authenticated with push access to the remote
#   - Run from the repository root directory
#
# What this script does:
#   1. Validates the landing page exists
#   2. Creates a temporary directory with just the landing page
#   3. Adds .nojekyll to bypass Jekyll processing
#   4. Force-pushes to the gh-pages branch
#   5. Cleans up the temporary directory
#
# After deploying, enable GitHub Pages in the repo settings:
#   Settings > Pages > Source: "Deploy from a branch" > Branch: gh-pages / (root)

set -euo pipefail

# ---- Configuration ----
REMOTE_URL="https://github.com/newclaw26/newclaw.git"
LANDING_SRC="docs/landing/index.html"
PAGES_URL="https://newclaw26.github.io/newclaw/"
BRANCH="gh-pages"

# ---- Resolve repo root ----
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "ERROR: Not inside a git repository. Run this script from within the newclaw repo."
    exit 1
}

cd "$REPO_ROOT"

# ---- Validate landing page exists ----
if [ ! -f "$LANDING_SRC" ]; then
    echo "ERROR: Landing page not found at $LANDING_SRC"
    echo "       Expected path: $REPO_ROOT/$LANDING_SRC"
    exit 1
fi

echo "Deploying NewClaw Landing Page to GitHub Pages..."
echo "  Source:  $REPO_ROOT/$LANDING_SRC"
echo "  Branch:  $BRANCH"
echo "  Remote:  $REMOTE_URL"
echo ""

# ---- Detect remote URL from git config (fall back to default) ----
CONFIGURED_REMOTE="$(git remote get-url origin 2>/dev/null)" || CONFIGURED_REMOTE=""
if [ -n "$CONFIGURED_REMOTE" ]; then
    REMOTE_URL="$CONFIGURED_REMOTE"
    echo "  Using remote from git config: $REMOTE_URL"
fi

# ---- Build deployment payload ----
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

cp "$LANDING_SRC" "$TEMP_DIR/index.html"

# .nojekyll prevents GitHub Pages from running Jekyll, which would
# ignore files starting with underscores and add unnecessary processing.
touch "$TEMP_DIR/.nojekyll"

# ---- Create isolated git repo and push ----
(
    cd "$TEMP_DIR"
    git init -q
    git checkout -q -b "$BRANCH"
    git add -A
    git commit -q -m "Deploy NewClaw Landing Page ($(date '+%Y-%m-%d %H:%M:%S'))"
    git remote add origin "$REMOTE_URL"
    echo "  Pushing to $BRANCH..."
    git push -f origin "$BRANCH"
)

echo ""
echo "Landing page deployed successfully."
echo ""
echo "Next steps:"
echo "  1. Go to https://github.com/newclaw26/newclaw/settings/pages"
echo "  2. Set Source to 'Deploy from a branch'"
echo "  3. Select branch: gh-pages / (root)"
echo "  4. Save -- the page will be live at: $PAGES_URL"
