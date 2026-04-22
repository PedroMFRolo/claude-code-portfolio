#!/usr/bin/env python3
"""
extract_transcript.py
Usage: python extract_transcript.py <input_file>
Prints cleaned transcript text to stdout.

Supports: .pdf, .docx, .txt, .md
Falls back gracefully if a dependency is missing.
"""

import sys
import os
import subprocess
from pathlib import Path


def extract_pdf(path: Path) -> str:
    # Try pdftotext first (fastest, best quality)
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", str(path), "-"],
            capture_output=True, text=True, check=True
        )
        if result.stdout.strip():
            return result.stdout
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass

    # Fallback: pypdf
    try:
        import re
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            # pypdf often returns one word per line; collapse whitespace
            # runs into a single space so downstream parsers get paragraphs.
            text = re.sub(r"\s+", " ", text).strip()
            if text:
                pages.append(text)
        return "\n\n".join(pages)
    except ImportError:
        pass

    sys.stderr.write(
        "ERROR: No PDF extractor available. Install one of: pdftotext, pypdf.\n"
    )
    sys.exit(2)


def extract_docx(path: Path) -> str:
    try:
        from docx import Document
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs)
    except ImportError:
        sys.stderr.write("ERROR: python-docx not installed. Run `pip install python-docx`.\n")
        sys.exit(2)


def extract_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def clean(text: str) -> str:
    """Light cleanup: normalize whitespace, strip page-number artifacts."""
    lines = []
    for line in text.splitlines():
        line = line.rstrip()
        # Drop bare page numbers like "12" alone on a line
        if line.strip().isdigit() and len(line.strip()) <= 3:
            continue
        lines.append(line)
    # Collapse 3+ blank lines into 2
    out = []
    blank = 0
    for line in lines:
        if not line.strip():
            blank += 1
            if blank <= 2:
                out.append(line)
        else:
            blank = 0
            out.append(line)
    return "\n".join(out).strip() + "\n"


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: extract_transcript.py <input_file>\n")
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        sys.stderr.write(f"ERROR: file not found: {path}\n")
        sys.exit(1)

    ext = path.suffix.lower()
    if ext == ".pdf":
        text = extract_pdf(path)
    elif ext == ".docx":
        text = extract_docx(path)
    elif ext in (".txt", ".md"):
        text = extract_text(path)
    else:
        sys.stderr.write(f"ERROR: unsupported extension {ext}\n")
        sys.exit(1)

    sys.stdout.write(clean(text))


if __name__ == "__main__":
    main()
