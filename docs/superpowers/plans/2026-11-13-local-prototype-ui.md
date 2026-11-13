# Dachametr Local Prototype UI Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a local, offline-capable interactive TypeScript prototype for plot dimensions, stable-ID zones/material variants/layers, exact BOM output, and responsive browser-tested editing.

**Architecture:** Keep `src/domain` as the calculation source of truth. Add a small Vite vanilla-TypeScript shell with pure draft/validation helpers and DOM components; no React, database, analytics, external runtime requests, or persistence. Add a detailed domain projection for per-zone breakdown without changing the existing `calculatePlot` output used by golden fixtures.

**Tech Stack:** Node 22.21, TypeScript 5.8.3, Vite 8.3.8, Playwright Test 1.65.0, native DOM/CSS, existing `node:test` domain tests.

**Spec:** `docs/specs/plot-zones-materials-v0.md` (`draft-v0.5`) and `docs/superpowers/specs/2026-11-13-local-prototype-design.md`.

## Global Constraints

- Only the approved local vertical slice is in scope; Market Gate 1 remains BLOCKED and no deploy, indexing, DNS, analytics, ads, or merge to `main` is allowed.
- Calculation logic remains pure TypeScript and independent of React/DOM/server APIs.
- Numeric draft input is stored as strings; comma and dot are accepted on commit, while intermediate `1,` remains unchanged until validation.
- Invalid data in any active zone/layer invalidates the complete BOM; no partial purchase report is shown as current.
- Material variants merge only through explicit stable `material_spec_id` reuse; same labels never merge automatically.
- No invented densities, construction norms, prices, or persistence promises.
- Screenshots are evidence only when tied to the current SHA, URL, browser, viewport, and state.

## Review Focus

- Removing or reordering a zone/layer must not move another draft's values; covered by stable-ID state tests.
- A reused material variant must update its label/kind everywhere without changing its ID; covered by material catalog state tests.
- An intermediate comma must remain visible and must not produce a stale BOM; covered by draft validation tests and browser input test.
- One invalid late zone must hide the complete BOM while preserving valid earlier data; covered by integration/browser tests.
- A grouped exact volume must ceil once after summing, and purchased mass must differ from required mass when appropriate; covered by existing golden tests plus a detailed projection test.

### Task 1: Design and application contract

**Files:**
- Create: `docs/superpowers/specs/2026-11-13-local-prototype-design.md`
- Create: `docs/superpowers/plans/2026-11-13-local-prototype-ui.md`
- Modify: `package.json`, `package-lock.json`, `tsconfig.json`
- Create: `index.html`, `vite.config.mjs`, `src/ui/model.ts`, `src/ui/format.ts`, `tests/ui-state.test.mjs`

**Interfaces:**
- Produces `AppState`, `ZoneDraft`, `LayerDraft`, `MaterialSpecDraft`, `createInitialState()`, `createZone()`, `createLayer()`, `updateDraftValue()`, and `formatRuNumber()` for later UI tasks.

- [ ] Write failing unit tests for stable IDs, draft-string preservation, deletion/reordering, and Russian number formatting.
- [ ] Run `npm run test:ui -- tests/ui-state.test.mjs` and observe failure before implementation.
- [ ] Add pinned Vite/Playwright scripts and minimal static entry; implement pure state and formatting helpers without DOM access.
- [ ] Run focused tests, typecheck, and build.
- [ ] Commit `chore: scaffold local prototype UI contract`.

### Task 2: Domain detail projection and draft validation

**Files:**
- Modify: `src/domain/plot.ts`
- Modify: `tests/plot-domain.test.mjs`
- Create: `src/ui/validation.ts`, `tests/ui-validation.test.mjs`

**Interfaces:**
- Consumes `AppState` from Task 1.
- Produces `calculatePlotDetailed(input)`, `DetailedCalculated`, `buildDomainInput(state)`, and `validateDraft(state)`.

- [ ] Add failing tests for per-zone/layer exact liters, comma conversion, fail-closed invalid input, and warning-area preservation.
- [ ] Run focused tests and observe failure.
- [ ] Extract shared exact calculation pass; keep `calculatePlot()` output unchanged and expose detailed rows only through `calculatePlotDetailed()`.
- [ ] Implement UI validation as a boundary adapter that preserves draft strings and maps domain errors to labels.
- [ ] Run domain and UI tests, typecheck, and build.
- [ ] Commit `feat: expose exact zone breakdown for UI`.

### Task 3: Tool-first responsive UI

**Files:**
- Create: `src/main.ts`, `src/ui/app.ts`, `src/styles.css`
- Modify: `index.html`
- Create: `tests/ui-app.test.mjs`

**Interfaces:**
- Consumes `createInitialState`, `validateDraft`, `buildDomainInput`, and `calculatePlotDetailed`.
- Produces a DOM application with labelled plot, zone, layer, material catalog, result, error, and empty states.

- [ ] Add failing component-level DOM tests for initial/empty states, add/remove zone and layer, material reuse, and result visibility.
- [ ] Run focused tests and observe failure.
- [ ] Implement semantic forms, delegated input events, stable-ID updates, explicit material reuse, fail-closed result rendering, and no-persistence notice.
- [ ] Add CSS tokens, focus/error states, compact desktop split, stacked mobile layout, and no-fake-map disclaimer.
- [ ] Run unit tests, typecheck, and build.
- [ ] Commit `feat: add interactive plot materials calculator UI`.

### Task 4: Browser E2E, evidence, and independent review

**Files:**
- Create: `playwright.config.mjs`, `tests/browser/prototype.spec.mjs`
- Create: `artifacts/ui-evidence/README.md`
- Modify: `.github/workflows/prototype-domain.yml` or add a scoped UI workflow only if it remains reproducible.

- [ ] Add a Playwright critical path: plot → two zones → reused soil variant → sand layer → grouped BOM, plus invalid late zone and comma editing.
- [ ] Run Chromium E2E with console/network failure capture; install/use only the required browser.
- [ ] Capture current-SHA screenshots at 320, 390, 768, 1024, and 1440 for initial, invalid, and result states.
- [ ] Audit keyboard focus, 200% zoom, horizontal overflow, font requests, and no external network calls.
- [ ] Run the complete local suite and the Python validators; record PASS/FAIL/BLOCKED/NOT RUN in evidence docs.
- [ ] Self-review the final diff against the spec, fix P0/P1 findings with RED→GREEN regression tests, and commit `test: verify local prototype browser flow`.

## Definition of Done

- The complete local flow works in a real Chromium session and the current UI never presents a partial BOM as current.
- Existing 16 golden cases and 37 negative cases remain unchanged and pass.
- Typecheck, unit tests, build, and available browser checks have fresh exit-code evidence.
- Evidence documents state exact SHA/browser/viewport and separate emulator checks from unavailable physical-device checks.
- PR is open from `feat/local-prototype-ui` against `feat/local-prototype-domain-engine`; no merge or deploy is performed.
