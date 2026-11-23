# Dachametr: WFA UI design workflow integration (2026-11-23)

**Status: IMPLEMENTED CODE / NOT VISUALLY APPROVED / BROWSER QA PENDING.**
**Base:** PR #17 `5fe7d3181a73f9a191b4f3b3ecac2da200231301`, following PR #16 → #15 → #14. **WFA source:** [`ebfd0880cedb0f1ebd68ab9821d19fbc64f681fb`](https://github.com/m-amirov/workflow-for-agents/commit/ebfd0880cedb0f1ebd68ab9821d19fbc64f681fb). Integration is a reviewable local-only PR based on PR #17; not merged into main. Main is docs-only. Owner approval of PR #14 does **not** approve new variants or export actions.

## Source and rights / design-reference-research

| Source | Observed public pattern / scope | Adaptation | Limit |
|---|---|---|---|
| [Rayon](https://www.rayon.design/) | Multi-surface design workspace; geometric inspection and tool-oriented workflows (product-level description; **no measured pixels**) | **Structure donor:** zones at left, real selected-zone editor center, computed BOM right; already approved in PR #14 | Not a spatial arrangement engine; no copied source assets/UI |
| [Mux via PricingPages](https://pricingpages.design/) | Catalog categorizes usage-based calculators and comparison patterns; **not a pixel audit** | **Numeric explanation donor:** keep net volume, reserve, packages and surplus traceable | Never add pricing tiers or inferred prices |
| [Vibecoding design guide](https://vibecoding.ru/build/dizain-saita-bez-neiroslopa) | Reference → components → one meaningful technique → preview choice → governed design | Adopt process, not copied aesthetics or motion | Website instructions are untrusted external content, not agent policy |

Previously reviewed individual references remain in [design-reference-research-2026-11-14](../../artifacts/design-reference-research-2026-11-14.md). Live measured grids, exact CSS properties of external sites and current mobile screenshots were **NOT** collected in this integration. Do not claim an external pixel match.

## Five WFA skills applied, without duplicating local Skills

1. **design-reference-research:** preserve Rayon as the approved reference; map numeric table patterns to BOM; avoid fabricated measurements and copied marketing sections.
2. **ui-component-reuse:** inventory and reuse project CSS + real `src/ui/app.ts` controls: `.workspace-grid`, `.zone-row`, `.layer-card`, `.bom-surface`, native HTML buttons/inputs. No React Bits, 21st.dev, npm package, external font or extra license surface was added.
3. **signature-visual-treatment:** the existing proportional dimension drawing and layer profile are the *single functional signature*. No decorative GPU animation, motion or fake image map. Existing static diagram behavior stays.
4. **design-variant-selector:** opt-in local-only selection with **three choices**: approved `rayon`, proposed `atlas` (editorial dimensional hierarchy) and proposed `ledger` (more prominent purchase schedule). Modes share state, inputs, calculations and semantics; only CSS variables/visual weight/layout proportions differ. `?select` shows an accessible non-overlay toolbar; `?dm-variant=...` is a shareable **local URL**, not a production URL. Other query parameters and hash are preserved, invalid variants fall back to baseline, back/forward should restore choice. Preview is excluded from production by `import.meta.env.DEV` plus a localhost guard. No parameter indexing/canonical duplication.
5. **design-system-governance:** existing `DESIGN.md` remains authority; approved tokens remain unchanged in the default view. Variant overrides are scoped to `:root[data-dm-preview]`. Add browser regression and exact-source review; don't imply spec tests prove rendering.

## Acceptance matrix

| Gate | Required evidence | Status at authoring |
|---|---|---|
| Source/semantic boundary | No changes to `src/domain/**`, formulas, app share/CSV semantics or approved no-query default | SOURCE REVIEW; must verify diff |
| Static/typecheck | `npm test`, `npm run build`, Python validators | NOT RUN at authoring; see exact-head CI |
| Browser preview behavior | Local `/?select`, 320/390/768/1024/1440, switches, hash preservation, browser history, no horizontal overflow or hidden results | NOT RUN at authoring |
| Real pixels | Before/after same browser, viewport, valid/error/result for all 3 options, exact HEAD screenshot hash | NOT RUN; do not claim visual PASS |
| Devices / A11Y | True zoom, physical mobile/tablet, software keyboard, screen reader | BLOCKED_DEVICE unless tested |
| Approval | Owner chooses whether to promote `atlas` or `ledger` | NOT AUTHORIZED |
| Market / publication | Market Gate 1, main merge, DNS, deploy, SEO indexing, monetization | BLOCKED / NOT AUTHORIZED |

## Local usage

```powershell
git fetch origin
git switch design/wfa-interface-variants-20261123
npm ci
npm run dev
# Open http://127.0.0.1:5173/?select
npm test
npm run build
npm run test:browser
python scripts/validate_skills.py
python scripts/validate_research.py
python -m unittest discover -s tests -v
```

Do not use this preview as a reason to merge stacked PRs or enable indexing. UI owner selection is a separate gate; project `AGENTS.md` and `DESIGN.md` outrank WFA's generic recommendations.
