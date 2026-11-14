# Дачаметр — перенос «Результат рядом» в работающий Vite UI

Источник идеи: PR #10, static design/plot-planner-result. Runtime base: PR #8, работающие модели PR #6–#7.
Без PR #9. Только локальный прототип, без деплоя и публичных SEO-страниц.

Сохраняем доменный движок в src/domain/, material_spec_id, precision и fail-closed BOM.
Новые элементы интерфейса: компактные summary-зоны, явная кнопка открытия редактирования;
краткая строка материала и раскрываемые настройки, ведомость в соседней колонке.
Разрешено только одно раскрытое редактирование зоны одновременно. Новый слой
открывается автоматически, кнопка «Настроить» управляет его настройками.

При вводе применяется существующая стратегия render+focus snapshot; UI view state
openZoneId/openLayerIds не включён в доменный расчёт и не сохраняется.
Все данные и итог по-прежнему получаются из calculatePlotDetailed.

Обязательный regression QA: 1, и caret/selection, русская запятая, material
sharing, area, BOM/packaging, fail-closed, mobile summary/expand, browser overflow,
reload/Back-Forward, keyboard/tab, errors. Подробные скриншоты из PR #10 — reference,
но не evidence рендера нового Vite UI.
