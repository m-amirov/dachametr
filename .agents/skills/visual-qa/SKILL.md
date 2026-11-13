---
name: visual-qa
description: "Use when auditing actual rendered DachaMetr screens, mobile calculator forms, image/screenshots, design regressions, AI-slop visual symptoms or responsive accessibility issues."
---

# Browser visual QA
Read-only unless implementation is requested. Never infer rendered pixels from CSS, a Figma mock or a DOM dump.
1. Record exact commit, URL, browser, device vs emulation, viewport CSS dimensions, DPR, input and state.
2. Capture real current-build screenshots at relevant widths 320/390/768/1440: initial, error and result; record evidence.
3. Evaluate visual hierarchy (calculator first), crop, controls, typography, labels/units, layout, focus, contrast, long Russian strings, zoom, tap targets and unnecessary generic decoration.
4. Assign P0/P1/P2 with reproduction, expected/observed, screenshot evidence and recommended correction.
5. Verify only supported scopes. Desktop emulation is not evidence of physical-device behavior. If capture unavailable → BLOCKED_BROWSER_CAPTURE.
Exit: concrete findings and evidence; PASS is only for actually tested, nonblocking scopes.

## Incident-driven audit
- Detect disappeared fonts/Cyrillic fallback, image 404/unsupported MIME, incomplete decode, low-quality images, clipping and unexpected blur/crop. Record network/console plus actual screenshot; do not infer from asset filenames.
- Check before/after approved baseline and isolate what changed intentionally. Run at 320,390,768,1024,1440, zoom/long Russian labels, keyboard/screenreader controls, state after back/reload, sticky-result overlap and landscape tablet.
- If a physical Huawei/Yandex Browser or another real target device is available, separately test touch/soft keyboard/navigation; emulation is NOT physical-device proof. If no device, mark `BLOCKED_DEVICE`.
- P0/P1 with reproducible steps and exact SHA cannot pass visual gate on “looks fine” or CI alone; require corrected screenshot and rerun affected paths. Consult `interaction-reliability` for state/lifecycle and `change-review` for regressions.
