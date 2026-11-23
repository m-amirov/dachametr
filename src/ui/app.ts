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

function renderZoneFigure(state: AppState, zone: ZoneDraft, validation: DraftValidation): string {
  const detail=zoneDetail(validation,zone.id);
  if (!detail) return '<p class="figure-placeholder">Схема размеров появится после корректного заполнения полей. Недостоверные размеры не отображаются.</p>';
  const length=Number(zone.length.replace(',','.')), width=Number(zone.width.replace(',','.'));
  if (!Number.isFinite(length) || !Number.isFinite(width) || length<=0 || width<=0) return '';
  const ratio=width/length;
  const layers=zone.layers.map(layer=>{
    const spec=state.materials.find(item=>item.id===layer.materialSpecId);
    const visual=Number(layer.thickness.replace(',','.'));
    if(!spec || !Number.isFinite(visual) || visual<=0) return null;
    return {id:layer.id,name:spec.label||MATERIAL_LABELS[spec.material],kind:spec.material,visual,thickness:layer.thickness};
  });
  if(layers.some(layer=>!layer)) return '';
  return `<div class="zone-visual-grid" data-testid="zone-visual-grid">
    <figure class="zone-figure">
      <div class="figure-toolbar"><span class="figure-note">СХЕМА РАЗМЕРОВ</span><span class="figure-scale">Условная схема</span></div>
      <div class="figure-canvas"><span class="measure-label measure-top">${formatUnit(zone.width,'м')}</span><span class="measure-label measure-side">${formatUnit(zone.length,'м')}</span>
        <div class="zone-rectangle" data-testid="zone-rectangle" data-ratio="${ratio}" style="aspect-ratio:${width}/${length}"><strong>${escapeHtml(zone.name)}</strong><span>${formatUnit(detail.area_m2,'м²')}</span></div></div>
      <figcaption>Схема выбранной зоны без координат на участке.</figcaption>
    </figure>
    <div class="section-figure"><div class="figure-toolbar"><span class="figure-note">РАЗРЕЗ СЛОЁВ</span><span class="figure-scale">${zone.layers.length} сл.</span></div>
      <div class="section-stack">
        ${layers.length?layers.map(layer=>layer===null?'':`<button type="button" class="section-layer layer-${escapeHtml(layer.kind)}" data-action="toggle-layer" data-layer-id="${escapeHtml(layer.id)}" data-zone-id="${escapeHtml(zone.id)}" data-focus-key="section-layer-${escapeHtml(layer.id)}" style="flex-grow:${layer.visual}" aria-label="Настроить ${escapeHtml(layer.name)}"><span>${escapeHtml(layer.name)}</span><strong>${escapeHtml(layer.thickness)} см</strong></button>`).join(''):'<p>Добавьте слой</p>'}
      </div>
      <p class="section-caption">Пропорции по введённым толщинам, не строительная норма.</p>
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
      '<div class="workspace-empty"><span class="step-label">Редактор зоны</span><h2>Начните с зоны</h2><p>Укажите размеры участка и добавьте первую зону. Здесь появятся её параметры, разрез слоёв и точный расчёт.</p><button type="button" class="button button-primary" data-action="add-zone">Добавить зону</button></div>'}
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
