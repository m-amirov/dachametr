# Дачаметр

Онлайн-калькуляторы для участка, дачи и сада. Основной домен: https://dachametr.ru (зарегистрирован владельцем; работа сайта и DNS ещё не настроены).

**Статус: подготовка.** Market Gate 1 остаётся BLOCKED, хотя PR #2 содержит 80 числовых Wordstat-наблюдений. Один локальный прототип AUTHORIZED LIMITED 2026-11-13; индексируемые страницы, деплой и реклама не разрешены.

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
Требуется Python 3.10+; npm/дополнительные зависимости на этом этапе не нужны.
- python scripts/validate_skills.py
- python -m unittest discover -s tests -v

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
- [Техническая спецификация](docs/specs/plot-zones-materials-v0.md) — DRAFT/NOT APPROVED
- [Эталонные тест-кейсы](docs/specs/plot-zones-materials-cases.json) — математика и границы
- [Дизайн-бриф](docs/specs/prototype-design-brief.md) — предложения, не принятие

PR #4 утверждён 2026-11-13 как инженерный baseline; отдельное owner-решение разрешает только локальный прототип, не публичный запуск. См. docs/decisions.md.
