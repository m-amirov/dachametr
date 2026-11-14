import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addLayer, addZone, createInitialState, updatePlotField, updateZoneField } from '../src/ui/model.ts';
import { validateDraft } from '../src/ui/validation.ts';
import { renderAppHtml } from '../src/ui/app.ts';

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

test('initial app render is task-first and shows the empty zone action', () => {
  const state = createInitialState();
  const html = renderAppHtml(state, validateDraft(state));
  assert.match(html, /Дачаметр/);
  assert.match(html, /Добавить первую зону/);
  assert.doesNotMatch(html, /Ведомость закупки/);
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
  assert.match(html, /РАЗМЕРЫ ЗОНЫ/);
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
