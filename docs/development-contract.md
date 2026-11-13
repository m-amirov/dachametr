# Engineering contract перед первым кодом

**Статус: требования на будущую реализацию, не готовая архитектура.** Пока отсутствует authorization на прототип и нет рабочего приложения. Применять как acceptance checklist после отдельного решения.

## A. Baseline и scope
- Перед каждым PR: `git status`, branch, `HEAD`, сравнение с целевым ref, сохранение реально существующих assets/fonts/routes/inputs. Не делать невидимый редизайн или замену шрифтов/иллюстраций.
- Feature PR содержит user job, границы, математическую спецификацию, совместимые изменения, тесты, канонические URL и сравнение фактического интерфейса.
- React/Next/TypeScript выбираются отдельным архитектурным решением и фиксируются lockfile/версиями runtime; Node/tool версии устанавливаются по реальному проекту, не угадываются по примерам.
- Минимум сторонних npm/runtime dependencies, аудит provenance/license/security; не копировать/исполнять внешние skill scripts.

## B. Вычисления и единицы
- Pure calculation domain вне React/DOM; UI parsing отделён от math. Базовые единицы SI, явный schema для сериализации; слои, плотности, коэффициенты и площади имеют размерности.
- Никакого вычисления из округлённого отображения: precise base → display formatting и отдельно `ceil` закупочных упаковок. Указывать размер упаковки, правило запаса, границы, undefined/NaN/Infinity/overflows.
- Цена и агрономическая/инженерная норма — только известный проверенный источник или ввод пользователя; не выдавать оценку материала за проектно-строительную экспертизу.
- Property/metamorphic tests: масштабирование площади, монотонность объёма, конверсия м³↔л, L×W×h, границы упаковок, mixed locale comma/dot, negative/blank.

## C. Browser state и touch
- Все input controlled, сохранение пользовательского ввода при ошибке, смене единиц, переключении зоны и back/forward; URL state versioned, parse fail-closed, no private data in link.
- Сохранение результата не подразумевает внешнюю сеть/аккаунт. Если появится localStorage — обосновать privacy, schema migration и восстановление после reload; отсутствие persistence прямо сообщать в UX.
- Numeric input при ru-RU: промежуточные `-`, `,`, `1,` должны сохраняться до завершения ввода, без дрожания caret; окончательная валидация отдельно.
- touch/pointer/scroll, контекстное меню, zoom, rotation, 200%/400% zoom (где релевантно); focus trap и overscroll только для явных модалок.
- Критический путь проверять Chromium + Firefox/WebKit при наличии runner и **физическом** планшете/мобильном браузере при доступе. Эмуляция не является физической проверкой.
- Обработать ошибки загрузки: timeout/404 изображения, deferred font swaps, decode, reload, partial network; наблюдать и фиксировать, не показывать ложное «успешно».

## D. Visual system и сохранность
- До реализации принять палитру, кириллические шрифты с лицензией, изображения/иконки и baseline screenshots. Change scope не должен неявно менять визуальный язык.
- Layout и интерактивные состояния 320/390/768/1024/1440 CSS px, keyboard, touch targets, color contrast; no horizontal overflow/clipped result/sticky overlay.
- Переиспользование components — после работающего вертикального среза; дизайн должен быть предметным и tool-first, без SaaS-hero/пустых карточек/нейрослопа.
- Скриншоты считаются evidence только если это текущий build, actual URL, browser, device/viewport, точный SHA и реальные состояния, а не макеты.

## E. SEO and security
- Одна независимая задача = один canonical, динамические query parameters не индексируются отдельно; проверить actual HTML и HTTP status в build/preview, noindex staging.
- Формы на статической странице должны работать при network отключении после загрузки, если расчёт заявлен полностью client-side; отсутствие server dependence подтвердить тестом, а не декларацией.
- No external user-input evaluation, injection, secrets in bundle, unsafe HTML, malicious URL/scheme, unintended remote telemetry, PII leaks. JSON/CSV — strict UTF-8 & provenance.
- Test Lighthouse lab, check CWV later on real field data. Lab PASS не значит SEO success.

## F. Definition of Done для PR с приложением
1. Реальный scope и спецификация утверждены, tests with independent expected numbers.
2. Scripted lint/typecheck/unit/integration/build на актуальном HEAD, exit codes, baseline outputs.
3. Browser E2E and screenshots с фиксацией браузера/viewport; axe automated + manual keyboard/focus. Физическая платформа `BLOCKED_DEVICE` если недоступна.
4. Asset/font MIME/decode/404 check и basic URL state/reload/back validation.
5. Independent review P0/P1 cleared, no unapproved visual redesign; результат `PASS/BLOCKED/FAIL/NOT RUN` по каждому gate.
6. Нет деплоя, merge, индексации или РСЯ без соответствующего отдельного owner approval.
