---
name: visual-craft
description: "Use for creating original brand identity, visual references, component tokens, typography and layouts for DachaMetr calculator pages and responsive frontend screens."
---

# Visual craft, not AI slop
1. Read docs/design-principles.md and the real calculator specification. This is a utility experience, **not** a conversion landing page.
2. Explore 2–3 distinct, reasoned design directions around measurement, land, water, plots and practical planning. Source references, don't copy layouts.
3. Agree on semantic color tokens, typography, hierarchy, spacing and interaction states. Do not blindly use third-party fixed fonts, colors or mandatory hero/FAQ/CTA sections.
4. Make tool inputs/results the first useful interface. Use functional diagrams only when they explain area, layers or planting scheme. Avoid fake reviews, decorative metrics and generic 3-card grids.
5. Develop one vertical slice with complete empty/error/result and desktop/mobile states before extending templates.
6. Critique real browser screenshots and improve defects; code, design mockup and passing build do not count as rendered visual review.
Exit: design rationale, tokens, real screenshot evidence, explicit remaining issues.

## Baseline preservation (prior game UI regressions)
- Before editing an existing screen capture original visual state, approved fonts, image IDs, crop policy and colors. No wholesale redesign or replacement with a generic AI style unless explicitly requested and approved.
- Font loading and Cyrillic glyph coverage are acceptance criteria; avoid switching to fallback without independent before/after browser review. Asset rights and deterministic processing matter more than a “modern” visual refresh.
- On project diagrams, preserve actual physical meaning: crop/contain/cover should never conceal formula-relevant elements. No forced blur-fill, stretched screenshots or fabricated visual measurements.
- Include tablet layouts 768/1024 and result/error/empty state; 320/390/1440 checks alone leave a gap. Screenshots from current SHA only; route to `change-review` on substantial visual diffs.
