# Dachametr Workspace — визуальный дизайн-срез

**Дата:** 2026-11-15
**Статус:** visual prototype for owner review; рабочее Vite-приложение не изменяется
**База:** PR #11 `101cd559d82c807c036c319265b57c98e8bc3162`

## Intent

Проверить новую архитектуру интерфейса «Дачаметра» в духе плотного профессионального workspace, вдохновлённого проверенными приёмами Rayon V2: структура слева, рабочая область по центру, инспектор/спецификация справа и компактные контекстные действия. Прототип должен помочь владельцу утвердить композицию до изменения рабочего Vite UI.

Основной сценарий: создать участок → выбрать зону → открыть слой → увидеть расчёт и закупочную ведомость. Графика показывает только выбранную прямоугольную зону и разрез слоёв; взаимное расположение зон на участке не моделируется.

## Goals

- desktop workspace 1440×900 с тремя функциональными областями;
- отдельные desktop-состояния обычного редактора и открытого инспектора материала;
- отдельные mobile-композиции 390×844 для редактора и ведомости;
- дизайн-system board с токенами, типографикой, состояниями и компонентами;
- интерактивный локальный prototype: переключение зон, раскрытие слоя, мобильные вкладки;
- все видимые числовые значения получаются из текущего `src/domain` engine;
- скриншотные и текстовые доказательства: exact SHA, browser, viewport, отсутствие горизонтального overflow, side-by-side с PR #11/#12.

## Non-goals and anti-goals

- не менять `src/domain`, `src/ui`, рабочий `index.html` и `src/styles.css`;
- не добавлять реальные сохранение, аккаунты, сеть, цены, аналитику, SEO или публикацию;
- не рисовать карту, GPS, кадастр, пересечения зон или придуманные нормы строительства;
- не копировать Rayon pixel-for-pixel, логотип, ассеты или лицензируемые шрифты;
- не использовать маркетинговый hero, набор одинаковых карточек, декоративные фото и градиенты;
- не выдавать mock-состояние за production-ready приложение.

## Approaches considered

1. **Canvas-led «карта участка».** Центральная схема с зонами и панелью свойств. Отклонён: текущая модель не содержит координат и такой экран легко создаёт ложное впечатление взаимного расположения.
2. **Result-led «форма + ведомость».** Эволюция PR #11/#12 с более аккуратными токенами. Отклонён: сохраняет прежнюю композицию анкеты и превращает рабочее пространство в длинную форму с карточками.
3. **Workspace-операторская — выбранный вариант.** Фиксированная левая структура проекта, широкий центральный инспектор выбранной зоны и узкая правая BOM-спецификация; на мобильном эти области становятся вкладками. Это даёт плотность и ясность Rayon-подобного инструмента, но сохраняет самостоятельную предметную модель «зона → слои → закупка».

## Visual direction

- neutral warm-gray canvas with pale paper panels, hairline separators and one oxide-orange action accent;
- deep graphite typography with tabular numeric alignment and explicit units;
- muted material colors only for soil/sand/gravel; status colors reserved for warnings/errors;
- rectangular controls with small radii, 8px base spacing and 44px touch targets on mobile;
- left project tree uses selected-row treatment instead of large cards;
- central zone preview is a true proportioned rectangle with measurement lines, not a site map;
- right BOM uses rows and disclosure, not KPI tiles.

## Data contract for the prototype

The scenario keeps the user-provided dimensions and uses the domain engine for every derived value:

- plot: 20×30 m;
- zone `Грядка`: 2×4 m, soil, 25 cm, 0% reserve, 50 L package;
- zone `Дорожка`: 2×5 m, sand 10 cm + 5% reserve + 1,500 kg/m³ + 50 L package; gravel 5 cm + 10% reserve + 1,400 kg/m³ + 50 L package;
- package values are explicit prototype inputs; totals, packages, surplus and mass are calculated by the exact engine and stored with provenance.

## Interaction contract

- zone selection updates the central editor and selected-row state without changing other zone values;
- layer disclosure exposes only the selected layer’s parameters; fields remain grouped by purpose;
- BOM is visible on desktop and is a first-class mobile tab, not a long continuation of the form;
- invalid or missing data blocks the BOM and points to the relevant field in the prototype copy;
- no save/autosave promise is displayed; the footer states that reload persistence is not part of this prototype.

## Acceptance boundary

The deliverable is accepted as a visual prototype only when the repository contains the source, rendered screenshots, reference audit, numeric provenance, side-by-side comparison and independent visual audit. Browser evidence is limited to Chromium emulation; physical mobile, assistive technology and real soft-keyboard checks remain `BLOCKED / NOT RUN` unless separately observed.

The user’s detailed request is the approval to execute this isolated visual slice. Final visual approval is intentionally left to the owner after the PR is presented; no design is promoted into the working Vite app in this change.
