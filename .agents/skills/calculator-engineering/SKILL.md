---
name: calculator-engineering
description: "Use when defining, implementing, checking or debugging lawn, garden, soil, fertilizer, watering, planting, material, geometry or area calculator mathematical logic."
---

# Calculator engineering
1. Start from docs/calculator-spec-template.md: scenario, typed inputs, units, allowed ranges, outputs, visible assumptions.
2. Separate deterministic geometry from agronomic rates (fertilizer NPK, seeding density, irrigation). For contextual norms verify actual sources and limits. If unknown, ask the user to enter their norm or block that claim; never invent an average.
3. Use pure, typed TypeScript calculation functions, independent of React/DOM/server API. Normalize values, handle NaN, infinity, empty, zero, negative and extreme inputs.
4. Specify base units (m², m³, L, g), precise conversions, dimensional consistency. Round only at display or purchase-unit boundary.
5. Before coding record numerical expected values derived independently from reference math or cited methodology; test boundary values, unit conversion, monotonic/scaling invariants, rounding and regression.
6. Show result breakdown and method limitations; cost requires actual user-entered price. Shared URL results must be deterministic and must not create indexed parameter duplicates.
Exit: sourced methodology, accepted spec and actual test evidence; otherwise BLOCKED_FORMULA_EVIDENCE.

## Anti-regression contract
- For each task specify the **physical quantity** for inputs/outputs: m, m², m³, L, kg, kg/m³. Density is not a universal constant; user input/credible material data required.
- Geometry and BOM are separate outputs. Never propagate rounded display numbers into later steps. Test `ceil` at 0, exact package boundary, boundary+epsilon, with/without reserve, several zones and different units.
- Keep raw user-entry locale parser outside the pure engine, preserve intermediate strings such as `1,` until final validation; reject NaN/Infinity and accidental Number coercion.
- Multi-zone property checks: area and volumes monotone, zone permutation invariant, correct sum then purchase-rounding policy documented. Undo/delete-zone and URL state should not change unrelated results.
- Require independently computed examples before implementation. Never accept the code-under-test as the source of its own expected answer. Use `docs/development-contract.md` and `docs/cross-project-regressions.md`.
