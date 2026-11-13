#!/usr/bin/env python3
"""Validate evidence provenance and CSV structure for Dachametr SEO Gate 1."""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import io
import json
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
    try:
        content = target.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError as exc:
        errors.append(f"{path}: invalid UTF-8 ({exc})")
        return []
    if "\ufffd" in content:
        errors.append(f"{path}: contains Unicode replacement character U+FFFD")
    reader = csv.DictReader(io.StringIO(content, newline=""))
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

def rounded_rub(value: Decimal) -> int:
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))

def check(root: Path) -> list[str]:
    errors = []
    base = "docs/research/"
    keywords = table(root, base + "keywords.csv",
        {"query", "cluster", "region", "period", "frequency",
         "frequency_definition", "source_url", "accessed_at", "notes",
         "frequency_status", "no_data_scope"}, errors)
    measured = 0
    seen = set()
    for i, row in enumerate(keywords, start=2):
        operator = row.get("operator", "").strip() or "UNSPECIFIED"
        key = (row["query"].strip(), row["cluster"].strip(), operator,
               row["region"].strip(), row["period"].strip())
        if not all(key[:4]) or key in seen:
            errors.append(f"keywords.csv:{i} blank or repeated keyword observation")
        seen.add(key)
        freq = row["frequency"].strip()
        if not freq:
            if row["frequency_definition"].strip() != "NOT_MEASURED":
                errors.append(f"keywords.csv:{i} unknown frequency must say NOT_MEASURED")
            if row["source_url"].strip() or row["accessed_at"].strip():
                errors.append(f"keywords.csv:{i} unknown frequency cannot imply verified observation")
            if row["frequency_status"].strip() != "not_measured":
                errors.append(f"keywords.csv:{i} unknown frequency has invalid frequency_status")
        else:
            measured += 1
            if not re.fullmatch(r"\d+(?:\.\d+)?", freq):
                errors.append(f"keywords.csv:{i} frequency must be a nonnegative number")
            if not all([valid_url(row["source_url"]), valid_date(row["accessed_at"]),
                        row["period"].strip(), row["frequency_definition"].strip() not in ("", "NOT_MEASURED")]):
                errors.append(f"keywords.csv:{i} measured frequency missing provenance")
            if row["frequency_status"].strip() != "measured_numeric":
                errors.append(f"keywords.csv:{i} measured frequency has invalid frequency_status")
            if row["no_data_scope"].strip() != "related_queries":
                errors.append(f"keywords.csv:{i} measured row has invalid no_data_scope")
    serp = table(root, base + "serp-samples.csv",
        {"observation_date", "region", "query", "organic_position",
         "title_short", "target_url", "collection_method", "browser_run"}, errors)
    per_snapshot = defaultdict(list)
    seen_results = set()
    for i, row in enumerate(serp, start=2):
        try:
            rank = int(row["organic_position"])
        except (ValueError, TypeError):
            errors.append(f"serp-samples.csv:{i} invalid rank")
            continue
        snapshot = (row["observation_date"].strip(), row["region"].strip(),
                    row["query"].strip(), row["collection_method"].strip(),
                    row["browser_run"].strip())
        per_snapshot[snapshot].append(rank)
        result_key = snapshot + (row["target_url"].strip(),)
        if result_key in seen_results:
            errors.append(f"serp-samples.csv:{i} repeated result in snapshot")
        seen_results.add(result_key)
        if not all([valid_date(row["observation_date"]), row["region"].strip(),
                    valid_url(row["target_url"]), valid_url(row["browser_run"])]):
            errors.append(f"serp-samples.csv:{i} missing observation/provenance")
    for snapshot, ranks in per_snapshot.items():
        if sorted(ranks) != list(range(1, len(ranks) + 1)):
            errors.append(f"serp-samples.csv: ranks not contiguous for {snapshot[2]}")
    competitors = table(root, base + "competitor-matrix.csv",
        {"cluster", "url", "verification_level", "observable_functionality",
         "evidence_url", "competitive_implication"}, errors)
    for i, row in enumerate(competitors, start=2):
        if row["verification_level"] not in {"tested_live_interaction", "page_read", "search_result_only"}:
            errors.append(f"competitor-matrix.csv:{i} invalid verification level")
        if not valid_url(row["url"]) or not valid_url(row["evidence_url"]):
            errors.append(f"competitor-matrix.csv:{i} source URL missing")
    wordstat = table(root, base + "wordstat-observations.csv",
        {"id", "query", "operator", "region", "checked_at", "period",
         "frequency", "no_data", "related_queries_json", "frequency_status",
         "no_data_scope", "source_url", "source_mode",
         "source_artifact_status"}, errors)
    seen_wordstat = set()
    seen_wordstat_keys = set()
    wordstat_by_id_operator = {}
    for i, row in enumerate(wordstat, start=2):
        key = (row["id"].strip(), row["operator"].strip())
        if not all(key) or key in seen_wordstat:
            errors.append(f"wordstat-observations.csv:{i} blank or repeated id/operator")
        seen_wordstat.add(key)
        full_key = (row["query"].strip(), row["operator"].strip(),
                    row["region"].strip(), row["period"].strip())
        if not all(full_key) and row["frequency"].strip():
            errors.append(f"wordstat-observations.csv:{i} measured key is incomplete")
        if full_key in seen_wordstat_keys:
            errors.append(f"wordstat-observations.csv:{i} repeated query/operator/region/period")
        seen_wordstat_keys.add(full_key)
        wordstat_by_id_operator[key] = row
        if row["operator"].strip() not in {"wide", "quotes"}:
            errors.append(f"wordstat-observations.csv:{i} invalid operator")
        if not all([row["query"].strip(), row["region"].strip(),
                    valid_date(row["checked_at"]), valid_url(row["source_url"]),
                    row["no_data"].strip() in {"true", "false"}]):
            errors.append(f"wordstat-observations.csv:{i} missing provenance")
        if row["frequency"].strip() and not re.fullmatch(r"\d+", row["frequency"].strip()):
            errors.append(f"wordstat-observations.csv:{i} invalid frequency")
        if row["frequency"].strip() and not row["period"].strip():
            errors.append(f"wordstat-observations.csv:{i} measured frequency missing period")
        try:
            related = json.loads(row["related_queries_json"])
            if not isinstance(related, list):
                raise ValueError("related queries must be a list")
            expected_no_data = "true" if not related else "false"
            if row["no_data"].strip() != expected_no_data:
                errors.append(f"wordstat-observations.csv:{i} no_data semantics mismatch")
        except (json.JSONDecodeError, TypeError, ValueError):
            errors.append(f"wordstat-observations.csv:{i} invalid related_queries_json")
        expected_status = "measured_numeric" if row["frequency"].strip() else "main_value_not_returned"
        if row["frequency_status"].strip() != expected_status:
            errors.append(f"wordstat-observations.csv:{i} invalid frequency_status")
        if row["no_data_scope"].strip() != "related_queries":
            errors.append(f"wordstat-observations.csv:{i} invalid no_data_scope")
        if row["source_artifact_status"].strip() != "local_only_outside_repository":
            errors.append(f"wordstat-observations.csv:{i} invalid source_artifact_status")

    for i, row in enumerate(keywords, start=2):
        if not row["frequency"].strip():
            continue
        source_key = (row["evidence_id"].strip(), row.get("operator", "").strip())
        source = wordstat_by_id_operator.get(source_key)
        if source is None:
            errors.append(f"keywords.csv:{i} measured row has no Wordstat source record")
            continue
        for field in ("query", "region", "period", "frequency", "source_url"):
            if row[field].strip() != source[field].strip():
                errors.append(f"keywords.csv:{i} {field} does not match wordstat-observations.csv")
        if row["no_data"].strip() != source["no_data"].strip():
            errors.append(f"keywords.csv:{i} no_data does not match wordstat-observations.csv")
    dynamics = table(root, base + "wordstat-dynamics.csv",
        {"query", "operator", "region", "checked_at", "period", "frequency",
         "source_url", "source_file"}, errors)
    seen_dynamics = set()
    for i, row in enumerate(dynamics, start=2):
        key = (row["query"].strip(), row["operator"].strip(), row["period"].strip())
        if not all(key) or key in seen_dynamics:
            errors.append(f"wordstat-dynamics.csv:{i} blank or repeated query/operator/period")
        seen_dynamics.add(key)
        if not all([valid_date(row["checked_at"]), row["region"].strip(),
                    valid_url(row["source_url"]), row["source_file"].strip(),
                    re.fullmatch(r"\d+", row["frequency"].strip() or "")]):
            errors.append(f"wordstat-dynamics.csv:{i} missing provenance or invalid frequency")
    financial = table(root, base + "financial-scenarios.csv",
        {"monthly_pageviews", "rpm_rub", "gross_revenue_rub", "tax_rate",
         "fixed_costs_rub", "net_revenue_rub"}, errors)
    for i, row in enumerate(financial, start=2):
        try:
            pageviews = Decimal(row["monthly_pageviews"])
            rpm = Decimal(row["rpm_rub"])
            gross = rounded_rub(pageviews * rpm / Decimal("1000"))
            expected_net = rounded_rub(
                Decimal(gross) * (Decimal("1") - Decimal(row["tax_rate"]))
                - Decimal(row["fixed_costs_rub"])
            )
            if int(row["gross_revenue_rub"]) != gross:
                errors.append(f"financial-scenarios.csv:{i} gross arithmetic mismatch")
            if int(row["net_revenue_rub"]) != expected_net:
                errors.append(f"financial-scenarios.csv:{i} net arithmetic mismatch")
        except (InvalidOperation, TypeError, ValueError):
            errors.append(f"financial-scenarios.csv:{i} invalid numeric assumption")
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
