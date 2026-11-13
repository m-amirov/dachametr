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
