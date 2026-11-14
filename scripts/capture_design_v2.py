#!/usr/bin/env python3
"""Capture exact-source local Chromium screenshots for the design-v2 static mockup."""
from __future__ import annotations
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MOCKUP = "design/plot-planner-result"
SOURCES = tuple(f"{MOCKUP}/{p}" for p in ("index.html", "styles.css", "app.js", "design-board.html"))
CAPTURES = (
    ("index.html", "result", 1440, 900),
    ("index.html", "result", 390, 844),
    ("index.html", "zoom-200-css-width-emulation", 195, 844),
    ("design-board.html", "board", 1440, 900),
    ("design-board.html", "board", 390, 844),
)

def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()

def source_fingerprint() -> dict:
    digest = hashlib.sha256()
    entries = []
    for path in SOURCES:
        raw = (ROOT / path).read_bytes()
        digest.update(path.encode() + b"\0" + raw + b"\0")
        entries.append({"path": path, "sha256": hashlib.sha256(raw).hexdigest()})
    status = git("status", "--porcelain=v1", "--untracked-files=all")
    return {
        "commitSha": git("rev-parse", "HEAD"),
        "dirty": bool(status),
        "dirtyStatus": status.splitlines(),
        "sourceDigestSha256": digest.hexdigest(),
        "sourceFiles": entries,
    }

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        return

@contextmanager
def serve_static():
    handler = partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)

def capture_all(output: Path) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    provenance = source_fingerprint()
    if provenance["dirty"]:
        raise RuntimeError(f"Visual capture requires clean committed source: {provenance['dirtyStatus']}")
    receipts = []
    with serve_static() as url:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            version = browser.version
            try:
                for document, state, width, height in CAPTURES:
                    errors = []
                    ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1)
                    page = ctx.new_page()
                    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
                    page.on("console", lambda m: errors.append(f"console: {m.text}") if m.type == "error" else None)
                    page.on("requestfailed", lambda r: errors.append(f"requestfailed: {r.url}"))
                    response = page.goto(f"{url}/{MOCKUP}/{document}", wait_until="load")
                    if response is None or response.status != 200:
                        raise AssertionError(f"{document}: HTTP {response.status if response else 'no response'}")
                    page.wait_for_timeout(150)
                    metrics = page.evaluate("""() => ({
                      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
                      clientWidth: document.documentElement.clientWidth,
                      fullHeight: document.documentElement.scrollHeight,
                      openZones: Array.from(document.querySelectorAll('details.zone-card')).map(x => x.open)
                    })""")
                    if metrics["scrollWidth"] > metrics["clientWidth"]:
                        raise AssertionError(f"horizontal overflow {width}: {metrics}")
                    if document == "index.html":
                        expected = [True, False] if width <= 720 else [True, True]
                        assert metrics["openZones"] == expected, (width, metrics)
                        bed = page.locator("details.zone-card").first.locator(".material-quantity strong").first.text_content()
                        path_soil = page.locator("details.zone-card").nth(1).locator(".material-quantity strong").first.text_content()
                        total = page.locator(".bom-row").first.locator(".bom-buy strong").text_content()
                        assert [bed.strip(), path_soil.strip(), total.strip()] == ["40 × 50 л", "12 × 50 л", "52 × 50 л"]
                        if width == 390:
                            zones = page.locator("details.zone-card")
                            zones.nth(1).locator("summary.zone-summary").click()
                            page.wait_for_timeout(150)
                            assert not zones.first.evaluate("(e) => e.open")
                            assert zones.nth(1).evaluate("(e) => e.open")
                            zones.first.locator("summary.zone-summary").click()
                            page.wait_for_timeout(150)
                            assert zones.first.evaluate("(e) => e.open")
                            assert not zones.nth(1).evaluate("(e) => e.open")
                    if errors:
                        raise AssertionError(f"Chromium errors: {errors}")
                    filename = f"{'result' if document == 'index.html' else 'design-board'}-{width}x{height}.png"
                    path = output / filename
                    page.screenshot(path=str(path), full_page=True, animations="disabled")
                    raw = path.read_bytes()
                    receipts.append({
                        "file": filename,
                        "document": document,
                        "state": state,
                        "viewport": {"width": width, "height": height, "dpr": 1},
                        "renderHeight": metrics["fullHeight"],
                        "scrollWidth": metrics["scrollWidth"],
                        "clientWidth": metrics["clientWidth"],
                        "openZones": metrics["openZones"],
                        "consoleErrors": errors,
                        "bytes": len(raw),
                        "pngSha256": hashlib.sha256(raw).hexdigest(),
                    })
                    print(f"PASS {filename}: {metrics['scrollWidth']}px, open zones {metrics['openZones']}")
                    ctx.close()
            finally:
                browser.close()
    manifest = {
        "status": "captured",
        "capturedAtUtc": datetime.now(timezone.utc).isoformat(),
        "source": provenance,
        "browser": {"name": "Chromium", "version": version},
        "captureTool": "playwright-python/1.56.0",
        "mode": "localhost only; no public deployment",
        "screenshots": receipts,
        "notRun": ["physical device", "soft keyboard", "assistive technology", "real 200% browser zoom"],
    }
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    capture_all(args.output)
