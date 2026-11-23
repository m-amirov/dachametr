# WFA → Dachametr: full interface redesign

**Date:** 2026-11-23. **Status:** IMPLEMENTED IN DRAFT PR / VISUAL APPROVAL PENDING.

The owner rejected the previous Rayon Workspace / atlas / ledger palette preview as generic. That feedback supersedes any former approval of *visual direction*, but not acceptance of functional behavior or release stop-lines.

## Root cause and design corrections

| Former problem | Implemented correction |
|---|---|
| Same visual weight for three dashboard columns | **Plot dimensions immediately after the header, without a decorative hero**; zone navigator quiet; main editor larger; separately weighted materials BOM |
| Tiny technical labels and duplicated dimensions | Editorial hierarchy, real step/order labels, form inputs above diagram, fewer repeated stats |
| Meaningless `?select` recolors | Retired preview module and its tests; one substantial direction on review branch |
| Accumulated overriding CSS obscured design ownership | Replaced 46 KB cascade with one coherent semantic-token stylesheet |
| Visualization before editable parameters | Zone dimensions before their measured plan; layer list immediately below |
| Tight mid-width three-pane layout | 821–1100px makes BOM a second-row continuation under editor |
| Insufficient mobile differentiation | Desktop sheet + 3-view mobile navigation with larger touch targets and no sticky keyboard overlay |

## WFA Skills applied

- `design-reference-research`: take procedural inspiration from [Rayon measurement](https://docs.rayon.design/documentation/design/measurement-distance-and-area) and [GARDENA myGarden](https://www.gardena.com/uk/c/discover/mygarden-planning-tools/garden-planner). No invented measurements, exact screenshots or unsupported current product claims; older detailed research is in [reference matrix](../../artifacts/design-reference-research-2026-11-14.md).
- `ui-component-reuse`: retain `src/ui/app.ts` existing controls and DOM events; no external packages, images or imported fonts.
- `signature-visual-treatment`: real input-dependent rectangle + layer cross-section, no decorative animation or fake plot placement.
- `design-variant-selector`: owner explicitly rejected palette-only alternatives, so the selector is removed rather than multiplied.
- `design-system-governance`: project `DESIGN.md` + `src/styles.css` only; add interaction/responsive regression coverage; native project Skills/AGENTS remain authoritative.

## Verification and authorization

Check current PR HEAD and commit-bound CI output. Run `npm test`, `npm run build`, `npm run test:browser`, `python scripts/validate_skills.py`, `python scripts/validate_research.py`, `python -m unittest discover -s tests -v`. Compare baseline PR #17 and redesigned PR #18 real browser captures for empty, editing, invalid, BOM. Check 195/320/390/768/821/900/1024/1100/1440px, overflow and keyboard focus. Structural checks do not prove visual polish.

**Before screenshot inspection:** visual acceptance NOT RUN. Device/a11y/true zoom NOT RUN. Market feasibility BLOCKED. PR stays Draft, no merge/main or public deployment.

## Graphics iteration — measured illustrations, not decoration

Following owner feedback that the graphics still looked generic, the plan now uses a survey-plate treatment (strong dimension marks, corner registration and high-contrast area) and the layers use **original dynamic SVG axonometric material faces** with explicit soil/sand/gravel textures, material legends and an empty state. Unlike the old flat strips, the visual corresponds to the selected zone and validated layers. The SVG surface is semantic and browser-rendered; its isometric depth is NOT a construction measurement. The proportion of layer heights follows the entered thickness values. Missing or invalid dimensions/specifications suppress unsupported graphics.

Inspiration in architectural section conventions, not copying: [Klopfer Martin section](https://www.klopfermartin.com/news/steel-yard-featured-in-asla-climate-exhibition-z583z), [STIMSON exploded layers](https://www.stimsonstudio.com/mit-hayden-library). External visual materials were not imported.

QA: the separate `tests/browser/material-graphics.spec.mjs` verifies no invented material, real label interaction, layer-height updates, invalid fail-closed behavior and responsiveness. CI and exact-HEAD captures required before claiming PASS. No change to `src/domain/**`.

### Empty-state graphics

The initial workspace now displays an original vector **blank measurement template** beside the explicit “Добавить зону” action. Dashed axes and the plus affordance communicate how a zone sketch is created without suggesting actual coordinates, dimensions or material quantities. The entire decorative SVG is `aria-hidden`, not an interactive fake map; the primary button remains keyboard accessible. Screenshot and mobile CSS verification required at final HEAD.
