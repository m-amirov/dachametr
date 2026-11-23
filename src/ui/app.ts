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
import { formatBomForClipboard } from './bom-export.ts';
import { BOM_CSV_FILENAME, BOM_CSV_MIME, formatBomCsv } from './bom-csv.ts';
import { decodeSharedCalculation, encodeSharedCalculation, isSharedCalculationHash } from './share.ts';
import { validateDraft, type DraftValidation } from './validation.ts';

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

interface ViewState {
  openZoneId: string | null;
  openLayerIds: ReadonlySet<string>;
  openBomKeys?: ReadonlySet<string>;
  mobileSurface?: 'zones' | 'editor' | 'bom';
  shareNotice?: string | undefined;
  shareProblem?: boolean;
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
  const materialLabelError = draftError(validation, `${prefix}.material_spec_label`);
  const materialLabelErrorId = `error-label-${layer.id}`;
  return `<section class="layer-card" data-testid="layer-card" data-layer-id="${escapeHtml(layer.id)}" role="group" aria-label="Слой ${layerIndex + 1}">
    <div class="layer-summary">
      <span class="layer-number">${String(layerIndex + 1).padStart(2, '0')}</span>
      <span class="material-swatch material-${escapeHtml(spec.material)}" aria-hidden="true"></span>
      <div class="layer-summary-copy"><strong>${escapeHtml(spec.label || MATERIAL_LABELS[spec.material])}</strong><span>${escapeHtml(MATERIAL_LABELS[spec.material])} · ${layer.thickness ? escapeHtml(layer.thickness) + ' см' : 'укажите толщину'}${detail ? ' · ' + formatUnit(detail.purchase_l, 'л') + ' с запасом' : ''}</span></div>
      <button type="button" class="button button-secondary layer-toggle" data-action="toggle-layer" data-zone-id="${escapeHtml(zone.id)}" data-layer-id="${escapeHtml(layer.id)}" data-focus-key="toggle-layer-${escapeHtml(layer.id)}" aria-controls="${escapeHtml(editId)}" aria-expanded="${expanded}">${expanded ? 'Скрыть' : 'Настроить'}</button>
      <button type="button" class="layer-remove" data-action="remove-layer" data-zone-id="${escapeHtml(zone.id)}" data-layer-id="${escapeHtml(layer.id)}" aria-label="Удалить слой ${layerIndex + 1}" title="Удалить слой">×</button>
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
        <input id="label-${escapeHtml(layer.id)}" data-action="material-field" data-field="label" data-material-id="${escapeHtml(spec.id)}" data-focus-key="label-${escapeHtml(layer.id)}" value="${escapeHtml(spec.label)}" type="text" autocomplete="off" maxlength="80" aria-invalid="${materialLabelError ? 'true' : 'false'}"${materialLabelError ? ` aria-describedby="${escapeHtml(materialLabelErrorId)}"` : ''} />
        ${materialLabelError ? `<p class="field-error" id="${escapeHtml(materialLabelErrorId)}">${escapeHtml(materialLabelError)}</p>` : ''}
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
  </section>`;
}

function renderZone(state: AppState, zone: ZoneDraft, zoneIndex: number, validation: DraftValidation, view: ViewState): string {
  const prefix = `zones[${zoneIndex}]`;
  const detail = zoneDetail(validation, zone.id);
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
    <div class="zone-diagrams">${expanded ? renderZoneFigure(state, zone, validation) : ''}</div>
    <div class="layers-heading"><div><span class="step-label">Материалы</span><h3>Слои и материалы</h3><p>Разные варианты считаются отдельно, даже если названы одинаково.</p></div><button type="button" class="button button-secondary" data-action="add-layer" data-zone-id="${escapeHtml(zone.id)}" data-focus-key="add-layer-${escapeHtml(zone.id)}">Добавить слой</button></div>
    ${zone.layers.length === 0 ? '<div class="empty-inline">В этой зоне пока нет слоёв. Добавьте грунт, песок или щебень.</div>' : zone.layers.map((layer, layerIndex) => renderLayer(state, zone, layer, layerIndex, zoneIndex, validation, view)).join('')}
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
  return `<section class="breakdown" aria-labelledby="breakdown-title"><div class="section-title"><span class="step-label">Проверка количества</span><h2 id="breakdown-title">Расшифровка по зонам</h2></div>
    ${value.zones.map(zone => {
      const draft = state.zones.find(item => item.id === zone.id);
      return `<div class="breakdown-zone"><div class="breakdown-zone-title"><strong>${escapeHtml(draft?.name || 'Без названия')}</strong><span>${formatUnit(zone.area_m2, 'м²')}</span></div>${zone.layers.length === 0 ? '<p class="muted">Слоёв пока нет.</p>' : `<ul>${zone.layers.map(layer => `<li><span>${escapeHtml(layer.material_spec_label)}</span><span>${formatUnit(layer.net_l, 'л')} чистого · ${formatUnit(layer.purchase_l, 'л')} с запасом</span></li>`).join('')}</ul>`}</div>`;
    }).join('')}
  </section>`;
}

function renderResults(state: AppState, validation: DraftValidation, view: ViewState): string {
  if (!validation.valid || !validation.result?.ok) {
    const hasDraftInput = state.plot.length.trim() !== '' || state.plot.width.trim() !== '' || state.zones.length > 0;
    if (!hasDraftInput) return `<aside class="results-column" id="result" tabindex="-1" aria-label="Ведомость закупки"><section class="panel result-empty bom-surface"><span class="eyebrow">РЕЗУЛЬТАТ</span><h2>Ведомость появится здесь</h2><p>Укажите размеры, добавьте зону и слой материала. Результат обновится автоматически.</p></section></aside>`;
    const error = validation.errors[0];
    return `<aside class="results-column" id="result" tabindex="-1" aria-label="Ведомость закупки"><section class="panel result-blocked bom-surface" data-testid="blocked-results" aria-live="assertive"><span class="eyebrow">РЕЗУЛЬТАТ ЗАБЛОКИРОВАН</span><h2>Сначала исправьте ввод</h2><p id="error-summary">Исправьте ошибки, чтобы получить итоговую ведомость. Частичный расчёт не показываем как готовую закупку.</p>${error ? `<p class="error-detail">${escapeHtml(error.message)} <code>${escapeHtml(error.path)}</code></p>` : ''}</section></aside>`;
  }
  const value = validation.result.value;
  const sotki = decimalDivide(value.plot_area_m2, '100');
  const totalPurchase = value.bom.reduce((sum, row) => sum.add(Exact.decimal(row.purchase_l)), new Exact(0n)).toString();
  const totalPackages = sumWholePackages(value.bom.map(row => row.packages));
  return `<aside class="results-column" id="result" tabindex="-1" aria-label="Ведомость закупки" data-testid="result-panel"><section class="panel result-panel bom-surface">
    <div class="result-heading"><div><span class="step-label">Результат</span><h2>Ведомость закупки</h2></div><div class="result-heading-actions"><span class="live-dot">Пересчитывается при изменениях</span><button type="button" class="quiet-button" data-action="share-calculation">Скопировать ссылку</button>${value.bom.length ? '<button type="button" class="quiet-button copy-bom-button" data-action="copy-bom">Копировать ведомость</button><button type="button" class="quiet-button copy-bom-button" data-action="download-bom-csv">Скачать CSV</button>' : ''}</div></div>
    <p class="share-link-hint">Ссылка содержит введённые названия зон и материалов. Не указывайте личные данные.</p>
    <p class="share-link-status" data-testid="share-link-status" role="status" aria-live="polite"></p>
    ${value.bom.length ? '<p class="copy-bom-status" data-testid="copy-bom-status" role="status" aria-live="polite"></p><p class="csv-bom-status" data-testid="csv-bom-status" role="status" aria-live="polite"></p>' : ''}
    <div class="result-lead"><div><span>Всего нужно с запасом</span><strong>${formatUnit(totalPurchase, 'л')}</strong></div>${totalPackages !== null ? `<div class="total-packages"><span>Упаковок</span><strong>${formatRuNumber(totalPackages)} уп.</strong></div>` : '<div class="total-packages"><span>Упаковки</span><strong>По материалам</strong></div>'}</div>
    <div class="area-summary"><div><span>Участок</span><strong>${formatUnit(value.plot_area_m2, 'м²')}</strong></div><div><span>Сотки</span><strong>${formatUnit(sotki, 'сотки')}</strong></div><div><span>Зоны</span><strong>${state.zones.length}</strong></div></div>
    ${value.areas_exceed_plot ? '<div class="warning" role="status"><strong>Проверьте площадь</strong><span>Сумма площадей зон больше участка. Мы не вычитаем и не размещаем зоны автоматически.</span></div>' : ''}
    <div class="result-list"><div class="section-title"><span class="step-label">Точный список</span><h3>Что понадобится</h3></div>${value.bom.length === 0 ? '<div class="empty-inline">Добавьте хотя бы один слой, чтобы получить строку закупки.</div>' : value.bom.map(row => renderBomRow(row, view.openBomKeys)).join('')}</div>
    ${renderZoneBreakdown(state, value)}
  </section></aside>`;
}


function renderSiteOverview(state: AppState, validation: DraftValidation): string {
  const area = validation.result?.ok ? validation.result.value.plot_area_m2 : null;
  return `<section class="site-overview" aria-labelledby="site-heading">
    <div class="site-overview-heading"><span class="step-label">Исходные данные</span><h2 id="site-heading">Ваш участок</h2><p>Задайте размеры участка. Затем добавьте зоны, слои и материалы — итоговая ведомость появится автоматически.</p></div>
    <div class="site-overview-fields" aria-label="Размеры участка">
      ${inputField({id:'plot-length',label:'Длина',value:state.plot.length,action:'plot-field',field:'length',focusKey:'plot-length',path:'plot.length_m',validation,unit:'м'})}
      ${inputField({id:'plot-width',label:'Ширина',value:state.plot.width,action:'plot-field',field:'width',focusKey:'plot-width',path:'plot.width_m',validation,unit:'м'})}
    </div>
    <div class="site-overview-area" aria-live="polite"><span>Площадь участка</span><strong>${area === null ? '—' : formatUnit(area,'м²')}</strong><small>Условная прямоугольная форма</small></div>
  </section>`;
}

function renderProjectStructure(state: AppState, validation: DraftValidation, view: ViewState): string {
  const activeId = view.openZoneId ?? state.zones[0]?.id;
  return `<aside class="structure-panel" data-testid="structure-panel" aria-label="Зоны участка">
    <div class="structure-heading"><span class="step-label">Структура</span><h2>Зоны участка <span class="list-count">${state.zones.length}</span></h2><p>Разделите участок на грядки, дорожки и другие зоны с собственными слоями.</p></div>
    <nav class="zone-list" aria-label="Зоны участка">
      ${state.zones.length === 0 ? '<p class="zone-list-empty">Пока нет зон. Добавьте первую, чтобы начать расчёт.</p>' : ''}
      ${state.zones.map((zone,index)=>{
        const detail=zoneDetail(validation,zone.id);
        const selected=zone.id===activeId;
        return `<button type="button" class="zone-row${selected?' is-selected':''}" data-action="select-zone" data-zone-id="${escapeHtml(zone.id)}" data-focus-key="select-zone-${escapeHtml(zone.id)}" aria-current="${selected?'true':'false'}" aria-label="Выбрать зону ${escapeHtml(zone.name)}"><span class="zone-index">${String(index+1).padStart(2,'0')}</span><span class="zone-row-copy"><strong>${escapeHtml(zone.name||'Без названия')}</strong><small>${escapeHtml(zone.length||'—')} × ${escapeHtml(zone.width||'—')} м</small></span><span class="zone-row-metric"><strong>${detail?formatUnit(detail.area_m2,'м²'):'—'}</strong><small>${zone.layers.length} сл.</small></span><span class="row-chevron" aria-hidden="true">›</span></button>`;
      }).join('')}
    </nav>
    <button type="button" class="add-zone-button" data-action="add-zone" data-testid="add-zone"><span aria-hidden="true">＋</span> Добавить зону</button>
    <p class="structure-footer">Зоны рассчитываются отдельно. Это не карта их расположения.</p>
  </aside>`;
}

function renderMobileTabs(active: 'zones' | 'editor' | 'bom'): string {
  return `<nav class="mobile-tabs" aria-label="Разделы калькулятора">
    ${([['zones','Зоны'],['editor','Редактор'],['bom','Ведомость']] as const).map(([key,label])=>
      `<button type="button" data-action="mobile-tab" data-target="${key}" data-focus-key="mobile-tab-${key}" class="mobile-tab${active===key?' is-active':''}" aria-current="${active===key?'page':'false'}">${label}</button>`
    ).join('')}
  </nav>`;
}

type TerrainLayer = { id: string; name: string; kind: MaterialKind; visual: number; thickness: string };

function renderMaterialCutaway(zone: ZoneDraft, layers: ReadonlyArray<TerrainLayer>): string {
  const prefix = 'section-' + zone.id.replace(/[^a-zA-Z0-9_-]/g, '-');
  const palette: Record<MaterialKind, { face: string; side: string; top: string; edge: string }> = {
    soil: { face: '#987052', side: '#714933', top: '#c6a181', edge: '#684832' },
    sand: { face: '#e1bd76', side: '#b58f4e', top: '#f0dbad', edge: '#947138' },
    gravel: { face: '#9caaa8', side: '#778a88', top: '#c5d0ce', edge: '#536963' },
  };
  if (layers.length === 0) {
    return `<div class="cutaway-art cutaway-art-empty" data-testid="material-cutaway">
      <svg viewBox="0 0 380 260" role="img" aria-label="Добавьте материал, чтобы увидеть разрез" preserveAspectRatio="xMidYMid meet">
        <rect width="380" height="260" fill="#eef2ec"/>
        <path d="M53 101 242 101 310 59 121 59Z" fill="#f5f8f2" stroke="#91aa9d" stroke-width="1.5" stroke-dasharray="6 5"/>
        <path d="M53 101V168H242V101M242 168L310 126V59" fill="none" stroke="#91aa9d" stroke-width="1.5" stroke-dasharray="6 5"/>
        <path d="M53 168 121 126 310 126" fill="none" stroke="#bfcec5" stroke-dasharray="5 5"/>
        <circle cx="180" cy="121" r="22" fill="#f6f9f3" stroke="#bfd0c2"/><path d="M180 109V133M168 121H192" stroke="#4f7d67" stroke-width="2" stroke-linecap="round"/>
        <text x="190" y="215" text-anchor="middle" font-size="12" fill="#577567">Здесь появится разрез ваших материалов</text>
      </svg></div>`;
  }

  const max = Math.max(...layers.map(layer => layer.visual));
  const weights = layers.map(layer => layer.visual / max);
  const weightTotal = weights.reduce((sum, n) => sum + n, 0);
  if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(weightTotal) || weightTotal <= 0) return '';
  const scale = 126 / weightTotal;
  let y = 88;
  const strata = [...layers].reverse().map((layer, index) => {
    const from = y;
    y += (layer.visual / max) * scale;
    const to = y;
    const paletteEntry = palette[layer.kind];
    const front = `M53 ${from}H242V${to}H53Z`;
    const side = `M242 ${from}L310 ${from - 43}V${to - 43}L242 ${to}Z`;
    return `<g data-material-kind="${layer.kind}" data-stratum="${index}">
      <path d="${side}" fill="${paletteEntry.side}" stroke="${paletteEntry.edge}" stroke-width=".75"/>
      <path d="${front}" fill="${paletteEntry.face}" stroke="${paletteEntry.edge}" stroke-width=".75"/>
      <path d="${front}" fill="url(#${prefix}-${layer.kind})" opacity=".75"/>
      <path d="${side}" fill="url(#${prefix}-${layer.kind})" opacity=".44"/>
      <path d="M53 ${to}H242" stroke="${paletteEntry.edge}" stroke-opacity=".6" stroke-width="1"/>
    </g>`;
  }).join('');
  const topLayer = layers[layers.length - 1]!;
  const top = palette[topLayer.kind];
  return `<div class="cutaway-art" data-testid="material-cutaway">
    <svg viewBox="0 0 380 270" class="cutaway-svg" preserveAspectRatio="xMidYMid meet"
      role="img" aria-labelledby="${prefix}-title ${prefix}-desc">
      <title id="${prefix}-title">Объёмный разрез материалов зоны ${escapeHtml(zone.name)}</title>
      <desc id="${prefix}-desc">Условная аксонометрия. Высоты слоёв пропорциональны введённым толщинам, глубина рисунка не в масштабе. Настройка слоёв расположена под рисунком.</desc>
      <defs>
        <pattern id="${prefix}-soil" width="21" height="19" patternUnits="userSpaceOnUse">
          <path d="m1 5 6 2m8 4 5-3M4 16l4-2" fill="none" stroke="#f4d6b5" stroke-width=".9" stroke-opacity=".7"/>
          <circle cx="13" cy="4" r="1.5" fill="#38291f" opacity=".55"/><circle cx="18" cy="16" r="1" fill="#ffe7c8" opacity=".85"/>
        </pattern>
        <pattern id="${prefix}-sand" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="1.2" fill="#fff7dc"/><circle cx="11" cy="10" r="1.2" fill="#8c6331" opacity=".6"/>
          <circle cx="5" cy="14" r=".6" fill="#fef4d4"/><circle cx="14" cy="2" r=".7" fill="#9f7a42"/>
        </pattern>
        <pattern id="${prefix}-gravel" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="m2 4 5-3 4 5-4 5-6-2Zm12 10 6-3 4 6-4 5-6-2Z" fill="#e9f0ec" stroke="#536c67" stroke-width=".9" opacity=".8"/>
          <path d="m6 20 3-3 4 5-3 2Z" fill="#647f7c" opacity=".8"/>
        </pattern>
        <pattern id="${prefix}-graph" width="23" height="23" patternUnits="userSpaceOnUse">
          <path d="M23 0H0V23" fill="none" stroke="#bfd0c1" stroke-width=".8" opacity=".52"/>
        </pattern>
        <filter id="${prefix}-shadow" x="-30%" y="-40%" width="160%" height="190%"><feGaussianBlur stdDeviation="8"/></filter>
      </defs>
      <rect width="380" height="270" fill="#eef3ec"/>
      <rect width="380" height="270" fill="url(#${prefix}-graph)"/>
      <text x="20" y="25" class="cutaway-sheet-number">РАЗРЕЗ / ${String(layers.length).padStart(2, '0')}</text>
      <text x="360" y="25" text-anchor="end" class="cutaway-sheet-number">УСЛОВНО</text>
      <ellipse cx="185" cy="238" rx="137" ry="15" fill="#244d36" opacity=".16" filter="url(#${prefix}-shadow)"/>
      ${strata}
      <path d="M53 88 242 88 310 45 121 45Z" fill="${top.top}" stroke="${top.edge}" stroke-width="1.6"/>
      <path d="M53 88 242 88 310 45 121 45Z" fill="url(#${prefix}-${topLayer.kind})" opacity=".6"/>
      <path d="M66 84 238 84 296 49" fill="none" stroke="#fff8ea" stroke-opacity=".7"/>
      <path d="M53 88V${y}H242L310 ${y - 43}V45" fill="none" stroke="#345647" stroke-width="1.7"/>
      <path d="M53 ${y} 121 ${y - 43} 310 ${y - 43}" fill="none" stroke="#557365" opacity=".6"/>
      <path d="M33 88H47M33 ${y}H47M39 88V${y}" fill="none" stroke="#627a6b" stroke-width="1.1"/>
      <path d="m36 96 3-8 3 8m-6 ${y - 8} 3 8 3-8" fill="none" stroke="#627a6b"/>
      <text x="188" y="258" text-anchor="middle" class="cutaway-footnote">Толщины заданы вами</text>
    </svg>
  </div>`;
}

function renderZoneFigure(state: AppState, zone: ZoneDraft, validation: DraftValidation): string {
  const detail = zoneDetail(validation, zone.id);
  if (!detail) return '<p class="figure-placeholder">Схема размеров появится после корректного заполнения полей. Недостоверные размеры не отображаются.</p>';
  const length = Number(zone.length.replace(',', '.'));
  const width = Number(zone.width.replace(',', '.'));
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return '';
  const ratio = width / length;
  const layers = zone.layers.map(layer => {
    const spec = state.materials.find(item => item.id === layer.materialSpecId);
    const visual = Number(layer.thickness.replace(',', '.'));
    if (!spec || !Number.isFinite(visual) || visual <= 0) return null;
    return { id: layer.id, name: spec.label || MATERIAL_LABELS[spec.material], kind: spec.material, visual, thickness: layer.thickness };
  });
  if (layers.some(layer => !layer)) return '';
  const visibleLayers = layers.filter((layer): layer is TerrainLayer => layer !== null);
  return `<div class="zone-visual-grid" data-testid="zone-visual-grid">
    <figure class="zone-figure">
      <div class="figure-toolbar"><span class="figure-note">План зоны</span><span class="figure-scale">Пропорции по размерам</span></div>
      <div class="figure-canvas">
        <span class="plan-figure-badge" aria-hidden="true">01 / ПЛАН</span>
        <span class="measure-label measure-top">${formatUnit(zone.width,'м')}</span>
        <span class="measure-label measure-side">${formatUnit(zone.length,'м')}</span>
        <div class="zone-rectangle" data-testid="zone-rectangle" data-ratio="${ratio}" style="aspect-ratio:${width}/${length}">
          <strong>${escapeHtml(zone.name)}</strong><span>${formatUnit(detail.area_m2,'м²')}</span>
        </div>
      </div>
      <figcaption>Пропорции выбранной зоны. Без размещения на карте участка.</figcaption>
    </figure>
    <div class="section-figure">
      <div class="figure-toolbar"><span class="figure-note">Объёмный разрез</span><span class="figure-scale">${visibleLayers.length} сл.</span></div>
      ${renderMaterialCutaway(zone, visibleLayers)}
      <div class="section-stack" aria-label="Настройка слоёв по порядку снизу вверх">
        ${visibleLayers.length ? visibleLayers.map((layer, index) => `<button type="button" class="section-layer layer-${escapeHtml(layer.kind)}" data-action="toggle-layer"
          data-layer-id="${escapeHtml(layer.id)}" data-zone-id="${escapeHtml(zone.id)}" data-focus-key="section-layer-${escapeHtml(layer.id)}"
          aria-label="Настроить ${escapeHtml(layer.name)}"><span class="section-layer-index">${String(index + 1).padStart(2, '0')}</span><span class="section-layer-name">${escapeHtml(layer.name)}</span><strong>${escapeHtml(layer.thickness)} см</strong></button>`).join('') : '<p class="section-layers-empty">Добавьте слой для визуализации материалов</p>'}
      </div>
      <p class="section-caption">Пропорции высот основаны на введённых толщинах. Аксонометрия условная, не строительная норма.</p>
    </div>
  </div>`;
}


function renderWorkspaceEditor(state: AppState, validation: DraftValidation, view: ViewState): string {
  const selectedId=view.openZoneId ?? state.zones[0]?.id;
  const selected=state.zones.find(zone=>zone.id===selectedId);
  return `<section class="editor-surface" data-testid="zone-editor" aria-label="Редактор выбранной зоны">
    <div class="editor-toolbar"><div class="breadcrumb"><span>Участок</span><span aria-hidden="true">/</span><strong>${selected?escapeHtml(selected.name):'Новая зона'}</strong></div>
      <div class="editor-actions">${selected ? `<button type="button" class="quiet-button workspace-remove-zone" data-action="remove-zone" data-zone-id="${escapeHtml(selected.id)}">Удалить зону</button>` : ''}<button type="button" class="quiet-button" data-action="reset">Сбросить расчёт</button></div></div>
    ${selected?`<div class="editor-heading"><div><span class="step-label">Выбранная зона</span><h2 tabindex="-1" data-testid="selected-zone-name">${escapeHtml(selected.name||'Без названия')}</h2><p>Задайте размеры и слои. Ведомость пересчитается сразу после изменений.</p></div>
      </div>`:
      '<div class="workspace-empty"><div class="workspace-empty-copy"><span class="step-label">Редактор зоны</span><h2>Начните с зоны</h2><p>Укажите размеры участка и добавьте первую зону. Здесь появятся её параметры, разрез слоёв и точный расчёт.</p><button type="button" class="button button-primary" data-action="add-zone">Добавить зону</button></div><div class="workspace-empty-art" data-testid="empty-zone-sketch" aria-hidden="true">
  <svg viewBox="0 0 430 300" preserveAspectRatio="xMidYMid meet" focusable="false">
    <defs>
      <pattern id="empty-survey-grid" width="21" height="21" patternUnits="userSpaceOnUse">
        <path d="M21 0H0V21" fill="none" stroke="#a2bda9" stroke-width=".65" opacity=".6"/>
      </pattern>
      <pattern id="empty-survey-dots" width="13" height="13" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="4" r="1.1" fill="#94b6a3" opacity=".7"/>
      </pattern>
    </defs>
    <rect x="1" y="1" width="428" height="298" fill="#eef4ed" stroke="#c2d5c5"/>
    <rect x="1" y="1" width="428" height="298" fill="url(#empty-survey-grid)"/>
    <path d="M21 28V15H34M396 15h13v13M409 271v13h-13M34 284H21v-13" fill="none" stroke="#5b8069" stroke-width="1.5"/>
    <text x="27" y="38" fill="#426a55" font-size="11" font-weight="750" letter-spacing="1.5">ЧЕРТЁЖ / ЗОНА</text>
    <text x="402" y="38" text-anchor="end" fill="#6c9076" font-size="10" font-weight="650">НЕ ЗАДАНА</text>
    <ellipse cx="225" cy="254" rx="135" ry="14" fill="#567260" opacity=".13"/>
    <path d="M64 155 258 155 355 99 161 99Z" fill="#dcecdf" stroke="#43815b" stroke-width="1.8"/>
    <path d="M64 155 258 155 355 99 161 99Z" fill="url(#empty-survey-dots)"/>
    <path d="M64 155V211L258 211V155M258 211L355 155V99" fill="#d9e8dc" stroke="#43815b" stroke-width="1.6"/>
    <path d="M64 155V211H258V155" fill="#aacbb2" stroke="#43815b" stroke-width="1.6"/>
    <path d="M258 155 355 99V155L258 211Z" fill="#8fb89c" stroke="#43815b" stroke-width="1.6"/>
    <path d="M64 211 161 155 355 155" fill="none" stroke="#367d54" stroke-opacity=".45" stroke-width="1.5"/>
    <path d="M78 162H249M78 171H249M78 180H249M78 189H249M78 198H249" stroke="#f2fff3" stroke-opacity=".35"/>
    <path d="M64 155 258 155 355 99 161 99Z" fill="none" stroke="#43815b" stroke-width="1.8"/>
    <path d="M84 151 167 105 329 105" fill="none" stroke="#fffef7" stroke-dasharray="5 6"/>
    <circle cx="210" cy="128" r="27" fill="#f9fdf7" stroke="#35784f" stroke-width="1.7"/>
    <path d="M210 115V141M197 128H223" stroke="#35784f" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M52 159H39V211H52M161 90V79H355V90" fill="none" stroke="#729b79" stroke-width="1.2" stroke-dasharray="5 4"/>
    <path d="m34 159 5-7 5 7m-10 52 5 7 5-7M161 74l-7 5 7 5m194-10 7 5-7 5" fill="none" stroke="#729b79" stroke-width="1"/>
    <text x="215" y="274" text-anchor="middle" fill="#4a7659" font-size="10" font-weight="650" letter-spacing="1">ГОТОВО ДЛЯ ПЕРВЫХ РАЗМЕРОВ</text>
  </svg>
</div></div>'}
    <form class="calculator-form" novalidate>
      ${state.zones.map((zone,index)=>`<div class="workspace-zone-wrap"${zone.id===selectedId?'':' hidden'}>${renderZone(state,zone,index,validation,view)}</div>`).join('')}
    </form>
  </section>`;
}

export function renderAppHtml(state: AppState, validation: DraftValidation, view: ViewState = {
  openZoneId: state.zones[0]?.id ?? null,
  openLayerIds: new Set(state.zones.flatMap(zone=>zone.layers.map(layer=>layer.id))),
  mobileSurface: 'zones',
}): string {
  const active=view.mobileSurface??'zones';
  return `<div class="workspace-app" data-testid="workspace-layout" data-mobile-surface="${active}">
    <header class="topbar"><div class="brand-lockup"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M5 11V5H11M29 5h6v6M35 29v6h-6M11 35H5v-6" stroke="currentColor" stroke-width="2"/><rect x="11" y="13" width="18" height="14" stroke="currentColor" stroke-width="1.6"/><path d="M12 32h16M8 14v12" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/></svg></span><h1 class="brand-name">Дачаметр</h1><span class="brand-product">Расчёт участка</span></div>
      <div class="topbar-context">Удобный расчёт без лишних допущений</div>
      <div class="topbar-actions"><span class="local-status">Без автосохранения</span><a class="jump-result" href="#result" data-action="open-bom">Открыть ведомость <span aria-hidden="true">↗</span></a></div></header>
    ${view.shareNotice ? `<p class="share-load-notice${view.shareProblem ? ' is-error' : ''}" data-testid="share-load-notice" role="${view.shareProblem ? 'alert' : 'status'}">${escapeHtml(view.shareNotice)}</p>` : ''}
    ${renderSiteOverview(state,validation)}
    ${renderMobileTabs(active)}
    <main class="workspace-grid">${renderProjectStructure(state,validation,view)}${renderWorkspaceEditor(state,validation,view)}${renderResults(state,validation,view)}</main>
    <footer class="workspace-footer"><span>Размеры × толщина = объём. Запас, плотность и объём упаковки задаёте вы.</span><span>Локальный инструмент · Без автоматического сохранения</span></footer>
  </div>`;
}

/** Fit only the selected zone, never a fictional placement of all zones. */
function fitZoneRectangles(root: HTMLElement): void {
  for (const canvas of Array.from(root.querySelectorAll<HTMLElement>('.figure-canvas'))) {
    const rectangle = canvas.querySelector<HTMLElement>('.zone-rectangle');
    if (!rectangle) continue;
    const ratio = Number(rectangle.dataset.ratio);
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    const availableWidth = Math.max(0, canvas.clientWidth - 16);
    const availableHeight = Math.max(0, canvas.clientHeight - 16);
    const width = Math.min(availableWidth * .76, 360, availableHeight * ratio);
    rectangle.style.width = `${width}px`;
    rectangle.style.height = `${width / ratio}px`;
  }
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
  let mobileSurface: 'zones' | 'editor' | 'bom' = 'zones';
  let shareNotice: string | undefined;
  let shareProblem = false;
  let wasMobile = window.matchMedia('(max-width: 820px)').matches;
  // Changing CSS display at a breakpoint may blur an element *before* resize
  // fires; document.activeElement is already <body> at that point.
  let lastFocused: HTMLElement | null = null;
  root.addEventListener('focusin', event => {
    if (event.target instanceof HTMLElement) lastFocused = event.target;
  });
  const render = (focus?: FocusSnapshot, preserveBomDetails = true) => {
    // Imported calculations must not inherit disclosure state from the old BOM.
    if (!preserveBomDetails) openBomKeys.clear();
    else for (const details of Array.from(root.querySelectorAll<HTMLDetailsElement>('details.bom-details[data-bom-key]'))) {
      const key = details.dataset.bomKey;
      if (!key) continue;
      if (details.open) openBomKeys.add(key);
      else openBomKeys.delete(key);
    }
    root.innerHTML = renderAppHtml(state, validateDraft(state), { openZoneId, openLayerIds, openBomKeys, mobileSurface, shareNotice, shareProblem });
    fitZoneRectangles(root);
    if (focus) restoreFocus(root, focus);
  };
  const update = (next: AppState, preserveFocus = true) => {
    const focus = preserveFocus ? captureFocus(root) : undefined;
    if (next !== state) {
      // Once the user edits an imported snapshot, remove the old token so a
      // reload cannot silently revert to a stale calculation.
      if (isSharedCalculationHash(window.location.hash)) {
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      }
      shareNotice = undefined;
      shareProblem = false;
    }
    state = next;
    render(focus);
  };

  const moveFocus = (key: string) => restoreFocus(root, { key, start: null, end: null });

  // This form is a live calculator, not a navigation/submission endpoint.
  root.addEventListener('submit', event => {
    if (event.target instanceof HTMLFormElement && event.target.matches('.calculator-form')) event.preventDefault();
  });

  const applyInput = (target: HTMLInputElement) => {
    const action = target.dataset.action;
    const value = target.value;
    if (action === 'plot-field' && (target.dataset.field === 'length' || target.dataset.field === 'width')) update(updatePlotField(state, target.dataset.field, value));
    if (action === 'zone-field' && target.dataset.zoneId && (target.dataset.field === 'name' || target.dataset.field === 'length' || target.dataset.field === 'width')) update(updateZoneField(state, target.dataset.zoneId, target.dataset.field, value));
    if (action === 'layer-field' && target.dataset.zoneId && target.dataset.layerId && ['thickness', 'reserve', 'packageL', 'density'].includes(target.dataset.field ?? '')) update(updateLayerField(state, target.dataset.zoneId, target.dataset.layerId, target.dataset.field as 'thickness' | 'reserve' | 'packageL' | 'density', value));
    if (action === 'material-field' && target.dataset.materialId && (target.dataset.field === 'label')) update(updateMaterialSpec(state, target.dataset.materialId, 'label', value));
  };

  // Replacing an input during an IME composition cancels the native editing
  // session (notably on mobile keyboards). Commit the final value on compositionend.
  let composingInput: HTMLInputElement | null = null;
  root.addEventListener('compositionstart', event => {
    if (event.target instanceof HTMLInputElement) composingInput = event.target;
  });
  root.addEventListener('compositionend', event => {
    if (!(event.target instanceof HTMLInputElement) || event.target !== composingInput) return;
    composingInput = null;
    applyInput(event.target);
  });
  root.addEventListener('input', event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target === composingInput || (event instanceof InputEvent && event.isComposing)) return;
    applyInput(target);
  });

  root.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const action = target.dataset.action;
    // The changed SELECT is the reliable focus target. Playwright and some
    // browsers fire change without leaving document.activeElement on SELECT.
    const restoreChangedSelect = () => {
      const key = target.dataset.focusKey;
      if (key) restoreFocus(root, { key, start: null, end: null });
    };
    if (action === 'material-field' && target.dataset.materialId && target.dataset.field === 'material') {
      update(updateMaterialSpec(state, target.dataset.materialId, 'material', target.value), false);
      restoreChangedSelect();
    }
    if (action === 'link-material' && target.dataset.zoneId && target.dataset.layerId) {
      const next = target.value === '__new__' ? linkLayerToNewMaterial(state, target.dataset.zoneId, target.dataset.layerId) : updateLayerField(state, target.dataset.zoneId, target.dataset.layerId, 'materialSpecId', target.value);
      update(next, false);
      restoreChangedSelect();
    }
  });

  root.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest<HTMLElement>('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'mobile-tab' && (button.dataset.target === 'zones' || button.dataset.target === 'editor' || button.dataset.target === 'bom')) {
      mobileSurface = button.dataset.target;
      // The clicked tab is destroyed and recreated during render. Restoring
      // the exact tab keeps keyboard users on the same navigation control.
      render({ key: `mobile-tab-${mobileSurface}`, start: null, end: null });
      return;
    }
    if (action === 'open-bom') {
      // At tablet widths the BOM is a separate hidden surface. A bare #result
      // anchor cannot open it; desktop retains normal anchor navigation.
      if (window.matchMedia('(max-width: 820px)').matches) {
        event.preventDefault();
        mobileSurface = 'bom';
        render();
        root.querySelector<HTMLElement>('#result')?.focus();
      }
      return;
    }
    if (action === 'select-zone' && button.dataset.zoneId) {
      openZoneId = button.dataset.zoneId;
      mobileSurface = 'editor';
      render();
      // Announce the new editing context instead of sending focus to <body>
      // when the source button is replaced (and hidden on mobile).
      root.querySelector<HTMLElement>('[data-testid="selected-zone-name"]')?.focus();
      return;
    }
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
      mobileSurface = 'editor';
      update(next, false);
      if (openZoneId) moveFocus(`zone-name-${openZoneId}`);
    }
    if (action === 'remove-zone' && button.dataset.zoneId) {
      const next = removeZone(state, button.dataset.zoneId);
      if (openZoneId === button.dataset.zoneId) openZoneId = next.zones[0]?.id ?? null;
      if (next.zones.length === 0) mobileSurface = 'zones';
      update(next, false);
      if (openZoneId) root.querySelector<HTMLElement>('[data-testid="selected-zone-name"]')?.focus();
      else moveFocus('plot-length');
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
      if (newLayer) moveFocus(`source-${newLayer.id}`);
    }
    if (action === 'remove-layer' && button.dataset.zoneId && button.dataset.layerId) {
      openLayerIds.delete(button.dataset.layerId);
      update(removeLayer(state, button.dataset.zoneId, button.dataset.layerId), false);
      moveFocus(`add-layer-${button.dataset.zoneId}`);
    }
    if (action === 'share-calculation') {
      const status = root.querySelector<HTMLElement>('[data-testid="share-link-status"]');
      const setStatus = (message: string) => { if (status?.isConnected) status.textContent = message; };
      const hash = encodeSharedCalculation(state);
      if (!hash) {
        setStatus('Не удалось создать ссылку: проверьте данные или уменьшите количество зон.');
        return;
      }
      // Fragments do not travel with HTTP requests; omit existing URL query
      // parameters as they could contain unrelated tracking/private tokens.
      const link = window.location.origin + window.location.pathname + hash;
      try {
        if (!navigator.clipboard?.writeText) {
          setStatus('Буфер обмена недоступен.');
          return;
        }
        void navigator.clipboard.writeText(link).then(
          () => setStatus('Ссылка скопирована. Она содержит введённые названия и размеры.'),
          () => setStatus('Не удалось скопировать ссылку. Проверьте доступ к буферу обмена.'),
        );
      } catch {
        setStatus('Не удалось скопировать ссылку. Проверьте доступ к буферу обмена.');
      }
      return;
    }
    if (action === 'download-bom-csv') {
      // Calculate only from the currently valid domain result. Incomplete or
      // invalid drafts can never generate a seemingly authoritative document.
      const validation = validateDraft(state);
      if (!validation.valid || !validation.result?.ok || validation.result.value.bom.length === 0) return;
      const status = root.querySelector<HTMLElement>('[data-testid="csv-bom-status"]');
      const setStatus = (message: string) => {
        if (status?.isConnected) status.textContent = message;
      };
      try {
        const csv = formatBomCsv(validation.result.value);
        if (!csv) return;
        const blob = new Blob([csv], { type: BOM_CSV_MIME });
        const url = URL.createObjectURL(blob);
        try {
          const link = document.createElement('a');
          link.href = url;
          link.download = BOM_CSV_FILENAME;
          link.hidden = true;
          document.body.appendChild(link);
          try {
            link.click();
          } finally {
            link.remove();
          }
          setStatus('CSV подготовлен для скачивания. Проверьте загрузки браузера.');
        } finally {
          // Do not revoke synchronously: Chromium/WebKit can cancel a download
          // when its object URL disappears before the file transfer begins.
          window.setTimeout(() => URL.revokeObjectURL(url), 3000);
        }
      } catch {
        setStatus('Не удалось подготовить CSV. Повторите попытку.');
      }
      return;
    }
    if (action === 'copy-bom') {
      // Copy the exact validated result only, never a stale or partial draft.
      const validation = validateDraft(state);
      if (!validation.valid || !validation.result?.ok || validation.result.value.bom.length === 0) return;
      const status = root.querySelector<HTMLElement>('[data-testid="copy-bom-status"]');
      const setStatus = (message: string) => {
        if (status?.isConnected) status.textContent = message;
      };
      const content = formatBomForClipboard(state, validation.result.value);
      try {
        if (!navigator.clipboard?.writeText) {
          setStatus('Буфер обмена недоступен в этом браузере.');
          return;
        }
        void navigator.clipboard.writeText(content).then(
          () => setStatus('Ведомость скопирована.'),
          () => setStatus('Не удалось скопировать. Проверьте разрешение на буфер обмена.'),
        );
      } catch {
        setStatus('Не удалось скопировать. Проверьте разрешение на буфер обмена.');
      }
      return;
    }
    if (action === 'reset') {
      const hasEnteredData = state.plot.length.trim() !== '' || state.plot.width.trim() !== '' || state.zones.length > 0 || state.materials.length > 0;
      if (!hasEnteredData || window.confirm('Сбросить введённые размеры, зоны и материалы?')) {
        mobileSurface = 'zones';
        openZoneId = null;
        openLayerIds.clear();
        update(createInitialState(), false);
        // render() snapshots the old DOM's details state; clear that snapshot
        // after replacing it so reused material IDs cannot inherit prior BOM UI.
        openBomKeys.clear();
        moveFocus('plot-length');
      }
    }
  });

  // A width change can hide the focused desktop panel via mobile CSS. Keep
  // that panel visible and update tab state in-place: rebuilding the DOM here
  // would discard the active input, caret and native keyboard composition.
  window.addEventListener('resize', () => {
    const isMobile = window.matchMedia('(max-width: 820px)').matches;
    const currentFocus = document.activeElement;
    const active = currentFocus instanceof HTMLElement && root.contains(currentFocus)
      ? currentFocus
      : currentFocus === document.body && lastFocused?.isConnected && root.contains(lastFocused)
        ? lastFocused
        : null;
    const headerLinkHidden = isMobile && active?.matches('.jump-result') && window.matchMedia('(max-width: 430px)').matches;
    if (isMobile !== wasMobile || headerLinkHidden) {
      if (isMobile) {
        if (active?.closest('.editor-surface')) mobileSurface = 'editor';
        else if (active?.closest('.results-column') || active?.matches('.jump-result')) mobileSurface = 'bom';
        else if (active?.closest('.structure-panel') || active?.closest('.site-overview')) mobileSurface = 'zones';
      }
      const layout = root.querySelector<HTMLElement>('.workspace-app');
      if (layout) layout.dataset.mobileSurface = mobileSurface;
      for (const tab of Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action="mobile-tab"]'))) {
        const selected = tab.dataset.target === mobileSurface;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-current', selected ? 'page' : 'false');
      }
      if (!isMobile && active?.closest('.mobile-tabs')) {
        // Mobile navigation is hidden on desktop; move focus to its destination.
        if (mobileSurface === 'zones') moveFocus('plot-length');
        else if (mobileSurface === 'editor') {
          // Before the first zone exists, the selected-zone heading is absent.
          const heading = root.querySelector<HTMLElement>('[data-testid="selected-zone-name"]');
          (heading ?? root.querySelector<HTMLElement>('.editor-surface [data-action="add-zone"]'))?.focus();
        } else root.querySelector<HTMLElement>('#result')?.focus();
      } else if (headerLinkHidden) {
        // The header BOM link disappears below 431px, even when the screen
        // was already in tablet mode before this resize.
        root.querySelector<HTMLElement>('#result')?.focus();
      } else if (isMobile && active && currentFocus !== active && root.contains(active)) {
        // CSS may have blurred the previous control when its panel was hidden.
        // Restore the same node after revealing the correct mobile surface.
        active.focus({ preventScroll: true });
      }
      wasMobile = isMobile;
    }
    fitZoneRectangles(root);
  }, { passive: true });
  const restoreFromShareHash = (): boolean => {
    if (!isSharedCalculationHash(window.location.hash)) return false;
    const shared = decodeSharedCalculation(window.location.hash);
    if (shared.ok) {
      state = shared.state;
      openZoneId = state.zones[0]?.id ?? null;
      openLayerIds.clear();
      const firstLayer = state.zones[0]?.layers[0];
      if (firstLayer) openLayerIds.add(firstLayer.id);
      mobileSurface = validateDraft(state).result?.ok && state.zones.some(zone => zone.layers.length > 0) ? 'bom' : 'zones';
      shareNotice = 'Расчёт восстановлен из ссылки. Изменения не сохраняются автоматически.';
      shareProblem = false;
    } else {
      // Never replace the current calculation with malformed or unsupported
      // external data; a visible warning is safer than a partial import.
      shareNotice = shared.reason === 'unsupported_version'
        ? 'Версия ссылки не поддерживается. Текущий расчёт не изменён.'
        : 'Ссылка повреждена или содержит недопустимые данные. Текущий расчёт не изменён.';
      shareProblem = true;
    }
    render(undefined, false);
    return true;
  };
  window.addEventListener('hashchange', () => { restoreFromShareHash(); });
  if (!restoreFromShareHash()) render();
}
