---
name: release-readiness
description: "Use when preparing deployment or DNS changes, reviewing production release gates, merging launch PRs, enabling Yandex advertising, tracking, SEO submissions or rollback."
---

# Release readiness
Never deploy, merge to main, change DNS or enable ads without owner authorization.
1. Identify release SHA, scope and docs/quality-gates.md; gather actual evidence for selected calculation methods, code, browser UX, SEO, performance, accessibility, privacy and asset rights.
2. Confirm production configuration and risks: redirects, dachametr.ru canonical, TLS, cache, no secrets in public bundle, analytics and privacy decisions.
3. Test the deployed **actual** build: ordinary/invalid inputs, shareable URL (if supported), mobile layout, status codes, robots/sitemap and calculation correctness.
4. Collect real logs/screenshots/tool output; distinguish staging evidence and live-production evidence.
5. РСЯ requires real audience, eligibility and completed moderation. Do not invent engagement or claim approval based on application.
6. Document rollback and unresolved P0/P1. Use PASS/FAIL/BLOCKED/N/A per gate; blocked means not ready, not partial PASS.
Exit: evidence-based release recommendation plus explicit approval; otherwise BLOCKED_RELEASE_GATE.

## Owner permissions, truthful release gates
- A docs-only PASS, mergeable PR, generated assets or local build is NEVER a public release gate. Distinguish Market feasibility, Prototype authorization, staged build, production release and Post-launch metrics.
- No merge, deployment, domain/DNS, robots activation, Webmaster site submission, analytics, trackers, РСЯ or monetization changes unless owner gave that precise permission.
- Exact tree/SHA + reproducible build; browser/device screenshots for critical states; rollback plan, 404/asset/font checks, sitemap/robots/canonical tests and privacy/security review all must be recorded before declaring release ready.
- Fail-closed: true P0/P1 or blocked required test is not “mostly PASS”; report `NOT RUN` and independent vs author-provided evidence. Do not allow auto-retry of destructive/external operations when completion unknown.
- Post-launch metrics (real CTR, indexed URLs, RPM) cannot block the **measurement** of pre-launch market demand, but do block claims of proven SEO profitability.
