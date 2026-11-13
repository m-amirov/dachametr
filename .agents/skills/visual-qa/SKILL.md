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
