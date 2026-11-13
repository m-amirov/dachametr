# UI evidence — local prototype

Rendered application SHA: `f6d42440f3720e2f85a45370aaeef2df2091c8f7`  
Captured: 2026-11-13  
Runner: Playwright `1.65.0`, Chromium `158.0.8127.18`, DPR 1, local Vite server at `127.0.0.1:4173`.

## Captured states

Each target width has an initial empty state, an invalid-input state, and a completed two-zone BOM state:

- `320`, `390`, `768`, `1024`, `1440` CSS px: `initial-*.png`, `error-*.png`, `result-*.png`.
- `zoom-200-css-viewport`: 195 CSS px layout viewport, an emulation of a 390px device at 200% browser zoom. This is explicitly a CSS-viewport emulation, not a physical-device observation.
- `viewport-checks.json`: no document horizontal overflow and no console/request-failed errors for every captured state.

## Independent visual audit

PASS for the checked local scope. The chosen «Измерительный инструмент» direction keeps the task ahead of decoration, uses a compact editor/results split on desktop, stacks results under the editor on tablet/mobile, and makes the BOM, units, reserve, package count, and zone breakdown legible. Empty, blocked, and completed states have distinct visual treatment. Invalid plot input now blocks the result panel even before the first zone exists. No false map or zone placement is shown.

Physical phone/tablet, assistive technology, real on-screen keyboard, and production font rendering were not tested in this local headless-browser run; those gates remain `BLOCKED`/`NOT RUN` rather than inferred from emulation.
