# Setup Guide — Get this running on your computer

This walks you from **"downloaded the zip"** to **"running `/transcript_to_doc` in VS Code."** Should take ~5 minutes.

---

## 1. Put the project somewhere

Unzip the folder anywhere you keep your projects:

```bash
# pick whatever path you like
cd ~/Projects
# unzip (or drag-drop in Finder/Explorer)
unzip ~/Downloads/transcript-to-document.zip
cd transcript-to-document
```

## 2. Open it in VS Code

```bash
code .
```

(Or: VS Code → File → Open Folder → select `transcript-to-document`.)

## 3. Install the dependencies (one-time)

You need Python, Node.js, and two CLI tools. If you already have them, skip to step 4.

### macOS

```bash
# Python + Node (via Homebrew)
brew install python node poppler

# Python library (PDF extraction fallback)
pip3 install pypdf python-docx

# Node library (docx builder)
npm install -g docx

# Optional: Mermaid diagram rendering (recommended)
npm install -g @mermaid-js/mermaid-cli
```

### Windows

```powershell
# Install Python from python.org and Node.js from nodejs.org, then:
pip install pypdf python-docx
npm install -g docx
npm install -g @mermaid-js/mermaid-cli

# For PDF text extraction, install poppler for Windows:
# https://github.com/oschwartz10612/poppler-windows/releases
# Add the bin/ folder to your PATH.
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y python3-pip nodejs npm poppler-utils
pip3 install pypdf python-docx
sudo npm install -g docx
sudo npm install -g @mermaid-js/mermaid-cli
```

## 4. Install Claude Code (if you haven't already)

```bash
npm install -g @anthropic-ai/claude-code
```

Then log in once:

```bash
claude
# follow the prompts to authenticate
```

## 5. Open Claude Code in this project

From inside the `transcript-to-document/` folder in your terminal:

```bash
claude
```

Claude Code will automatically pick up the `CLAUDE.md` file in the root and the skill in `.claude/skills/transcript_to_doc/`.

## 6. Use it

### Option A — Slash command (recommended)

1. Drop a transcript PDF into `temporary/resources/`.
2. Inside Claude Code, type:
   ```
   /transcript_to_doc
   ```
3. Wait. Your polished `.docx` appears in `temporary/outputs/`.

### Option B — Natural language

```
Run the transcript_to_doc workflow on the file in temporary/resources.
```

## 7. Verify the skill is detected

Inside Claude Code, type `/` and you should see `/transcript_to_doc` in the autocomplete list.

If it's missing:
- Make sure you opened Claude Code from **inside** `transcript-to-document/` (not its parent).
- Restart Claude Code.
- Check that the path is exactly `.claude/skills/transcript_to_doc/SKILL.md`.

---

## Folder layout reminder

```
transcript-to-document/
├── CLAUDE.md                          ← Claude reads this every session
├── .claude/
│   └── skills/
│       └── transcript_to_doc/
│           └── SKILL.md               ← the /transcript_to_doc command
├── workflows/
│   └── transcript_to_doc.md           ← full workflow definition
├── tools/
│   ├── extract_transcript.py          ← PDF/docx/txt → text
│   └── build_docx.js                  ← markdown draft → styled .docx
└── temporary/
    ├── resources/                     ← drop input transcripts HERE
    └── outputs/                       ← finished documents appear HERE
```

## Using it on a NEW project (not just this one)

The whole `transcript-to-document/` folder is self-contained. You can:

- Keep it as a dedicated project and always drop transcripts into its `temporary/resources/`.
- **Or** copy just the `.claude/skills/transcript_to_doc/` folder into any other Claude Code project and the `/transcript_to_doc` skill will work there too — as long as the `tools/` scripts are reachable (adjust paths in the skill if needed).

## If something breaks

Just tell Claude Code what went wrong. That's the self-improvement loop from the WAT framework — it will update the workflow or tool so the error doesn't recur next time. Examples:

- "The Mermaid diagrams didn't render — fix the tool and workflow."
- "I want the accent color to be green instead of blue. Update CLAUDE.md and the builder."
- "Add a 'Further reading' section at the end of each chapter."
