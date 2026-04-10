# Zero Stars Diagnosis — NewClaw

**Date:** 2026-04-10. Tool permissions blocked live URL checks. Diagnosis from local repo evidence.

---

## Fatal Problems (Fix These First)

**1. README is Chinese-only.**
GitHub's discovery surface — Explore, trending, search — is globally English-dominant. A Chinese-only README means zero organic discovery from international developers, who are the ones who star freely. Nobody stars what they cannot read.

**2. No repo topics/tags set.**
Without topics (e.g. `electron`, `ai-agent`, `llm`, `desktop-app`, `claude`), GitHub search cannot surface the repo. This is the single biggest discoverability lever on GitHub and it costs 30 seconds to fix.

**3. No repo description line.**
package.json has `"description": "NewClaw - 个人 AI 超级助手桌面应用"` but the GitHub repo About field is almost certainly empty. GitHub search indexes the About description. This must be set in English.

**4. README has zero social proof hooks.**
No badge row, no screenshot, no demo GIF. The first thing a visitor sees is an SVG logo and a Chinese subtitle. Stars are an emotional reaction — the page triggers none.

**5. No one has been told it exists.**
A repo gets stars in its first 48 hours only through active seeding: HackerNews, Reddit r/LocalLLaMA, Product Hunt, Twitter/X, Discord servers. None of this has happened.

---

## Secondary Problems

**6. `"private": true` in package.json.**
This is a npm publish guard, not a GitHub visibility flag, but it signals to contributors that the project is not meant for public contribution. Remove it or add a CONTRIBUTING note.

**7. No releases published.**
GitHub's Releases tab is empty. No binary = no casual users = no word-of-mouth stars. Package a `v7.0.0` macOS `.dmg` and publish it as a GitHub Release today.

**8. No GitHub Pages site confirmed live.**
Cannot verify without WebFetch, but if `newclaw26.github.io/newclaw/` returns 404, it means the `gh-pages` branch was never pushed or Pages was never enabled in repo settings.

---

## Action List (Priority Order)

1. Add 10 English topics in GitHub repo Settings: `electron`, `ai-agent`, `llm`, `desktop-app`, `claude-ai`, `openai`, `deepseek`, `react`, `typescript`, `macos`
2. Set the GitHub About description in English: "Personal AI super-assistant for desktop — 17+ models, 13 messaging platforms, 53 built-in skills"
3. Add English README section above the Chinese content: one-paragraph pitch, a screenshot or GIF, badge row (stars, license, version)
4. Post to HackerNews Show HN, Reddit r/LocalLLaMA, and one relevant Discord today
5. Publish a `v7.0.0` GitHub Release with a macOS `.dmg` attached
6. Verify GitHub Pages is enabled (Settings > Pages > Source: gh-pages branch)
7. Remove `"private": true` from package.json before next publish
