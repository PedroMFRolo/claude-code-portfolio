# Setup Guide — Get this running on your computer

This walks you from **"cloned the repo"** to **"running `/web_research` in Claude Code."** Should take ~5 minutes, plus Firecrawl account signup.

---

## 1. Put the project somewhere

```bash
cd ~/Projects
git clone git@github.com:PedroMFRolo/claude-code-portfolio.git
cd claude-code-portfolio/web-research
```

## 2. Install the dependencies (one-time)

You need Node.js and (optionally) the Mermaid CLI for inline diagrams in briefs.

### macOS

```bash
brew install node
npm install                         # installs local docx library
npm install -g @mermaid-js/mermaid-cli
```

### Windows

```powershell
# Install Node.js from nodejs.org, then:
npm install
npm install -g @mermaid-js/mermaid-cli
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y nodejs npm
npm install
sudo npm install -g @mermaid-js/mermaid-cli
```

## 3. Get a Firecrawl API key

1. Sign up at https://www.firecrawl.dev.
2. Copy your API key from the dashboard.
3. Configure it in this project:

```bash
cp .env.example .env
# open .env and paste your key into FIRECRAWL_API_KEY=
```

Then export it in the shell you will launch Claude Code from:

```bash
set -a; source .env; set +a
```

(Or use your preferred method of exporting env vars. The Firecrawl MCP server reads `${FIRECRAWL_API_KEY}` from the environment.)

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

From inside the `web-research/` folder, with `FIRECRAWL_API_KEY` exported in the current shell:

```bash
claude
```

Claude Code will automatically pick up the `CLAUDE.md` file, the Firecrawl MCP server from `.claude/settings.json`, and the skill in `.claude/skills/web_research/`.

The first time you launch, Claude Code will install the Firecrawl MCP server via `npx`. You may need to restart Claude Code once after the first install so the MCP tools register.

## 6. Use it

### Option A — Slash command (recommended)

```
/web_research agentic AI coding tools in 2026
```

The skill will show you a sub-query plan first (to avoid wasting credits), then run search → scrape → synthesis → citation, and drop the finished `.docx` into `temporary/outputs/`.

### Option B — Natural language

```
Research the state of self-hosted vector databases and write me a brief.
```

## 7. Verify the skill and MCP are detected

Inside Claude Code:

- Type `/` — you should see `/web_research` in the autocomplete list.
- Ask: "Which MCP tools are available?" — the list should include `mcp__firecrawl__firecrawl_search` and `mcp__firecrawl__firecrawl_scrape`.

If the MCP tools are missing:
- Confirm `FIRECRAWL_API_KEY` is exported in the shell that launched Claude Code (`echo $FIRECRAWL_API_KEY`).
- Confirm `.claude/settings.json` contains the `firecrawl` server entry.
- Restart Claude Code.

---

## Folder layout reminder

```
web-research/
├── CLAUDE.md                          ← Claude reads this every session
├── .claude/
│   ├── settings.json                  ← Firecrawl MCP server config
│   └── skills/
│       └── web_research/
│           └── SKILL.md               ← the /web_research command
├── workflows/
│   └── web_research.md                ← full workflow definition
├── tools/
│   └── build_docx.js                  ← markdown draft → styled .docx
└── temporary/
    └── outputs/                       ← finished briefs + scrape cache
```

## Using it on a NEW project (not just this one)

The whole `web-research/` folder is self-contained. You can:

- Keep it as a dedicated project and always run briefs from here.
- **Or** copy the `.claude/skills/web_research/` folder plus `tools/build_docx.js` into any other Claude Code project, and the `/web_research` skill will work there too, as long as that project also has a Firecrawl MCP entry in its `.claude/settings.json`.

## If something breaks

Just tell Claude Code what went wrong. That's the self-improvement loop from the WAT framework — it will update the workflow or tool so the error doesn't recur next time. Examples:

- "The sub-query plan is too shallow on tradeoffs. Always force a critique angle."
- "I want briefs capped at 6 sources to stay cheap. Update the workflow."
- "Use green accent color for research docs. Update CLAUDE.md and the builder."
