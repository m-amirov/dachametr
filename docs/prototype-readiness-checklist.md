# Prototype Gate: checklist для решения владельца

`GATE_1_MARKET = BLOCKED`. **PROTOTYPE_AUTHORIZATION = AUTHORIZED LIMITED (2026-11-13);** только локальная реализация утверждённого среза. Публичный запуск не разрешён. Это разрешение не включает публичный релиз, SEO-индексацию или рекламу.

| Decision input | Сейчас | Требуется |
| --- | --- | --- |
| Исследование спроса | PARTIAL | Shortlist + источники и ограничения из PR #2; недостающий Webmaster отдельно |
| Вертикальный срез | AUTHORIZED LIMITED / SPEC BASELINE draft-v0.5 | Owner explicitly approves exact scope: участок → зоны → грунт/щебень/песок → BOM |
| Формулы | DOMAIN ENGINE IMPLEMENTED / UNIT VERIFIED ON PR #6; FULL G2 PARTIAL | Самостоятельные числовые эталоны, единицы, исключения, закупочные округления |
| Продуктовый дизайн | NOT RUN | 2–3 осмысленных направления → утверждённые tokens/assets/fonts |
| Инженерный контракт | SPECIFIED | `docs/development-contract.md` adopted for implementation |
| Среда разработки | TS DOMAIN SETUP / CI PASS / APP BUILD NOT RUN | Reproducible package lock, pinned versions, CI and browser runner |
| Доступность и планшет | NOT RUN | Keyboard, responsive and physical device evidence; blocked explicitly when absent |
| Технический SEO | NOT RUN | Rendered HTML, canonical/query URL, status, robots, sitemap review |
| Публичный запуск/РСЯ | NOT AUTHORIZED | Отдельные release gates, реальный production smoke |

**Владелец разрешил локальный прототип 2026-11-13:** разрешение распространяется исключительно на ограниченный вертикальный срез, без деплоя, индексации, аналитики, рекламы и массовых URL. Оно не изменяет Market Gate или post-launch verification. Записывать одобрение в `docs/decisions.md` с датой и точным scope; не интерпретировать «продолжи» как широкую авторизацию публикации.

## Подготовленная спецификация (не одобрение)

- [Черновик предметной модели и формул](specs/plot-zones-materials-v0.md)
- [Проверяемые числовые эталоны](specs/plot-zones-materials-cases.json) — 16 позитивных, 16 негативных числовых и 21 негативный структурный сценарий.
- [Бриф интерфейса](specs/prototype-design-brief.md) — направления предложены, ни одно не выбрано.

Подтверждение тестов JSON означает только внутреннюю согласованность спецификации, не готовность кода или допуск на прототип.

**Принято в рамках локального прототипа:** правило идентичности материала (`material_spec_id`) и различения марок/фракций согласно baseline draft-v0.5. Эти свойства реализованы в pure TypeScript доменном движке и проверяются отдельно в CI; работа интерфейса и реальных браузеров ещё не проверена. Визуальное направление, лицензии шрифтов и браузерные проверки ещё не подтверждены.

**Owner authorization:** 2026-11-13, см. `docs/decisions.md`. Начинать с тестируемой доменной логики, не с публичных страниц. Список недостающих проверок остаётся действующим.
