# Источники и решения по внешним skills

Проверка 13.11.2026. Локальные навыки Дачаметра написаны для проекта; **сторонний код или SKILL.md не копировались**, команды инсталляции не выполнялись.

| Источник | Полезное | Решение |
| --- | --- | --- |
| [Eskizno AGENTS](https://github.com/m-amirov/eskizno/blob/main/AGENTS.md) | Задача, root cause, доказательные QA | Адаптировано |
| [Eskizno frontend-design](https://github.com/m-amirov/eskizno/blob/main/.agents/skills/frontend-design/SKILL.md) | Предметная типографика, визуальная уникальность | Адаптировано |
| [Eskizno seo-audit](https://github.com/m-amirov/eskizno/blob/main/.agents/skills/seo-audit/SKILL.md) | Техническая проверка индексируемости | Адаптировано |
| [Eskizno verification](https://github.com/m-amirov/eskizno/blob/main/.agents/skills/verification-before-completion/SKILL.md) | Evidence before claims | Обязательно |
| [Dzen research](https://github.com/m-amirov/dzen-conveyor/blob/main/.agents/skills/dzen-research/SKILL.md) | Список действительно проверенных источников | Для норм/формул |
| [Dzen anti-slop](https://github.com/m-amirov/dzen-conveyor/blob/main/.agents/skills/dzen-anti-slop/SKILL.md) | Плотность фактов, без выдумок | Для SEO-копирайта |
| [Ludory visual QA](https://github.com/m-amirov/ludory/blob/main/.agents/skills/ludory-visual-qa/SKILL.md) | Только фактические browser screenshots | Для UI |
| [Ludory engineering](https://github.com/m-amirov/ludory/blob/main/.agents/skills/ludory-engineering-quality/SKILL.md) | Тест и source-bound checks | Для кода |
| [Elaya design skills](https://github.com/elayadesign/ai-design-skills) | Figma tokens, typography, interactive states | Идеи, не обязательный готовый skill |
| [AgentSkill / Codex](https://agentskill.sh/for/codex) | Каталог для поиска React, performance, testing, a11y, SEO | Не устанавливать без аудита |

### elayadesign/ai-design-skills
Проверенный исходный commit: 456d9e0d3e2d84c748bb143c6ca3d90c45e16213. Два skills: landing-page-design и figma-designer; лицензия MIT. Второй полезен при реальной работе в Figma. Первый рассчитан на маркетинговую воронку и предписывает обязательные секции, CTA, фиксированные шрифты и графические приёмы, которые могут вредить tool-first UX. Полностью **не устанавливать** в качестве всеобщих правил сайта.

### Внешние навыки позже
При необходимости проверить точную версию/commit, лицензию, весь SKILL.md, скрипты, сеть, полномочия, зависимости и конфликт с AGENTS. Приоритетный shortlist: React/Next performance, browser testing (Playwright), accessible forms, structured data, technical SEO, frontend-security. Рейтинги каталога — не гарантия безопасного исполнения и корректности методики.

Рекомендация OpenAI: держать AGENTS коротким, а навыки конкретными по задачам: https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra

## Повторный обзор каталога 13.11.2026
См. [обзор разделов и карточек](external-skills-review.md): Codex, Development, Frontend, Testing, Design, Product. Из карточек полезны направления @affaan-m/react-testing, frontend-a11y, react-performance, seo и @obra/writing-skills. Изучены **описания** на сайте, а не полные исходники SKILL.md; сторонние скрипты и `/learn` не устанавливались. Quality/security score — неподтверждённое нами утверждение каталога, не security-аудит.
Добавлены локальные `research-data-integrity`, `interaction-reliability`, `change-review` как ответ на реестр `docs/cross-project-regressions.md`.

## OpenDesign (изучен 2026-11-14)
Upstream [nexu-io/open-design](https://github.com/nexu-io/open-design), SHA `59e4f2ae85de7e7318a5e6bdcf3a34584c4b7582`, лицензия Apache-2.0. Официальный пакет для Codex [nexu-io/open-design-agent-plugins](https://github.com/nexu-io/open-design-agent-plugins), SHA `c0710761302c69bded82e205362effcce6fde49e`, лицензия Apache-2.0, текущая версия plugin по README `0.5.3`. В исходники Dachametr не копируются чужие навыки или исполняемые пакеты: добавлен собственный `open-design-project` с анализом референсов и документацией официальной установки. Установка/подключение OpenDesign на пользовательском ПК не подтверждены. Референсы: [Supahero](https://supahero.io/), [PricingPages](https://pricingpages.design/), [CTA Gallery](https://www.cta.gallery/); использовать методы композиции/сравнения/CTA, не чужие скриншоты или лицензии. См. `docs/design/reference-library.md`.
