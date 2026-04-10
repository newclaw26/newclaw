#!/bin/bash
# Deploy NewClaw Public Site to GitHub Pages
# Usage: ./scripts/deploy-landing.sh
#
# Deploys the entire public-site/ directory (landing page + web demo)
# to the gh-pages branch as the site root.
#
# Site structure after deployment:
#   / (root)       -> Landing Page  (public-site/index.html)
#   /demo/         -> Web Demo      (public-site/demo/index.html)
#   /.nojekyll     -> Bypass Jekyll processing
#
# Prerequisites:
#   - git installed and authenticated with push access to the remote
#   - Run from the repository root directory
#
# What this script does:
#   1. Validates public-site/ directory and required files exist
#   2. Copies the entire public-site/ directory to a temp deploy dir
#   3. Force-pushes to the gh-pages branch
#   4. Cleans up the temporary directory
#
# After deploying, enable GitHub Pages in the repo settings:
#   Settings > Pages > Source: "Deploy from a branch" > Branch: gh-pages / (root)

set -euo pipefail

# ---- Configuration ----
REMOTE_URL="https://github.com/newclaw26/newclaw.git"
SITE_DIR="public-site"
PAGES_URL="https://newclaw26.github.io/newclaw/"
BRANCH="gh-pages"

# ---- Resolve repo root ----
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "ERROR: Not inside a git repository. Run this script from within the newclaw repo."
    exit 1
}

cd "$REPO_ROOT"

# ---- Validate public-site directory and required files ----
if [ ! -d "$SITE_DIR" ]; then
    echo "ERROR: Site directory not found at $SITE_DIR"
    echo "       Expected path: $REPO_ROOT/$SITE_DIR"
    exit 1
fi

if [ ! -f "$SITE_DIR/index.html" ]; then
    echo "ERROR: Landing page not found at $SITE_DIR/index.html"
    exit 1
fi

if [ ! -f "$SITE_DIR/demo/index.html" ]; then
    echo "ERROR: Web demo not found at $SITE_DIR/demo/index.html"
    exit 1
fi

echo "Deploying NewClaw Public Site to GitHub Pages..."
echo "  Source:  $REPO_ROOT/$SITE_DIR/"
echo "  Branch:  $BRANCH"
echo "  Remote:  $REMOTE_URL"
echo ""
echo "  Files to deploy:"
echo "    - index.html        (Landing Page)"
echo "    - demo/index.html   (Web Demo)"
echo "    - .nojekyll         (Bypass Jekyll)"
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

# Copy the entire public-site directory contents to the temp deploy dir
cp -R "$SITE_DIR"/. "$TEMP_DIR"/

# Ensure .nojekyll exists (should already be in public-site/)
touch "$TEMP_DIR/.nojekyll"

# ---- Create isolated git repo and push ----
(
    cd "$TEMP_DIR"
    git init -q
    git checkout -q -b "$BRANCH"
    git add -A
    git commit -q -m "Deploy NewClaw Public Site ($(date '+%Y-%m-%d %H:%M:%S'))"
    git remote add origin "$REMOTE_URL"
    echo "  Pushing to $BRANCH..."
    git push -f origin "$BRANCH"
)

echo ""
echo "Public site deployed successfully."
echo ""
echo "  Landing Page: $PAGES_URL"
echo "  Web Demo:     ${PAGES_URL}demo/"
echo ""
echo "Next steps (first time only):"
echo "  1. Go to https://github.com/newclaw26/newclaw/settings/pages"
echo "  2. Set Source to 'Deploy from a branch'"
echo "  3. Select branch: gh-pages / (root)"
echo "  4. Save -- the site will be live at: $PAGES_URL"
