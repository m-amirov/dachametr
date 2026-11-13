---
name: change-review
description: "Use when reviewing PRs, fixing bugs, upgrading dependencies, modifying design, fonts, images, routes, CI or release readiness; require baseline preservation, independent evidence and exact SHA."
---

# Change impact and independent review
1. Start from branch/HEAD/status, PR base, changed files, owner decisions and affected gates. Compare with existing baseline, not only new screenshot or author claims.
2. Freeze unaffected visual assets/fonts/typography/routes/formulas unless requested. Unexpected file deletion, fallback font, crop/blur, binary replacement, screenshot drift or query canonical changes are regressions.
3. Compute change-impact matrix: math, UI, mobile, a11y, SEO, security, image/font license, data integrity, state, performance. For each mark PASS/FAIL/BLOCKED/NOT RUN/N/A, tool, command, evidence SHA.
4. Review actual rendered state and network requests; build/DOM/CI success cannot prove layout. Treat independent verification as separate from author's self-report.
5. Root-cause fix requires a regression test on pre-fix behavior when practical, and evidence RED→GREEN. Never hide failure by weakening CI, excluding tests or redefining scope.
6. Inspect PR diff for accidental new dependencies, mass refactor, generated noise, hardcoded assumptions, duplicated configs, lossy encodings, secret leak, unrelated asset edits or destructive actions.
7. Require user approval before merging main, releasing, changing DNS, public indexing, analytics or ad integration. Exact target SHA; check branch HEAD and CI on that SHA.
Exit: reproducible, scope-limited review receipt with blockers rather than assumed ready status.
