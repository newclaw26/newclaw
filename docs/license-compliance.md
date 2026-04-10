# NewClaw V7.0 License Compliance Report

Date: 2026-04-10

## 1. Project License

NewClaw is released under the MIT License. Copyright holder: ValueCell Team (2026).
The LICENSE file at repository root contains the standard MIT text. No issues found.

## 2. Upstream Dependencies — License Status

| Dependency | License | Verified | Notes |
|---|---|---|---|
| OpenClaw 2026.4.1 | MIT | Yes | `node_modules/openclaw/package.json` confirms MIT |
| Electron 40.x | MIT | Yes | Well-known MIT project |
| React 19.x | MIT | Yes | facebook/react, MIT |
| Zustand 5.x | MIT | Yes | pmndrs/zustand, MIT |
| Vite 7.x | MIT | Yes | vitejs/vite, MIT |
| Tailwind CSS 3.x | MIT | Yes | tailwindlabs/tailwindcss, MIT |
| ClawHub 0.5.0 | MIT | Yes | `node_modules/clawhub/package.json` confirms MIT |
| Shadcn/Radix UI | MIT | Yes | Radix primitives, MIT |

All direct dependencies use MIT-compatible licenses. No GPL or copyleft contamination detected.

## 3. ClawX — Origin Framework

**Status: Requires attention.**

NewClaw was forked from ClawX (a desktop Electron app framework). Per PRODUCT_SPEC.md,
the project inherited UI/UX from ClawX with renaming from "ClawX" to "NewClaw".

**ClawX license not explicitly verified.** No standalone LICENSE file for ClawX was found
in the repository. However, the overall project carries MIT, and ClawX appears to be an
internal/related project by the same team (ValueCell). If ClawX is a third-party project,
its license must be verified and documented.

**Residual ClawX references found (not yet renamed):**

- `resources/cli/posix/openclaw` — 12 references to "ClawX" (executable paths, user messages)
- `resources/cli/win32/openclaw` — 5 references to "ClawX" (executable paths, user messages)
- `resources/cli/win32/openclaw.cmd` — 6 references to "ClawX" (executable paths, user messages)
- `scripts/prepare-preinstalled-skills-dev.mjs` — env var `CLAWX_SKIP_PREINSTALLED_SKILLS_PREPARE`
- `PRODUCT_SPEC.md` — Extensive ClawX references (design documentation, expected)

**Recommendation:** Rename remaining ClawX references in CLI scripts and env vars to NewClaw
for consistency and to avoid user confusion. These are functional references (executable names,
error messages) that users may encounter.

## 4. Compliance Check — No False Official Claims

**PASS.** The codebase does NOT:

- Claim to be an official Anthropic product
- Claim to be an official OpenClaw product
- Claim endorsement by or affiliation with Anthropic
- Use Anthropic trademarks beyond factual provider listing

The `electron-builder.yml` correctly uses:
- `appId: app.newclaw.desktop` (not Anthropic/OpenClaw branded)
- `productName: NewClaw`
- `copyright: Copyright 2026 NewClaw`

The README and CHANGELOG factually list Anthropic Claude as a supported AI provider
and development tool, which is permissible usage.

## 5. Compliance Check — Original License Headers

**PASS.** No evidence of removed or modified license headers in upstream dependencies.
The `node_modules/` directory retains all original LICENSE files from OpenClaw and its
transitive dependencies. The project does not vendored or copy upstream source files
with stripped headers.

## 6. MIT License Compliance

The MIT License requires:
1. Include copyright notice and permission notice in copies — **COMPLIANT** (LICENSE at root)
2. No warranty claims — **COMPLIANT** (standard MIT disclaimer present)
3. No restrictions on downstream use — **COMPLIANT** (MIT applied to NewClaw itself)

## 7. Findings Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | All dependencies MIT-licensed | Info | OK |
| 2 | No false official product claims | Info | OK |
| 3 | No stripped license headers | Info | OK |
| 4 | Credits section added to CHANGELOG.md | Info | Done |
| 5 | ClawX license not independently verified | Medium | Action needed if ClawX is third-party |
| 6 | 23+ residual "ClawX" references in CLI scripts | Low | Rename recommended |
| 7 | `OPENCLAW_EMBEDDED_IN=ClawX` env var in CLI | Low | Should be `NewClaw` |

## 8. Recommended Actions

1. **Verify ClawX license** — If ClawX is a separate third-party project, obtain and
   document its license. If it is an internal ValueCell project, document that fact.
2. **Rename CLI references** — Update `resources/cli/posix/openclaw` and
   `resources/cli/win32/openclaw*` to replace "ClawX" with "NewClaw" in user-facing
   messages, executable paths, and the `OPENCLAW_EMBEDDED_IN` environment variable.
3. **Rename env var** — Change `CLAWX_SKIP_PREINSTALLED_SKILLS_PREPARE` to
   `NEWCLAW_SKIP_PREINSTALLED_SKILLS_PREPARE` in `scripts/prepare-preinstalled-skills-dev.mjs`.
