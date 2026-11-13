#!/usr/bin/env python3
"""Validate evidence provenance and CSV structure for Dachametr SEO Gate 1."""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from pathlib import Path
import csv
import re
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]

def table(root: Path, path: str, required: set[str], errors: list[str]) -> list[dict]:
    target = root / path
    if not target.is_file():
        errors.append(f"missing: {path}")
        return []
    with target.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        headers = set(reader.fieldnames or [])
        if not required <= headers:
            errors.append(f"{path}: missing columns {sorted(required - headers)}")
            return []
        return list(reader)

def valid_url(url: str) -> bool:
    parsed = urlsplit(url)
    return parsed.scheme == "https" and bool(parsed.netloc)

def valid_date(value: str) -> bool:
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False

def check(root: Path) -> list[str]:
    errors = []
    base = "docs/research/"
    keywords = table(root, base + "keywords.csv",
        {"query", "cluster", "region", "period", "frequency",
         "frequency_definition", "source_url", "accessed_at", "notes"}, errors)
    measured = 0
    seen = set()
    for i, row in enumerate(keywords, start=2):
        key = (row["query"].strip(), row["cluster"].strip())
        if not all(key) or key in seen:
            errors.append(f"keywords.csv:{i} blank or repeated query/cluster")
        seen.add(key)
        freq = row["frequency"].strip()
        if not freq:
            if row["frequency_definition"].strip() != "NOT_MEASURED":
                errors.append(f"keywords.csv:{i} unknown frequency must say NOT_MEASURED")
            if row["source_url"].strip() or row["accessed_at"].strip():
                errors.append(f"keywords.csv:{i} unknown frequency cannot imply verified observation")
        else:
            measured += 1
            if not re.fullmatch(r"\d+(?:\.\d+)?", freq):
                errors.append(f"keywords.csv:{i} frequency must be a nonnegative number")
            if not all([valid_url(row["source_url"]), valid_date(row["accessed_at"]),
                        row["period"].strip(), row["frequency_definition"].strip() not in ("", "NOT_MEASURED")]):
                errors.append(f"keywords.csv:{i} measured frequency missing provenance")
    serp = table(root, base + "serp-samples.csv",
        {"observation_date", "region", "query", "organic_position",
         "title_short", "target_url", "collection_method", "browser_run"}, errors)
    per_query = defaultdict(list)
    for i, row in enumerate(serp, start=2):
        try:
            rank = int(row["organic_position"])
        except (ValueError, TypeError):
            errors.append(f"serp-samples.csv:{i} invalid rank")
            continue
        per_query[row["query"]].append(rank)
        if not all([valid_date(row["observation_date"]), row["region"].strip(),
                    valid_url(row["target_url"]), valid_url(row["browser_run"])]):
            errors.append(f"serp-samples.csv:{i} missing observation/provenance")
    for q, ranks in per_query.items():
        if sorted(ranks) != list(range(1, len(ranks) + 1)):
            errors.append(f"serp-samples.csv: ranks not contiguous for {q}")
    competitors = table(root, base + "competitor-matrix.csv",
        {"cluster", "url", "verification_level", "observable_functionality",
         "evidence_url", "competitive_implication"}, errors)
    for i, row in enumerate(competitors, start=2):
        if row["verification_level"] not in {"tested_live_interaction", "page_read", "search_result_only"}:
            errors.append(f"competitor-matrix.csv:{i} invalid verification level")
        if not valid_url(row["url"]) or not valid_url(row["evidence_url"]):
            errors.append(f"competitor-matrix.csv:{i} source URL missing")
    decision_path = root / base / "gate-1-decision.md"
    if not decision_path.is_file():
        errors.append("missing Gate 1 decision")
    else:
        decision = decision_path.read_text(encoding="utf-8")
        outcome = re.search(r"\*\*ИТОГ:\s*(GO|NO-GO|BLOCKED)\b", decision)
        if not outcome:
            errors.append("Gate 1 decision must explicitly name GO/NO-GO/BLOCKED")
        elif outcome.group(1) == "GO" and not measured:
            errors.append("Gate 1 cannot be GO with no actual measured frequencies")
    return errors

if __name__ == "__main__":
    problems = check(ROOT)
    if problems:
        for problem in problems:
            print("ERROR:", problem, file=sys.stderr)
        raise SystemExit(1)
    print("PASS: research CSV provenance, SERP ranks and decision; measured keywords:",
          sum(bool(r["frequency"].strip()) for r in table(
              ROOT, "docs/research/keywords.csv", {"frequency"}, [])))
