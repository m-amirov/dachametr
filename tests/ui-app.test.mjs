import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addLayer, addZone, createInitialState, updatePlotField, updateZoneField } from '../src/ui/model.ts';
import { validateDraft } from '../src/ui/validation.ts';
import { renderAppHtml } from '../src/ui/app.ts';
import { sumWholePackages, formatRuNumber } from '../src/ui/format.ts';
import { formatBomForClipboard } from '../src/ui/bom-export.ts';

function completeState() {
  let state = createInitialState();
  state = updatePlotField(state, 'length', '20');
  state = updatePlotField(state, 'width', '30');
  state = addZone(state);
  const zone = state.zones[0];
  state = updateZoneField(state, zone.id, 'name', 'Грядка');
  state = updateZoneField(state, zone.id, 'length', '2');
  state = updateZoneField(state, zone.id, 'width', '4');
  state = addLayer(state, zone.id);
  state = { ...state, materials: state.materials.map(material => ({ ...material, label: 'Грунт для грядок' })) };
  state = { ...state, zones: state.zones.map(item => ({ ...item, layers: item.layers.map(layer => ({ ...layer, thickness: '25', packageL: '50' })) })) };
  return state;
}

test('initial runtime workspace shows structure, empty editor and blank output without fake numbers', () => {
  const state = createInitialState();
  const html = renderAppHtml(state, validateDraft(state));
  assert.match(html, /Дачаметр/);
  assert.match(html, /data-testid="structure-panel"/);
  assert.match(html, /Начните с зоны/);
  assert.match(html, /data-testid="add-zone"/);
  assert.match(html, /Ведомость появится здесь/);
  assert.doesNotMatch(html, /3 600 л/);
});

test('invalid plot input blocks results even before the first zone exists', () => {
  const state = updatePlotField(createInitialState(), 'length', '1,');
  const html = renderAppHtml(state, validateDraft(state));
  assert.match(html, /РЕЗУЛЬТАТ ЗАБЛОКИРОВАН/);
  assert.match(html, /Введите число/);
  assert.doesNotMatch(html, /Ведомость появится здесь/);
});

test('zone and layer render exposes labelled editing controls', () => {
  let state = addZone(createInitialState());
  state = addLayer(state, state.zones[0].id);
  const html = renderAppHtml(state, validateDraft(state));
  assert.match(html, /aria-label="Параметры и конструкция зоны"/);
  assert.match(html, /Параметры зоны/);
  assert.match(html, /data-action="zone-field"[^>]*data-field="length"/);
  assert.match(html, /data-action="zone-field"[^>]*data-field="width"/);
  assert.match(html, /Толщина слоя/);
  assert.match(html, /Название варианта материала/);
  assert.match(html, /ранее созданный вариант/);
});

test('valid state renders current BOM and zone breakdown', () => {
  const state = completeState();
  const html = renderAppHtml(state, validateDraft(state));
  assert.match(html, /Ведомость закупки/);
  assert.match(html, /40/);
  assert.match(html, /Расшифровка по зонам/);
});

test('invalid state renders an explicit fail-closed message instead of stale BOM', () => {
  const state = completeState();
  const broken = updateZoneField(state, state.zones[0].id, 'length', 'bad');
  const html = renderAppHtml(broken, validateDraft(broken));
  assert.match(html, /Исправьте ошибки, чтобы получить итоговую ведомость/);
  assert.doesNotMatch(html, /40 упаковок/);
});

test('result-nearby layout uses actual grouped BOM quantities and no hardcoded demo values', () => {
  const state = completeState();
  const html = renderAppHtml(state, validateDraft(state));
  assert.match(html, /class="result-lead"/);
  assert.match(html, /Всего нужно с запасом/);
  assert.match(html, /2 000 л/);
  assert.match(html, /40 уп/);
  assert.match(html, /class="bom-values"/);
  assert.match(html, /href="#result"/);
  assert.doesNotMatch(html, /<h1>Дачаметр<\/h1>.*<h1>Дачаметр<\/h1>/s);
});

test('collapsed zone and layer retain accessible controls but keep editors hidden', () => {
  const state = completeState();
  const zoneId = state.zones[0].id;
  const layerId = state.zones[0].layers[0].id;
  const closed = renderAppHtml(state, validateDraft(state), { openZoneId: null, openLayerIds: new Set() });
  assert.match(closed, new RegExp('aria-controls="zone-editor-' + zoneId + '" aria-expanded="false"'));
  assert.match(closed, new RegExp('id="zone-editor-' + zoneId + '" hidden'));
  assert.match(closed, new RegExp('id="layer-editor-' + layerId + '" hidden'));
  assert.match(closed, /Грунт для грядок/);
  const opened = renderAppHtml(state, validateDraft(state), { openZoneId: zoneId, openLayerIds: new Set([layerId]) });
  assert.match(opened, new RegExp('aria-controls="zone-editor-' + zoneId + '" aria-expanded="true"'));
  assert.doesNotMatch(opened, new RegExp('id="layer-editor-' + layerId + '" hidden'));
});

test('inline numeric error is bound to the offending field, while full BOM is blocked', () => {
  const state = updatePlotField(createInitialState(), 'length', '1,');
  const html = renderAppHtml(state, validateDraft(state));
  assert.match(html, /aria-describedby="error-plot-length"/);
  assert.match(html, /id="error-plot-length"/);
  assert.match(html, /data-testid="blocked-results"/);
  assert.doesNotMatch(html, /data-testid="bom-row"/);
});

test('aggregate package totals remain exact above MAX_SAFE_INTEGER', () => {
  const exact = sumWholePackages([9007199254740991, 2]);
  assert.equal(exact, '9007199254740993');
  assert.equal(formatRuNumber(exact), '9 007 199 254 740 993');
  assert.equal(sumWholePackages([40, 12]), '52');
  assert.equal(sumWholePackages([40, null]), null);
  assert.equal(sumWholePackages([]), null);
});

test('BOM detail disclosure can be restored from render-only view state', () => {
  const state = completeState();
  const initial = renderAppHtml(state, validateDraft(state));
  const key = 'spec-1|soil|50|';
  assert.match(initial, /class="bom-details" data-bom-key="spec-1\|soil\|50\|"/);
  const expanded = renderAppHtml(state, validateDraft(state), {
    openZoneId: state.zones[0].id,
    openLayerIds: new Set(),
    openBomKeys: new Set([key]),
  });
  assert.match(expanded, /class="bom-details" data-bom-key="spec-1\|soil\|50\|" open/);
});

test('Rayon workspace selects a single real zone and preserves its current data', () => {
  let state = completeState();
  state = addZone(state);
  const first = state.zones[0].id;
  const second = state.zones[1].id;
  state = updateZoneField(state, second, 'name', 'Дорожка');
  const validation = validateDraft(state);
  const html = renderAppHtml(state, validation, {
    openZoneId: second,
    openLayerIds: new Set(),
    mobileSurface: 'editor',
  });
  assert.match(html, /class="workspace-grid"/);
  assert.match(html, /data-mobile-surface="editor"/);
  assert.match(html, /data-action="mobile-tab" data-target="zones"/);
  assert.match(html, /data-action="mobile-tab" data-target="editor"/);
  assert.match(html, /data-action="mobile-tab" data-target="bom"/);
  assert.match(html, new RegExp('data-zone-id="' + second + '" data-focus-key="select-zone-' + second + '" aria-current="true"'));
  assert.match(html, new RegExp('data-zone-id="' + first + '" data-focus-key="select-zone-' + first + '" aria-current="false"'));
  assert.match(html, new RegExp('class="workspace-zone-wrap" hidden>[\\s\\S]*?data-zone-id="' + first + '"'));
  assert.match(html, /Дорожка/);
});

test('workspace drawing cannot assert real spatial placement for an invalid zone', () => {
  const state = updateZoneField(completeState(), 'zone-1', 'length', '1,');
  const html = renderAppHtml(state, validateDraft(state));
  assert.match(html, /Схема размеров появится после корректного заполнения полей/);
  assert.match(html, /data-testid="blocked-results"/);
  assert.doesNotMatch(html, /data-testid="zone-rectangle"/);
});

test('material variant label error has a local accessible description and clears after correction', () => {
  const valid = completeState();
  const zoneId = valid.zones[0].id;
  const layerId = valid.zones[0].layers[0].id;
  const invalid = { ...valid, materials: valid.materials.map(material => ({ ...material, label: '' })) };
  const validation = validateDraft(invalid);
  assert.equal(validation.errors[0]?.path, 'zones[0].layers[0].material_spec_label');
  const view = { openZoneId: zoneId, openLayerIds: new Set([layerId]) };
  const html = renderAppHtml(invalid, validation, view);
  assert.match(html, new RegExp('id="label-' + layerId + '"[^>]*aria-invalid="true" aria-describedby="error-label-' + layerId + '"'));
  assert.match(html, new RegExp('id="error-label-' + layerId + '">Добавьте название варианта материала\\.'));
  const corrected = renderAppHtml(valid, validateDraft(valid), view);
  assert.match(corrected, new RegExp('id="label-' + layerId + '"[^>]*aria-invalid="false"'));
  assert.doesNotMatch(corrected, new RegExp('id="error-label-' + layerId + '"'));
});

test('valid BOM exposes a clipboard action, invalid and empty results do not', () => {
  const valid = completeState();
  const html = renderAppHtml(valid, validateDraft(valid));
  assert.match(html, /data-action="copy-bom"/);
  assert.match(html, /data-testid="copy-bom-status" role="status" aria-live="polite"/);
  const invalid = updateZoneField(valid, valid.zones[0].id, 'length', '1,');
  assert.doesNotMatch(renderAppHtml(invalid, validateDraft(invalid)), /data-action="copy-bom"/);
  assert.doesNotMatch(renderAppHtml(createInitialState(), validateDraft(createInitialState())), /data-action="copy-bom"/);
  const noMaterials = updatePlotField(updatePlotField(createInitialState(), 'length', '20'), 'width', '30');
  assert.doesNotMatch(renderAppHtml(noMaterials, validateDraft(noMaterials)), /data-action="copy-bom"/);
});

test('clipboard formatter uses exact validated quantities, spec IDs and mass semantics', () => {
  const state = completeState();
  const validation = validateDraft(state);
  assert.equal(validation.result?.ok, true);
  if (!validation.result?.ok) return;
  const text = formatBomForClipboard(state, validation.result.value);
  assert.match(text, /^Дачаметр — ведомость закупки/);
  assert.match(text, /Участок: 600 м²/);
  assert.match(text, /Грунт для грядок \(Грунт, spec-1\)/);
  assert.match(text, /Нужно с запасом: 2 000 л/);
  assert.match(text, /Купить: 40 уп\. × 50 л/);
  assert.match(text, /Фактически в упаковках: 2 000 л/);
  assert.match(text, /Излишек: 0 л/);
  assert.doesNotMatch(text, /Цена:|РСЯ/);
});

test('clipboard formatter marks bulk purchases without invented bags or density', () => {
  const state = completeState();
  state.zones[0].layers[0].packageL = '';
  const checked = validateDraft(state);
  assert.equal(checked.result?.ok, true);
  if (!checked.result?.ok) return;
  const text = formatBomForClipboard(state, checked.result.value);
  assert.match(text, /Купить: 2 000 л россыпью \/ по объёму/);
  assert.match(text, /Фактически в упаковках: —/);
  assert.doesNotMatch(text, /уп\. ×/);
  assert.doesNotMatch(text, /Масса:/);
});

test('clipboard formatter sanitizes control characters and retains distinct material variants', () => {
  const state = completeState();
  const clone = structuredClone(state);
  clone.materials[0].label = 'Грунт\nдля\tгрядки';
  const value = validateDraft(state).result;
  assert.equal(value?.ok, true);
  if (!value?.ok) return;
  value.value.bom[0].material_spec_label = clone.materials[0].label;
  const text = formatBomForClipboard(clone, value.value);
  assert.match(text, /Грунт для грядки \(Грунт, spec-1\)/);
  assert.doesNotMatch(text, /Грунт\nдля/);
});

test('clipboard formatter keeps two same-named independent material variants separate', () => {
  let state = completeState();
  state = addZone(state);
  const second = state.zones[1];
  state = updateZoneField(state, second.id, 'name', 'Дорожка');
  state = updateZoneField(state, second.id, 'length', '1');
  state = updateZoneField(state, second.id, 'width', '2');
  state = addLayer(state, second.id);
  const specId = state.zones[1].layers[0].materialSpecId;
  state = {
    ...state,
    materials: state.materials.map(item => item.id === specId ? { ...item, label: 'Грунт для грядок' } : item),
    zones: state.zones.map(zone => zone.id === second.id ? {
      ...zone,
      layers: zone.layers.map(layer => ({ ...layer, thickness: '10', packageL: '50' })),
    } : zone),
  };
  const validation = validateDraft(state);
  assert.equal(validation.result?.ok, true, JSON.stringify(validation.errors));
  if (!validation.result?.ok) return;
  assert.equal(validation.result.value.bom.length, 2);
  const text = formatBomForClipboard(state, validation.result.value);
  assert.match(text, /1\. Грунт для грядок \(Грунт, spec-1\)/);
  assert.match(text, /2\. Грунт для грядок \(Грунт, spec-2\)/);
  assert.match(text, /Купить: 40 уп\. × 50 л/);
  assert.match(text, /Купить: 4 уп\. × 50 л/);
});

test('Garden Atlas renders validated scene dimensions and an exact plan without mutating draft or BOM', () => {
  const state = completeState();
  const validation = validateDraft(state);
  const selected = state.zones[0].id;
  const before = JSON.stringify(state);
  const scene = renderAppHtml(state, validation, { openZoneId: selected, openLayerIds: new Set(), sceneView: 'scene' });
  const plan = renderAppHtml(state, validation, { openZoneId: selected, openLayerIds: new Set(), sceneView: 'plan' });
  assert.match(scene, /data-testid="atlas-scene" data-scene-material="soil" data-scene-ratio="2"/);
  assert.match(scene, /data-testid="atlas-scene-footprint"/);
  assert.match(scene, /data-target="scene"[^>]*aria-pressed="true"/);
  assert.match(plan, /data-testid="zone-rectangle" data-ratio="2"/);
  assert.match(plan, /data-target="plan"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(plan, /data-testid="atlas-scene-footprint"/);
  assert.equal(JSON.stringify(state), before);
  const broken = updateZoneField(state, selected, 'length', '1,');
  const invalid = renderAppHtml(broken, validateDraft(broken), { openZoneId: selected, openLayerIds: new Set(), sceneView: 'scene' });
  assert.doesNotMatch(invalid, /data-testid="atlas-scene-footprint"/);
  assert.match(invalid, /data-testid="blocked-results"/);
});
