# claude-code-portfolio

A collection of agentic workflows built with Claude Code, following the WAT framework (Workflows, Agent, Tools).

Each subfolder is a self-contained project: open it in Claude Code, drop your input into `temporary/resources/`, and run the corresponding slash command.

---

## Projects

| Project | What it does | Key technologies |
|---------|--------------|------------------|
| [transcript-to-document](transcript-to-document/) | Turns raw class transcripts (PDF, DOCX, TXT) into polished, chapter-organized Word documents with callouts, comparison tables, step-by-step guides, embedded Mermaid diagrams, and per-chapter key takeaways. | Claude Code, Python (`pypdf`, `python-docx`), Node.js (`docx`, `@mermaid-js/mermaid-cli`) |
| [web-research](web-research/) | Turns a topic into a citation-backed research brief (`.docx`) via the Firecrawl MCP server. Runs search → source selection → scrape → synthesis → citation validation in a single agentic run, with a confirm-before-scrape checkpoint to avoid wasting credits. | Claude Code, Node.js (`docx`, `@mermaid-js/mermaid-cli`), Firecrawl MCP server |

Each project is a self-contained folder with its own `README.md`, `SETUP.md`, `CLAUDE.md`, workflows, tools, and skills. The convention is **one workflow = one top-level portfolio entry**: every new workflow added here gets its own folder and its own row in this table, so nothing useful is hidden inside another project.

---

## About these projects

Every project here is built on the **WAT framework**, which splits an agentic system into three layers:

- **W — Workflows.** Markdown SOPs that tell the agent *what* to accomplish and *when* to use each tool. Written in plain language, not code.
- **A — Agent.** Claude Code itself. Reads the relevant workflow, decides which tools to call in which order, and recovers from failures.
- **T — Tools.** Deterministic Python and Node.js scripts that do the actual parsing, API calls, and file generation.

### Why this is different from traditional automation

A traditional script says "do these exact steps in this exact order." That works until the input changes shape, or an API rate-limits you, or a file is malformed. The script breaks and someone has to patch it.

An agentic workflow says "here is the outcome I want, here are the tools available, here is what to do when things go wrong." The agent reasons about the input, picks the right tool, and — crucially — updates its own workflow when it discovers a better method. This means the system gets *more* reliable the more it is used, not less.

The WAT split matters because LLM reasoning is probabilistic and executable code is deterministic. If you let the model do everything directly, the error rate compounds and a five-step task drops below 60% reliability. By pushing every deterministic action into a script, reasoning stays where the model is strong (orchestration, judgment, edge-case handling) and execution stays where code is strong (file I/O, API calls, formatting).

---

## How to run any project

Every project in this portfolio follows the same two-command launch:

```bash
cd <project-folder>     # e.g. cd transcript-to-document
claude
```

Inside Claude Code, type `/` to see the available slash commands for the current project. Each project's own `README.md` covers its specific setup steps, inputs, and outputs.

---

By Pedro Rolo

Built as part of the Vibe Coding Course — Phase 2: Mastering Claude Code.
