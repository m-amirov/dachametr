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
