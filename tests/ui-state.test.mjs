import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addLayer,
  addZone,
  createInitialState,
  removeZone,
  updateLayerField,
  updateZoneField,
} from '../src/ui/model.ts';
import { formatRuNumber } from '../src/ui/format.ts';

test('initial state is empty and adding zones gives stable ids', () => {
  const initial = createInitialState();
  assert.deepEqual(initial.zones, []);

  const first = addZone(initial);
  const second = addZone(first);
  assert.deepEqual(second.zones.map(zone => zone.id), ['zone-1', 'zone-2']);
  assert.equal(second.zones[0].name, 'Новая зона');
});

test('draft input stays as typed while editing and does not move after deletion', () => {
  const first = addZone(createInitialState());
  const second = addZone(first);
  const withLength = updateZoneField(second, first.zones[0].id, 'length', '1,');
  const withSecondLength = updateZoneField(withLength, second.zones[1].id, 'length', '7');
  const afterDelete = removeZone(withSecondLength, first.zones[0].id);

  assert.equal(afterDelete.zones[0].id, 'zone-2');
  assert.equal(afterDelete.zones[0].length, '7');
});

test('layer updates stay attached to stable layer id', () => {
  const zoneState = addZone(createInitialState());
  const withLayer = addLayer(zoneState, zoneState.zones[0].id);
  const layer = withLayer.zones[0].layers[0];
  const edited = updateLayerField(withLayer, zoneState.zones[0].id, layer.id, 'thickness', '4,9999');
  assert.equal(edited.zones[0].layers[0].id, layer.id);
  assert.equal(edited.zones[0].layers[0].thickness, '4,9999');
});

test('numbers are formatted for Russian readers without changing source precision', () => {
  assert.equal(formatRuNumber('1200'), '1 200');
  assert.equal(formatRuNumber('4.9999'), '4,9999');
  assert.equal(formatRuNumber('0'), '0');
});
