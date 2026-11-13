# Gate 1: срез поисковой выдачи и конкурентов

Дата наблюдений: **13 ноября 2026**. Приоритетная система — Яндекс, аудитория — Россия.

## Уровни доказательств

- **A — tested_live_interaction:** форма открыта, параметры изменены, результат наблюдён.
- **B — serp_snapshot:** URL реально увиден в браузерной выдаче; это срез, а не постоянная позиция.
- **C — page_read:** страница открыта и прочитана, но перерасчёт формы не проверен.
- **D — search_result_only:** URL/тип/заголовок взят из поискового результата или расширенного аудита; работу формы не утверждаем.

competitor-matrix.csv содержит 16 конкурентных записей с уровнем проверки. serp-samples.csv содержит 20 органических строк в четырёх полностью описанных снимках Пермского региона.

## Полностью описанные снимки: Яндекс, Пермь, lr=50

Снимки анонимные, desktop/mobile-разрез не зафиксирован, реклама и промоблоки исключены.

| Запрос | Органические URL по порядку 1–5 | Browser evidence |
| --- | --- | --- |
| калькулятор грунта для грядки | [ecalc.ru](https://ecalc.ru/raised-bed-soil/); [goodcalc.online](https://goodcalc.online/ru/soil-volume-calculator); [calcneo.com](https://calcneo.com/raised-bed-soil-volume-calculator); [gruntcalc.ru](https://gruntcalc.ru/); [calc-tools.ru](https://calc-tools.ru/calculators/priming/) | [run](https://agent.tinyfish.ai/runs/b93598f9-9896-4b0b-b4f7-151671f38238) |
| калькулятор семян газона | [lifegazon.ru](https://lifegazon.ru/kalkulyator-gazona); [agrogrunt.ru](https://agrogrunt.ru/kalkulyator-gazona/); [calcal.ru](https://calcal.ru/lawn-calculator); [ecalc.ru](https://ecalc.ru/grass-seed/); [miniwebtool.com](https://ru.miniwebtool.com/калькулятор-газонных-семян/) | [run](https://agent.tinyfish.ai/runs/58b6abb2-b1a9-4ba4-b12d-2e4030628843) |
| калькулятор геотекстиля | [stk-svoydom.ru](https://stk-svoydom.ru/kalkulyatory/raschet-geotekstilya); [mpkm.org](https://mpkm.org/calc/raskroy-geosintetiki/); [roadline.ru](https://roadline.ru/calculator); [tech-stc.ru](https://tech-stc.ru/engineering-calculators/roofing/geotextile-for-drainage-systems-calculator/); [tdagro.ru](https://tdagro.ru/onlayn-kalkulyator-dlya-rascheta-geotekstilya-pod-fundament/) | [run](https://agent.tinyfish.ai/runs/b36d9d48-2327-4a39-bc45-520e30907054) |
| калькулятор капельного полива | [radioskot.com](https://radioskot.com/calc/kalkulyator-sistemy-kapelnogo-poliva); [forfr1end.ru](https://forfr1end.ru/irrigation-drip-calculator/); [calcneo.com](https://calcneo.com/drip-irrigation); [converterok.com](https://converterok.com/calculator/drip-irrigation-calculator/); [calcal.ru](https://calcal.ru/auto-irrigation-calculator) | [run](https://agent.tinyfish.ai/runs/73ddc785-38fe-454c-b7d4-54a1d0042e02) |

Это доказывает наличие специализированных страниц в одном региональном срезе. Это **не** доказывает федеральный спрос, CTR, достижимость нового домена или низкую конкуренцию.

## Расширенный SERP-аудит

Файл [serp-expanded-audit.csv](serp-expanded-audit.csv) сохраняет 50 наблюдений Яндекса по пяти запросам (по 10 URL для «расчёт забора», «расчёт теплицы», «калькулятор щебня», «калькулятор удобрений», «калькулятор площади участка») и один точечный результат Google.

У расширенного артефакта нет отдельного browser-run URL, региона и устройства в каждой строке. Поэтому его позиции — **ориентир для состава конкурентов**, а не национальный рейтинг и не замена [serp-samples.csv](serp-samples.csv). В нём встречаются специализированные инструменты, магазины/производители и статьи:

- забор: [romanfink.ru](https://romanfink.ru/calculator/kalkulyator-zabora/), [metallprofil.ru](https://metallprofil.ru/calculators/fence/), [grandline.ru](https://www.grandline.ru/raschet-ogragdeniy/);
- теплица: [stroykalk.ru](https://stroykalk.ru/raschet-teplitsy/), [calcal.ru](https://calcal.ru/greenhouse-calculator), [zhitov.com](https://www.zhitov.com/glasshouse/);
- щебень: [td-psn.ru](https://td-psn.ru/shcheben/kalkulyator-shchebnya), [stk-svoydom.ru](https://stk-svoydom.ru/kalkulyatory/raschet-shchebnya);
- удобрения: [mineral-rus.com](https://mineral-rus.com/calc-agro/), [calcneo.com](https://calcneo.com/npk-fertilizer-ratio-calculator);
- площадь участка: [romanfink.ru](https://romanfink.ru/calculator/kalkulyator-ploshchadi-uchastka/), [moycalc.ru](https://moycalc.ru/sad/ploshchad-uchastka).

Факт наличия 3–10 релевантных URL в срезе не означает, что страницы проверены интерактивно. Функциональные поля и результаты принимаются только из уровня A/C и из [competitor-matrix.csv](competitor-matrix.csv).

## Конкурентные продукты и функциональность

| Продукт | Уровень | Что реально наблюдалось | Вывод |
| --- | --- | --- | --- |
| [Gazon52](https://gazon52.ru/kalkulyator) | A | 100 м², универсальный газон, посев с нуля, 30 г/м², запас 10% → 3,3 кг к посеву и 4 кг к закупке; динамический перерасчёт | Простое «площадь × норма» уже закрыто; нужны зоны, упаковки и ведомость без копирования нормы |
| [Calcup](https://calcup.ru/construction/soil) | A | 3×1×0,20 м, мешок 50 л, запас 0% → 0,6 м³, 600 л, 12 мешков; видны плотность и доля компоста | Сильный конкурент для грунта; отличаться можно проектом из нескольких зон и прозрачным вводом нормы |
| [Calcal](https://www.calcal.ru/lawn-calculator) | C | На странице заявлены категории газона, метод посева, грунт, нормы и стоимость; формула отдельно не проверена | Нормы нельзя переносить без источника |
| [CalcNeo](https://calcneo.com/raised-bed-soil-volume-calculator) | D в расширенном аудите, B для Perm soil SERP | Специализированная страница реально присутствует в региональном SERP; live-перерасчёт в этой задаче не выполнен | Учитывать как конкурента выдачи, но не приписывать проверенные поля |
| [SimGarden](https://simgarden.ru/calculators) | C | Открыт каталог с заявленными 16 садовыми инструментами: грунт, растения, полив, теплица, мульча, семена и др.; каждый инструмент отдельно не тестировался | Прямой тематический конкурент по ширине каталога |
| [Kalkhub](https://kalkhub.ru/sad/) | C | Открыта категория, на странице заявлено 63 инструмента; индивидуальная работоспособность не проверялась | Число в каталоге — не метрика трафика и не доказательство качества |

Наличие небольших сайтов в выдаче не является доказательством низкой конкуренции. В сильных кластерах одновременно присутствуют специализированные калькуляторы, магазины и производители.

## Гипотеза продуктового отличия

Связка «площадь → зоны → материалы → объёмы → упаковки → общий список закупок» практически полезнее одиночной формы только если:

1. пользователь может внести несколько зон с разными геометриями;
2. каждый результат показывает единицы, формулу, запас и источник нормы;
3. закупочный список не скрывает промежуточные значения;
4. результат можно сохранить ссылкой/печатью без аккаунта;
5. садовые нормы не выдаются без источника или пользовательского ввода.

Сравнение конкурентов подтверждает наличие окна по связности и нейтральности, но **не подтверждает пользовательский спрос на проект участка**.

## Непроверено и блокирует расширенное решение

- Москва, Санкт-Петербург и дополнительный региональный город не сняты в этом цикле.
- Mobile SERP не проверен.
- Яндекс Вебмастер: спрос, клики, конкурентность и страницы конкурентов не выгружены.
- Скорость, ссылочный профиль, CTR и фактическая достижимость нового домена не измерены.
- 404 [Texiz](https://texiz.ru/kalkulyatory/kalkulyator-geotekstilya/) не считается работающим конкурентом.
