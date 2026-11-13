"""Checks that research gate is not silently promoted to PASS without evidence."""
from pathlib import Path
import csv
import importlib.util
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("research_validator", ROOT / "scripts" / "validate_research.py")
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)

class ResearchValidatorTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.root = Path(self.dir.name)
        shutil.copytree(ROOT / "docs" / "research", self.root / "docs" / "research")

    def test_current_repo_passes_with_unknown_frequency(self):
        self.assertEqual([], module.check(ROOT))

    def test_claimed_frequency_requires_source_period_and_access_date(self):
        path = self.root / "docs/research/keywords.csv"
        with path.open(encoding="utf-8", newline="") as fh:
            rows = list(csv.DictReader(fh))
        rows[0]["frequency"] = "12345"
        rows[0]["frequency_definition"] = "wide"
        with path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        self.assertTrue(any("measured frequency missing provenance" in e for e in module.check(self.root)))

    def test_missing_organic_position_is_rejected(self):
        path = self.root / "docs/research/serp-samples.csv"
        with path.open(encoding="utf-8", newline="") as fh:
            rows = list(csv.DictReader(fh))
        rows[0]["organic_position"] = "2"
        with path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        self.assertTrue(any("ranks not contiguous" in e for e in module.check(self.root)))

    def test_independent_serp_snapshots_do_not_share_rank_sequence(self):
        path = self.root / "docs/research/serp-samples.csv"
        with path.open(encoding="utf-8", newline="") as fh:
            rows = list(csv.DictReader(fh))
        extra = []
        for row in rows[:5]:
            copy = row.copy()
            copy["region"] = "Moscow, Russia (Yandex region 213)"
            copy["browser_run"] = "https://example.com/browser-run-moscow"
            extra.append(copy)
        with path.open("a", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
            writer.writerows(extra)
        self.assertEqual([], module.check(self.root))

    def test_go_without_measured_data_is_rejected(self):
        keywords_path = self.root / "docs/research/keywords.csv"
        with keywords_path.open(encoding="utf-8", newline="") as fh:
            rows = list(csv.DictReader(fh))
        for row in rows:
            row["frequency"] = ""
            row["frequency_definition"] = "NOT_MEASURED"
            row["source_url"] = ""
            row["accessed_at"] = ""
            row["frequency_status"] = "not_measured"
        with keywords_path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        path = self.root / "docs/research/gate-1-decision.md"
        text = path.read_text(encoding="utf-8")
        path.write_text(text.replace("**ИТОГ: BLOCKED", "**ИТОГ: GO"), encoding="utf-8")
        self.assertTrue(any("cannot be GO" in e for e in module.check(self.root)))

    def test_financial_arithmetic_mismatch_is_rejected(self):
        path = self.root / "docs/research/financial-scenarios.csv"
        with path.open(encoding="utf-8", newline="") as fh:
            rows = list(csv.DictReader(fh))
        rows[2]["net_revenue_rub"] = "-9867"
        with path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        self.assertTrue(any("net arithmetic mismatch" in e for e in module.check(self.root)))

    def test_replacement_character_is_rejected(self):
        path = self.root / "docs/research/keywords.csv"
        text = path.read_text(encoding="utf-8")
        path.write_text(text.replace("калькулятор", "�", 1), encoding="utf-8")
        self.assertTrue(any("U+FFFD" in e for e in module.check(self.root)))

    def test_invalid_utf8_is_rejected(self):
        path = self.root / "docs/research/keywords.csv"
        path.write_bytes(b"query,cluster\n\xff\n")
        self.assertTrue(any("invalid UTF-8" in e for e in module.check(self.root)))

    def test_measured_keyword_must_match_wordstat_observation(self):
        path = self.root / "docs/research/keywords.csv"
        with path.open(encoding="utf-8", newline="") as fh:
            rows = list(csv.DictReader(fh))
        measured = next(row for row in rows if row["frequency"])
        measured["frequency"] = "999999"
        with path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        self.assertTrue(any("does not match wordstat-observations.csv" in e
                            for e in module.check(self.root)))

    def test_no_data_is_validated_as_related_query_flag(self):
        path = self.root / "docs/research/wordstat-observations.csv"
        with path.open(encoding="utf-8", newline="") as fh:
            rows = list(csv.DictReader(fh))
        row = next(row for row in rows if row["frequency"] and row["no_data"] == "true")
        row["no_data"] = "false"
        with path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        self.assertTrue(any("no_data semantics mismatch" in e for e in module.check(self.root)))

if __name__ == "__main__":
    unittest.main()
