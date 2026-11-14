#!/usr/bin/env python3
"""Dependency-free checks for local Codex skills and required docs."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_DOCS = (
    "AGENTS.md", "README.md", "docs/product-brief.md", "docs/decisions.md",
    "docs/seo-validation.md", "docs/quality-gates.md", "docs/skills-sources.md",
    "docs/audits/readiness-2026-11-13.md", "docs/development-contract.md",
    "docs/cross-project-regressions.md", "docs/prototype-readiness-checklist.md",
    "docs/external-skills-review.md", "DESIGN.md",
    "docs/design/reference-library.md", "docs/design/open-design-integration.md",
)

REQUIRED_SKILLS = {
    "market-validation", "calculator-engineering", "calculator-ux", "visual-craft",
    "visual-qa", "technical-seo", "content-integrity", "engineering-quality",
    "release-readiness", "research-data-integrity", "interaction-reliability",
    "change-review", "open-design-project",
}

def check(root: Path) -> list[str]:
    errors = []
    for rel in REQUIRED_DOCS:
        path = root / rel
        if not path.is_file():
            errors.append(f"missing document: {rel}")
            continue
        try:
            contents = path.read_text(encoding="utf-8", errors="strict")
        except UnicodeError:
            errors.append(f"invalid UTF-8 document: {rel}")
            continue
        if "\ufffd" in contents:
            errors.append(f"replacement character U+FFFD in document: {rel}")
    # Cover every docs Markdown file, not only the required entrypoints.
    for path in sorted((root / "docs").rglob("*.md")):
        rel = path.relative_to(root).as_posix()
        if rel in REQUIRED_DOCS:
            continue  # already checked above
        try:
            content = path.read_text(encoding="utf-8", errors="strict")
        except UnicodeError:
            errors.append(f"invalid UTF-8 document: {rel}")
            continue
        if "\ufffd" in content:
            errors.append(f"replacement character U+FFFD in document: {rel}")
    skills = sorted((root / ".agents" / "skills").glob("*/SKILL.md"))
    if not skills:
        errors.append("missing local skill manifests")
    try:
        routing = (root / "AGENTS.md").read_text(encoding="utf-8", errors="strict") if (root / "AGENTS.md").exists() else ""
    except UnicodeError:
        routing = ""  # document error already reported above
    names = set()
    for path in skills:
        relative = path.relative_to(root)
        try:
            text = path.read_text(encoding="utf-8", errors="strict")
        except UnicodeError:
            errors.append(f"{relative}: invalid UTF-8 skill")
            continue
        if "\ufffd" in text:
            errors.append(f"{relative}: replacement character U+FFFD")
        match = re.match(r"\A---\n(.*?)\n---\n", text, re.DOTALL)
        if not match:
            errors.append(f"{relative}: missing frontmatter")
            continue
        header = match.group(1)
        name = re.search(r"^name:\s*([a-z0-9-]+)\s*$", header, re.MULTILINE)
        description = re.search(r"^description:\s*(.+)$", header, re.MULTILINE)
        if not name or name.group(1) != path.parent.name:
            errors.append(f"{relative}: skill name must match directory")
        if not description or len(description.group(1).strip().strip('"')) < 50:
            errors.append(f"{relative}: description needs meaningful trigger (>50 chars)")
        if name:
            val = name.group(1)
            if val in names:
                errors.append(f"{relative}: duplicate skill {val}")
            names.add(val)
            if f"$" + val not in routing:
                errors.append(f"{relative}: missing AGENTS.md router entry")
        if len(text[match.end():].strip()) < 250:
            errors.append(f"{relative}: workflow body too short")
    for missing in sorted(REQUIRED_SKILLS - names):
        errors.append(f"missing required skill: {missing}")
    return errors

if __name__ == "__main__":
    failures = check(ROOT)
    for problem in failures:
        print("ERROR:", problem, file=sys.stderr)
    if failures:
        print(f"FAIL: {len(failures)} error(s)", file=sys.stderr)
        raise SystemExit(1)
    print(f"PASS: {len(list((ROOT / '.agents' / 'skills').glob('*/SKILL.md')))} skills and required docs")
