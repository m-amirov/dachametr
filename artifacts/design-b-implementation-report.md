# Реализация B: «Современный садовый атлас»

Дата: 2026-11-14

## Границы изменения

- Ветка: `design/modern-garden-atlas`
- База: `design/open-design-project-integration` (`44dd04d8f0b86122c948e41a9df4bb40c739e628`)
- Реализация: `e62db610311669e7ae520d33060c55330772a2ca`
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

## Before / after evidence

Baseline PR #8 на HEAD `90bb578291d6f9aeb935470ce4784e4f9ce4a8af` сохранён в [`ui-evidence/current-90bb578`](./ui-evidence/current-90bb578/). After-кадры для реализации B находятся в [`ui-evidence/design-b-e62db61`](./ui-evidence/design-b-e62db61/).

| Viewport | Baseline | After B |
| --- | --- | --- |
| 320 px | `current-90bb578/initial-320.png` | `design-b-e62db61/initial-320.png` |
| 390 px | `current-90bb578/result-390.png` | `design-b-e62db61/result-390.png` |
| 768 px | `current-90bb578/result-768.png` | `design-b-e62db61/result-768.png` |
| 1024 px | `current-90bb578/result-1024.png` | `design-b-e62db61/result-1024.png` |
| 1440 px | `current-90bb578/result-1440.png` | `design-b-e62db61/result-1440.png` |
| 200% CSS viewport | `current-90bb578/zoom-200-css-viewport.png` | `design-b-e62db61/zoom-200-css-viewport.png` |

Каждая ширина также имеет `initial`, `error` и `result`; полный список и автоматические проверки находятся в соответствующих `viewport-checks.json`. 200% кадр является CSS viewport emulation, а не проверкой физического устройства.

## Проверки на точном HEAD

- `npm test`: typecheck PASS; domain 9/9; concept regression 2/2; UI 13/13.
- `npm run build`: PASS.
- `E2E_BASE_URL=http://127.0.0.1:4174 npm run test:browser`: Chromium 5/5 PASS.
- `EVIDENCE_BASE_URL=http://127.0.0.1:4174 EVIDENCE_DIR=artifacts/ui-evidence/design-b-e62db61 npm run capture:evidence`: 16 viewport checks, `overflow=false`, runtime errors отсутствуют.
- `git diff --check`: PASS.

## Оставшиеся ограничения

- Физические телефоны и планшеты: `NOT RUN`.
- Экранная клавиатура и реальное изменение viewport при её появлении: `NOT RUN`.
- Screen reader / assistive technology: `NOT RUN`.
- Контраст проверен по цветовым парам и browser evidence; независимый ручной аудит с AT не проводился.
- Market Gate 1: `BLOCKED`. Merge в `main`, deploy, SEO-индексация, реклама и аналитика не выполнялись.
