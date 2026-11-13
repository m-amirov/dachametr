# Prototype Gate: checklist для решения владельца

`GATE_1_MARKET = BLOCKED`. **PROTOTYPE_AUTHORIZATION = NOT AUTHORIZED**. Наличие этой таблицы не выдаёт разрешение.

| Decision input | Сейчас | Требуется |
| --- | --- | --- |
| Исследование спроса | PARTIAL | Shortlist + источники и ограничения из PR #2; недостающий Webmaster отдельно |
| Вертикальный срез | DRAFT_SPEC_WRITTEN / NOT APPROVED | Owner explicitly approves exact scope: участок → зоны → грунт/щебень/песок → BOM |
| Формулы | DRAFT_FIXTURES_PREPARED / ENGINE_NOT RUN | Самостоятельные числовые эталоны, единицы, исключения, закупочные округления |
| Продуктовый дизайн | NOT RUN | 2–3 осмысленных направления → утверждённые tokens/assets/fonts |
| Инженерный контракт | SPECIFIED | `docs/development-contract.md` adopted for implementation |
| Среда разработки | NOT STARTED | Reproducible package lock, pinned versions, CI and browser runner |
| Доступность и планшет | NOT RUN | Keyboard, responsive and physical device evidence; blocked explicitly when absent |
| Технический SEO | NOT RUN | Rendered HTML, canonical/query URL, status, robots, sitemap review |
| Публичный запуск/РСЯ | NOT AUTHORIZED | Отдельные release gates, реальный production smoke |

**Если владелец разрешит прототип:** это разрешение исключительно локального вертикального среза, без деплоя, индексации, аналитики, рекламы и массовых URL. Оно не изменяет Market Gate или post-launch verification. Записывать одобрение в `docs/decisions.md` с датой и точным scope; не интерпретировать «продолжи» как широкую авторизацию публикации.

## Подготовленная спецификация (не одобрение)

- [Черновик предметной модели и формул](specs/plot-zones-materials-v0.md)
- [Проверяемые числовые эталоны](specs/plot-zones-materials-cases.json) — 15 позитивных, 12 негативных числовых и 9 негативных структурных сценариев.
- [Бриф интерфейса](specs/prototype-design-brief.md) — направления предложены, ни одно не выбрано.

Подтверждение тестов JSON означает только внутреннюю согласованность спецификации, не готовность кода или допуск на прототип.
