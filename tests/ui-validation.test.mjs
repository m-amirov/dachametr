import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addLayer, addZone, createInitialState, updatePlotField, updateZoneField } from '../src/ui/model.ts';
import { buildDomainInput, validateDraft } from '../src/ui/validation.ts';

function validState() {
  let state = createInitialState();
  state = updatePlotField(state, 'length', '20');
  state = updatePlotField(state, 'width', '30');
  state = addZone(state);
  const zone = state.zones[0];
  state = updateZoneField(state, zone.id, 'length', '2');
  state = updateZoneField(state, zone.id, 'width', '4');
  state = addLayer(state, zone.id);
  const layer = state.zones[0].layers[0];
  state = updateZoneField(state, zone.id, 'name', 'Грядка');
  state = { ...state, materials: state.materials.map(material => ({ ...material, label: 'Грунт для грядок' })) };
  state = { ...state, zones: state.zones.map(item => ({ ...item, layers: item.layers.map(value => ({ ...value, thickness: '25', packageL: '50' })) })) };
  assert.equal(layer.materialSpecId, state.zones[0].layers[0].materialSpecId);
  return state;
}

test('draft adapter accepts comma decimals and converts blank optional fields to null', () => {
  let state = validState();
  state = updatePlotField(state, 'length', '20,5');
  const input = buildDomainInput(state);
  assert.equal(input.plot.length_m, '20,5');
  assert.equal(input.zones[0].layers[0].density_kg_m3, null);
  const checked = validateDraft(state);
  assert.equal(checked.valid, true, JSON.stringify(checked.errors));
  assert.equal(checked.result?.ok, true);
});

test('invalid late zone blocks the complete BOM and keeps earlier draft values', () => {
  let state = validState();
  state = addZone(state);
  state = updateZoneField(state, state.zones[1].id, 'length', 'bad');
  const checked = validateDraft(state);
  assert.equal(checked.valid, false);
  assert.equal(checked.result, null);
  assert.equal(checked.errors[0].code, 'invalid_number');
  assert.equal(state.zones[0].layers[0].thickness, '25');
});

test('valid zone area warning is retained as a warning, not a calculation error', () => {
  let state = validState();
  state = updatePlotField(state, 'length', '2');
  state = updatePlotField(state, 'width', '2');
  state = updateZoneField(state, state.zones[0].id, 'length', '40');
  const checked = validateDraft(state);
  assert.equal(checked.valid, true, JSON.stringify(checked.errors));
  assert.equal(checked.result?.ok, true);
  if (checked.result?.ok) assert.equal(checked.result.value.areas_exceed_plot, true);
});
