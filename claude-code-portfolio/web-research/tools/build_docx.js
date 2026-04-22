#!/usr/bin/env node
/**
 * build_docx.js
 *
 * Usage: node build_docx.js <draft.md> <output.docx> [--title "Class Title"]
 *
 * Parses a structured markdown draft and produces a styled .docx following
 * the spec in ../CLAUDE.md (section 5).
 *
 * Markdown conventions the parser understands:
 *   # Title                       → H1
 *   ## Chapter                    → H2
 *   ### Subsection                → H3
 *   > [!tip] / [!warning] / [!example] / [!takeaway]  → callout box
 *   | a | b |                     → table
 *   1. step                       → numbered list
 *   - item                        → bullet list
 *   ```mermaid ... ```            → rendered diagram (PNG)
 *   ```lang ... ```               → code block
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageBreak, TableOfContents, TabStopType,
  TabStopPosition,
} = require("docx");

// ---------- Config (mirrors CLAUDE.md style preferences) ----------
const ACCENT = "2E75B6";
const CALLOUTS = {
  tip:      { bg: "D9E7F5", border: "2E75B6", icon: "💡", label: "Tip" },
  warning:  { bg: "FFF3CD", border: "CC8800", icon: "⚠️", label: "Warning" },
  example:  { bg: "E2F0D9", border: "548235", icon: "📌", label: "Example" },
  takeaway: { bg: "E8D9F5", border: "7030A0", icon: "🎯", label: "Key Takeaways" },
};

// ---------- Args ----------
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: build_docx.js <draft.md> <output.docx> [--title \"...\"]");
  process.exit(1);
}
const [inputPath, outputPath] = args;
const titleIdx = args.indexOf("--title");
const cliTitle = titleIdx >= 0 ? args[titleIdx + 1] : null;

let md = fs.readFileSync(inputPath, "utf8");
// Safety-net: strip em-dashes and en-dashes per CLAUDE.md style rules.
// Most drafts use " — " as clause separator; ", " is the closest readable substitute.
md = md.replace(/\s*[—–]\s*/g, ", ");

// ---------- Mermaid rendering (best-effort) ----------
function renderMermaid(code) {
  const tmpDir = path.join(path.dirname(outputPath), ".mermaid_tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const inFile = path.join(tmpDir, `m_${Date.now()}_${Math.random().toString(36).slice(2)}.mmd`);
  const outFile = inFile.replace(/\.mmd$/, ".png");
  fs.writeFileSync(inFile, code);
  try {
    execSync(`mmdc -i ${inFile} -o ${outFile} -b white -w 1400`, { stdio: "pipe" });
    return fs.readFileSync(outFile);
  } catch (err) {
    return null; // fall back to code block
  }
}

// ---------- Minimal markdown parser ----------
// Returns an array of blocks: {type, ...}
function parseMarkdown(src) {
  const lines = src.split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      const lang = (fence[1] || "").toLowerCase();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: "code", lang, content: codeLines.join("\n") });
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      blocks.push({ type: "heading", level: h[1].length, text: h[2].trim() });
      i++;
      continue;
    }

    // Callouts: > [!tip] Title\n> body...
    const callout = line.match(/^>\s*\[!(\w+)\]\s*(.*)$/i);
    if (callout) {
      const kind = callout[1].toLowerCase();
      const title = callout[2].trim();
      const body = [];
      i++;
      while (i < lines.length && lines[i].startsWith(">")) {
        body.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "callout", kind, title, body: body.join("\n").trim() });
      continue;
    }

    // Tables
    if (/^\|.*\|$/.test(line) && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1])) {
      const tableLines = [line];
      i++;
      // skip separator
      const sep = lines[i];
      i++;
      while (i < lines.length && /^\|.*\|$/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.map(l =>
        l.replace(/^\||\|$/g, "").split("|").map(c => c.trim())
      );
      blocks.push({ type: "table", rows });
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "numbered", items });
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "bullet", items });
      continue;
    }

    // Horizontal rule = page break marker
    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: "pagebreak" });
      i++;
      continue;
    }

    // Blank
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph — consume until blank/special
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s*\[!/.test(lines[i]) &&
      !/^\|.*\|$/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^[-*]\s/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}

// ---------- Inline formatting: **bold**, *italic*, `code` ----------
function inlineRuns(text) {
  const runs = [];
  // Tokenize bold, italic, code (simple, non-nested)
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index) }));
    }
    const tok = m[0];
    if (tok.startsWith("**")) {
      runs.push(new TextRun({ text: tok.slice(2, -2), bold: true }));
    } else if (tok.startsWith("*")) {
      runs.push(new TextRun({ text: tok.slice(1, -1), italics: true }));
    } else if (tok.startsWith("`")) {
      runs.push(new TextRun({ text: tok.slice(1, -1), font: "Consolas", shading: { type: ShadingType.CLEAR, fill: "F2F2F2" } }));
    }
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last) }));
  return runs.length ? runs : [new TextRun({ text })];
}

// ---------- Renderers ----------
const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };

function renderTable(rows) {
  const colCount = rows[0].length;
  const totalWidth = 9360;
  const colWidth = Math.floor(totalWidth / colCount);
  const columnWidths = new Array(colCount).fill(colWidth);

  const tableRows = rows.map((row, idx) => {
    const isHeader = idx === 0;
    return new TableRow({
      tableHeader: isHeader,
      children: row.map((cell, colIdx) => {
        // All cells center-aligned (header + body, first column included).
        const alignment = AlignmentType.CENTER;
        return new TableCell({
          borders,
          width: { size: colWidth, type: WidthType.DXA },
          shading: isHeader ? { fill: ACCENT, type: ShadingType.CLEAR } : undefined,
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          children: [new Paragraph({
            alignment,
            children: isHeader
              ? [new TextRun({ text: cell, bold: true, color: "FFFFFF" })]
              : inlineRuns(cell),
          })],
        });
      }),
    });
  });

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths,
    rows: tableRows,
  });
}

// Build the paragraphs inside a callout body, preserving one-per-line bullets
// and numbered items. Consecutive non-list lines are merged into a single
// paragraph (so wrapped prose still reads as prose).
function renderCalloutBody(body) {
  const descriptors = [];
  let buf = [];
  const flushBuf = () => {
    if (buf.length) {
      descriptors.push({ kind: "para", text: buf.join(" ") });
      buf = [];
    }
  };
  for (const rawLine of body.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed) { flushBuf(); continue; }
    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (bullet) {
      flushBuf();
      descriptors.push({ kind: "bullet", text: bullet[1] });
    } else if (numbered) {
      flushBuf();
      descriptors.push({ kind: "num", num: numbered[1], text: numbered[2] });
    } else {
      buf.push(trimmed);
    }
  }
  flushBuf();

  return descriptors.map((d, idx) => {
    const isLast = idx === descriptors.length - 1;
    const after = isLast ? 0 : (d.kind === "para" ? 100 : 60);
    if (d.kind === "bullet") {
      return new Paragraph({
        spacing: { before: 0, after },
        indent: { left: 360, hanging: 220 },
        children: [new TextRun({ text: "•  " }), ...inlineRuns(d.text)],
      });
    }
    if (d.kind === "num") {
      return new Paragraph({
        spacing: { before: 0, after },
        indent: { left: 360, hanging: 220 },
        children: [new TextRun({ text: `${d.num}.  ` }), ...inlineRuns(d.text)],
      });
    }
    return new Paragraph({
      spacing: { before: 0, after },
      children: inlineRuns(d.text),
    });
  });
}

function renderCallout(kind, title, body) {
  const style = CALLOUTS[kind] || CALLOUTS.tip;
  const headTitle = title ? `${style.icon}  ${style.label}: ${title}` : `${style.icon}  ${style.label}`;
  const headPara = new Paragraph({
    spacing: { before: 0, after: 160 },
    children: [new TextRun({ text: headTitle, bold: true, color: style.border })],
  });
  const bodyParas = renderCalloutBody(body);

  const calloutTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 18, color: style.border },
          left:   { style: BorderStyle.SINGLE, size: 18, color: style.border },
          right:  { style: BorderStyle.SINGLE, size: 4,  color: style.border },
          bottom: { style: BorderStyle.SINGLE, size: 4,  color: style.border },
        },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: style.bg, type: ShadingType.CLEAR },
        margins: { top: 240, bottom: 240, left: 220, right: 220 },
        children: [headPara, ...bodyParas],
      })],
    })],
  });

  // Tables can't have "spacing" properties, so wrap with empty paragraphs
  // above and below so callouts always have breathing room from surrounding text.
  return [
    new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),
    calloutTable,
    new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }),
  ];
}

function renderCodeBlock(content, lang) {
  const paragraphs = content.split("\n").map(line =>
    new Paragraph({
      children: [new TextRun({ text: line || " ", font: "Consolas", size: 20 })],
      spacing: { before: 0, after: 0 },
    })
  );
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
          left:   { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
          right:  { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
        },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: "F7F7F7", type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: paragraphs,
      })],
    })],
  });
}

function renderMermaidBlock(code) {
  const png = renderMermaid(code);
  if (png) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        data: png,
        type: "png",
        transformation: { width: 560, height: 380 },
      })],
    });
  }
  // Fallback: show as code block with a note
  return renderCodeBlock("[Mermaid diagram, render with mmdc]\n\n" + code, "mermaid");
}

// ---------- Build the document children from blocks ----------
function blocksToChildren(blocks) {
  const children = [];

  for (const b of blocks) {
    switch (b.type) {
      case "heading": {
        const levelMap = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
        children.push(new Paragraph({
          heading: levelMap[b.level] || HeadingLevel.HEADING_3,
          children: [new TextRun({ text: b.text })],
        }));
        break;
      }
      case "paragraph":
        children.push(new Paragraph({
          children: inlineRuns(b.text),
          spacing: { after: 120 },
        }));
        break;
      case "bullet":
        for (const item of b.items) {
          children.push(new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            children: inlineRuns(item),
          }));
        }
        break;
      case "numbered":
        for (const item of b.items) {
          children.push(new Paragraph({
            numbering: { reference: "numbers", level: 0 },
            children: inlineRuns(item),
          }));
        }
        break;
      case "table":
        children.push(renderTable(b.rows));
        children.push(new Paragraph({ text: "" })); // spacer
        break;
      case "callout":
        children.push(...renderCallout(b.kind, b.title, b.body));
        break;
      case "code":
        if (b.lang === "mermaid") {
          children.push(renderMermaidBlock(b.content));
        } else {
          children.push(renderCodeBlock(b.content, b.lang));
        }
        children.push(new Paragraph({ text: "" }));
        break;
      case "pagebreak":
        children.push(new Paragraph({ children: [new PageBreak()] }));
        break;
    }
  }

  return children;
}

// ---------- Assemble document ----------
function buildDocument(blocks, title) {
  // Title page
  const titleBlocks = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 240 },
      children: [new TextRun({ text: title, bold: true, size: 56, color: ACCENT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: "Organized Study Document", italics: true, size: 28, color: "595959" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 4800 },
      children: [new TextRun({ text: new Date().toISOString().slice(0, 10), color: "595959", size: 22 })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
    // TOC
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Table of Contents" })],
    }),
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  const bodyChildren = blocksToChildren(blocks);

  return new Document({
    creator: "Claude — Transcript to Doc Workflow",
    title,
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 40, bold: true, color: ACCENT, font: "Arial" },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 30, bold: true, color: ACCENT, font: "Arial" },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, color: "404040", font: "Arial" },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
        { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, italics: true, color: "595959", font: "Arial" },
          paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 3 } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "numbers",
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [...titleBlocks, ...bodyChildren],
    }],
  });
}

// ---------- Main ----------
const blocks = parseMarkdown(md);

// Pull title: CLI > first H1 in draft > filename
let title = cliTitle;
if (!title) {
  const firstH1 = blocks.find(b => b.type === "heading" && b.level === 1);
  title = firstH1 ? firstH1.text : path.basename(inputPath, path.extname(inputPath));
}
// Remove the first H1 from body since we render it on the title page
const firstH1Idx = blocks.findIndex(b => b.type === "heading" && b.level === 1);
if (firstH1Idx >= 0) blocks.splice(firstH1Idx, 1);

const doc = buildDocument(blocks, title);

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outputPath, buf);
  console.log(`Wrote ${outputPath} (${(buf.length / 1024).toFixed(1)} KB)`);
}).catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
