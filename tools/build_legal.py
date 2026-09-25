#!/usr/bin/env python3
"""Builds privacy.html, terms.html and copyright.html from legal-src/*.md.

Run after editing the Markdown:  python tools/build_legal.py
Pages that still contain [[MISSING: ...]] or [[REVIEW: ...]] markers get a
visible "draft" banner; tools/release_check.js refuses to pass while any remain.
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = {"privacy": "Privacy Notice", "terms": "Terms of Service and Licence", "copyright": "Copyright and Rights Complaints"}


def inline(text: str) -> str:
    out = html.escape(text, quote=False)
    out = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"\[\[(MISSING|REVIEW):(.+?)\]\]", r'<mark class="legal-marker">[[\1:\2]]</mark>', out)
    out = re.sub(r"(https://[^\s<)]+)", r'<a href="\1" rel="noopener">\1</a>', out)
    return out


def render(md: str) -> str:
    lines = md.splitlines()
    out, i = [], 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line.strip():
            i += 1
            continue
        if line.startswith("# "):
            out.append(f"<h1>{inline(line[2:])}</h1>")
        elif line.startswith("## "):
            out.append(f"<h2>{inline(line[3:])}</h2>")
        elif line.startswith("| "):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                if not re.match(r"^\|\s*-", lines[i]):
                    rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            head, body = rows[0], rows[1:]
            out.append("<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
                       + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body) + "</tbody></table>")
            continue
        elif line.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline(lines[i][2:])}</li>")
                i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
            continue
        elif re.match(r"^\d+\. ", line):
            items = []
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                item_text = re.sub(r"^\d+\. ", "", lines[i])
                items.append(f"<li>{inline(item_text)}</li>")
                i += 1
            out.append("<ol>" + "".join(items) + "</ol>")
            continue
        else:
            out.append(f"<p>{inline(line)}</p>")
        i += 1
    return "\n".join(out)


def page(title: str, body: str, draft: bool) -> str:
    banner = ('<div class="legal-draft" role="note"><strong>Draft.</strong> This document has not been finalised or '
              'reviewed by a lawyer. Highlighted items are still missing.</div>') if draft else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>{html.escape(title)} — Study-Smart</title>
  <link rel="icon" href="icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="landing.css">
  <link rel="stylesheet" href="legal.css">
</head>
<body>
  <header><div class="nav-container"><a href="./" class="logo">Study-Smart</a><nav class="nav-links"><a href="app.html">Open the app</a></nav></div></header>
  <main class="legal-main">
{banner}
{body}
  </main>
  <footer class="legal-footer">
    <a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="copyright.html">Copyright</a><a href="notices.html">Notices</a><a href="./">Home</a>
  </footer>
</body>
</html>
"""


def main():
    for name, title in PAGES.items():
        md = (ROOT / "legal-src" / f"{name}.md").read_text(encoding="utf-8")
        draft = "[[MISSING:" in md or "[[REVIEW:" in md
        (ROOT / f"{name}.html").write_text(page(title, render(md), draft), encoding="utf-8")
        print(f"built {name}.html{' (draft)' if draft else ''}")


if __name__ == "__main__":
    main()
