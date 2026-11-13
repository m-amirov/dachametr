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
