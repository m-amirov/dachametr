import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addLayer, addZone, createInitialState, updatePlotField, updateZoneField, updateLayerField, updateMaterialSpec } from '../src/ui/model.ts';
import { validateDraft } from '../src/ui/validation.ts';
import { renderAppHtml } from '../src/ui/app.ts';
import { buildLayerDiagram } from '../src/ui/layer-visual.ts';
import { sumWholePackages, formatRuNumber } from '../src/ui/format.ts';

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

test('layer cross-section follows exact input thickness, not material defaults', () => {
  let state = updatePlotField(createInitialState(), 'length', '20');
  state = updatePlotField(state, 'width', '30');
  state = addZone(state);
  const zoneId = state.zones[0].id;
  state = updateZoneField(state, zoneId, 'length', '2');
  state = updateZoneField(state, zoneId, 'width', '5');
  state = addLayer(state, zoneId);
  const firstLayerId = state.zones[0].layers[0].id;
  assert.equal(buildLayerDiagram(state, state.zones[0]), null, 'one layer: no redundant diagram');
  state = addLayer(state, zoneId);
  const secondLayerId = state.zones[0].layers[1].id;
  const [soilId, sandId] = state.zones[0].layers.map(layer => layer.materialSpecId);
  state = updateMaterialSpec(state, soilId, 'label', 'Грунт для грядки');
  state = updateMaterialSpec(state, sandId, 'material', 'sand');
  state = updateMaterialSpec(state, sandId, 'label', 'Песок');
  state = updateLayerField(state, zoneId, firstLayerId, 'thickness', '25');
  state = updateLayerField(state, zoneId, secondLayerId, 'thickness', '6,5');

  const diagram = buildLayerDiagram(state, state.zones[0]);
  assert.deepEqual(diagram, {
    totalThicknessCm: '31.5',
    layers: [
      { id: firstLayerId, material: 'soil', label: 'Грунт для грядки', thicknessCm: '25' },
      { id: secondLayerId, material: 'sand', label: 'Песок', thicknessCm: '6.5' },
    ],
  });
  const validation = validateDraft(state);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  const html = renderAppHtml(state, validation);
  assert.match(html, /data-testid="layer-visual"/);
  assert.match(html, /data-thickness-cm="25" style="flex-grow:25"/);
  assert.match(html, /data-thickness-cm="6.5" style="flex-grow:6.5"/);
  assert.match(html, /31,5 см/);
  assert.match(html, /Это не схема расположения зон/);
  assert.match(html, /class="brand-geometry"/);
  assert.match(html, /class="result-lead"/);

  state = updateLayerField(state, zoneId, secondLayerId, 'thickness', '1,');
  assert.equal(buildLayerDiagram(state, state.zones[0]), null);
  const invalid = renderAppHtml(state, validateDraft(state));
  assert.doesNotMatch(invalid, /data-testid="layer-visual"/);
  assert.match(invalid, /data-testid="blocked-results"/);
  state = updateLayerField(state, zoneId, secondLayerId, 'thickness', '<script>');
  assert.equal(buildLayerDiagram(state, state.zones[0]), null, 'invalid text cannot be interpolated into CSS');
});
