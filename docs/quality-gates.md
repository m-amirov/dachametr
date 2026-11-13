# Матрица доказательных gates

## Семантика
`PASS` — реально выполненная проверка с результатом на exact SHA; `FAIL` — наблюдаемый дефект; `BLOCKED` — нет возможности проверить; `NOT RUN` — проверка ещё не запускалась; `N/A` — явно неприменима. **Не подменять BLOCKED/NOT RUN на PASS.** Структурный CI проверяет документы и исследования, но не browser UI.

| Gate | Требуемое доказательство | Текущий статус |
| --- | --- | --- |
| G0 preparation | Правила/skills, provenance, validator и unit tests | PASS в пределах опубликованного docs CI; новые изменения требуют своего CI |
| G1 market feasibility | Измеренный спрос, конкуренты, SERP/регион/device, Webmaster competition, user jobs и честный вывод | BLOCKED; `docs/research/gate-1-decision.md` |
| GP prototype authorization | Явное решение владельца на один локальный vertical slice, scope, spec, stop-lines | AUTHORIZED LIMITED 2026-11-13 (только локальная реализация; docs/decisions.md) |
| G2 formula correctness | Independently derived golden numbers, units, bounds, source/assumptions, rounding | PARTIAL: TypeScript engine проверен против 16 golden и 37 negative cases на HEAD PR #6; независимый код-ревью/приложение — NOT RUN |
| G3 code engineering | Exact SHA, lockfile/runtime, lint, typecheck, unit/component/integration/build/security | PARTIAL: npm ci + строгий tsc + Node unit tests PASS на HEAD PR #6; lint, UI integration и build — NOT RUN |
| G4 real browser/visual/a11y | Screenshots 320/390/768/1024/1440, current URL/SHA/browser/state; focus/keyboard/zoom/touch; asset/font/network errors | NOT RUN |
| G4 physical device | Реальный mobile/tablet для critical workflows; desktop emulation отмечать отдельно | BLOCKED_DEVICE если физическая платформа недоступна |
| G5 technical SEO | Фактический HTML/status, title/H1/canonical/query URL, robots/sitemap, duplicate routes, mobile parity | NOT RUN |
| G6 performance | Lighthouse lab текущей сборки, JS/image/font budget; field CWV позже | NOT RUN |
| G7 privacy/security/assets | URL/JSON/XSS security, secrets/PII, CSP/dependency rights, font/image integrity | NOT RUN |
| G8 staging/production | Owner permission, deployed exact SHA, smoke, TLS/DNS, rollback, indexing/ads decision | NOT AUTHORIZED |
| G9 post-launch evidence | Реальная индексация, impressions, clicks/CTR, organic sessions, RPM/расходы | N/A до запуска |

Field CWV при достаточной выборке: LCP <=2.5s, INP <=200ms, CLS <=0.1 на p75. Lab Lighthouse не доказывает field performance и SEO позиции. Нельзя требовать настоящий Page RPM нового домена как pre-launch доказательство рыночного спроса.

## Severity, review и release
- P0: high-impact неверная формула, потеря состояния, security/privacy, несанкционированный production release.
- P1: неправильное округление упаковок, критический UI на touch/keyboard, исчезновение шрифтов/картинок, ошибочный canonical/noindex.
- P2: косметический дрейф, слабые вторичные подписи, некритическая производительность.
- Для docs-only PR G2–G9 = N/A/NOT RUN, но **не PASS**. Для UI PR G4 обязателен на проверенных сценариях; отсутствие физического устройства допускает только `BLOCKED_DEVICE` (не ложный PASS).
- Нельзя скрывать P0/P1, ослаблять CI, переписывать эталон под buggy observed, заявлять release ready при недостающих mandatory gates.
- Каждый PR: exact branch/base/HEAD, changed files, commands и exit code, screenshots/logs/links на тот же SHA, RED→GREEN root cause по дефекту, FAIL/BLOCKED/NOT RUN и owner authorizations.
