# Дачаметр

Онлайн-калькуляторы для участка, дачи и сада. Основной домен: https://dachametr.ru (зарегистрирован владельцем; работа сайта и DNS ещё не настроены).

**Статус: локальный прототип (расчётный движок).** Market Gate 1 остаётся BLOCKED, хотя PR #2 содержит 80 числовых Wordstat-наблюдений. Один локальный прототип AUTHORIZED LIMITED 2026-11-13; индексируемые страницы, деплой и реклама не разрешены.

## Документация
- [Инструкции Codex](AGENTS.md)
- [Продуктовый бриф](docs/product-brief.md)
- [Журнал решений](docs/decisions.md)
- [Исходная SEO-гипотеза](docs/research-baseline.md)
- [Gate 1: валидация спроса](docs/seo-validation.md)
- [Шаблон спецификации калькулятора](docs/calculator-spec-template.md)
- [Требования к дизайну](docs/design-principles.md)
- [Источники и качество контента](docs/content-trust.md)
- [Критерии качества](docs/quality-gates.md)
- [Этапы разработки](docs/roadmap.md)
- [Аудит и источники скиллов](docs/skills-sources.md)
- [Сценарии оценки поведения скиллов](docs/skill-evaluations.md)
- [Рубрика визуального QA](docs/design-review-rubric.md)
- [Первая задача для Codex](docs/first-codex-task.md)

## Codex
Двенадцать локальных project skills расположены в .agents/skills; выбираются по задаче через AGENTS.md. Три дополнительные защиты: data integrity, browser interaction и change review.

## Проверка базы знаний
Для документации требуется Python 3.10+. Для расчётного движка: Node.js 22.16.0, npm и фиксированная зависимость TypeScript 5.8.3.
- python scripts/validate_skills.py
- python scripts/validate_research.py
- python -m unittest discover -s tests -v
- npm ci
- npm run typecheck
- npm run test:domain

Проверка документации не означает готовность приложения, рынка или SEO.

## Лицензия
Не выбрана. Public-репозиторий сам по себе не означает разрешение повторно использовать код. Сторонние навыки не скопированы.

## Аудит разработки
- [Аудит готовности](docs/audits/readiness-2026-11-13.md)
- [Реестр повторяющихся регрессий](docs/cross-project-regressions.md)
- [Технический контракт](docs/development-contract.md)
- [Prototype Gate](docs/prototype-readiness-checklist.md) — AUTHORIZED LIMITED (local-only)
- [Обзор внешних навыков](docs/external-skills-review.md)

CI подготовительного репозитория проверяет структуру и данные. Реальные unit/browser/device/a11y/SEO/performance gates потребуют работающего приложения и отдельной авторизации.

## Предлагаемый первый вертикальный срез
- [Техническая спецификация](docs/specs/plot-zones-materials-v0.md) — утверждённый engineering baseline draft-v0.5, local-only
- [Эталонные тест-кейсы](docs/specs/plot-zones-materials-cases.json) — математика и границы
- [Дизайн-бриф](docs/specs/prototype-design-brief.md) — предложения, не принятие

PR #4 утверждён 2026-11-13 как инженерный baseline; отдельное owner-решение разрешает только локальный прототип, не публичный запуск. См. docs/decisions.md.

## Первый этап реализации
- `src/domain/exact.ts` — рациональная десятичная арифметика без округления IEEE-754 в вычислениях.
- `src/domain/plot.ts` — чистый расчёт участка, слоёв, BOM, упаковок и ошибок без React/DOM.
- `tests/plot-domain.test.mjs` — тесты против независимых эталонов и отрицательных сценариев из `docs/specs`.
- `.github/workflows/prototype-domain.yml` — отдельный CI с `npm ci`, `tsc` и Node test runner.

**UI пока отсутствует.** Next.js, дизайн-направление, шрифты, мобильный/планшетный браузер, индексация и реклама не утверждены и не проверены. Зелёный тест домена нельзя выдавать за готовый калькулятор.
