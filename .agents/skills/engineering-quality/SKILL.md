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

## Lessons from incidents
- Add a source-bound negative fixture for any previously missed failure (e.g. lossy UTF-8, duplicate JSON key, percent-encoded path/URL traversal, unexpected image/font MIME, nondeterministic EOL hashing), proportionate to changed code.
- Keep normalized values and typed domain results independent of UI; use a single schema for URL serialization/deserialization and parse untrusted query strings fail-closed. Avoid eval/unsafe HTML and leaking user input to network requests.
- Real browser checks must wait for assets/fonts to load and images to decode, then inspect console/network/404. Build success cannot prove mobile layout, keyboard access or image quality.
- On initial app scaffold choose and record runtime/tool versions and lockfile, tests/CI commands, module boundaries, narrow dependencies, and a reproduction command. Do not require Windows CI simply because prior app ran there; test actual affected platforms instead.
- For changed behavior require expected result, regression RED/GREEN when appropriate, and reviewer receipt tied to exact HEAD; consult `change-review`. Existing CI tests are structural only while no frontend exists.
