# web-research

**Turn a topic into a polished, citation-backed research brief using an agentic Claude Code workflow and the Firecrawl MCP server.**

Type `/web_research <topic>`, approve the sub-query plan, and get back a styled `.docx` with an Executive Summary, Key Findings, a Deep Dive organized by theme, Open Questions, and a numbered Sources list — all in a neutral analytical voice.

---

## What this demonstrates

- **Agentic workflow design using the WAT framework (Workflows, Agent, Tools).** Separation of concerns: probabilistic reasoning lives in markdown workflows, deterministic work lives in Node scripts, and Claude coordinates between them.
- **End-to-end MCP integration.** The `/web_research` skill orchestrates the Firecrawl MCP server to perform search → source selection → scrape → synthesis → citation validation inside a single agentic run.
- **Cost-aware agent design.** Scrape calls cost real credits, so the workflow forces a sub-query plan review before any scraping, caches raw scrapes on disk, and skips re-fetching anything scraped in the last 7 days.
- **Self-improving systems.** The workflow is a markdown file the agent is explicitly instructed to revise when it discovers a better approach or a recurring failure mode, so the system gets more reliable with use.
- **Prompt engineering for consistent, reusable, production-quality outputs.** A strict output spec (neutral voice, forced citations on every claim, no invention, fonts, accent colors, callout palette, table centering, em-dash prohibition) is encoded once in `CLAUDE.md` and the builder script, producing comparable-quality briefs across unrelated topics.
- **Tool development in Node.js without writing the tool manually.** `build_docx.js` (styled `.docx` generator with Mermaid rendering and callout boxes) was generated and iterated through Claude Code itself.
- **Token management and context-aware session design.** `CLAUDE.md` is kept under 500 lines, the skill is only loaded when invoked, and the architecture follows a "one task per session" rule to avoid context rot.

---

## How it works

The **WAT framework** splits responsibility across three layers, which is what makes the system reliable:

- **W — Workflows.** Markdown SOPs (`workflows/web_research.md`, `.claude/skills/web_research/SKILL.md`) that describe the objective, inputs, tool sequence, and edge cases in plain language.
- **A — Agent.** Claude Code reads the workflow, plans the sub-queries, confirms with the user, runs the MCP tools in sequence, recovers from failures, and asks for clarification when needed.
- **T — Tools.** The Firecrawl MCP server (`mcp__firecrawl__firecrawl_search`, `mcp__firecrawl__firecrawl_scrape`) plus the local `tools/build_docx.js` Node script.

```
     ┌────────────────────────── feedback loop ──────────────────────────┐
     │                                                                    │
     ▼                                                                    │
   User ──▶ Workflow ──▶ Agent (Claude) ──▶ Firecrawl MCP ──▶ Output (.docx)
            (markdown)                      + build_docx.js
```

Every failure is an opportunity: the agent reads the error, fixes the tool or workflow, verifies the fix, and updates the workflow so the same problem cannot recur.

---

## Workflow included

### `/web_research`

- **Description:** Produces a citation-backed research brief on any topic using the Firecrawl MCP server.
- **Input:** A topic string, plus optional `audience`, `recency_window`, and `angles`.
- **Output:** `.docx` brief in `temporary/outputs/` with Executive Summary, Key Findings, Deep Dive by theme, Open Questions, and numbered Sources. Intermediate markdown draft and per-source scrape cache are also written for transparency and reruns.
- **Technically interesting:**
  - End-to-end MCP integration: search → source selection → scrape → synthesis → validation, all inside a single agentic run.
  - Source triangulation rules baked into the workflow: no single-source claims, primary sources preferred over aggregators, dates required for anything time-sensitive.
  - Neutral analytical voice enforced by the workflow prompt.
  - Per-source scrape cache with a 7-day freshness window so reruns are cheap.
  - Mid-run checkpoint: the sub-query plan must be confirmed by the user before any scrape calls fire, because credits are real.

---

## Setup

```bash
# 1. Clone this repo and cd into the project
git clone git@github.com:PedroMFRolo/claude-code-portfolio.git
cd claude-code-portfolio/web-research

# 2. Install dependencies (macOS example, see SETUP.md for Windows/Linux)
brew install node
npm install                         # local docx library
npm install -g @mermaid-js/mermaid-cli

# 3. Get a Firecrawl API key from https://www.firecrawl.dev and put it in .env
cp .env.example .env
# edit .env, then:
set -a; source .env; set +a

# 4. Install Claude Code
npm install -g @anthropic-ai/claude-code

# 5. Launch it inside this folder (with FIRECRAWL_API_KEY exported)
claude
```

Inside Claude Code, run:

```
/web_research agentic AI coding tools in 2026
```

The finished `.docx` lands in `temporary/outputs/`. Full step-by-step install guide with Windows and Linux instructions is in [`SETUP.md`](SETUP.md).

---

## Project structure

```
web-research/
├── CLAUDE.md                         # Master config read at every session — WAT architecture + output spec
├── README.md                         # This file
├── SETUP.md                          # Cross-platform install guide (macOS / Windows / Linux)
├── .env.example                      # Template for FIRECRAWL_API_KEY (copy to .env)
├── .gitignore                        # Excludes .env, node_modules, and temporary/outputs contents
├── package.json                      # Node dependency (docx library for .docx generation)
├── .claude/
│   ├── settings.json                 # MCP server config (Firecrawl, uses ${FIRECRAWL_API_KEY})
│   └── skills/
│       └── web_research/
│           └── SKILL.md              # /web_research slash command definition
├── workflows/
│   └── web_research.md               # Full 8-step workflow SOP for Firecrawl-powered research briefs
├── tools/
│   └── build_docx.js                 # Markdown draft → styled .docx with callouts, tables, diagrams
└── temporary/
    └── outputs/                      # Generated .docx files + per-source scrape cache
```

---

By Pedro Rolo

Built as part of the Vibe Coding Course — Phase 2: Mastering Claude Code.
