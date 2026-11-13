---
name: calculator-ux
description: "Use when designing calculator input labels, validation, units, errors, result presentation, keyboard navigation, responsive interaction and accessibility for DachaMetr."
---

# Calculator UX
1. Begin with the visitor's direct job. Primary form and result outrank branding and marketing sections.
2. Specify empty, editing, valid, invalid, missing-assumption and unit-switch states; preserve user's entered data on error.
3. Always show visible labels, units and helpful error messages; use semantic forms, fieldsets, focus styles and keyboard access. Never rely only on color.
4. Support Russian numeric entry with comma or dot, and format readable decimal output without silently changing input values.
5. Verify widths 320, 390, 768 and 1440 CSS px, 200% zoom, long Russian strings, tab order and accessible focus. Aim for 44×44 touch targets where practical.
6. Avoid surprise page navigation; saving or copying results must preserve valid inputs and remain private. Distinguish simulator from physical-device tests.
Exit: reproducible working user path with observed mobile/keyboard evidence, else BLOCKED_INTERACTIVE_QA.

## Lifecycle and tablet acceptance
- Critical steps: initial → editing (including `1,`) → error → result → change units → add/remove zone → share/copy/print → back/reload. Specify what persists, what resets and how errors are announced.
- Eskizno-derived risk: on a real Huawei tablet/Yandex Browser click/change/file chooser and scroll/zoom behavior differed from desktop; mark physical evidence BLOCKED unless actually observed.
- Avoid global wheel/scroll interception, focus loss on each keystroke, automatic form reset after invalid values, scroll-jumping sticky results and tooltips hiding units.
- Test 768/1024 tablet + software keyboard/landscape independently of narrow mobile; 200% zoom and 400% if relevant. Clipboard/print errors need user-visible fallback; no fake success.
- `interaction-reliability` owns browser state and gestures, `visual-qa` owns screenshots; neither DOM-only tests nor mocked event dispatch prove real browser behavior.
