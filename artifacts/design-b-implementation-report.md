# Реализация B: «Современный садовый атлас»

Дата: 2026-11-14

## Границы изменения

- Ветка: `design/modern-garden-atlas`
- База: `design/open-design-project-integration` (`44dd04d8f0b86122c948e41a9df4bb40c739e628`)
- Исправление header: `addc42782857989771116aa8d8512c250e407edc`
- Стек: Vite + vanilla TypeScript сохранён.
- Расчётное ядро `src/domain/` не изменялось.

Направление B реализовано как предметный редакционный интерфейс: полевая нумерация, профиль размеров без карты, тонкие правила, serif-заголовки и компактная ведомость. Иерархия действий и числовых результатов усилена из A, а плотность BOM взята из C; декоративные элементы из концептного макета в рабочий UI не перенесены.

## Исправленные дефекты

| Приоритет | Дефект | Исправление | Проверка |
| --- | --- | --- | --- |
| P1 | При 200% CSS viewport заголовок выходил за границы и baseline скрывал overflow через `body` | Уменьшен заголовок только для узкого layout viewport, добавлены `min-width: 0`, безопасная сетка и `overflow-wrap`; `overflow-x: hidden` удалён | Chromium 195px: `scrollWidth === clientWidth`, screenshot `zoom-200-css-viewport.png` |
| P1 | Длинный редактор отодвигал ведомость на мобильном | Вступление сокращается до «Размеры → зоны → ведомость», добавлена ссылка «К ведомости» к `#results-panel` | Browser E2E, 320/390 screenshots |
| P1 | Ошибка показывалась только в result panel | Ошибка рядом с полем, `aria-describedby`, `aria-invalid` и `role=alert`; fail-closed result сохранён | Browser E2E: поздняя ошибка зоны и отсутствие BOM |
| P2 | Пустые обязательные поля выглядели ошибочными до первого действия | Начальный экран не подсвечивает required errors; после ввода или добавления зоны ошибки появляются локально | UI test: initial render без `field-invalid` и `field-error` |
| P1 | В концептных результатах грунт был 2 000 л при 52 упаковках по 50 л, а слой дорожки был заменён на щебень | Демонстрационный сценарий приведён к domain engine: грунт 2 600 л / 52 × 50 л, песок 1 000 л / 1 050 л / 21 × 50 л; слои совпадают со сценарием | `tests/design-concepts.test.mjs`, 2/2 PASS |
| P2 | Review thread подтвердил, что отрисованный заголовок пересекал описание на 1024 px, хотя grid-box и `scrollWidth` оставались в пределах viewport | Для трёхколоночного header зарезервировано 370 px под бренд; до 1120 px состояние переносится в отдельную строку. `overflow`-скрытие не добавлялось | E2E geometry regression и `header-geometry.json`; до фикса тест красный на `7ee9fb9`, после фикса зелёный на `addc427` |

На исходном проверенном `7ee9fb978a66bc5ba492a464bc91d4a7c18238cc` был подтверждён этот P2-дефект из review thread [`src/styles.css`](https://github.com/m-amirov/dachametr/pull/9#discussion_r4572118304). Поэтому прежние формулировки о безусловном отсутствии P1/P2 не используются: текущий статус ограничен проверенным Chromium scope на SHA `addc427`; подтверждённых P0/P1 после исправления в этом scope нет.

## Before / after evidence

Baseline PR #8 на HEAD `90bb578291d6f9aeb935470ce4784e4f9ce4a8af` сохранён в [`ui-evidence/current-90bb578`](./ui-evidence/current-90bb578/). Кадр до исправления header сохранён в [`ui-evidence/design-b-e62db61/initial-1024.png`](./ui-evidence/design-b-e62db61/initial-1024.png), источник кадра — `e62db610311669e7ae520d33060c55330772a2ca` (CSS header, унаследованный `7ee9fb9`). After-кадры сняты на source SHA `addc42782857989771116aa8d8512c250e407edc` в [`ui-evidence/design-b-addc427`](./ui-evidence/design-b-addc427/).

| Viewport | Baseline | After B |
| --- | --- | --- |
| 320 px | `current-90bb578/initial-320.png` | `design-b-addc427/initial-320.png` |
| 390 px | `current-90bb578/result-390.png` | `design-b-addc427/result-390.png` |
| 768 px | `current-90bb578/result-768.png` | `design-b-addc427/result-768.png` |
| 1024 px | [`design-b-e62db61/initial-1024.png`](./ui-evidence/design-b-e62db61/initial-1024.png) | [`design-b-addc427/initial-1024.png`](./ui-evidence/design-b-addc427/initial-1024.png) |
| 1440 px | `current-90bb578/result-1440.png` | `design-b-addc427/result-1440.png` |
| 200% CSS viewport | `current-90bb578/zoom-200-css-viewport.png` | `design-b-addc427/zoom-200-css-viewport.png` |

Каждая ширина также имеет `initial`, `error` и `result`; полный список и автоматические проверки находятся в `design-b-addc427/viewport-checks.json`. Геометрия заголовка для 960/961/1024/1100/1200/1280/1440, 320/390 и 195 px сохранена в [`design-b-addc427/header-geometry.json`](./ui-evidence/design-b-addc427/header-geometry.json). 200% кадр является CSS viewport emulation, а не проверкой физического устройства.

## Проверки на точном HEAD

- `npm test`: typecheck PASS; domain 9/9; concept regression 2/2; UI 13/13.
- `npm run build`: PASS.
- `E2E_BASE_URL=http://127.0.0.1:4174 npm run test:browser`: Chromium 6/6 PASS, включая geometry regression.
- `EVIDENCE_BASE_URL=http://127.0.0.1:4174 EVIDENCE_DIR=artifacts/ui-evidence/design-b-addc427 npm run capture:evidence`: 16 viewport/state checks, `overflow=false`, runtime errors отсутствуют.
- `EVIDENCE_BASE_URL=http://127.0.0.1:4174 EVIDENCE_DIR=artifacts/ui-evidence/design-b-addc427 npm run capture:header-geometry`: 10 ширин, все пять проверок пересечения `false`.
- `python -m unittest discover -s tests -v`: 36/36 PASS.
- `git diff --check`: PASS.
- `test:concepts` теперь запускается отдельным обязательным шагом `ui` в `.github/workflows/prototype-domain.yml`; ранее этот охват был только в локальном `npm test`.

Проверенные цветовые пары по WCAG 2.x relative luminance: `ink/paper` 11.94:1, `muted/paper` 4.54:1, `white/accent` 4.79:1, `result/soft` 6.54:1, `danger/error` 6.15:1, `warning` 7.79:1.

## Оставшиеся ограничения

- Физические телефоны и планшеты: `NOT RUN`.
- Экранная клавиатура и реальное изменение viewport при её появлении: `NOT RUN`.
- Screen reader / assistive technology: `NOT RUN`.
- Контраст проверен по цветовым парам и browser evidence; независимый ручной аудит с AT не проводился.
- Физические размеры и header geometry проверены в Chromium emulation; реальный tablet/phone rendering не проверялся.
- Market Gate 1: `BLOCKED`. Merge в `main`, deploy, SEO-индексация, реклама и аналитика не выполнялись.
