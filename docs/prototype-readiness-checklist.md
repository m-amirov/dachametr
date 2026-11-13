# Prototype Gate: checklist для решения владельца

`GATE_1_MARKET = BLOCKED`. **PROTOTYPE_AUTHORIZATION = AUTHORIZED LIMITED (2026-11-13);** только локальная реализация утверждённого среза. Публичный запуск не разрешён. Наличие этой таблицы не выдаёт разрешение.

| Decision input | Сейчас | Требуется |
| --- | --- | --- |
| Исследование спроса | PARTIAL | Shortlist + источники и ограничения из PR #2; недостающий Webmaster отдельно |
| Вертикальный срез | AUTHORIZED LIMITED / SPEC BASELINE draft-v0.5 | Owner explicitly approves exact scope: участок → зоны → грунт/щебень/песок → BOM |
| Формулы | OWNER-APPROVED ENGINEERING BASELINE / ENGINE_NOT RUN | Самостоятельные числовые эталоны, единицы, исключения, закупочные округления |
| Продуктовый дизайн | NOT RUN | 2–3 осмысленных направления → утверждённые tokens/assets/fonts |
| Инженерный контракт | SPECIFIED | `docs/development-contract.md` adopted for implementation |
| Среда разработки | NOT STARTED | Reproducible package lock, pinned versions, CI and browser runner |
| Доступность и планшет | NOT RUN | Keyboard, responsive and physical device evidence; blocked explicitly when absent |
| Технический SEO | NOT RUN | Rendered HTML, canonical/query URL, status, robots, sitemap review |
| Публичный запуск/РСЯ | NOT AUTHORIZED | Отдельные release gates, реальный production smoke |

**Если владелец разрешит прототип:** это разрешение исключительно локального вертикального среза, без деплоя, индексации, аналитики, рекламы и массовых URL. Оно не изменяет Market Gate или post-launch verification. Записывать одобрение в `docs/decisions.md` с датой и точным scope; не интерпретировать «продолжи» как широкую авторизацию публикации.

## Подготовленная спецификация (не одобрение)

- [Черновик предметной модели и формул](specs/plot-zones-materials-v0.md)
- [Проверяемые числовые эталоны](specs/plot-zones-materials-cases.json) — 16 позитивных, 16 негативных числовых и 21 негативный структурный сценарий.
- [Бриф интерфейса](specs/prototype-design-brief.md) — направления предложены, ни одно не выбрано.

Подтверждение тестов JSON означает только внутреннюю согласованность спецификации, не готовность кода или допуск на прототип.

**Принято в рамках локального прототипа:** правило идентичности материала (`material_spec_id`) и различения марок/фракций согласно baseline draft-v0.5. Эти свойства ещё не реализованы, и пройденные документационные тесты не доказывают работу приложения. Визуальное направление, лицензии шрифтов и браузерные проверки ещё не подтверждены.

**Owner authorization:** 2026-11-13, см. `docs/decisions.md`. Начинать с тестируемой доменной логики, не с публичных страниц. Список недостающих проверок остаётся действующим.
