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
