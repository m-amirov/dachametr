## Задача и обоснование

## Сценарий пользователя и acceptance criteria

## Доказательства проверок
| Gate | Команда/действие | Фактический результат | Доказательство | PASS/FAIL/BLOCKED/N/A |
| --- | --- | --- | --- | --- |

## Контроль предметной достоверности
- [ ] Нет выдуманных норм, Wordstat, цен, отзывов или источников
- [ ] Формулы/единицы/независимые числовые примеры проверены (если затронуты)
- [ ] Реальный мобильный и desktop browser render проверен (если затронут UI)
- [ ] Новые зависимости/шрифты/ассеты проверены на права и приватность
- [ ] SEO-страницы решают самостоятельные задачи (если изменены)

## Известные проблемы/непроверенные пункты

## Следующий шаг

## Change-impact и анти-регрессии
- [ ] Проверены branch/base/HEAD, старые маршруты и визуальные assets/fonts/tokens.
- [ ] Проверены raw ввод, ru-RU comma, единицы, error/result, back/reload, mobile/tablet (если UI).
- [ ] Если touch важен, физический browser/device PASS или явно BLOCKED_DEVICE.
- [ ] Если CSV/data: strict UTF-8/U+FFFD, source binding и круговой parse/write.
- [ ] Если SEO: actual rendered HTML, canonical и query дубли.
- [ ] Если код: golden maths, root cause regression, screenshots и console/network при UI.
- [ ] Нет неразрешённого merge, DNS, деплоя, рекламы, трекеров/индексации.
- [ ] Связанные классы рисков из docs/cross-project-regressions.md проверены.

## Exact SHA и непроверенное
Указать SHA для каждого доказательства, команды и exit status, отдельные NOT RUN/BLOCKED. P0/P1 не скрывать.
