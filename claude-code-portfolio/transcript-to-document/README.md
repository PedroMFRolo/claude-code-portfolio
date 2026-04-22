# transcript-to-document

**Turn raw class transcripts into polished, chapter-organized Word documents using an agentic Claude Code workflow.**

Drop a PDF or text transcript into `temporary/resources/`, type `/transcript_to_doc`, and get back a styled `.docx` with a title page, table of contents, chapter callouts, comparison tables, step-by-step guides, embedded Mermaid diagrams, and per-chapter key takeaways — all written in the instructor's first-person voice.

---

## What this demonstrates

- **Agentic workflow design using the WAT framework (Workflows, Agent, Tools).** Separation of concerns: probabilistic reasoning lives in markdown workflows, deterministic work lives in Python/Node scripts, and Claude coordinates between them.
- **MCP server integration.** The companion `/web_research` skill orchestrates the Firecrawl MCP server to perform search → scrape → synthesis → citation in a single agentic run.
- **Self-improving systems.** Workflows are markdown files the agent is explicitly instructed to revise when it discovers a better approach or a recurring failure mode, so the system gets more reliable with use.
- **Prompt engineering for consistent, reusable, production-quality outputs.** A strict output spec (fonts, accent colors, callout palette, table centering, em-dash prohibition, straight-quotes inside callouts) is encoded once in `CLAUDE.md` and the builder script, producing identical-quality documents across unrelated source material.
- **Tool development in Python and Node.js without writing the tools manually.** `extract_transcript.py` (multi-format ingestion with graceful fallbacks) and `build_docx.js` (styled `.docx` generator with Mermaid rendering and callout boxes) were both generated and iterated through Claude Code itself.
- **Token management and context-aware session design.** `CLAUDE.md` is kept under 500 lines, skills are only loaded when invoked, and the architecture follows a "one task per session" rule to avoid context rot.

---

## How it works

The **WAT framework** splits responsibility across three layers, which is what makes the system reliable:

- **W — Workflows.** Markdown SOPs (`workflows/*.md`, `.claude/skills/*/SKILL.md`) that describe the objective, inputs, tool sequence, and edge cases in plain language.
- **A — Agent.** Claude Code reads the relevant workflow, picks the right tools, runs them in sequence, recovers from failures, and asks for clarification when needed.
- **T — Tools.** Deterministic Python/Node scripts (`tools/*.py`, `tools/*.js`) that do the actual file I/O, parsing, and document generation.

```
     ┌──────────────────────── feedback loop ────────────────────────┐
     │                                                                │
     ▼                                                                │
   User ──▶ Workflows ──▶ Agent (Claude) ──▶ Tools ──▶ Output (.docx)
            (markdown)                      (py/js)
```

Every failure is an opportunity: the agent reads the error, fixes the tool, verifies the fix, and updates the workflow so the same problem cannot recur.

---

## Workflows and skills included

### `/transcript_to_doc`

- **Description:** Converts a raw class transcript into a polished, chapter-organized Word document.
- **Input:** PDF, DOCX, TXT, or MD file in `temporary/resources/`.
- **Output:** Styled `.docx` in `temporary/outputs/`, plus a markdown draft for debugging.
- **Technically interesting:**
  - Multi-format ingestion with layered fallbacks (`pdftotext` → `pypdf` → `python-docx` → direct read) so a missing dependency degrades gracefully instead of hard-failing.
  - A full callout-box styling system (💡 Tip, ⚠️ Warning, 📌 Example, 🎯 Key Takeaways) with matched background + border hex codes enforced by the builder, not the drafter.
  - Mermaid diagrams rendered to PNG via `@mermaid-js/mermaid-cli` and embedded inline in the `.docx`.
  - Silent speech-to-text error correction via a configurable mapping table in the workflow, so "dock or" becomes "Docker" without inventing content.

### `/web_research`

- **Description:** Produces a citation-backed research brief on any topic using the Firecrawl MCP server.
- **Input:** A topic (and optional scope/timeframe) passed on the command line.
- **Output:** `.docx` brief in `temporary/outputs/` with Executive Summary, Key Findings, Deep Dive by theme, Open Questions, and numbered Sources.
- **Technically interesting:**
  - End-to-end MCP integration: search → source selection → scrape → synthesis → validation, all inside a single agentic run.
  - Source triangulation rules baked into the workflow (no single-source claims, primary sources preferred over aggregators, dates required for anything time-sensitive).
  - Neutral analytical voice enforced by the workflow prompt, distinct from the first-person instructor voice of `/transcript_to_doc`, demonstrating that the same tool stack can produce very different document styles with only a workflow change.

---

## Sample output

See the [`examples/`](examples/) folder for a redacted sample document generated by this workflow. It walks through the exact structure (title page → TOC → chapters with callouts, tables, step-by-step guides, Mermaid diagrams → glossary) using fictional placeholder content, so you can see the output quality without any real course material.

---

## Setup

```bash
# 1. Clone this repo and cd into the project
git clone git@github.com:PedroMFRolo/claude-code-portfolio.git
cd claude-code-portfolio/transcript-to-document

# 2. Install dependencies (macOS example — see SETUP.md for Windows/Linux)
brew install python node poppler
pip3 install pypdf python-docx
npm install                         # local docx library
npm install -g @mermaid-js/mermaid-cli

# 3. Install Claude Code
npm install -g @anthropic-ai/claude-code

# 4. Launch it inside this folder
claude
```

Inside Claude Code, drop a transcript into `temporary/resources/` and run:

```
/transcript_to_doc
```

The finished `.docx` lands in `temporary/outputs/`. Full step-by-step install guide with Windows and Linux instructions is in [`SETUP.md`](SETUP.md).

---

## Project structure

```
transcript-to-document/
├── CLAUDE.md                         # Master config read at every session — WAT architecture + output spec
├── README.md                         # This file
├── SETUP.md                          # Cross-platform install guide (macOS / Windows / Linux)
├── .env.example                      # Template for optional Firecrawl API key (copy to .env)
├── .gitignore                        # Excludes .env, node_modules, and temporary/ contents
├── package.json                      # Node dependency (docx library for .docx generation)
├── .claude/
│   ├── settings.json                 # MCP server config (Firecrawl, uses ${FIRECRAWL_API_KEY})
│   └── skills/
│       ├── transcript_to_doc/
│       │   └── SKILL.md              # /transcript_to_doc slash command definition
│       └── web_research/
│           └── SKILL.md              # /web_research slash command definition
├── workflows/
│   ├── transcript_to_doc.md          # Full 7-step workflow SOP for the transcript pipeline
│   └── web_research.md               # 8-step workflow SOP for Firecrawl-powered research briefs
├── tools/
│   ├── extract_transcript.py         # PDF/DOCX/TXT/MD → plain text with fallback chain
│   └── build_docx.js                 # Markdown draft → styled .docx with callouts, tables, diagrams
├── temporary/
│   ├── resources/                    # Drop input transcripts here (gitkeep placeholder only in this repo)
│   └── outputs/                      # Generated .docx files land here (gitkeep placeholder only in this repo)
└── examples/
    └── sample_output_structure.md    # Redacted fictional sample showing output format
```

---

By Pedro Rolo

Built as part of the Vibe Coding Course — Phase 2: Mastering Claude Code.
