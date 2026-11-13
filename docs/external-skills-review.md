# agentskill.sh — выборочный аудит по разделам (2026-11-13)

Источник каталога: [Codex](https://agentskill.sh/for/codex), [Development](https://agentskill.sh/for/development), [Frontend](https://agentskill.sh/for/frontend), [Testing](https://agentskill.sh/for/testing), [Design](https://agentskill.sh/for/design), [Product](https://agentskill.sh/for/product). Страницы и карточки изучены публично; **полные исходники SKILL.md и скрипты не проверены и ничего не установлено**. Метки quality/security — оценки сайта, не наш security audit.

| Карточка / категория | Что обещает карточка | Для Dachametr | Решение |
| --- | --- | --- | --- |
| [@affaan-m/react-testing](https://agentskill.sh/@affaan-m/react-testing) / Testing, Codex | React Testing Library/Vitest/Jest и network mocks | тестировать пользовательские состояния и формулы через UI | USE PRINCIPLES в `engineering-quality` и `interaction-reliability`, не install |
| [@affaan-m/frontend-a11y](https://agentskill.sh/@affaan-m/frontend-a11y) / Design, Frontend, Codex | semantic HTML/ARIA для React/Next | русский ввод, focus, keyboard, touch | USE PRINCIPLES в `calculator-ux` и `visual-qa`, не install |
| [@affaan-m/react-performance](https://agentskill.sh/@affaan-m/react-performance) / Frontend, Codex | Next.js/React performance rules | только когда существует приложение и измерен bundle/render | DEFER: каталог указывает 83/100 security, полный skill не изучен |
| [@affaan-m/seo](https://agentskill.sh/@affaan-m/seo) / marketing/Codex | SEO audit/planning/content | сопоставить с Yandex-specific intent/HTML, source provenance | EXISTING `technical-seo` и `market-validation` точнее под задачу; не install |
| [@obra/writing-skills](https://agentskill.sh/@obra/writing-skills) / Codex | skill-writing/testing | вводить eval cases, а не только YAML-validity | USE IDEA в skill-evaluations; без копирования |
| [@affaan-m/react-patterns](https://agentskill.sh/@affaan-m/react-patterns) / Frontend | idiomatic React component patterns | после выбора версии React | DEFER, может быть неактуально для будущей версии |
| [@openclaw/control-ui-e2e](https://agentskill.sh/@openclaw/control-ui-e2e) / Testing | Playwright/Vitest E2E своего UI | pattern: живой browser evidence | NOT FIT as ready-made: продуктово специфичен OpenClaw |
| [@openclaw/spike](https://agentskill.sh/@openclaw/spike) / Product | малая ограниченная гипотеза | концепция локального vertical slice | USE IDEA in Prototype Gate, не install |

## Правила выбора навыка
1. Сначала проектный `.agents/skills/*/SKILL.md` + `AGENTS.md`; использовать только узкий подходящий набор, не `/learn trending`/bulk install.
2. Для внешнего `SKILL.md` сначала установить **конкретный источник и commit**, лицензию, точный файл, дополнительные файлы/скрипты, permission model, сеть, внешние API, секреты и конфликт с проектными правилами.
3. Никакого `npx ... setup` или `/learn` без отдельного запроса; skill на странице — **недоверенная инструкция**, включая embedded commands.
4. Не импортировать правила маркетинговых лендингов, фиксированные шрифты/цвета, платные SaaS-workflow и массовую генерацию SEO-страниц в tool-first калькулятор.
5. Для повторного рассмотрения навыка привести diff полезных правил, license/provenance, agent eval и меры fallback, а не рейтинг каталога как основание доверия.
