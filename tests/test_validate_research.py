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
        with keywords_path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        path = self.root / "docs/research/gate-1-decision.md"
        text = path.read_text(encoding="utf-8")
        path.write_text(text.replace("**ИТОГ: BLOCKED", "**ИТОГ: GO"), encoding="utf-8")
        self.assertTrue(any("cannot be GO" in e for e in module.check(self.root)))

if __name__ == "__main__":
    unittest.main()
