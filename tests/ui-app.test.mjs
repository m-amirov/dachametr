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
