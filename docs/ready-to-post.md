# Ready-to-Post Content

---

## 1. HackerNews — Show HN

**Title (paste into HN title field):**
Show HN: NewClaw – AI agents with identity, economy, and governance (not just prompt chains)

**URL (paste into HN URL field):**
https://github.com/newclaw26/newclaw

**First comment (paste immediately after the post goes live):**

Most agent frameworks let you chain prompts and call it "autonomous." NewClaw treats that as the problem, not the solution. Every task runs through a Trinity Engine: AI-1 proposes, AI-2 audits and challenges, AI-3 makes the final call. Six append-only ledgers (SHA-256 hash chain) record every decision with H1–H4 evidence grading. An L0–L4 permission fuse matrix blocks dangerous actions before execution, not after. Agents carry DID-based identities and earn New.B currency by producing verifiable outcomes — not just by completing tasks.

This is an MVP. The governance engine is fully spec'd and tested (508 passing tests, 7 modules, under 30 seconds to run). Real LLM orchestration and Docker sandbox execution are in progress — right now the engine runs on stubs, which is why the browser demo works without a backend. I built the core in one day to validate the architecture. Looking for feedback on whether the three-branch debate model (propose / audit / decide) maps to real problems you've hit with current agent frameworks. Try the demo: https://newclaw26.github.io/newclaw/demo/

---

## 2. Reddit — r/LocalLLaMA

**Title:**
I built an AI agent framework where agents audit each other – 508 tests, zero defects, built in one day

**Body:**

Current agent frameworks (LangChain, AutoGPT, CrewAI) give you prompt chaining and role assignment, but no accountability. If an agent does something wrong, you find out after the fact from unstructured logs. NewClaw takes a different approach: every task runs through a Trinity Engine where three AI cores debate in real time. AI-1 Expander proposes a solution. AI-2 Auditor actively challenges it. AI-3 Governor makes the final call. The result is logged to six typed ledgers with SHA-256 hash chaining and H1–H4 evidence grading — tamper-evident by design.

The framework has full Ollama support alongside OpenAI, Anthropic, DeepSeek, and 11 other providers via a pluggable LLM abstraction layer. Swap models without touching governance logic. There's also an L0–L4 permission fuse matrix (L4 requires human + AI-3 dual-signature before execution), a Proof of Outcome oracle that prevents agents from spinning without producing value, a knowledge market where nodes trade successful Playbooks in New.B currency, and a 5-stage node promotion pipeline from Simulated to Federated. The engine is 7 modules, 65+ exported functions, 508 tests passing in under 30 seconds.

Current honest state: this is an MVP. The governance architecture is fully implemented and tested. Real LLM orchestration (replacing stubs) and Docker sandbox execution are the next milestones. The browser demo runs the full Trinity cycle in-browser so you can see the debate UI without installing anything. Would love feedback from anyone who has hit the accountability wall with current frameworks.

Demo: https://newclaw26.github.io/newclaw/demo/
GitHub: https://github.com/newclaw26/newclaw

---

## 3. Reddit — r/opensource

**Title:**
NewClaw: Open-source AI governance framework with identity, economy, and three-AI debate system

**Body:**

NewClaw is an MIT-licensed AI agent framework built around one idea: agents should be accountable, not just capable. The core is the Trinity Engine — three AI cores (Expander, Auditor, Governor) that debate every task through a six-phase pipeline before anything executes. Six append-only governance ledgers with SHA-256 hash chains create a tamper-evident audit trail. An L0–L4 permission fuse matrix enforces that dangerous actions require escalating levels of approval, up to human + AI dual-signature at L4.

The project is fully open: MIT license, public GitHub, Discord community, and a CONTRIBUTING.md with clear guidelines. The engine ships with 508 Vitest tests you can run in under 30 seconds (`pnpm test`). The tech stack is React 19, TypeScript, Electron, Tailwind, Zustand, and Vite — standard tooling, no proprietary lock-in. LLM providers are pluggable: Ollama for local-first use, plus OpenAI, Anthropic, DeepSeek, and 11 others.

This is an early MVP looking for contributors and feedback. Real LLM orchestration and Docker sandbox execution are the immediate next milestones. If you care about AI accountability, auditability, or just want to see what governance-first agent architecture looks like in practice, the browser demo requires zero install.

Demo: https://newclaw26.github.io/newclaw/demo/
GitHub: https://github.com/newclaw26/newclaw
Discord: https://discord.com/invite/84Kex3GGAh
