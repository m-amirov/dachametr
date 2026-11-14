---
name: open-design-project
description: "Use for OpenDesign integration, gallery reference analysis, brand contract and non-generic visual review of Dachametr's calculation-first UI without changing unrelated functionality."
---

# OpenDesign — проектный skill «Дачаметр»

## Перед действиями
Прочитай AGENTS.md, DESIGN.md, docs/design/reference-library.md, docs/design/open-design-integration.md, docs/design-principles.md и docs/design-review-rubric.md. Найди фактический HEAD, baseline CSS, артефакты screenshots и реальные ограничения Prototype Gate/Market Gate.

## Разделить инструменты
Этот навык уже версионирован в проекте; официальный OpenDesign Codex plugin — **отдельная установка в профиль Codex**, сам OpenDesign — внешняя программа. Не заявляй, что приложение/MCP установлены, без codex plugin list --json и codex mcp get open-design --json, плюс фактической проверки доступности. Не выполнять чужие скрипты, не брать на себя paid/Cloud authorization и не передавать проект/секреты во внешние сервисы без разрешения пользователя.

## Дизайнерский цикл
1. Зафиксируй исходные браузерные screenshots на exact SHA: initial/error/result и 320/390/768/1024/1440. Исходные evidence PR #7 привязаны к более старому SHA и не доказывают новый рендер.
2. Прочитай Supahero (композиция первого экрана), PricingPages.design (табличные сравнения для BOM) и CTA.gallery (ясные действия форм). Выбери 2–3 отдельных URL/примера, но не копируй чужие скриншоты, бренд, композицию целиком и шрифты без лицензии.
3. Каждая идея должна иметь цепочку **референс → наблюдаемый приём → улучшение конкретной задачи пользователя → проверяемый критерий**. «Просто современно» недостаточно.
4. Создай 2–3 самостоятельные концепции с предметным характером: понятная типографика чисел, реальные единицы, формы участка/слоёв и прозрачный результат, без гигантского hero, тарифов и маркетинговой воронки. Не подменяй стиль сменой одного accent.
5. Сохраняй текущие цвета, fonts и пропорции как baseline до отдельного выбора владельца. Не делать скрытый полный редизайн. Не переписывать src/domain и рабочие формы во время исследования референсов.
6. После утверждения изменённого направления проведи actual browser QA: 320/390/768/1024/1440, 200% zoom, touch/keyboard, запятая и caret, ошибки, пустое/итог, группировка, console/network, Cyrillic font glyphs, image decode, before/after. Реальное устройство отдельно от emulation.
7. В PR предоставить diff, источники и версии, точный SHA, screenshot evidence и результат CI/визуального QA, включая BLOCKED_DEVICE и NOT RUN.

## Границы
Правила AGENTS.md, docs/development-contract.md и market/release gates первичны. OpenDesign — генеративный инструмент, а не доказательство качества. Не подключать OpenDesign в package.json сайта, не делать Cloud генерацию и массовые SEO-страницы без явного решения владельца.
