"""Project OpenDesign integration: deterministic static regression checks."""
from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]

class OpenDesignProjectTests(unittest.TestCase):
    def test_design_contract_reflects_existing_tokens(self):
        css = (ROOT / "src/styles.css").read_text(encoding="utf-8")
        design = (ROOT / "DESIGN.md").read_text(encoding="utf-8")
        for name, value in (
            ("canvas", "#f4f6f0"),
            ("paper", "#ffffff"),
            ("ink", "#14251f"),
            ("pine", "#2f705d"),
            ("coral", "#be4c2d"),
            ("danger", "#a53428"),
        ):
            with self.subTest(token=name):
                self.assertIn("--" + name + ": " + value, css)
                self.assertIn("--" + name + ": " + value, design)

    def test_integration_is_documented_and_routed(self):
        skill = (ROOT / ".agents/skills/open-design-project/SKILL.md").read_text(encoding="utf-8")
        routing = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        ref = (ROOT / "docs/design/reference-library.md").read_text(encoding="utf-8")
        guide = (ROOT / "docs/design/open-design-integration.md").read_text(encoding="utf-8")
        self.assertIn("$open-design-project", routing)
        self.assertIn("DESIGN.md", skill)
        for site in ("supahero.io", "pricingpages.design", "cta.gallery"):
            self.assertIn(site, ref)
        self.assertIn("nexu-io/open-design-agent-plugins", guide)
        self.assertIn("codex mcp get open-design --json", guide)

    def test_no_open_design_runtime_dependency_in_frontend(self):
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        for section in ("dependencies", "devDependencies"):
            self.assertFalse(any("open-design" in name for name in package.get(section, {})))

if __name__ == "__main__":
    unittest.main()
