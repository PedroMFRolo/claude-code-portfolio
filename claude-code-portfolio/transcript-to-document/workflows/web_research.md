# Workflow: Topic → Web Research Brief

## Goal
Transform a **topic string** into a polished, citation-backed research brief (`.docx`) in `temporary/outputs/`, using the Firecrawl MCP for web search and scrape.

## Input
- A topic string (required). Example: "agentic AI coding tools in 2026".
- Optional arguments:
  - `audience` — who the brief is written for (default: "technical practitioner").
  - `recency_window` — time range for prioritised sources (default: "past 12 months").
  - `angles` — a comma-separated list of specific sub-topics the user wants covered.

## Expected output
- `temporary/outputs/{topic_snake_case}_research_draft.md` — intermediate markdown draft.
- `temporary/outputs/{topic_snake_case}_research.docx` — final deliverable, styled per `CLAUDE.md` section 5.
- `temporary/outputs/.research_cache/{topic_snake_case}/` — cached raw scrapes, one file per source.

## Pre-flight check
- Confirm the Firecrawl MCP is registered and reachable. Expected tools: `mcp__firecrawl__firecrawl_search`, `mcp__firecrawl__firecrawl_scrape`.
- If `FIRECRAWL_API_KEY` is missing or the MCP tools are not listed, stop and tell the user what to fix (copy `.env.example` → `.env`, fill the key, export it in the shell, restart Claude Code).

## Steps

### Step 1 — Clarify the topic and plan sub-queries
- If the topic is ambiguous, restate it back to the user with your interpretation and wait for confirmation (unless in autonomous/bypass mode).
- Break the topic into **3 to 5 sub-queries** that cover distinct angles. Good default angles:
  1. Definition and scope (what is it, what isn't it).
  2. Current state (who's doing it now, what's shipping).
  3. Tradeoffs and critiques (limits, failure modes, open debates).
  4. Leading examples or players (named companies, products, people, papers).
  5. Near-term outlook (what's changing in the next 6 to 12 months).
- If the user supplied `angles`, fold those in and replace the weakest default angle.
- **Show the sub-query plan to the user for review before running Step 2.** Scrape calls cost credits; plan confirmation prevents wasted spend. If the user is in autonomous/bypass mode, proceed without waiting.

### Step 2 — Search
- For each confirmed sub-query, call `mcp__firecrawl__firecrawl_search` with:
  - `limit`: 8 to 12 results per sub-query.
  - recency bias: pass a time filter matching `recency_window` (Firecrawl accepts a `tbs` parameter like `qdr:y` for the past year; use the appropriate one).
- Collect raw results: title, URL, publisher/domain, snippet, published date (if available).

### Step 3 — Select sources
- Dedupe by URL and by (domain + near-identical title).
- Rank and keep sources using these preferences:
  - Prefer primary sources: official docs, vendor announcements, peer-reviewed papers, named-author blog posts at reputable publications, first-person accounts.
  - Down-rank: SEO listicles, AI-generated content farms, undated posts, pages whose snippet reads as a rewrite of another source.
  - Prefer sources dated within `recency_window`; keep older foundational sources only if they are genuinely canonical (flag them as "foundational" in the Sources list).
- **Target 8 to 15 final sources.** Fewer than 6 usable sources is a red flag; broaden queries and re-run Step 2 once.

### Step 4 — Scrape
- For each selected URL, call `mcp__firecrawl__firecrawl_scrape` with `formats: ["markdown"]` and `onlyMainContent: true`.
- Write each scrape to `temporary/outputs/.research_cache/{topic_snake_case}/{NN}_{slug}.md` where `NN` is the source's citation number (zero-padded) and `slug` is a short url-safe slug of the title. Include a header comment with the source URL and the scrape timestamp so reruns can check freshness.
- Before scraping, check if a cached file already exists for the URL. If so, reuse it (skip the API call) unless the cache is older than 7 days.
- If a scrape fails, log the failure, drop the source from the final list, and continue. If more than 30 percent of selected sources fail, pause and ask the user whether to retry, substitute, or proceed with fewer sources.

### Step 5 — Synthesize the markdown draft
Write `temporary/outputs/{topic_snake_case}_research_draft.md` with this exact structure:

```
# {Topic}: Research Brief

## Executive Summary
(2 to 4 sentences. The whole point of the brief in plain language.)

## Key Findings
- Finding 1, 1 to 2 sentences, ending with [n] citations.
- Finding 2, ...
(5 to 8 bullets total.)

## Deep Dive

### {Theme A}
Prose in neutral, third-person analytical voice. Claims carry [n] citations.

Use callouts where genuinely useful:
> [!tip]
> Short actionable insight.

> [!warning]
> Known risk or caveat.

> [!example]
> A concrete named example with a citation [n].

Use a comparison table only when contrasting 2+ named items on shared attributes.

End each theme with:
> [!takeaway]
> - Point 1
> - Point 2

### {Theme B}
...

(Repeat for each theme. Typically 3 to 5 themes.)

## Open Questions
- What the research did not answer confidently.
- Conflicting claims across sources, with [n] pointers.
- Areas where the most recent data is older than desired.

## Sources
1. **Title** — Publisher (YYYY-MM-DD). https://url. One-line summary of why this source matters.
2. **Title** — ...
```

#### Drafting conventions
These inherit from `workflows/transcript_to_doc.md` Step 4 and `CLAUDE.md` section 5. Key points specific to research briefs:

- **Voice**: neutral, third-person, analytical. Do NOT use the first-person instructor voice from the transcript workflow. This is a briefing document, not a class.
- **Citations**: every factual claim in Key Findings and Deep Dive must carry a `[n]` footnote reference matching the Sources list. A claim without a source gets cut, or moved to Open Questions if the gap itself is informative.
- **No invention**: never fabricate URLs, dates, author names, quotes, statistics, or study results. If scraping failed or the source didn't actually say something, it does not go in the brief.
- **Quotes**: short direct quotes (under 25 words) are fine, in double-quotes, with a `[n]` citation. Longer material must be paraphrased.
- **Em/en-dashes**: never. Use commas, periods, colons, semicolons, or parentheses. `build_docx.js` has a safety-net replacement but get it right in the draft.
- **Inside callouts**: straight double-quotes for phrases and quoted prompt text. Reserve backticks for actual code (file paths, shell commands, code fragments). Backticks in prose inside callouts render as greyed-out inline code and swallow normal reading flow.
- **Callout bullets**: one bullet per line (`> - item`). Never merge takeaways into a single running-text paragraph.
- **Tables**: every cell is center-aligned; the builder enforces this. Don't add markdown alignment pipes.
- **No duplicate Key Takeaways heading**: the `> [!takeaway]` callout labels itself. Never precede it with `### Key Takeaways`.
- **Mermaid**: include a diagram only when a process, taxonomy, or architecture genuinely benefits. Don't force one.

### Step 6 — Assemble the .docx
Run:
```
node tools/build_docx.js \
  temporary/outputs/{topic_snake_case}_research_draft.md \
  temporary/outputs/{topic_snake_case}_research.docx \
  --title "{Topic}: Research Brief"
```
The builder renders callouts, tables, numbered lists (Sources), bullets, and Mermaid exactly as for the transcript pipeline.

### Step 7 — Validate
- Confirm the `.docx` exists and is non-empty.
- Spot-check: every `[n]` used in the body must have a matching entry in the Sources list. If any are orphaned, fix the draft and re-run Step 6.
- Note any sources that fell back to code blocks from failed Mermaid rendering (from `build_docx.js` stderr).
- If `libreoffice` is available, run `libreoffice --headless --convert-to pdf {output.docx}` as a final render sanity check; otherwise skip.

### Step 8 — Report
Print a summary to the user:
- Output file path.
- Sub-query count, source count (scraped vs skipped).
- Themes covered in the Deep Dive.
- Any sub-queries that returned thin results.
- Any Open Questions worth flagging.

## Error handling / self-heal

- **Firecrawl search returns 0 results**: broaden the query (drop qualifiers, widen recency), retry once; if still empty, report to user and ask whether to rephrase the angle.
- **Scrape fails on a URL**: skip it, log, continue. >30 percent failure rate → pause and ask user.
- **Same URL appears under multiple sub-queries**: dedupe before scraping.
- **Rate-limited by Firecrawl**: back off, wait, retry once; if persistent, report to user.
- **MCP tool not available**: check `.claude/settings.json`, confirm `FIRECRAWL_API_KEY` is exported in the shell, and tell the user to restart Claude Code.

## Iteration loop
When the user gives feedback that applies to every future run, persist it:
- "I want shorter briefs" / "always include a methodology note" → update this workflow.
- "Use green accent for research docs" → update `CLAUDE.md` style spec and `tools/build_docx.js` constants.
- "Skip the Open Questions section" → update the Step 5 structure above.

Whenever you act on such feedback, update the workflow and tool files, not just this run's output. That is how the system gets smarter.
