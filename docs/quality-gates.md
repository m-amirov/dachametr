# Матрица качества и релизные проверки

Статусы: PASS (реальные доказательства), FAIL (наблюдаемый дефект), BLOCKED (нет возможности проверить), N/A (обоснованно неприменимо). **Не подменять BLOCKED на PASS.**

| Gate | Нужное доказательство | Когда обязателен |
| --- | --- | --- |
| 0: подготовка | Skill manifests, docs, validator + тесты | Сейчас |
| 1: поисковая ниша | Wordstat, SERP, уникальные задачи, принятое GO | До создания приложения |
| 2: модели расчёта | Утверждённая спецификация, реальные нормы, размерности, независимые примеры | До публикации каждого калькулятора |
| 3: engineering | typecheck/lint/unit/integration/build реального проекта и регрессии багов | PR с кодом |
| 4: visual/UX/a11y | Текущий browser render и screenshots 320/390/768/1440, ошибки и итог, tab/zoom, автоматические a11y-проверки | PR с UI |
| 5: technical SEO | Фактический HTML, canonical/robots/sitemap, ссылки, корректные metadata/status/schema, отсутствие дублей | SEO-релиз |
| 6: performance | Lighthouse lab + при появлении аудитории field CWV, bundle/image analysis | Релиз |
| 7: security/rights | Приватность, отсутствие секретов, зависимости/лицензии, внешние скрипты | Релиз |
| 8: production release | Разрешение владельца, TLS/DNS, smoke на live build, rollback | Объявление релиза |

Ориентиры для field CWV при наличии статистически достаточной выборки: LCP <=2.5s, INP <=200ms, CLS <=0.1 на 75-м перцентиле. Lighthouse не доказывает field performance. Пока нет приложения, gates 2–8 являются будущими, а не успешно пройденными.

## Отчёт Codex
Указывать ветку и commit SHA, файлы, конкретные изменения; каждому gate — команду/действие, exit code, лог или screenshot URL, PASS/FAIL/BLOCKED/N/A. Для багов: root cause и regression RED/GREEN. Для UX — viewport/browser/state. Для SERP — даты и реальные источники.
Нельзя ослаблять CI, исключать критические тесты или скрывать BLOCKED ради успешного релиза.
