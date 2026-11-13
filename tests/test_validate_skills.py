"""Regression coverage for the local skill-manifest validator."""
from pathlib import Path
import importlib.util
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("skill_validator", ROOT / "scripts" / "validate_skills.py")
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)

class ValidatorTests(unittest.TestCase):
    def test_current_repository(self):
        self.assertEqual([], module.check(ROOT))

    def test_missing_docs_are_not_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / ".agents", root / ".agents")
            (root / "AGENTS.md").write_text((ROOT / "AGENTS.md").read_text(encoding="utf-8"), encoding="utf-8")
            self.assertTrue(any("missing document:" in e for e in module.check(root)))

    def test_invalid_frontmatter_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for rel in module.REQUIRED_DOCS:
                target = root / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text((ROOT / rel).read_text(encoding="utf-8"), encoding="utf-8")
            bad = root / ".agents" / "skills" / "broken" / "SKILL.md"
            bad.parent.mkdir(parents=True)
            bad.write_text("---\nname: wrong\n---\nshort\n", encoding="utf-8")
            errors = module.check(root)
            self.assertTrue(any("must match directory" in e for e in errors))
            self.assertTrue(any("description" in e for e in errors))

if __name__ == "__main__":
    unittest.main()
