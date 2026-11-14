import { Exact } from '../domain/exact.ts';
import type { BomRow, DetailedCalculated, ZoneBreakdown } from '../domain/plot.ts';
import {
  addLayer,
  addZone,
  createInitialState,
  linkLayerToNewMaterial,
  removeLayer,
  removeZone,
  updateLayerField,
  updateMaterialSpec,
  updatePlotField,
  updateZoneField,
  type AppState,
  type LayerDraft,
  type MaterialKind,
  type MaterialSpecDraft,
  type ZoneDraft,
} from './model.ts';
import { formatRuNumber, formatUnit, sumWholePackages } from './format.ts';
import { validateDraft, type DraftValidation } from './validation.ts';
import { buildLayerDiagram, type LayerDiagram } from './layer-visual.ts';

const MATERIAL_LABELS: Record<MaterialKind, string> = {
  soil: 'Грунт',
  sand: 'Песок',
  gravel: 'Щебень',
};

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fieldId(...parts: string[]): string {
  return parts.join('-');
}

function decimalDivide(value: string, divisor: string): string {
  try {
    return Exact.decimal(value).divide(Exact.decimal(divisor)).toString();
  } catch {
    return '—';
  }
}

function errorFor(validation: DraftValidation, path: string): boolean {
  return validation.errors.some(error => error.path === path);
}

interface ViewState {
  openZoneId: string | null;
  openLayerIds: ReadonlySet<string>;
  openBomKeys?: ReadonlySet<string>;
}

function draftError(validation: DraftValidation, path: string): string | undefined {
  return validation.errors.find(error => error.path === path)?.message;
}

function inputField(options: {
  id: string;
  label: string;
  value: string;
  action: string;
  field: string;
  focusKey: string;
  path: string;
  validation: DraftValidation;
  unit?: string;
  hint?: string;
  optional?: boolean;
  zoneId?: string;
  layerId?: string;
}): string {
  const message = draftError(options.validation, options.path);
  const invalid = Boolean(message);
  const errorId = `error-${options.id}`;
  return `<div class="field ${invalid ? 'field-invalid' : ''}">
    <label for="${escapeHtml(options.id)}">${escapeHtml(options.label)}${options.optional ? ' <span class="optional">необязательно</span>' : ''}</label>
    <div class="input-wrap">
      <input id="${escapeHtml(options.id)}" data-action="${escapeHtml(options.action)}" data-field="${escapeHtml(options.field)}"${options.zoneId ? ` data-zone-id="${escapeHtml(options.zoneId)}"` : ''}${options.layerId ? ` data-layer-id="${escapeHtml(options.layerId)}"` : ''} data-focus-key="${escapeHtml(options.focusKey)}" data-domain-path="${escapeHtml(options.path)}" value="${escapeHtml(options.value)}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-invalid="${invalid ? 'true' : 'false'}"${invalid ? ` aria-describedby="${escapeHtml(errorId)}"` : ''} />
      ${options.unit ? `<span class="unit">${escapeHtml(options.unit)}</span>` : ''}
    </div>
    ${options.hint ? `<p class="field-hint">${escapeHtml(options.hint)}</p>` : ''}
    ${message ? `<p class="field-error" id="${escapeHtml(errorId)}">${escapeHtml(message)}</p>` : ''}
  </div>`;
}

function zoneDetail(validation: DraftValidation, zoneId: string): ZoneBreakdown | undefined {
  if (!validation.result?.ok) return undefined;
  return validation.result.value.zones.find(zone => zone.id === zoneId);
}

function layerDetail(validation: DraftValidation, zoneId: string, layerId: string) {
  return zoneDetail(validation, zoneId)?.layers.find(layer => layer.id === layerId);
}

function renderMaterialSource(state: AppState, layer: LayerDraft): string {
  return `<div class="field field-wide">
    <label for="source-${escapeHtml(layer.id)}">Связь варианта</label>
    <select id="source-${escapeHtml(layer.id)}" data-action="link-material" data-zone-id="" data-layer-id="${escapeHtml(layer.id)}" data-focus-key="source-${escapeHtml(layer.id)}">
      <option value="__new__">Создать новый вариант материала</option>
      ${state.materials.map(material => `<option value="${escapeHtml(material.id)}"${material.id === layer.materialSpecId ? ' selected' : ''}>${escapeHtml(material.label || 'Без названия')} · ${escapeHtml(MATERIAL_LABELS[material.material])} · ${escapeHtml(material.id)}</option>`).join('')}
    </select>
    <p class="field-hint">Выберите ранее созданный вариант в списке или создайте новый. Одинаковое название не объединяет варианты автоматически.</p>
  </div>`;
}

function renderLayer(state: AppState, zone: ZoneDraft, layer: LayerDraft, layerIndex: number, zoneIndex: number, validation: DraftValidation, view: ViewState): string {
  const material = state.materials.find(spec => spec.id === layer.materialSpecId) as MaterialSpecDraft | undefined;
  const spec = material ?? { id: layer.materialSpecId, material: 'soil' as MaterialKind, label: '' };
  const prefix = `zones[${zoneIndex}].layers[${layerIndex}]`;
  const detail = layerDetail(validation, zone.id, layer.id);
  const expanded = view.openLayerIds.has(layer.id);
  const editId = `layer-editor-${layer.id}`;
  return `<fieldset class="layer-card" data-testid="layer-card" data-layer-id="${escapeHtml(layer.id)}">
    <legend><span class="layer-number">Слой ${layerIndex + 1}</span><button type="button" class="button button-text danger" data-action="remove-layer" data-zone-id="${escapeHtml(zone.id)}" data-layer-id="${escapeHtml(layer.id)}">Удалить</button></legend>
    <div class="layer-summary">
      <span class="material-swatch material-${escapeHtml(spec.material)}" aria-hidden="true"></span>
      <div class="layer-summary-copy"><strong>${escapeHtml(spec.label || MATERIAL_LABELS[spec.material])}</strong><span>${escapeHtml(MATERIAL_LABELS[spec.material])} · ${layer.thickness ? escapeHtml(layer.thickness) + ' см' : 'укажите толщину'}${detail ? ' · ' + formatUnit(detail.purchase_l, 'л') + ' с запасом' : ''}</span></div>
      <button type="button" class="button button-secondary layer-toggle" data-action="toggle-layer" data-zone-id="${escapeHtml(zone.id)}" data-layer-id="${escapeHtml(layer.id)}" data-focus-key="toggle-layer-${escapeHtml(layer.id)}" aria-controls="${escapeHtml(editId)}" aria-expanded="${expanded}">${expanded ? 'Скрыть' : 'Настроить'}</button>
    </div>
    <div class="layer-edit" id="${escapeHtml(editId)}"${expanded ? '' : ' hidden'}>
    ${renderMaterialSource(state, layer).replace('data-zone-id=""', `data-zone-id="${escapeHtml(zone.id)}"`)}
    <div class="field-grid two-columns">
      <div class="field">
        <label for="material-${escapeHtml(layer.id)}">Тип материала</label>
        <select id="material-${escapeHtml(layer.id)}" data-action="material-field" data-field="material" data-material-id="${escapeHtml(spec.id)}" data-focus-key="material-${escapeHtml(layer.id)}">
          ${(['soil', 'sand', 'gravel'] as MaterialKind[]).map(kind => `<option value="${kind}"${spec.material === kind ? ' selected' : ''}>${MATERIAL_LABELS[kind]}</option>`).join('')}
        </select>
      </div>
      <div class="field field-wide-mobile">
        <label for="label-${escapeHtml(layer.id)}">Название варианта материала</label>
        <input id="label-${escapeHtml(layer.id)}" data-action="material-field" data-field="label" data-material-id="${escapeHtml(spec.id)}" data-focus-key="label-${escapeHtml(layer.id)}" value="${escapeHtml(spec.label)}" type="text" autocomplete="off" maxlength="80" aria-invalid="${errorFor(validation, `${prefix}.material_spec_label`) ? 'true' : 'false'}" />
      </div>
      ${inputField({ id: fieldId('thickness', layer.id), label: 'Толщина слоя', value: layer.thickness, action: 'layer-field', field: 'thickness', focusKey: `thickness-${layer.id}`, path: `${prefix}.thickness_cm`, validation, unit: 'см', zoneId: zone.id, layerId: layer.id })}
      ${inputField({ id: fieldId('reserve', layer.id), label: 'Запас', value: layer.reserve, action: 'layer-field', field: 'reserve', focusKey: `reserve-${layer.id}`, path: `${prefix}.reserve_percent`, validation, unit: '%', zoneId: zone.id, layerId: layer.id })}
      ${inputField({ id: fieldId('package', layer.id), label: 'Объём упаковки', value: layer.packageL, action: 'layer-field', field: 'packageL', focusKey: `package-${layer.id}`, path: `${prefix}.package_l`, validation, unit: 'л', optional: true, hint: 'Оставьте пустым для покупки россыпью.', zoneId: zone.id, layerId: layer.id })}
      ${inputField({ id: fieldId('density', layer.id), label: 'Плотность', value: layer.density, action: 'layer-field', field: 'density', focusKey: `density-${layer.id}`, path: `${prefix}.density_kg_m3`, validation, unit: 'кг/м³', optional: true, hint: 'Не подставляем плотность по названию.', zoneId: zone.id, layerId: layer.id })}
    </div>
    <div class="layer-readout" aria-live="polite">
      <span>Расчёт слоя</span>
      <strong>${detail ? `${formatUnit(detail.net_l, 'л')} чистого → ${formatUnit(detail.purchase_l, 'л')} с запасом` : 'Заполните поля, чтобы увидеть объём'}</strong>
    </div>
    </div>
  </fieldset>`;
}

function renderLayerVisual(diagram: LayerDiagram | null): string {
  if (!diagram) return '';
  return `<figure class="layer-visual" data-testid="layer-visual" aria-labelledby="layer-visual-title">
    <div class="layer-visual-heading">
      <div><strong id="layer-visual-title">Разрез материалов</strong><span>Пропорции по толщине · всего ${formatUnit(diagram.totalThicknessCm, 'см')}</span></div>
      <span class="layer-visual-measure" aria-hidden="true">↕</span>
    </div>
    <div class="layer-visual-body">
      <div class="layer-visual-stack" aria-hidden="true">
        ${diagram.layers.map(layer => `<span class="layer-slice layer-slice-${escapeHtml(layer.material)}" data-thickness-cm="${escapeHtml(layer.thicknessCm)}" style="flex-grow:${layer.thicknessCm}"></span>`).join('')}
      </div>
      <ol class="layer-visual-legend">
        ${diagram.layers.map(layer => `<li><span class="layer-legend-swatch material-${escapeHtml(layer.material)}" aria-hidden="true"></span><span class="layer-legend-name">${escapeHtml(layer.label)}</span><strong>${formatUnit(layer.thicknessCm, 'см')}</strong></li>`).join('')}
      </ol>
    </div>
    <figcaption>Слои показаны сверху вниз в порядке списка. Это не схема расположения зон и не строительная норма.</figcaption>
  </figure>`;
}

function renderZone(state: AppState, zone: ZoneDraft, zoneIndex: number, validation: DraftValidation, view: ViewState): string {
  const prefix = `zones[${zoneIndex}]`;
  const detail = zoneDetail(validation, zone.id);
  const diagram = validation.result?.ok ? buildLayerDiagram(state, zone) : null;
  const expanded = view.openZoneId === zone.id;
  return `<article class="zone-card" data-testid="zone-card" data-zone-id="${escapeHtml(zone.id)}">
    <header class="zone-header">
      <button type="button" class="zone-toggle" data-action="toggle-zone" data-zone-id="${escapeHtml(zone.id)}" data-focus-key="toggle-zone-${escapeHtml(zone.id)}" aria-controls="zone-editor-${escapeHtml(zone.id)}" aria-expanded="${expanded}">
        <span class="zone-number">${String(zoneIndex + 1).padStart(2, '0')}</span>
        <span class="zone-toggle-title"><strong>${escapeHtml(zone.name || 'Без названия')}</strong><small>${escapeHtml(zone.length || '—')} × ${escapeHtml(zone.width || '—')} м · ${zone.layers.length} сл.</small></span>
        <span class="zone-toggle-area">${detail ? formatUnit(detail.area_m2, 'м²') : '—'}</span>
        <span class="zone-chevron" aria-hidden="true">${expanded ? '⌃' : '⌄'}</span>
      </button>
      <button type="button" class="button button-text danger" data-action="remove-zone" data-zone-id="${escapeHtml(zone.id)}">Удалить</button>
    </header>
    <div class="zone-edit" id="zone-editor-${escapeHtml(zone.id)}"${expanded ? '' : ' hidden'}>
    <div class="zone-dimensions-label eyebrow">РАЗМЕРЫ ЗОНЫ</div><div class="field-grid three-columns">
      <div class="field field-wide">
        <label for="zone-name-${escapeHtml(zone.id)}">Название зоны</label>
        <input id="zone-name-${escapeHtml(zone.id)}" data-action="zone-field" data-zone-id="${escapeHtml(zone.id)}" data-field="name" data-focus-key="zone-name-${escapeHtml(zone.id)}" value="${escapeHtml(zone.name)}" type="text" maxlength="80" autocomplete="off" />
      </div>
      ${inputField({ id: `zone-length-${zone.id}`, label: 'Длина', value: zone.length, action: 'zone-field', field: 'length', focusKey: `zone-length-${zone.id}`, path: `${prefix}.length_m`, validation, unit: 'м', zoneId: zone.id })}
      ${inputField({ id: `zone-width-${zone.id}`, label: 'Ширина', value: zone.width, action: 'zone-field', field: 'width', focusKey: `zone-width-${zone.id}`, path: `${prefix}.width_m`, validation, unit: 'м', zoneId: zone.id })}
    </div>
    <div class="zone-area"><span>Площадь зоны</span><strong>${detail ? formatUnit(detail.area_m2, 'м²') : '—'}</strong></div>
    <div class="layers-heading"><div><span class="eyebrow">СЛОИ И МАТЕРИАЛЫ</span><p>Каждый вариант и его фракция считаются отдельно.</p></div><button type="button" class="button button-secondary" data-action="add-layer" data-zone-id="${escapeHtml(zone.id)}">Добавить слой</button></div>
    ${zone.layers.length === 0 ? '<div class="empty-inline">В этой зоне пока нет слоёв. Добавьте грунт, песок или щебень.</div>' : zone.layers.map((layer, layerIndex) => renderLayer(state, zone, layer, layerIndex, zoneIndex, validation, view)).join('')}
    ${renderLayerVisual(diagram)}
    </div>
  </article>`;
}

function renderBomRow(row: BomRow, openBomKeys?: ReadonlySet<string>): string {
  const key = [row.material_spec_id, row.material, row.package_l ?? '', row.density_kg_m3 ?? ''].join('|');
  const packed = row.package_l === null ? 'Россыпью / по объёму' : `${formatRuNumber(row.packages ?? 0)} уп. × ${formatUnit(row.package_l, 'л')}`;
  const purchased = row.packed_volume_l === null ? '—' : formatUnit(row.packed_volume_l, 'л');
  const surplus = row.surplus_l === null ? '—' : formatUnit(row.surplus_l, 'л');
  return `<article class="bom-row" data-testid="bom-row">
    <div class="bom-title"><span class="material-swatch material-${escapeHtml(row.material)}" aria-hidden="true"></span><div><span class="eyebrow">${escapeHtml(MATERIAL_LABELS[row.material])}</span><h3>${escapeHtml(row.material_spec_label)}</h3><small class="spec-id">${escapeHtml(row.material_spec_id)}</small></div></div>
    <div class="bom-values" role="group" aria-label="Количество материала">
      <div><span>Нужно с запасом</span><strong>${formatUnit(row.purchase_l, 'л')}</strong></div>
      <div class="bom-buy"><span>Купить</span><strong>${packed}</strong></div>
      <div><span>Излишек</span><strong>${surplus}</strong></div>
    </div>
    <details class="bom-details" data-bom-key="${escapeHtml(key)}"${openBomKeys?.has(key) ? ' open' : ''}>
      <summary>Показать расчёт и массу</summary>
      <dl class="metric-grid">
        <div><dt>Чистый объём</dt><dd>${formatUnit(row.net_l, 'л')}</dd></div>
        <div><dt>Куплено фактически</dt><dd>${purchased}</dd></div>
        <div><dt>Масса</dt><dd>${row.mass_required_kg === null ? 'Плотность не указана' : `${formatUnit(row.mass_required_kg, 'кг')} требуется / ${formatUnit(row.mass_purchased_kg, 'кг')} закуплено`}</dd></div>
      </dl>
    </details>
  </article>`;
}

function renderZoneBreakdown(state: AppState, value: DetailedCalculated): string {
  return `<section class="breakdown" aria-labelledby="breakdown-title"><div class="section-title"><span class="eyebrow">ПРОВЕРКА РАСЧЁТА</span><h2 id="breakdown-title">Расшифровка по зонам</h2></div>
    ${value.zones.map(zone => {
      const draft = state.zones.find(item => item.id === zone.id);
      return `<div class="breakdown-zone"><div class="breakdown-zone-title"><strong>${escapeHtml(draft?.name || 'Без названия')}</strong><span>${formatUnit(zone.area_m2, 'м²')}</span></div>${zone.layers.length === 0 ? '<p class="muted">Слоёв пока нет.</p>' : `<ul>${zone.layers.map(layer => `<li><span>${escapeHtml(layer.material_spec_label)}</span><span>${formatUnit(layer.net_l, 'л')} чистого · ${formatUnit(layer.purchase_l, 'л')} с запасом</span></li>`).join('')}</ul>`}</div>`;
    }).join('')}
  </section>`;
}

function renderResults(state: AppState, validation: DraftValidation, view: ViewState): string {
  if (!validation.valid || !validation.result?.ok) {
    const hasDraftInput = state.plot.length.trim() !== '' || state.plot.width.trim() !== '' || state.zones.length > 0;
    if (!hasDraftInput) return `<aside class="results-column" id="result"><section class="panel result-empty"><span class="eyebrow">РЕЗУЛЬТАТ</span><h2>Ведомость появится здесь</h2><p>Укажите размеры, добавьте зону и слой материала. Результат обновится автоматически.</p></section></aside>`;
    const error = validation.errors[0];
    return `<aside class="results-column" id="result"><section class="panel result-blocked" data-testid="blocked-results" aria-live="assertive"><span class="eyebrow">РЕЗУЛЬТАТ ЗАБЛОКИРОВАН</span><h2>Сначала исправьте ввод</h2><p id="error-summary">Исправьте ошибки, чтобы получить итоговую ведомость. Частичный расчёт не показываем как готовую закупку.</p>${error ? `<p class="error-detail">${escapeHtml(error.message)} <code>${escapeHtml(error.path)}</code></p>` : ''}</section></aside>`;
  }
  const value = validation.result.value;
  const sotki = decimalDivide(value.plot_area_m2, '100');
  const totalPurchase = value.bom.reduce((sum, row) => sum.add(Exact.decimal(row.purchase_l)), new Exact(0n)).toString();
  const totalPackages = sumWholePackages(value.bom.map(row => row.packages));
  return `<aside class="results-column" id="result" data-testid="result-panel"><section class="panel result-panel">
    <div class="result-heading"><div><span class="eyebrow">ВАШ РАСЧЁТ</span><h2>Ведомость закупки</h2></div><span class="live-dot">Обновляется</span></div>
    <div class="result-lead"><div><span>Всего нужно с запасом</span><strong>${formatUnit(totalPurchase, 'л')}</strong></div>${totalPackages !== null ? `<div class="total-packages"><span>Упаковок</span><strong>${formatRuNumber(totalPackages)} уп.</strong></div>` : '<div class="total-packages"><span>Упаковки</span><strong>По материалам</strong></div>'}</div>
    <div class="area-summary"><div><span>Участок</span><strong>${formatUnit(value.plot_area_m2, 'м²')}</strong></div><div><span>Сотки</span><strong>${formatUnit(sotki, 'сотки')}</strong></div><div><span>Зоны</span><strong>${state.zones.length}</strong></div></div>
    ${value.areas_exceed_plot ? '<div class="warning" role="status"><strong>Проверьте площадь</strong><span>Сумма площадей зон больше участка. Мы не вычитаем и не размещаем зоны автоматически.</span></div>' : ''}
    <div class="result-list"><div class="section-title"><span class="eyebrow">МАТЕРИАЛЫ</span><h3>Что купить</h3></div>${value.bom.length === 0 ? '<div class="empty-inline">Добавьте хотя бы один слой, чтобы получить строку закупки.</div>' : value.bom.map(row => renderBomRow(row, view.openBomKeys)).join('')}</div>
    ${renderZoneBreakdown(state, value)}
  </section></aside>`;
}

export function renderAppHtml(state: AppState, validation: DraftValidation, view: ViewState = { openZoneId: state.zones[0]?.id ?? null, openLayerIds: new Set(state.zones.flatMap(zone => zone.layers.map(layer => layer.id))) }): string {
  return `<div class="app-shell">
    <header class="site-header">
      <a class="brand" href="#top" aria-label="Дачаметр, к началу"><span class="brand-mark" aria-hidden="true"><svg class="brand-geometry" viewBox="0 0 40 40" focusable="false">
            <rect x="5" y="5" width="30" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/>
            <path d="M18 5V35M18 19H35" fill="none" stroke="currentColor" stroke-width="2" opacity=".85"/>
            <rect x="22" y="23" width="9" height="8" rx="1" class="brand-geometry-accent"/>
          </svg></span><span><h1>Дачаметр</h1><small>расчёт участка и закупки</small></span></a>
      <div class="session-note"><span class="status-dot"></span><span>Локальный расчёт</span><button type="button" class="button button-text" data-action="reset">Сбросить</button></div>
    </header>
    <main id="top">
      <section class="intro" aria-labelledby="intro-title">
        <div><span class="eyebrow">КАЛЬКУЛЯТОР МАТЕРИАЛОВ</span><h2 id="intro-title">Рассчитайте материалы <em>для участка</em></h2><p>Грунт, песок и щебень — от размеров ваших зон до точной закупки.</p></div>
        <a class="jump-result" href="#result">К ведомости <span aria-hidden="true">↓</span></a>
      </section>
      <div class="workspace"><section class="editor-column"><form class="calculator-form" novalidate>
        <section class="panel plot-section">
          <div class="section-title"><span class="eyebrow">УЧАСТОК</span><h2>Размеры участка</h2></div>
          <div class="field-grid two-columns">
            ${inputField({ id: 'plot-length', label: 'Длина участка', value: state.plot.length, action: 'plot-field', field: 'length', focusKey: 'plot-length', path: 'plot.length_m', validation, unit: 'м' })}
            ${inputField({ id: 'plot-width', label: 'Ширина участка', value: state.plot.width, action: 'plot-field', field: 'width', focusKey: 'plot-width', path: 'plot.width_m', validation, unit: 'м' })}
          </div>
          <div class="plot-readout"><span>Площадь участка</span><strong>${validation.result?.ok ? formatUnit(validation.result.value.plot_area_m2, 'м²') : '—'}</strong><span>${validation.result?.ok ? `≈ ${formatUnit(decimalDivide(validation.result.value.plot_area_m2, '100'), 'сотки')}` : 'Введите оба размера'}</span></div>
        </section>
        <section class="zone-section">
          <div class="section-title zones-title"><div><span class="eyebrow">ЗОНЫ</span><h2>Зоны <span class="count-badge">${state.zones.length}</span></h2><p>Грядки, дорожки и другие прямоугольные области.</p></div><button type="button" class="button button-primary" data-action="add-zone" data-testid="add-zone">+ Добавить зону</button></div>
          ${state.zones.length === 0 ? '<div class="empty-zones"><div><h3>Начните с первой зоны</h3><p>Назовите её, задайте размеры и добавьте слой грунта, песка или щебня.</p></div><button type="button" class="button button-secondary" data-action="add-zone">Добавить первую зону</button></div>' : state.zones.map((zone, index) => renderZone(state, zone, index, validation, view)).join('')}
        </section>
      </form></section>${renderResults(state, validation, view)}</div>
    </main>
    <footer class="site-footer"><span>Площадь × толщина = объём слоя. Запас и плотность указываете сами.</span><span>Нет сохранения после перезагрузки · нет внешних запросов</span></footer>
  </div>`;
}

interface FocusSnapshot {
  key: string | null;
  start: number | null;
  end: number | null;
}

function captureFocus(root: HTMLElement): FocusSnapshot {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return { key: null, start: null, end: null };
  const key = active.dataset.focusKey ?? null;
  const input = active instanceof HTMLInputElement ? active : null;
  return { key, start: input?.selectionStart ?? null, end: input?.selectionEnd ?? null };
}

function restoreFocus(root: HTMLElement, snapshot: FocusSnapshot): void {
  if (!snapshot.key) return;
  const target = Array.from(root.querySelectorAll<HTMLElement>('[data-focus-key]')).find(item => item.dataset.focusKey === snapshot.key);
  if (!target) return;
  target.focus();
  if (target instanceof HTMLInputElement && snapshot.start !== null && snapshot.end !== null) target.setSelectionRange(snapshot.start, snapshot.end);
}

export function mountApp(root: HTMLElement): void {
  let state = createInitialState();
  let openZoneId: string | null = null;
  const openLayerIds = new Set<string>();
  const openBomKeys = new Set<string>();
  const render = (focus?: FocusSnapshot) => {
    // Read native details state before replacing DOM, including across transient
    // invalid inputs where BOM is intentionally hidden by fail-closed validation.
    for (const details of Array.from(root.querySelectorAll<HTMLDetailsElement>('details.bom-details[data-bom-key]'))) {
      const key = details.dataset.bomKey;
      if (!key) continue;
      if (details.open) openBomKeys.add(key);
      else openBomKeys.delete(key);
    }
    root.innerHTML = renderAppHtml(state, validateDraft(state), { openZoneId, openLayerIds, openBomKeys });
    if (focus) restoreFocus(root, focus);
  };
  const update = (next: AppState, preserveFocus = true) => {
    const focus = preserveFocus ? captureFocus(root) : undefined;
    state = next;
    render(focus);
  };

  root.addEventListener('input', event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const action = target.dataset.action;
    const value = target.value;
    if (action === 'plot-field' && (target.dataset.field === 'length' || target.dataset.field === 'width')) update(updatePlotField(state, target.dataset.field, value));
    if (action === 'zone-field' && target.dataset.zoneId && (target.dataset.field === 'name' || target.dataset.field === 'length' || target.dataset.field === 'width')) update(updateZoneField(state, target.dataset.zoneId, target.dataset.field, value));
    if (action === 'layer-field' && target.dataset.zoneId && target.dataset.layerId && ['thickness', 'reserve', 'packageL', 'density'].includes(target.dataset.field ?? '')) update(updateLayerField(state, target.dataset.zoneId, target.dataset.layerId, target.dataset.field as 'thickness' | 'reserve' | 'packageL' | 'density', value));
    if (action === 'material-field' && target.dataset.materialId && (target.dataset.field === 'label')) update(updateMaterialSpec(state, target.dataset.materialId, 'label', value));
  });

  root.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const action = target.dataset.action;
    if (action === 'material-field' && target.dataset.materialId && target.dataset.field === 'material') update(updateMaterialSpec(state, target.dataset.materialId, 'material', target.value));
    if (action === 'link-material' && target.dataset.zoneId && target.dataset.layerId) {
      const next = target.value === '__new__' ? linkLayerToNewMaterial(state, target.dataset.zoneId, target.dataset.layerId) : updateLayerField(state, target.dataset.zoneId, target.dataset.layerId, 'materialSpecId', target.value);
      update(next, false);
    }
  });

  root.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest<HTMLElement>('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'toggle-zone' && button.dataset.zoneId) {
      openZoneId = openZoneId === button.dataset.zoneId ? null : button.dataset.zoneId;
      update(state);
    }
    if (action === 'toggle-layer' && button.dataset.layerId) {
      if (openLayerIds.has(button.dataset.layerId)) openLayerIds.delete(button.dataset.layerId);
      else {
        openLayerIds.clear();
        openLayerIds.add(button.dataset.layerId);
      }
      update(state);
    }
    if (action === 'add-zone') {
      const next = addZone(state);
      openZoneId = next.zones.at(-1)?.id ?? null;
      update(next, false);
    }
    if (action === 'remove-zone' && button.dataset.zoneId) {
      const next = removeZone(state, button.dataset.zoneId);
      if (openZoneId === button.dataset.zoneId) openZoneId = next.zones[0]?.id ?? null;
      update(next, false);
    }
    if (action === 'add-layer' && button.dataset.zoneId) {
      const next = addLayer(state, button.dataset.zoneId);
      const newLayer = next.zones.find(z => z.id === button.dataset.zoneId)?.layers.at(-1);
      if (newLayer) {
        openLayerIds.clear();
        openLayerIds.add(newLayer.id);
      }
      openZoneId = button.dataset.zoneId;
      update(next, false);
    }
    if (action === 'remove-layer' && button.dataset.zoneId && button.dataset.layerId) {
      openLayerIds.delete(button.dataset.layerId);
      update(removeLayer(state, button.dataset.zoneId, button.dataset.layerId), false);
    }
    if (action === 'reset') {
      if (state.zones.length === 0 || window.confirm('Сбросить введённые размеры, зоны и материалы?')) {
        openZoneId = null;
        openLayerIds.clear();
        update(createInitialState(), false);
        // The render snapshots the old DOM before replacing it; clear after reset.
        openBomKeys.clear();
      }
    }
  });

  render();
}
