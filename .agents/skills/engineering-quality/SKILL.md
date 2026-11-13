---
name: engineering-quality
description: "Use when implementing, testing, debugging, reviewing or securing TypeScript/React/Next.js logic, calculations, dependencies, build pipelines and CI for DachaMetr."
---

# Engineering quality
1. Read the repository and its current stage. Never assume package.json, test scripts, built app or passed SEO gate.
2. State observable behavior and write a focused failing test before new calculation logic/bugfix where feasible. Fix root cause, prove regression.
3. Keep pure calculation logic separate from parsing, React, IO and presentation. Explicit types, validation, deterministic outputs and minimal dependencies.
4. Test boundaries, unit conversions, numeric expectations, error handling, URL encoding, UI interaction, and relevant security assumptions.
5. Evaluate dependencies, licenses, XSS/unsafe HTML, client secrets, remote requests, personal-data collection and accessibility/performance regressions.
6. Run **actual** repository lint/typecheck/tests/build when they exist. At preparation stage only Python skill validation commands exist.
7. Don't weaken tests/CI to get green. Report exact commands, exit codes, behavior proved, remaining risks and BLOCKED checks.
Exit: scoped diff, reproducible evidence and explicitly recorded unknowns.
