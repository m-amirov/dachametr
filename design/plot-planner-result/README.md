# Дачаметр — макеты «Результат рядом»

Изолированный статический дизайн-слой. Он не подключён к `src/` и не меняет расчётное ядро.

## Открыть локально

Из корня checkout:

```powershell
py -m http.server 4173
```

Открыть:

- `http://127.0.0.1:4173/design/plot-planner-result/index.html`
- `http://127.0.0.1:4173/design/plot-planner-result/design-board.html`

Макет использует реальный RESULT-сценарий domain engine из PR #7/#8, но сам не выполняет расчёт и не является рабочим приложением.

## Состав

- `index.html` — основной desktop/mobile макет состояния RESULT;
- `styles.css` — дизайн-токены, responsive layout, mobile result dock;
- `app.js` — минимальные mock-взаимодействия раскрытия и навигации;
- `design-board.html` — компактный design board.

Скриншоты и метаданные находятся в `artifacts/design-v2/`. Для скриншотов всегда указываются viewport и SHA-256.
