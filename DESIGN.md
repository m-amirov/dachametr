# Dachametr — DESIGN.md

**Status: PROPOSED / pending owner visual acceptance.** A full design revision to replace the rejected generic workstation aesthetic. The calculator remains a private local prototype in Draft PR #18.

## Direction: «Полевой лист»

A clear practical notebook for actual measurements and material takeoffs. Not a SaaS dashboard, sales funnel or pretend CAD editor.

- **Sequence:** plot inputs + measured area → zone navigation → editing one selected zone → proportional rectangle / layer profile → independently computed BOM and calculations. No double sets of editable parameters.
- **Layout:** small product masthead, **no marketing hero**, immediately visible plot input band, quiet zone rail, focused working sheet, distinctly weighted procurement results. At 821–1100px the BOM flows beneath the editor rather than squeezing into a third pane; at ≤820px existing tabs "Зоны / Редактор / Ведомость" stay operative.
- **Tokens:** paper `#f8f7f2`, panel `#fffefa`, ink `#24332b`, computed values and primary action green `#285747`, restrained rust accent `#a45c37`; soil/sand/gravel have separate semantic swatches. Exact implementation: `src/styles.css`.
### Canonical CSS tokens
Values below must match the initial `:root` declarations in `src/styles.css`. Tests enforce both directions.
- `--paper: #f8f7f2`
- `--canvas: #f2f0e9`
- `--panel: #fffefa`
- `--ink: #24332b`
- `--teal: #285747`
- `--orange: #a45c37`
- `--danger: #a53b31`

- **Type:** Cyrillic-safe system UI for labels, input and tabular numerals; Georgia only for structural headings. No fetched external fonts.
- **Signature:** real proportional *selected-zone* diagram and layer cross-section, not a fake geospatial placement or an invented agronomic rate. Geometry comes from existing input validation. Static, zero decorative animation.
- **Interaction:** existing `src/ui/app.ts` events, focus, ru-RU `1,`, invalid/error/recovery, accessible labels/units, zone selection, BOM fail-closed, share fragment and CSV remain unchanged. No domain calculation changes.
- **UI controls:** source-owned buttons, HTML fields, inline geometry. No React Bits, SaaS patterns, external component/script downloads or new runtime dependency.
- **Preview:** reject the previous palette-only `?select` variants; this PR carries one coherent redesigned page. No preview URL is indexable or deployed.

## Evidence and authority

This is the project's single design authority. Local `visual-craft`, `calculator-ux`, `visual-qa`, `interaction-reliability`, `technical-seo`, `change-review` and project `AGENTS.md` retain priority over generic WFA Skills.

Functional design sources: [Rayon measurement tools](https://docs.rayon.design/documentation/design/measurement-distance-and-area) for precision and takeoff hierarchy; [GARDENA myGarden](https://www.gardena.com/uk/c/discover/mygarden-planning-tools/garden-planner) for garden user tasks; [internal research](docs/design/reference-library.md). No copied visual assets, branding or external measured grids.

Working parent: PR #17 `5fe7d3181a73f9a191b4f3b3ecac2da200231301`.
WFA design methodology: [`ebfd088`](https://github.com/m-amirov/workflow-for-agents/commit/ebfd0880cedb0f1ebd68ab9821d19fbc64f681fb).

## Gates

For each candidate: exact HEAD `npm test`, `npm run build`, `npm run test:browser`, screenshot evidence on 320/390/768/1024/1440 (empty, error, editing, result), check geometry/overflow/focus, no `src/domain/**` diff. No claims of visual PASS without independent pixel inspection. Physical mobile/tablet, native keyboard, AT and true 200% zoom are separate `BLOCKED_DEVICE` until demonstrated. **Market Gate 1 remains BLOCKED**. No `main` merge, DNS/deployment/SEO/analytics/ads without separate authorization.
