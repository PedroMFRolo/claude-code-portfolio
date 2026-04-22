# CLAUDE.md — Transcript-to-Document Workflow Project

This is the master configuration file for this project. Read this file **first** at the start of every session.

---

## 1. Project Purpose

This project turns **raw class transcripts (PDF or text)** into **polished, user-friendly Word documents (.docx)** organized by chapter, with callouts, comparison tables, step-by-step guides, key takeaways, and Mermaid diagrams where helpful.

Typical input: a single transcript file (one class/module at a time).
Typical output: a single `.docx` file saved in `temporary/outputs/`.

---

## 2. The WAT Framework

This project follows the **WAT framework**:

- **W — Workflows**: Markdown instruction files that tell the agent what to do. Live in `workflows/` and in `.claude/skills/` (as skills).
- **A — Agent**: Claude Code itself. Reads workflows, selects tools, coordinates the run.
- **T — Tools**: Python/Node scripts that do the actual work (parsing PDFs, building .docx files, rendering diagrams). Live in `tools/`.

**Golden rule**: describe the outcome, not the steps. Let the agent reason its way there.

---

## 3. Folder Structure

```
.
├── CLAUDE.md                    ← this file (read first)
├── .claude/
│   └── skills/
│       └── transcript_to_doc/   ← reusable skill (slash command)
│           └── SKILL.md
├── workflows/                   ← markdown workflow files
│   └── transcript_to_doc.md
├── tools/                       ← Python/Node scripts the agent calls
│   ├── extract_transcript.py
│   └── build_docx.js
├── temporary/
│   ├── resources/               ← drop input transcripts here
│   └── outputs/                 ← finished .docx files land here
└── .env                         ← API keys / secrets (NEVER commit)
```

### Directory rules

- All input transcripts go in `temporary/resources/`.
- All final deliverables go in `temporary/outputs/`.
- Intermediate files (parsed JSON, markdown drafts) also go in `temporary/outputs/` with a clear suffix like `_draft.md`.
- Never write outside `temporary/` unless creating/updating workflows, tools, or skills.

---

## 4. Agent Operating Rules

1. **Look for existing tools first.** Before writing a new tool, check `tools/` — reuse and extend instead of duplicating.
2. **Use Plan Mode for anything nontrivial.** Ask clarifying questions, then propose a plan before executing.
3. **Self-heal.** When a tool fails, read the error, fix the tool, and update the workflow so the same error does not recur.
4. **Keep workflows current.** If the user gives feedback ("I prefer lists over tables"), update the workflow/tool so the preference sticks for next time.
5. **One task per session.** Run `/clear` between unrelated runs to avoid context rot.

---

## 5. Output Specification

Every generated document must include:

- **Title page** with class title, date, and a one-line subtitle.
- **Table of contents** (auto-generated from headings).
- **Executive summary / TL;DR** at the very top (2–4 sentences).
- **Chapters** reorganized from the class outline for clarity (not strictly bound to the original order).
- For each chapter:
  - A short **chapter TL;DR** (1–2 sentences).
  - Body content in the **instructor's first-person conversational voice**.
  - **Callout boxes** for 💡 Tips, ⚠️ Warnings, and 📌 Examples.
  - **Comparison tables** wherever two or more concepts are contrasted.
  - **Step-by-step numbered guides** with code blocks for any procedure.
  - **Mermaid diagrams or flowcharts** for processes, architectures, or frameworks (rendered as images embedded in the .docx).
  - A **Key Takeaways** box at the end.
- **Glossary** at the end for any technical terms introduced.

### Style Preferences

- **Tone**: keep the instructor's first-person, conversational voice. Do not flatten into textbook prose.
- **Clarifications**: where the transcript is vague or has speech-to-text errors, correct them silently using the mapping table in `workflows/transcript_to_doc.md` Step 4. Do **not** invent new content or examples the instructor didn't mention.
- **Fonts**: Arial, 11pt body, accent-colored H1/H2 headings, dark-gray H3+.
- **Accent color**: `#2E75B6` (professional blue) for headings, table shading, and callout borders.
- **Callout color coding** (background + border hex codes must match `tools/build_docx.js`):
  - 💡 Tip → background `#D9E7F5`, border `#2E75B6`
  - ⚠️ Warning → background `#FFF3CD`, border `#CC8800`
  - 📌 Example → background `#E2F0D9`, border `#548235`
  - 🎯 Key Takeaways → background `#E8D9F5`, border `#7030A0`
- **Page size**: US Letter, 1-inch margins.
- **Punctuation**: never use em-dashes (`—`) or en-dashes (`–`) anywhere in the output. Use commas, periods, colons, semicolons, or parentheses instead. The `build_docx.js` step does a safety-net replacement, but the drafter should get it right in the first place.
- **Inside callouts**: use straight double-quotes (`"..."`) to quote phrases, slash commands, or prompt text. Reserve backticks (`` `...` ``) for actual code (file paths, shell commands, code fragments). This avoids the greyed-out inline-code styling swallowing normal prose.
- **No duplicate Key Takeaways heading**: the `> [!takeaway]` callout already labels itself. Never add a `## Key Takeaways` section heading before it.
- **Callout spacing**: callouts must have visible breathing room above and below the box, and space between the bold label line and the body text. This is enforced by `tools/build_docx.js`; do not try to simulate it with blank markdown lines.
- **Comparison tables**: header row stays bold and accent-shaded; **every** cell (header and body, first column included) is center-aligned. Enforced by the builder.
- **Bullets inside callouts**: write one bullet per line (`> - item`). The builder renders each bullet as its own paragraph with a `•` marker so Key Takeaways lists stay readable. Do not merge takeaways into a single running-text paragraph.

### Naming conventions

- Output filename: `{ClassTitle_snake_case}_organized.docx`
- Draft markdown: `{ClassTitle_snake_case}_draft.md`

---

## 6. Quick-start commands

- `/transcript_to_doc` — run the skill on the file currently in `temporary/resources/`.
- "Run the transcript to doc workflow on `<filename>`" — natural-language trigger.
- `/web_research <topic>` — run the web-research workflow (Firecrawl MCP) and produce a citation-backed `.docx` brief in `temporary/outputs/`.

---

## 7. Notes on size

- Keep this file under 500 lines. If it grows, move specifics into skills.
- API keys (if any are added later for MCP-powered enrichment) live in `.env`, never here.
