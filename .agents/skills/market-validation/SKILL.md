---
name: market-validation
description: "Use when researching DachaMetr search demand, collecting Wordstat data, comparing real SERP competitors, grouping search intents or choosing MVP calculator clusters."
---

# Market validation
1. Read docs/seo-validation.md and the research baseline before searching. Understand Russian region, device, observation date and seasonality.
2. Gather genuine Wordstat/Вебмастер evidence where authorized. A search snippet is not a verified frequency. If the data source is inaccessible, report BLOCKED_WORDSTAT_ACCESS, not estimated counts as real.
3. Analyze SERP and actual working competitor calculators: query intent, inputs, outputs, mobile UX, formulas, differentiating potential. Record real URLs, dates, limitations.
4. Group by distinct **user job**, not synonym or number variations. Prevent cannibalizing same task through multiple nearly identical URLs.
5. Score candidates transparently on obtainable demand, competition, functional differentiation, formula safety, seasonal risk and implementation effort.
6. Produce docs/research/keywords.csv, serp-review.md, mvp-prioritization.md only with observed data, and gate-1-decision.md with GO/NO-GO/BLOCKED.
Exit gate: evidence-supported multi-cluster plan with ~8–10 unique calculator jobs. Without evidence → BLOCKED, not aspirational PASS.

## Gate separation and data lineage
- Project PR #2 currently has 80 numeric Wordstat observations, 23 months for 11 phrases and 4 full Perm SERP snapshots: recognize partial data and do not repeat obsolete `no Wordstat` claims. Market Gate remains BLOCKED.
- Require `research-data-integrity` on CSV regeneration/Wordstat exports. Strict UTF-8/U+FFFD check, raw observations, exact mode, provenance, explicit zero vs unknown and a recorded actual source artifact status.
- Wide, quoted and related phrases are not additive demand; flag building/industrial intent contamination for gravel/sand/fence/greenhouse before calling it garden demand.
- Mobile/region snapshots are not interchangeable; 23 months support a provisional seasonality description but never invent missing October. Do not demand real RPM/indexation from an unlaunched domain as prerequisite for measuring market interest.
- Separate market GO, separately owner-authorized local prototype and post-launch economics. Proposal is not approval; record what cannot be verified.
