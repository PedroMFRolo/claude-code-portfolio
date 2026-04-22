# CLAUDE.md — Web Research Workflow Project

This is the master configuration file for this project. Read this file **first** at the start of every session.

---

## 1. Project Purpose

This project turns a **topic string** into a **polished, citation-backed research brief (.docx)** using the Firecrawl MCP server for search and scrape, and a deterministic Node.js builder for styled document rendering.

Typical input: a topic, optionally with audience, recency window, and specific angles.
Typical output: a single `.docx` file saved in `temporary/outputs/`, plus a markdown draft and a per-source cache folder for transparency and reruns.

---

## 2. The WAT Framework

This project follows the **WAT framework**:

- **W — Workflows**: Markdown instruction files that tell the agent what to do. Live in `workflows/` and in `.claude/skills/` (as skills).
- **A — Agent**: Claude Code itself. Reads workflows, selects tools, coordinates the run.
- **T — Tools**: Node scripts that do the actual work (rendering the styled .docx). The search and scrape tools are provided by the Firecrawl MCP server.

**Golden rule**: describe the outcome, not the steps. Let the agent reason its way there.

---

## 3. Folder Structure

```
.
├── CLAUDE.md                    ← this file (read first)
├── .claude/
│   ├── settings.json            ← Firecrawl MCP server config
│   └── skills/
│       └── web_research/        ← reusable skill (slash command)
│           └── SKILL.md
├── workflows/                   ← markdown workflow files
│   └── web_research.md
├── tools/                       ← Node scripts the agent calls
│   └── build_docx.js
├── temporary/
│   └── outputs/                 ← finished .docx files + cached scrapes
└── .env                         ← FIRECRAWL_API_KEY (NEVER commit)
```

### Directory rules

- All final deliverables go in `temporary/outputs/`.
- Intermediate markdown drafts also go in `temporary/outputs/` with a `_draft.md` suffix.
- Per-source raw scrape cache goes in `temporary/outputs/.research_cache/{topic_snake_case}/`.
- Never write outside `temporary/` unless creating/updating workflows, tools, or skills.

---

## 4. Agent Operating Rules

1. **Pre-flight the MCP.** Before any run, confirm the Firecrawl MCP tools are available (`mcp__firecrawl__firecrawl_search`, `mcp__firecrawl__firecrawl_scrape`). If they aren't, stop and tell the user exactly what to fix (set `FIRECRAWL_API_KEY`, restart Claude Code).
2. **Confirm the sub-query plan before scraping.** Scrape calls cost Firecrawl credits. Show the 3–5 sub-query plan to the user and wait for confirmation, unless in autonomous/bypass mode.
3. **Cache scrapes.** Before scraping a URL, check `temporary/outputs/.research_cache/` for a fresh copy (<7 days). Reuse when possible.
4. **Stay grounded.** Never invent URLs, dates, authors, quotes, or statistics. A claim without a source gets cut or moved to Open Questions.
5. **Self-heal.** When a tool or scrape fails, read the error, fix the tool, and update the workflow so the same error does not recur.
6. **Keep workflows current.** If the user gives feedback ("always include a methodology note"), update the workflow/tool so the preference sticks for next time.
7. **One task per session.** Run `/clear` between unrelated briefs to avoid context rot.

---

## 5. Output Specification

Every generated research brief must include:

- **Title page** with topic, date, and a one-line subtitle.
- **Executive Summary** (2–4 sentences, plain language).
- **Key Findings** (5–8 bullets, each ending with `[n]` citations).
- **Deep Dive** organized by 3–5 themes, in neutral third-person analytical voice. Callouts where genuinely useful. Comparison tables only when contrasting 2+ named items on shared attributes. Each theme ends with a `> [!takeaway]` callout.
- **Open Questions** — what the research did not answer, conflicting claims, stale data.
- **Sources** — numbered list, each entry: `**Title** — Publisher (YYYY-MM-DD). URL. One-line summary.`

### Style Preferences

- **Voice**: neutral, third-person, analytical. This is a briefing document, not a class. Do NOT use first-person instructor voice.
- **Citations**: every factual claim in Key Findings and Deep Dive must carry a `[n]` footnote reference matching the Sources list.
- **No invention**: never fabricate URLs, dates, author names, quotes, statistics, or study results. If the source didn't actually say it, it does not go in the brief.
- **Quotes**: short direct quotes (under 25 words) are fine, in double-quotes, with a `[n]` citation. Longer material must be paraphrased.
- **Fonts**: Arial, 11pt body, accent-colored H1/H2 headings, dark-gray H3+.
- **Accent color**: `#2E75B6` (professional blue) for headings, table shading, and callout borders.
- **Callout color coding** (background + border hex codes must match `tools/build_docx.js`):
  - 💡 Tip → background `#D9E7F5`, border `#2E75B6`
  - ⚠️ Warning → background `#FFF3CD`, border `#CC8800`
  - 📌 Example → background `#E2F0D9`, border `#548235`
  - 🎯 Key Takeaways → background `#E8D9F5`, border `#7030A0`
- **Page size**: US Letter, 1-inch margins.
- **Punctuation**: never use em-dashes (`—`) or en-dashes (`–`) anywhere in the output. Use commas, periods, colons, semicolons, or parentheses instead. The `build_docx.js` step does a safety-net replacement, but the drafter should get it right in the first place.
- **Inside callouts**: use straight double-quotes (`"..."`) for phrases and quoted prompt text. Reserve backticks (`` `...` ``) for actual code (file paths, shell commands, code fragments).
- **No duplicate Key Takeaways heading**: the `> [!takeaway]` callout already labels itself. Never add a `### Key Takeaways` section heading before it.
- **Callout bullets**: one bullet per line (`> - item`). The builder renders each bullet as its own paragraph with a `•` marker.
- **Comparison tables**: header row stays bold and accent-shaded; every cell (header and body, first column included) is center-aligned. Enforced by the builder.
- **Mermaid**: include a diagram only when a process, taxonomy, or architecture genuinely benefits. Don't force one.

### Naming conventions

- Output filename: `{topic_snake_case}_research.docx`
- Draft markdown: `{topic_snake_case}_research_draft.md`
- Scrape cache folder: `temporary/outputs/.research_cache/{topic_snake_case}/`

---

## 6. Quick-start commands

- `/web_research <topic>` — run the skill with a topic string.
- "Research X" / "Write me a brief on Y" / "Summarize the state of the art in Z" — natural-language triggers.

---

## 7. Notes on size

- Keep this file under 500 lines. If it grows, move specifics into the skill or workflow.
- `FIRECRAWL_API_KEY` lives in `.env`, never here.
