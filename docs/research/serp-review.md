# Gate 1: срез поисковой выдачи и конкурентов

Дата наблюдений: **13 ноября 2026**. Отдельный региональный срез: **Пермь, Яндекс, lr=50**, анонимный браузер. География сайта как продукта: **Россия**, региональное исследование ещё не обеспечивает репрезентативность по РФ.

## Методика и уровни доказательств
- A — 실제 форма калькулятора проверена в живом браузере с изменением параметров, итог наблюдён.
- B — выдача Яндекса проверена в публичном браузере, позиции не являются постоянными; исключены рекламные блоки.
- C — страница конкурента открыта и прочитана, поля и текст видны; **фактический перерасчёт не проверен**.
- D — описание из поискового результата, не считать прямой проверкой работы калькулятора.
- Все URLs и статусы в `competitor-matrix.csv`; 20 строк органической региональной выдачи в `serp-samples.csv`.

Отдельное ограничение: 4 выборки Яндекс SERP — не систематическое слежение за позициями, не mobile/desktop split, не репрезентативное федеральное исследование; позиции отличаются по географии, устройству и персонализации.

## 4 живых поисковых среза (Яндекс, Пермь)
| Поисковый запрос | Органические URL по порядку (1–5) | Сессия |
| --- | --- | --- |
| калькулятор грунта для грядки | [ecalc.ru](https://ecalc.ru/raised-bed-soil/); [goodcalc.online](https://goodcalc.online/ru/soil-volume-calculator); [calcneo.com](https://calcneo.com/raised-bed-soil-volume-calculator); [gruntcalc.ru](https://gruntcalc.ru/); [calc-tools.ru](https://calc-tools.ru/calculators/priming/) | [браузер](https://agent.tinyfish.ai/runs/b93598f9-9896-4b0b-b4f7-151671f38238) |
| калькулятор семян газона | [lifegazon.ru](https://lifegazon.ru/kalkulyator-gazona); [agrogrunt.ru](https://agrogrunt.ru/kalkulyator-gazona/); [calcal.ru](https://calcal.ru/lawn-calculator); [ecalc.ru](https://ecalc.ru/grass-seed/); [miniwebtool.com](https://ru.miniwebtool.com/калькулятор-газонных-семян/) | [браузер](https://agent.tinyfish.ai/runs/58b6abb2-b1a9-4ba4-b12d-2e4030628843) |
| калькулятор геотекстиля | [stk-svoydom.ru](https://stk-svoydom.ru/kalkulyatory/raschet-geotekstilya); [mpkm.org](https://mpkm.org/calc/raskroy-geosintetiki/); [roadline.ru](https://roadline.ru/calculator); [tech-stc.ru](https://tech-stc.ru/engineering-calculators/roofing/geotextile-for-drainage-systems-calculator/); [tdagro.ru](https://tdagro.ru/onlayn-kalkulyator-dlya-rascheta-geotekstilya-pod-fundament/) | [браузер](https://agent.tinyfish.ai/runs/b36d9d48-2327-4a39-bc45-520e30907054) |
| калькулятор капельного полива | [radioskot.com](https://radioskot.com/calc/kalkulyator-sistemy-kapelnogo-poliva); [forfr1end.ru](https://forfr1end.ru/irrigation-drip-calculator/); [calcneo.com](https://calcneo.com/drip-irrigation); [converterok.com](https://converterok.com/calculator/drip-irrigation-calculator/); [calcal.ru](https://calcal.ru/auto-irrigation-calculator) | [браузер](https://agent.tinyfish.ai/runs/73ddc785-38fe-454c-b7d4-54a1d0042e02) |

**Вывод из SERP:** для каждого из четырёх интентов существуют специальные страницы в топ-5 регионального среза. Наличие результатов не доказывает общий поисковый спрос, CTR, доходность, доменную конкурентоспособность или реальные позиции в другой сессии.

## Реально проверенные интерактивные калькуляторы (уровень A)
### Gazon52 — [калькулятор расхода семян](https://gazon52.ru/kalkulyator)
[Лог браузерной сессии](https://agent.tinyfish.ai/runs/5d0d9872-9bc5-4e16-85c0-0d08f58c771a). Введены площадь 100 м², тип «Универсальный», способ «С нуля»; норма 30 г/м², 10% запас. Отображено **3,3 кг** к посеву и **4 кг** к закупке. При изменении площади результат меняется без перезагрузки. Есть выбор м²/соток, типа/метода посева и ориентир цены. Это уже полноценный функциональный конкурент; просто площадь×норма — слабое отличие.

### Calcup — [грунт для грядки](https://calcup.ru/construction/soil)
[Лог браузерной сессии](https://agent.tinyfish.ai/runs/4c473801-cf6f-4f05-b3bc-83c9a123da76). Введены 3 м × 1 м × 20 см, мешок 50 л, запас 0%. Отображено **0,6 м³ / 600 л / 12 мешков**. Также по оставленным значениям плотности 900 кг/м³ и компоста 30%: 540 кг и 0,18 м³ компоста; пересчёт динамический. Здесь уже есть закупка, масса, состав смеси и ограничения. Простая копия не даст самостоятельной ценности.

## Проверенные открытые страницы (уровень C), без живого теста формы
- [SimGarden — 16 позиций в каталоге](https://simgarden.ru/calculators): грунт, растения, полив, теплица, мульча, семена, сбор дождевой воды, капельный полив, удобрения, высокая грядка и др. Только наличие ссылок в каталоге, не подтверждение работы каждой.
- [БОБР — калькулятор щепы](https://xn--90ah1adgs1b.xn--p1ai/kalkulyatory/kalkulyator-shchepy-dlya-mulchi/): прямоугольник/круг/кольцо, слой, потери, мешки, тачки. Видны названия форм и пояснения; перерасчёт не тестировался.
- [МойКалк — садовые дорожки](https://www.moycalc.ru/sad/dorozhki): обещаны плитка, гравий, песок, геотекстиль и бордюр; на открытой странице присутствуют требования к параметрам.
- [Геодезист.ру — площадь по точкам](https://geodesist.ru/tools/area/): координаты, формула Гаусса, периметр, самопересечения, схема.
- [ЭМИТЕКС — геотекстиль](https://emitexgeo.ru/): реальные параметры рулона, нахлёсты и ширина, коммерческий сайт поставщика.
- [Kalkhub — категория «Сад и растения»](https://kalkhub.ru/sad/): на странице заявлено 63 инструмента, включая полив, NPK, объём грядки и сбор воды; количество работающих не проверялось.

## Найденные на поиске страницы (уровень D; НЕ подтверждённый live calculation)
- [ecalc — схема посадки](https://ecalc.ru/plant-spacing/): площадь, шаг рядов и растений.
- [Calcup — дождевая вода](https://calcup.ru/everyday/rainwater-harvest): водосбор, осадки, бак, перелив.
- [ТЕХСТАНДАРТ — геотекстиль](https://www.tech-stc.ru/engineering-calculators/exterior-site/geotextile-for-garden-path-base-calculator/): основание дорожки.
- [ТЕХСТАНДАРТ — пруд](https://www.tech-stc.ru/engineering-calculators/exterior-site/garden-pond-volume-and-liner-calculator/): объём и плёнка.
- [Росстип — капельный полив](https://www.rosstip.ru/news/21544-kalkulyator-vremeni-poliva-i-kolichestva-zon-kapelnogo-poliva): капельницы, зоны, производительность.
- [Росстип — NPK](https://rosstip.ru/news/19312-kalkulyator-normy-vneseniya-udobrenij-npk): действующие вещества и дозировки; научная обоснованность норм не проверялась.

## Ошибки, неопределённость и конкурентное окно
- Один из найденных источников [Texiz](https://texiz.ru/kalkulyatory/kalkulyator-geotekstilya/) при попытке отдельного открытия дал 404, поэтому не используем как подтверждённый работающий калькулятор.
- Пустой title или обрывок из веб-поиска не является доказательством функциональности.
- Широкие каталоги калькуляторов и нишевые поставщики уже закрывают базовые операции. Конкурировать вероятнее через **связанный сценарий проекта участка**: площадь → зоны → материалы → закупочный список, не через ещё 20 независимых шаблонов.
- Это **гипотеза продуктовой дифференциации**, не проверенный пользовательский спрос. Сезонность по двум годам и конкурентность Яндекс Вебмастера не получены.
