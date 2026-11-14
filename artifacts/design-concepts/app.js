const params = new URLSearchParams(window.location.search);
let concept = params.get('concept') || 'a';
let state = params.get('state') || 'result';

const copy = {
  a: {
    name: 'Измерительная мастерская',
    short: 'точный инструмент',
    title: 'Сначала измерения. Потом закупка.',
    intro: 'Спокойный рабочий лист, где площадь и объём читаются с первого взгляда, а каждое действие привязано к расчёту.',
    note: 'Вариант A сохраняет тёплый фон PR #7, но делает цифры и сетку главным визуальным материалом.',
  },
  b: {
    name: 'Современный садовый атлас',
    short: 'редакционный лист',
    title: 'Лист участка, собранный по слоям.',
    intro: 'Предметный интерфейс для планирования сада: не карта и не декор, а последовательное чтение геометрии, зон и материалов.',
    note: 'Вариант B добавляет ритм полевого атласа: листы, подписи и профиль размеров вместо SaaS-карточек.',
  },
  c: {
    name: 'Профессиональная расчётная студия',
    short: 'операторский режим',
    title: 'Данные участка — в одной расчётной панели.',
    intro: 'Плотный режим для нескольких зон: редактирование рядом с ведомостью, сопоставимые колонки и заметные статусы ошибок.',
    note: 'Вариант C рассчитан на пользователя, который быстро вводит много слоёв и проверяет закупку строка за строкой.',
  },
};

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function valueFor(empty, filled) {
  return state === 'initial' ? empty : filled;
}

function field(label, value, unit = '', extra = '') {
  return `<label class="mock-field ${extra}"><span>${label}</span><span class="mock-input"><input value="${escapeHtml(value)}" aria-label="${escapeHtml(label)}" />${unit ? `<em>${unit}</em>` : ''}</span></label>`;
}

function sectionLabel(number, label, detail = '') {
  return `<div class="section-label"><span>${number}</span><strong>${label}</strong>${detail ? `<small>${detail}</small>` : ''}</div>`;
}

function status() {
  const current = copy[concept];
  return `<div class="concept-meta"><span>${current.name}</span><span>${current.short}</span><span>макет · ${state}</span></div>`;
}

function header() {
  const current = copy[concept];
  return `<header class="product-header">
    <div class="brand-lockup"><span class="micro-label">РАСЧЁТНЫЙ ИНСТРУМЕНТ ДЛЯ УЧАСТКА</span><h1>Дачаметр</h1></div>
    <div class="header-copy"><span class="header-index">ЛИСТ 01 / 03</span><p>${current.intro}</p></div>
    <div class="header-session"><span class="signal"></span><span>Локальная сессия</span><button type="button">Сбросить</button></div>
  </header>`;
}

function plotInputs() {
  const invalid = state === 'error' ? ' is-invalid' : '';
  return `<div class="plot-fields">
    ${field('Длина участка', valueFor('', '20'), 'м', invalid)}
    ${field('Ширина участка', valueFor('', '30'), 'м', state === 'error' ? ' is-invalid' : '')}
    <div class="plot-total"><span>Площадь участка</span><strong>${state === 'initial' || state === 'error' ? '—' : '600 м²'}</strong><small>${state === 'initial' || state === 'error' ? 'Введите оба размера' : '≈ 6 соток'}</small></div>
  </div>`;
}

function miniLayer(name, type, thickness, packageSize) {
  return `<div class="mini-layer"><span class="layer-mark"></span><div><strong>${name}</strong><small>${type} · ${thickness} см</small></div><b>${packageSize}</b></div>`;
}

function zone(name, index, withSecondLayer = false) {
  const empty = state === 'initial';
  if (empty) return `<div class="empty-zone"><span class="zone-number">01</span><div><strong>Начните с первой зоны</strong><p>Назовите её и задайте размеры, затем добавьте слои материалов.</p></div><button type="button" class="outline-button">Добавить первую зону</button></div>`;
  return `<article class="zone-block">
    <div class="zone-heading"><span class="zone-number">${String(index).padStart(2, '0')}</span><div><span class="micro-label">ЗОНА ${String(index).padStart(2, '0')}</span><h3>${name}</h3></div><button type="button" class="quiet-danger">Удалить</button></div>
    <div class="zone-fields">${field('Название зоны', name)}${field('Длина', index === 1 ? '2' : '2', 'м')}${field('Ширина', index === 1 ? '4' : '5', 'м')}</div>
    <div class="zone-area-line"><span>Площадь зоны</span><strong>${index === 1 ? '8 м²' : '10 м²'}</strong></div>
    <div class="layers-title"><div><span class="micro-label">СЛОИ И МАТЕРИАЛЫ</span><small>Связанные варианты считаются отдельно</small></div><button type="button" class="outline-button">Добавить слой</button></div>
    <div class="layer-stack">
      ${miniLayer(index === 1 ? 'Грунт для грядок' : 'Грунт для грядок', 'грунт', index === 1 ? '25' : '6', index === 1 ? '52 уп. × 50 л' : '12 уп. × 50 л')}
      ${withSecondLayer ? miniLayer('Песок', 'песок', '10', '21 уп. × 50 л') : ''}
    </div>
  </article>`;
}

function resultPanel() {
  if (state === 'initial' || state === 'editing') {
    return `<aside class="result-panel result-empty"><span class="result-symbol">Σ</span><span class="micro-label">РЕЗУЛЬТАТ</span><h2>Ведомость появится здесь</h2><p>Добавьте зону и слой материала. Итог обновляется после каждого изменения.</p></aside>`;
  }
  if (state === 'error') {
    return `<aside class="result-panel result-error"><span class="result-symbol">!</span><span class="micro-label">РЕЗУЛЬТАТ ЗАБЛОКИРОВАН</span><h2>Сначала исправьте ввод</h2><p>Частичный расчёт не показываем как готовую закупку.</p><div class="error-line"><strong>Введите число</strong><code>plot.length_m</code></div></aside>`;
  }
  return `<aside class="result-panel result-ready"><div class="result-heading"><div><span class="micro-label">ТЕКУЩИЙ РАСЧЁТ</span><h2>Ведомость закупки</h2></div><span class="live-state"><i></i>обновляется</span></div><div class="result-stats"><div><span>Участок</span><strong>600 м²</strong></div><div><span>Это примерно</span><strong>6 соток</strong></div><div><span>Зоны вместе</span><strong>18 м²</strong></div></div><div class="bom-heading"><span class="micro-label">BOM / 02 ПОЗИЦИИ</span><small>нужно · с запасом · закупка</small></div><div class="bom-list"><div class="bom-row"><div><span>ГРУНТ</span><strong>Грунт для грядок</strong></div><b>52 уп. × 50 л</b><small>2 600 л чистого · 2 600 л с запасом</small></div><div class="bom-row"><div><span>ПЕСОК</span><strong>Песок</strong></div><b>21 уп. × 50 л</b><small>1 000 л чистого · 1 050 л с запасом</small></div></div><div class="breakdown"><span class="micro-label">РАСШИФРОВКА ПО ЗОНАМ</span><div><strong>Грядка</strong><span>2 000 л чистого · 2 000 л с запасом</span></div><div><strong>Дорожка</strong><span>600 л + 1 000 л по слоям</span></div></div></aside>`;
}

function conceptA() {
  return `<div class="concept concept-a"><div class="concept-frame">${status()}${header()}<div class="a-intro"><div><span class="micro-label">ИНСТРУМЕНТ / 01</span><h2>${copy.a.title}</h2><p>${copy.a.note}</p></div><div class="a-readout"><span>Профиль участка</span><strong>${state === 'initial' || state === 'error' ? '—' : '20 × 30 м'}</strong><small>прямоугольная геометрия</small></div></div><div class="a-workspace"><section class="editor-sheet"><div class="sheet-title">${sectionLabel('01', 'Размеры участка', 'м · м² · сотки')}<button type="button" class="solid-button">Добавить зону</button></div>${plotInputs()}<div class="section-divider"></div><div class="sheet-title">${sectionLabel('02', 'Зоны и слои', 'каждая область считается отдельно')}<button type="button" class="solid-button">Добавить зону</button></div>${zone('Грядка', 1, false)}${state === 'result' ? zone('Дорожка', 2, true) : ''}</section>${resultPanel()}</div><footer class="concept-footer"><span>Данные остаются в этой сессии</span><span>Площадь × толщина = объём слоя</span></footer></div></div>`;
}

function atlasProfile() {
  return `<div class="atlas-profile"><div class="profile-caption"><span class="micro-label">ПРОФИЛЬ УЧАСТКА</span><strong>${state === 'initial' || state === 'error' ? 'Размеры не заданы' : '20,00 × 30,00 м'}</strong></div><div class="profile-rule"><i></i><i></i><i></i><i></i><i></i><span class="profile-x">30 м</span><span class="profile-y">20 м</span></div><small>Схема показывает только размеры расчёта, не расположение зон.</small></div>`;
}

function conceptB() {
  return `<div class="concept concept-b"><div class="concept-frame">${status()}<header class="atlas-header"><div><span class="atlas-mark">Д / 01</span><span class="micro-label">ПОЛЕВОЙ АТЛАС</span><h1>Дачаметр</h1></div><div class="atlas-title"><span>Лист расчёта</span><h2>${copy.b.title}</h2><p>${copy.b.intro}</p></div><div class="atlas-session">Сессия 01<br /><button type="button">Сбросить</button></div></header>${atlasProfile()}<div class="b-workspace"><section class="atlas-editor"><div class="atlas-section-head">${sectionLabel('A', 'Геометрия', 'участок')}<button type="button" class="text-button">Изменить</button></div>${plotInputs()}<div class="atlas-section-head">${sectionLabel('B', 'План зон', 'прямоугольные области')}<button type="button" class="solid-button">+ Зона</button></div>${zone('Грядка', 1, false)}${state === 'result' ? zone('Дорожка', 2, true) : ''}</section><section class="atlas-result">${resultPanel()}</section></div><footer class="atlas-footer"><span>Лист 01 · расчётная геометрия</span><span>Не карта · не смета · не строительная норма</span></footer></div></div>`;
}

function dataRow(title, material, required, reserve, purchase) {
  return `<div class="data-row"><div><span class="row-index">01</span><strong>${title}</strong><small>${material}</small></div><span>${required}</span><span>${reserve}</span><b>${purchase}</b><button type="button" class="row-action">Открыть</button></div>`;
}

function studioResult() {
  if (state === 'initial' || state === 'editing') return resultPanel();
  if (state === 'error') return resultPanel();
  return `<aside class="studio-summary"><div class="studio-summary-head"><div><span class="micro-label">OUTPUT / BOM</span><h2>Ведомость закупки</h2></div><span class="ready-tag">READY</span></div><div class="studio-total"><span>Общий закупочный объём</span><strong>3 650 л</strong><small>по 2 сопоставимым материалам</small></div><div class="studio-table"><div class="table-head"><span>Материал</span><span>Нужно</span><span>С запасом</span><span>Купить</span></div>${dataRow('Грунт для грядок', 'Грунт · spec-1', '2 600 л', '2 600 л', '52 × 50 л')}${dataRow('Песок', 'Песок · spec-3', '1 000 л', '1 050 л', '21 × 50 л')}</div><div class="studio-note"><b>Проверка</b><span>Зона 02 превышает собственную площадь только по слоям — зоны не размещаются автоматически.</span></div></aside>`;
}

function conceptC() {
  return `<div class="concept concept-c"><div class="concept-frame">${status()}<header class="studio-header"><div><span class="studio-code">DACHAMETR / CALC STUDIO</span><h1>Дачаметр</h1></div><div class="studio-intro"><span>Рабочая область</span><strong>${copy.c.title}</strong><p>${copy.c.intro}</p></div><div class="studio-session"><i></i>LOCAL SESSION<br /><button type="button">RESET</button></div></header><div class="c-toolbar"><div><span class="micro-label">PROJECT 01</span><strong>Участок без названия</strong></div><div class="toolbar-metrics"><span>ЗОНЫ <b>${state === 'result' ? '02' : '00'}</b></span><span>СЛОИ <b>${state === 'result' ? '03' : '00'}</b></span><span>СТАТУС <b class="accent-text">${state === 'error' ? 'BLOCKED' : state === 'result' ? 'CALCULATED' : 'DRAFT'}</b></span></div><button type="button" class="solid-button">+ ДОБАВИТЬ ЗОНУ</button></div><div class="c-workspace"><section class="data-pane"><div class="pane-title"><div>${sectionLabel('01', 'Ввод данных', 'участок / зоны / слои')}</div><span class="keyboard-hint">TAB ↵</span></div><div class="data-group"><div class="data-group-title"><span>ПЛОЩАДЬ</span><small>прямоугольная геометрия</small></div>${plotInputs()}</div><div class="data-group"><div class="data-group-title"><span>ЗОНЫ</span><button type="button" class="text-button">+ добавить</button></div>${zone('Грядка', 1, false)}${state === 'result' ? zone('Дорожка', 2, true) : ''}</div></section><section class="summary-pane"><div class="pane-title"><div>${sectionLabel('02', 'Расчёт', 'живой результат')}</div><span class="live-state"><i></i>SYNCED</span></div>${studioResult()}</section></div><footer class="studio-footer"><span>Ошибки блокируют BOM целиком</span><span>ru-RU · м · м² · м³ · л · кг</span></footer></div></div>`;
}

function render() {
  if (!copy[concept]) concept = 'a';
  if (!['initial', 'editing', 'error', 'result'].includes(state)) state = 'result';
  document.body.dataset.concept = concept;
  document.body.dataset.state = state;
  document.querySelectorAll('[data-concept]').forEach(button => button.classList.toggle('is-active', button.dataset.concept === concept));
  document.querySelectorAll('[data-state]').forEach(button => button.classList.toggle('is-active', button.dataset.state === state));
  document.querySelector('#app').innerHTML = concept === 'a' ? conceptA() : concept === 'b' ? conceptB() : conceptC();
}

function update(next) {
  if (next.concept) concept = next.concept;
  if (next.state) state = next.state;
  const url = new URL(window.location.href);
  url.searchParams.set('concept', concept);
  url.searchParams.set('state', state);
  window.history.replaceState({}, '', url);
  render();
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-concept], [data-state]');
  if (!target) return;
  update(target.dataset.concept ? { concept: target.dataset.concept } : { state: target.dataset.state });
});

render();
