# Макеты «Результат рядом»

Фактически отрисованные Chromium screenshots для отдельного дизайн-PR.

| Артефакт | Viewport | Screenshot |
| --- | --- | --- |
| [Desktop RESULT full page](./desktop-1440x900.png) | 1440×900 CSS px | 1440×1688 px |
| [Desktop RESULT viewport](./desktop-1440x900-viewport.png) | 1440×900 CSS px | 1440×900 px |
| [Mobile RESULT full page](./mobile-390x844.png) | 390×844 CSS px | 390×2943 px |
| [Mobile RESULT viewport](./mobile-390x844-viewport.png) | 390×844 CSS px | 390×844 px |
| [Design board full page](./design-board-1440x900.png) | 1440×900 CSS px | 1440×1323 px |
| [Design board mobile](./design-board-390x844.png) | 390×844 CSS px | 390×2600 px |

Скриншоты сняты с локального статического макета на текущем checkout, без внешних изображений и web-font requests. `*-viewport.png` — ровно видимая область; full-page варианты показывают весь макет для ревью композиции.

## Сценарий

- 20×30 м → 600 м² → 6 соток;
- Грядка 2×4 м → 8 м²;
- Дорожка 2×5 м → 10 м²;
- грунт: 2 600 л, 52×50 л;
- песок: 1 050 л, 21×50 л, запас 5%;
- итог: 3 650 л, 73 упаковки, излишки 0 л; плотность не задана, поэтому масса не показывается.

SHA-256 и browser checks: [`sha256.json`](./sha256.json), [`viewport-checks.json`](./viewport-checks.json).
