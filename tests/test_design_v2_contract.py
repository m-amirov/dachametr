"""Contracts for the separate design-v2 static mockup, not the working app."""
from decimal import Decimal
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
MOCK = ROOT / "design" / "plot-planner-result"


class DesignV2MockupContracts(unittest.TestCase):
    def test_layer_quantities_are_not_aggregate_bom_quantities(self):
        html = (MOCK / "index.html").read_text(encoding="utf-8")
        board = (MOCK / "design-board.html").read_text(encoding="utf-8")
        bed_liters = Decimal(2) * Decimal(4) * Decimal("0.25") * 1000
        path_liters = Decimal(2) * Decimal(5) * Decimal("0.06") * 1000
        bed = int(bed_liters / Decimal(50))
        path = int(path_liters / Decimal(50))
        self.assertEqual((bed, path, bed + path), (40, 12, 52))
        self.assertIn(f"<strong>{bed} × 50 л</strong><small>2 000 л с запасом</small>", html)
        self.assertIn(f"<strong>{path} × 50 л</strong><small>600 л с запасом</small>", html)
        self.assertIn("<strong>52 × 50 л</strong><small>2 600 л фактически</small>", html)
        self.assertIn("<span>40 × 50 л</span>", board)
        self.assertIn("<strong>52 × 50 л</strong>", board)

    def test_mobile_uses_native_details_and_one_editing_zone(self):
        html = (MOCK / "index.html").read_text(encoding="utf-8")
        js = (MOCK / "app.js").read_text(encoding="utf-8")
        self.assertEqual(html.count('<details class="zone-card" open>'), 2)
        self.assertIn("matchMedia('(max-width: 720px)')", js)
        self.assertIn("card.open = index === 0", js)
        self.assertIn("card.addEventListener('toggle'", js)
        self.assertNotIn('href="./design-board.html"', html)

    def test_new_capture_requires_clean_exact_source_sha(self):
        capture = (ROOT / "scripts/capture_design_v2.py").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/design-v2-evidence.yml").read_text(encoding="utf-8")
        self.assertIn('git("rev-parse", "HEAD")', capture)
        self.assertIn("sourceDigestSha256", capture)
        self.assertIn('if provenance["dirty"]:', capture)
        self.assertIn("playwright==1.56.0", workflow)
        self.assertIn("actions/upload-artifact@v4", workflow)


if __name__ == "__main__":
    unittest.main()
