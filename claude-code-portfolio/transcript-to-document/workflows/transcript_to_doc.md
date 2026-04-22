# Workflow: Transcript → Organized Document

## Goal
Transform a raw class transcript (PDF or `.txt`) from `temporary/resources/` into a polished, chapter-organized Word document (`.docx`) in `temporary/outputs/`.

## Input
- A single transcript file in `temporary/resources/`.
- Supported formats: `.pdf`, `.txt`, `.md`, `.docx`.

## Expected output
- One `.docx` file in `temporary/outputs/` following the spec in `CLAUDE.md` section 5.
- One intermediate markdown draft `{name}_draft.md` in `temporary/outputs/` for review.

## Steps

### Step 1 — Extract transcript text
Call `tools/extract_transcript.py <input_file>`. It prints clean text to stdout.
- For PDFs, it uses `pdftotext` / `pypdf` fallback.
- For `.docx`, it uses `python-docx`.
- For `.txt` / `.md`, it returns the file as-is.

### Step 2 — Detect class title and chapter list
- The class title is typically the first "Meeting Title" line or the first H1-level heading.
- Look for a chapter/section outline at the top or in a sidebar image description. If an outline image was provided, use it as the canonical chapter list.
- If no outline exists, infer chapters from topic shifts in the transcript (keywords like "In this video we're going to...", "Now let's talk about...", "Okay, let's move on to...").

### Step 3 — Plan chapter structure
- Start from the original chapter list but **reorganize for clarity**: merge redundant sections, split overly long ones, and place hands-on examples next to the concepts they illustrate.
- Output the planned table of contents to the user for review **before** writing the full document. If the user is in autonomous/bypass mode, proceed without waiting.

### Step 4 — Draft each chapter
For each planned chapter, produce:
1. A one-sentence TL;DR.
2. Body copy in the **instructor's first-person conversational voice**. Fix speech-to-text errors silently:
   - "Glutcode" / "Glut code" / "Cloud Code" / "Clot code" / "Quadco" / "QuadCode" / "Clock code" → **Claude Code**
   - "Clod" / "Clot" / "Gloc" / "Gloat" / "Gloot" → **Claude**
   - "N8N6" / "NAN" / "NAN" / "N Adan" → **n8n**
   - "CloudMD" / "QuadMD" / "Claudem" → **CLAUDE.md**
   - "WIT" / "WATE" / "WOT" / "WATT" / "EWAT" / "DWT" / "WAGO" / "WAT button" → **WAT framework**
   - "MTP" / "MCB" → **MCP**
   - "Firecrawl" references: keep as Firecrawl.
   - "slash command" typos like "slashcommand" / "andcommands" → "slash command(s)".
   - "Versus Code" / "Visual Studio" (when context is VS Code) → **Visual Studio Code**.
3. Callouts where appropriate: 💡 Tips, ⚠️ Warnings, 📌 Examples.
4. Comparison tables where the instructor contrasts two concepts (e.g. deterministic vs non-deterministic, skills vs workflows, clear vs compact).
5. Step-by-step numbered guides for procedures (installing MCP, running the first workflow, building a skill).
6. A Mermaid diagram block for any process flow or architecture (e.g. WAT framework diagram, self-improvement loop).
7. A Key Takeaways callout at the end, written as `> [!takeaway]` with no preceding `## Key Takeaways` heading. The callout labels itself; a separate heading duplicates it.

#### Drafting conventions (enforced per CLAUDE.md Style Preferences)

- **Never use em-dashes or en-dashes.** Replace with commas, periods, colons, semicolons, or parentheses. (`build_docx.js` has a safety-net replacement, but get it right in the draft.)
- **Inside callouts**: use straight double-quotes `"..."` for phrases, slash commands like `"/clear"`, or quoted prompt text. Reserve backticks for actual code (file paths, shell commands, code fragments). Backticks inside callouts render as greyed-out inline code and swallow normal prose.
- **Outside callouts**: backticks are fine for anything code-ish.
- **Table alignment** is handled by the builder: **every cell is center-aligned**, headers included. Don't bother with markdown alignment pipes like `|:---:|`.
- **Callout bullets**: write one bullet per line inside a callout (`> - item`). The builder renders each line as its own paragraph. Never merge takeaways into a single running-text paragraph.

### Step 5 — Assemble
Call `tools/build_docx.js <draft.md> <output.docx>`. The tool:
- Parses the markdown draft.
- Renders Mermaid code blocks as embedded PNG images via the Mermaid CLI (`mmdc`), falling back to a styled placeholder if unavailable.
- Produces the `.docx` with the styles defined in `CLAUDE.md`.

### Step 6 — Validate
- Confirm the `.docx` exists and is non-empty.
- If `libreoffice` is available, run `libreoffice --headless --convert-to pdf <output.docx>` and check the exit code. Otherwise skip this step and rely on visual inspection.
- Log any Mermaid diagrams that fell back to code blocks (from Step 5).

### Step 7 — Report
Print a summary to the user:
- Output file path.
- Chapter count and rough page count.
- Any unresolved items (sections where the transcript was too unclear to include confidently).

## Error handling / self-heal

- **PDF extraction returns empty**: retry with OCR (`ocrmypdf` or Tesseract) and re-parse.
- **Mermaid rendering fails**: fall back to a code-block representation inside a bordered paragraph and note the limitation.
- **Document too large (>100 pages)**: split output into multiple .docx files by chapter group and zip them.

## Iteration loop
After the first run, the user may say things like:
- "I want fewer tables and more prose" → update this workflow's Step 4 list and the skill.
- "Use red accent instead of blue" → update `CLAUDE.md` color spec and `build_docx.js` color constants.

Whenever you act on such feedback, **update the workflow and tool files**, not just this run's output. That is how the system gets smarter.
