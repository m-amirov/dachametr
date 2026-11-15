# Dachametr Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended here) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an isolated, data-bound Dachametr Workspace visual prototype and evidence package for owner approval without changing the working Vite application.

**Architecture:** Add a self-contained static prototype under `artifacts/dachametr-workspace/` with its own HTML, CSS and browser JavaScript. A small generator imports the existing exact domain engine and writes a scenario JSON consumed by the prototype; the existing `src/` remains read-only. Browser tests and a capture script verify the interaction states, responsive layout and evidence metadata.

**Tech Stack:** Existing Vite 8.3.8 dev server, vanilla browser JavaScript, Playwright 1.65.0, current TypeScript domain engine, no new dependencies or fonts.

**Spec:** `docs/superpowers/specs/2026-11-15-dachametr-rayon-workspace-design.md`

## Global Constraints

- Base exact SHA is PR #11 `101cd559d82c807c036c319265b57c98e8bc3162`.
- Do not modify `src/domain`, `src/ui`, working `index.html`, `src/styles.css`, package dependencies or market/release settings.
- Prototype Gate is local-only; Market Gate 1 remains `BLOCKED`.
- No site map or invented geometry; only selected-zone dimensions and layer cross-section are allowed.
- No autosave claim; physical mobile, assistive technology and real soft-keyboard checks remain `BLOCKED / NOT RUN`.
- All derived numbers must come from `src/domain` and be recorded with source SHA and scenario input.

## Review Focus

- Domain-derived quantities: scenario JSON and the UI must agree on areas, volumes, packages, surplus and mass; `tests/workspace-data.test.mjs` pins this.
- Zone switching: selected zone and central editor must update while the BOM stays globally consistent; `tests/browser/workspace.spec.mjs` pins this.
- Mobile composition: only one workspace surface is visible at a time, no horizontal overflow, and BOM is reachable as a tab; browser tests pin this.
- Provenance honesty: no persistence or real placement claim appears in the prototype; `tests/workspace-contract.test.mjs` pins copy/markers.
- Visual evidence integrity: captures record SHA, browser, DPR, viewport and console/request failures; `scripts/capture-workspace-evidence.mjs` writes the manifest.

### Task 1: Record research, data contract and project-safe fixture

**Files:**
- Create: `artifacts/dachametr-workspace/scenario.json`
- Create: `scripts/generate-workspace-scenario.mjs`
- Create: `tests/workspace-data.test.mjs`
- Create: `tests/workspace-contract.test.mjs`
- Modify: none under `src/`

**Interfaces:**
- Consumes: `calculatePlotDetailed` from `src/domain/plot.ts`.
- Produces: `artifacts/dachametr-workspace/scenario.json` with `input`, `calculated`, `sourceSha` and `engine` metadata.

- [ ] **Step 1: Write failing data-contract tests** asserting the scenario file exists, includes plot 20×30, zones 2×4 and 2×5, includes soil/sand/gravel, and matches exact engine output.
- [ ] **Step 2: Run `node --test tests/workspace-data.test.mjs tests/workspace-contract.test.mjs`** and observe failure because the scenario and generator are absent.
- [ ] **Step 3: Implement `scripts/generate-workspace-scenario.mjs`** to import the existing engine, calculate the explicit input and write the JSON with SHA-256 of the domain source.
- [ ] **Step 4: Run the generator and the focused tests**; expected PASS with exact totals and no hardcoded derived values in the test fixture.
- [ ] **Step 5: Commit** `feat: add engine-bound workspace scenario`.

### Task 2: Build the isolated workspace prototype

**Files:**
- Create: `artifacts/dachametr-workspace/index.html`
- Create: `artifacts/dachametr-workspace/styles.css`
- Create: `artifacts/dachametr-workspace/app.js`
- Create: `tests/browser/workspace.spec.mjs`

**Interfaces:**
- Consumes: `scenario.json` from Task 1.
- Produces: desktop editor, selected-material editor, mobile editor and mobile BOM states through stable `data-testid` and `data-action` attributes.

- [ ] **Step 1: Write browser tests** for selecting `Дорожка`, opening the sand layer, mobile `Ведомость` tab, no horizontal overflow at 390/1440 and fail-closed error copy.
- [ ] **Step 2: Run `npm run test:browser -- tests/browser/workspace.spec.mjs`** and observe failure because the prototype route is absent.
- [ ] **Step 3: Implement the HTML/CSS/JS prototype** with a three-pane desktop workspace, proportioned zone rectangle, layer cross-section, compact BOM rows, and mobile tabs; keep all numeric display derived from JSON.
- [ ] **Step 4: Run the focused browser tests** and inspect both DOM behavior and screenshots at 1440×900 and 390×844.
- [ ] **Step 5: Commit** `feat: add Dachametr workspace visual prototype`.

### Task 3: Add design system board, Rayon audit and baseline comparison

**Files:**
- Create: `artifacts/dachametr-workspace/design-board.html`
- Create: `artifacts/dachametr-workspace/reference-audit.md`
- Create: `artifacts/dachametr-workspace/side-by-side.html`
- Create: `artifacts/dachametr-workspace/README.md`
- Create: `artifacts/dachametr-workspace/baseline/pr11-result-1440.png`
- Create: `artifacts/dachametr-workspace/baseline/pr12-result-1440.png`

**Interfaces:**
- Consumes: official Rayon URLs and exact baseline screenshots from PR #11/#12.
- Produces: verifiable reference table, token/component board and visual comparison page.

- [ ] **Step 1: Write the reference audit** with at least five official Rayon URLs, observed UI element, adopted principle, Dachametr benefit and explicit non-copy boundary.
- [ ] **Step 2: Add the board and comparison pages**; keep all images local and label screenshots with exact SHA/viewport.
- [ ] **Step 3: Run a browser smoke check** for both pages at desktop and mobile widths; expected no horizontal overflow and no console errors.
- [ ] **Step 4: Commit** `docs: add workspace design board and reference audit`.

### Task 4: Capture evidence, audit and handoff package

**Files:**
- Create: `scripts/capture-workspace-evidence.mjs`
- Create: `artifacts/dachametr-workspace/evidence/<sha>/desktop-1440x900.png`
- Create: `artifacts/dachametr-workspace/evidence/<sha>/desktop-material-1440x900.png`
- Create: `artifacts/dachametr-workspace/evidence/<sha>/mobile-390x844.png`
- Create: `artifacts/dachametr-workspace/evidence/<sha>/mobile-bom-390x844.png`
- Create: `artifacts/dachametr-workspace/evidence/<sha>/design-board-1440x900.png`
- Create: `artifacts/dachametr-workspace/evidence/<sha>/viewport-checks.json`
- Create: `artifacts/dachametr-workspace/audit-<sha>.md`

**Interfaces:**
- Consumes: prototype pages and browser test selectors from Task 2.
- Produces: exact-SHA screenshot receipt, independent visual audit, and explicit PASS/BLOCKED/NOT RUN gates.

- [ ] **Step 1: Write the capture script** to record Chromium version, DPR, viewport, console/request errors, scrollWidth/clientWidth and SHA-256 for every PNG.
- [ ] **Step 2: Run it at 1440×900 and 390×844**; expected evidence files with no horizontal overflow or console errors.
- [ ] **Step 3: Review screenshots side-by-side** and write findings against the ten user criteria, including any issues found and remaining gates.
- [ ] **Step 4: Run `npm test`, `npm run build`, `npm run test:browser`** and project validators; record actual outputs and `BLOCKED / NOT RUN` items.
- [ ] **Step 5: Commit** `test: capture workspace visual evidence`.

## Definition of Done

- The branch contains all five required visual artifacts plus source, reference audit, numeric provenance and side-by-side comparison.
- `src/domain` and the working Vite UI have no diff.
- Focused and existing checks run with exact outcomes; no unrun gate is called PASS.
- A GitHub PR is opened from the isolated branch without merge or deployment, with the final HEAD SHA and artifact links.
