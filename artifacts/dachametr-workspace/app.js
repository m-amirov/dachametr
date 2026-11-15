const root = document.querySelector('#app');
const MATERIALS = {
  soil: { label: 'Грунт', tone: 'soil' },
  sand: { label: 'Песок', tone: 'sand' },
  gravel: { label: 'Щебень', tone: 'gravel' },
};

const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 });
const formatNumber = value => numberFormatter.format(Number(value)).replaceAll('\u00a0', ' ');
const formatUnit = (value, unit) => `${formatNumber(value)} ${unit}`;
const formatMass = value => value === null ? '—' : formatUnit(value, 'кг');
const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function icon(name) {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14" />',
    chevron: '<path d="m9 18 6-6-6-6" />',
    layers: '<path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 16 8 4 8-4"/>',
    measure: '<path d="M4 18 18 4M6 15l3 3M9 12l3 3M12 9l3 3M15 6l3 3"/>',
    more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    warning: '<path d="m12 4 8 15H4L12 4Z"/><path d="M12 9v4M12 16h.01"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.cube}</svg>`;
}

function zoneArea(zone, scenario) {
  return scenario.calculated.zones.find(item => item.id === zone.id)?.area_m2 ?? '0';
}

function layerDetail(layer, scenario) {
  for (const zone of scenario.calculated.zones) {
    const detail = zone.layers.find(item => item.id === layer.id);
    if (detail) return detail;
  }
  return null;
}

function totalValues(scenario) {
  const rows = scenario.calculated.bom;
  return {
    purchase: rows.reduce((sum, row) => sum + Number(row.purchase_l), 0).toString(),
    packages: rows.reduce((sum, row) => sum + (row.packages ?? 0), 0),
    mass: rows.reduce((sum, row) => sum + Number(row.mass_required_kg ?? 0), 0).toString(),
  };
}

function zoneLayers(zone) {
  return zone.layers.map((layer, index) => ({ ...layer, index, ...MATERIALS[layer.material] }));
}

function renderTopbar(scenario) {
  return `<header class="topbar">
    <div class="brand-lockup"><span class="brand-mark">${icon('layers')}</span><span class="brand-name">Дачаметр</span><span class="brand-product">Workspace</span></div>
    <div class="topbar-context"><span class="context-kicker">ПРОТОТИП</span><span>${escapeHtml(scenario.labels.project)}</span><span class="topbar-separator">/</span><span>Материалы</span></div>
    <div class="topbar-actions"><span class="local-status"><i></i> локальный расчёт</span><button class="icon-button prototype-action" type="button" data-action="mock" aria-label="Дополнительные действия (прототип)" title="Прототип: дополнительные действия не реализованы">${icon('more')}</button></div>
  </header>`;
}

function renderMobileTabs(activeSurface) {
  return `<nav class="mobile-tabs" data-testid="mobile-tabs" aria-label="Разделы рабочего пространства">
    ${[['zones', 'Зоны'], ['editor', 'Редактор'], ['bom', 'Ведомость']].map(([surface, label]) => `<button class="mobile-tab ${activeSurface === surface ? 'is-active' : ''}" type="button" role="tab" aria-selected="${activeSurface === surface}" data-action="mobile-tab" data-target="${surface}">${surface === 'editor' ? icon('measure') : surface === 'zones' ? icon('cube') : icon('layers')}<span>${label}</span></button>`).join('')}
  </nav>`;
}

function renderProjectStructure(scenario, selectedZoneId) {
  const zones = scenario.input.zones;
  return `<aside class="panel structure-panel" data-testid="project-structure" data-surface="structure">
    <div class="panel-label-row"><span class="panel-label">Структура проекта</span><button class="icon-button subtle prototype-action" type="button" data-action="mock" aria-label="Добавить объект (прототип)" title="Прототип: добавление объекта не реализовано">${icon('plus')}</button></div>
    <div class="project-heading"><span class="project-glyph">${icon('cube')}</span><div><h2>${escapeHtml(scenario.labels.project)}</h2><span>Рабочий расчёт</span></div></div>
    <div class="project-meta">
      <div><span>Габариты</span><strong>${escapeHtml(scenario.labels.plot)}</strong></div>
      <div data-testid="plot-area"><span>Площадь</span><strong>${formatUnit(scenario.calculated.plot_area_m2, 'м²')}</strong></div>
    </div>
    <div class="structure-divider"></div>
    <div class="list-heading"><span>Зоны</span><span class="list-count">${zones.length}</span></div>
    <div class="zone-list" role="list">
      ${zones.map((zone, index) => {
        const selected = zone.id === selectedZoneId;
        const details = scenario.calculated.zones.find(item => item.id === zone.id);
        return `<button class="zone-row ${selected ? 'is-selected' : ''}" type="button" role="listitem" data-testid="zone-row-${zone.id}" data-action="select-zone" data-zone-id="${zone.id}" aria-current="${selected ? 'true' : 'false'}">
          <span class="zone-index">${String(index + 1).padStart(2, '0')}</span><span class="zone-row-copy"><strong>${escapeHtml(scenario.labels.zones[zone.id])}</strong><small>${zone.length_m} × ${zone.width_m} м</small></span><span class="zone-row-metric"><strong>${formatUnit(details?.area_m2 ?? '0', 'м²')}</strong><small>${zone.layers.length} сл.</small></span><span class="row-chevron">${icon('chevron')}</span>
        </button>`;
      }).join('')}
    </div>
    <button class="add-zone-button prototype-action" type="button" data-action="mock" aria-label="Добавить зону (прототип)" title="Прототип: добавление зоны не реализовано">${icon('plus')}<span>Добавить зону</span><small>прототип</small><kbd>⌘ N</kbd></button>
    <div class="structure-footer"><span class="tiny-dot"></span><span>Размеры зон независимы</span></div>
  </aside>`;
}

function renderZoneFigure(zone, scenario) {
  const layers = zoneLayers(zone);
  const width = Number(zone.width_m);
  const length = Number(zone.length_m);
  const totalThickness = layers.reduce((sum, layer) => sum + Number(layer.thickness_cm), 0);
  return `<div class="zone-visual-grid">
    <figure class="zone-figure" aria-labelledby="figure-title">
      <div class="figure-toolbar"><span class="figure-note">Схема размеров</span><span class="figure-scale">Условная схема размеров</span></div>
      <div class="figure-canvas"><div class="measure-label measure-top"><span>${zone.width_m} м</span></div><div class="measure-label measure-side"><span>${zone.length_m} м</span></div><div class="zone-rectangle" data-testid="zone-rectangle" style="--zone-ratio:${width}/${length}"><span class="zone-rectangle-label">${escapeHtml(scenario.labels.zones[zone.id])}</span><span class="zone-rectangle-area">${formatUnit(zoneArea(zone, scenario), 'м²')}</span></div><span class="figure-origin">0,0</span></div>
      <figcaption id="figure-title">Прямоугольник выбранной зоны. Не показывает её положение на участке.</figcaption>
    </figure>
    <div class="section-figure"><div class="figure-toolbar"><span class="figure-note">Разрез слоёв</span><span class="figure-scale">${totalThickness} см</span></div><div class="section-stack">${layers.length ? layers.map(layer => `<button class="section-layer layer-${layer.tone}" type="button" data-action="toggle-layer" data-layer-id="${layer.id}" aria-label="Настроить ${escapeHtml(layer.material_spec_label)}" style="--layer-size:${Number(layer.thickness_cm) / totalThickness}"><span>${escapeHtml(layer.material_spec_label)}</span><b>${layer.thickness_cm} см</b></button>`).join('') : '<div class="section-empty">Добавьте слой</div>'}</div><p class="section-caption">Высота полос пропорциональна введённой толщине, это не строительная норма.</p></div>
  </div>`;
}

function renderLayerList(zone, scenario, activeLayerId) {
  const layers = zoneLayers(zone);
  return `<section class="layers-section" aria-labelledby="layers-title"><div class="section-heading"><div><span class="eyebrow">СОСТАВ ЗОНЫ</span><h3 id="layers-title">Слои материалов</h3></div><button class="quiet-button prototype-action" type="button" data-action="mock" aria-label="Добавить слой (прототип)" title="Прототип: добавление слоя не реализовано">${icon('plus')}<span>Добавить слой</span><small>прототип</small></button></div>
    <div class="layer-table-header"><span>№</span><span>Материал / вариант</span><span>Толщина</span><span>Расчёт</span><span></span></div>
    <div class="layer-list">
      ${layers.map((layer, index) => { const detail = layerDetail(layer, scenario); const open = activeLayerId === layer.id; return `<div class="layer-row ${open ? 'is-open' : ''} layer-${layer.tone}" data-testid="layer-row-${layer.id}"><button class="layer-main" type="button" data-action="toggle-layer" data-layer-id="${layer.id}"><span class="layer-number">${String(index + 1).padStart(2, '0')}</span><span class="layer-swatch"></span><span class="layer-copy"><strong>${escapeHtml(layer.material_spec_label)}</strong><small>${layer.label} · ${formatUnit(detail?.purchase_l ?? '0', 'л')} с запасом</small></span><span class="layer-thickness">${layer.thickness_cm}<small>см</small></span><span class="layer-volume">${formatUnit(detail?.purchase_l ?? '0', 'л')}</span><span class="layer-disclosure">${open ? icon('close') : icon('chevron')}</span></button>${open ? renderMaterialInspector(layer, scenario) : ''}</div>`; }).join('')}
    </div>
  </section>`;
}

function renderMaterialInspector(layer, scenario) {
  const detail = layerDetail(layer, scenario);
  return `<div class="material-inspector" data-testid="material-inspector"><div class="inspector-heading"><div><span class="eyebrow">ПАРАМЕТРЫ СЛОЯ</span><h4>${escapeHtml(layer.material_spec_label)}</h4></div><span class="inspector-tag">${layer.label}</span></div><div class="inspector-fields"><div class="inspector-field"><span>Толщина слоя</span><strong>${layer.thickness_cm} см</strong></div><div class="inspector-field"><span>Запас</span><strong>${layer.reserve_percent} %</strong></div><div class="inspector-field"><span>Упаковка</span><strong>${layer.package_l ? `${formatUnit(layer.package_l, 'л')} / уп.` : 'Россыпью'}</strong></div><div class="inspector-field"><span>Плотность</span><strong>${layer.density_kg_m3 ? formatUnit(layer.density_kg_m3, 'кг/м³') : 'Не указана'}</strong></div></div><div class="inspector-result"><span>К расчёту</span><strong>${formatUnit(detail?.purchase_l ?? '0', 'л')} с запасом</strong><span class="inspector-help">Значение обновляется из размеров зоны и параметров слоя.</span></div></div>`;
}

function renderEditor(scenario, selectedZoneId, activeLayerId, errorState) {
  const zone = scenario.input.zones.find(item => item.id === selectedZoneId) ?? scenario.input.zones[0];
  const label = scenario.labels.zones[zone.id];
  const details = scenario.calculated.zones.find(item => item.id === zone.id);
  return `<section class="panel editor-surface" data-testid="zone-editor" data-surface="editor">
    <div class="editor-toolbar"><div class="breadcrumb"><span>Участок</span><span>/</span><strong>${escapeHtml(label)}</strong></div><div class="editor-actions"><button class="quiet-button prototype-action" type="button" data-action="mock" aria-label="Переименовать зону (прототип)" title="Прототип: переименование зоны не реализовано"><span>Переименовать</span><small>прототип</small></button><button class="icon-button subtle prototype-action" type="button" data-action="mock" aria-label="Действия зоны (прототип)" title="Прототип: действия зоны не реализованы">${icon('more')}</button></div></div>
    <div class="editor-heading"><div><span class="eyebrow">ВЫБРАННАЯ ЗОНА</span><h1 data-testid="selected-zone-name">${escapeHtml(label)}</h1><p>${escapeHtml(zone.length_m)} × ${escapeHtml(zone.width_m)} м · ${zone.layers.length} слоя · ${formatUnit(details?.area_m2 ?? '0', 'м²')}</p></div><div class="editor-stat"><span>Площадь зоны</span><strong>${formatUnit(details?.area_m2 ?? '0', 'м²')}</strong></div></div>
    ${errorState ? '<div class="error-banner" role="alert"><span class="error-icon">' + icon('warning') + '</span><span><strong>Расчёт приостановлен</strong><small>Исправьте толщину слоя в дорожке, чтобы обновить ведомость.</small></span><button type="button" class="icon-button subtle prototype-action" data-action="mock" aria-label="Закрыть сообщение (прототип)" title="Прототип: закрытие сообщения не реализовано">' + icon('close') + '</button></div>' : ''}
    <div class="zone-dimensions" data-testid="zone-dimensions"><span class="dimension-item"><small>Длина</small><strong>${zone.length_m} м</strong></span><span class="dimension-item"><small>Ширина</small><strong>${zone.width_m} м</strong></span><span class="dimension-item"><small>Суммарная толщина</small><strong>${zone.layers.reduce((sum, layer) => sum + Number(layer.thickness_cm), 0)} см</strong></span><span class="dimension-item dimension-note"><small>Режим отображения</small><strong>Выбранная зона</strong></span></div>
    ${renderZoneFigure(zone, scenario)}
    ${renderLayerList(zone, scenario, activeLayerId)}
  </section>`;
}

function renderBom(scenario, errorState) {
  const totals = totalValues(scenario);
  const rows = scenario.calculated.bom;
  return `<aside class="panel bom-surface" data-testid="bom-spec" data-surface="bom"><div class="bom-heading"><div><span class="eyebrow">СПЕЦИФИКАЦИЯ</span><h2>Ведомость закупки</h2></div><span class="live-status"><i></i> расчёт</span></div>${errorState ? `<div class="blocked-bom" data-testid="blocked-bom"><span class="error-icon">${icon('warning')}</span><strong>Итог заблокирован</strong><p>Исправьте толщину слоя, чтобы не показывать частично достоверный объём.</p><small>Поле: Дорожка → Песок → Толщина слоя</small></div>` : ''}<div class="bom-total ${errorState ? 'is-blocked' : ''}"><span>Требуемый объём с запасом</span><strong data-testid="bom-total-volume">${errorState ? '—' : formatUnit(totals.purchase, 'л')}</strong><div class="bom-total-meta"><span>Упаковки</span><strong data-testid="bom-total-packages">${errorState ? '—' : `${formatNumber(totals.packages)} уп.`}</strong></div></div><div class="bom-summary"><div><span>Участок</span><strong>${formatUnit(scenario.calculated.plot_area_m2, 'м²')}</strong></div><div><span>Зоны</span><strong>${scenario.input.zones.length}</strong></div><div><span>Материалы</span><strong>${rows.length}</strong></div></div><div class="bom-list-heading"><span>Материалы</span><span>Объём / закупка</span></div><div class="bom-list">${errorState ? '<div class="bom-placeholder">Строки скрыты до исправления ошибки.</div>' : rows.map(row => renderBomRow(row)).join('')}</div>${!errorState ? `<div class="bom-footnote"><span>Масса по указанной плотности</span><strong>${formatUnit(totals.mass, 'кг')}</strong></div>` : ''}<div class="bom-note"><span class="note-mark">i</span><p>«Нужно» — объём с запасом. «Купить» — округление до целых упаковок. Излишек показывает разницу.</p></div></aside>`;
}

function renderBomRow(row) {
  const material = MATERIALS[row.material];
  return `<article class="bom-row" data-testid="bom-row"><div class="bom-row-name"><span class="row-swatch layer-${material.tone}"></span><div><span class="bom-material-label">${material.label}</span><strong>${escapeHtml(row.material_spec_label)}</strong><small>${row.package_l ? `${formatUnit(row.package_l, 'л')} упаковка` : 'Россыпь'}</small></div></div><div class="bom-row-values"><div><span>Нужно</span><strong>${formatUnit(row.purchase_l, 'л')}</strong></div><div><span>Купить</span><strong>${formatNumber(row.packages)} уп.</strong></div><div><span>Масса</span><strong>${formatMass(row.mass_required_kg)}</strong></div></div><details class="bom-disclosure"><summary>Подробнее</summary><dl><div><dt>Чистый объём</dt><dd>${formatUnit(row.net_l, 'л')}</dd></div><div><dt>Излишек</dt><dd>${formatUnit(row.surplus_l, 'л')}</dd></div><div><dt>Фактически куплено</dt><dd>${formatUnit(row.packed_volume_l, 'л')}</dd></div></dl></details></article>`;
}

function renderFooter() {
  return `<footer class="workspace-footer"><span>Локальный визуальный прототип · данные не сохраняются после перезагрузки</span><span>Действия с пометкой «прототип» не выполняются</span><span>Схема зоны ≠ схема размещения на участке</span></footer>`;
}

async function boot() {
  const scenario = await fetch('./scenario.json').then(response => {
    if (!response.ok) throw new Error(`scenario ${response.status}`);
    return response.json();
  });
  const state = {
    selectedZoneId: 'bed',
    activeLayerId: null,
    mobileSurface: 'editor',
    errorState: new URLSearchParams(window.location.search).get('state') === 'error',
  };

  function render() {
    root.innerHTML = `${renderTopbar(scenario)}${renderMobileTabs(state.mobileSurface)}<main class="workspace-grid">${renderProjectStructure(scenario, state.selectedZoneId)}${renderEditor(scenario, state.selectedZoneId, state.activeLayerId, state.errorState)}${renderBom(scenario, state.errorState)}</main>${renderFooter()}`;
    root.dataset.mobileSurface = state.mobileSurface;
    root.dataset.errorState = String(state.errorState);
    root.querySelectorAll('[data-action="select-zone"]').forEach(button => button.addEventListener('click', () => {
      state.selectedZoneId = button.dataset.zoneId;
      state.activeLayerId = null;
      state.mobileSurface = 'editor';
      render();
    }));
    root.querySelectorAll('[data-action="toggle-layer"]').forEach(button => button.addEventListener('click', () => {
      state.activeLayerId = state.activeLayerId === button.dataset.layerId ? null : button.dataset.layerId;
      render();
    }));
    root.querySelectorAll('[data-action="mobile-tab"]').forEach(button => button.addEventListener('click', () => {
      state.mobileSurface = button.dataset.target;
      render();
    }));
  }
  render();
}

boot().catch(error => {
  root.innerHTML = `<main class="load-error"><h1>Не удалось загрузить сценарий</h1><p>${escapeHtml(error.message)}</p></main>`;
  console.error(error);
});
