import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addLayer, addZone, createInitialState, updateLayerField,
  updateMaterialSpec, updatePlotField, updateZoneField,
} from '../src/ui/model.ts';
import { validateDraft } from '../src/ui/validation.ts';
import { BOM_CSV_FILENAME, BOM_CSV_MIME, formatBomCsv } from '../src/ui/bom-csv.ts';
import { renderAppHtml } from '../src/ui/app.ts';

function sample() {
  let state = createInitialState();
  state = updatePlotField(state, 'length', '20');
  state = updatePlotField(state, 'width', '30');
  state = addZone(state);
  const zone = state.zones[0];
  state = updateZoneField(state, zone.id, 'name', 'Грядка');
  state = updateZoneField(state, zone.id, 'length', '2');
  state = updateZoneField(state, zone.id, 'width', '4');
  state = addLayer(state, zone.id);
  const layer = state.zones[0].layers[0];
  state = updateMaterialSpec(state, layer.materialSpecId, 'label', 'Грунт для грядок');
  state = updateLayerField(state, zone.id, layer.id, 'thickness', '25');
  state = updateLayerField(state, zone.id, layer.id, 'packageL', '50');
  return state;
}

function csvLines(text) {
  assert.ok(text.startsWith('\uFEFF'), 'CSV is UTF-8 BOM marked');
  assert.ok(text.endsWith('\r\n'), 'CSV has CRLF lines for Excel');
  return text.slice(1).trimEnd().split('\r\n');
}

test('CSV exports exact calculated BOM as semicolon-delimited UTF-8 BOM with ordered columns', () => {
  const state = sample();
  const validation = validateDraft(state);
  assert.equal(validation.result?.ok, true);
  if (!validation.result?.ok) return;
  assert.equal(BOM_CSV_MIME, 'text/csv;charset=utf-8');
  assert.equal(BOM_CSV_FILENAME, 'dachametr-vedomost.csv');

  const lines = csvLines(formatBomCsv(validation.result.value));
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^"Название материала";"Тип";"ID варианта";"Способ закупки";/);
  assert.equal(lines[0].split(';').length, 12);
  assert.equal(lines[1], '"Грунт для грядок";"Грунт";"spec-1";"В упаковках";"2000";"2000";"50";"40";"2000";"0";"";""');
  assert.doesNotMatch(lines.join('\n'), /Цена|Норматив|Плотность по умолчанию/);
});

test('bulk delivery retains blanks, never invents bags, purchased volume or density', () => {
  let state = sample();
  const zoneId = state.zones[0].id;
  const layerId = state.zones[0].layers[0].id;
  state = updateLayerField(state, zoneId, layerId, 'packageL', '');
  const validation = validateDraft(state);
  assert.equal(validation.result?.ok, true);
  if (!validation.result?.ok) return;
  const lines = csvLines(formatBomCsv(validation.result.value));
  assert.equal(lines[1], '"Грунт для грядок";"Грунт";"spec-1";"Россыпью / по объёму";"2000";"2000";"";"";"";"";"";""');
});

test('different specifications with identical names remain independent CSV rows', () => {
  let state = sample();
  state = addZone(state);
  const secondId = state.zones[1].id;
  state = updateZoneField(state, secondId, 'length', '1');
  state = updateZoneField(state, secondId, 'width', '2');
  state = addLayer(state, secondId);
  const second = state.zones[1].layers[0];
  state = updateMaterialSpec(state, second.materialSpecId, 'label', 'Грунт для грядок');
  state = updateLayerField(state, secondId, second.id, 'thickness', '10');
  state = updateLayerField(state, secondId, second.id, 'packageL', '50');
  const validation = validateDraft(state);
  assert.equal(validation.result?.ok, true, JSON.stringify(validation.errors));
  if (!validation.result?.ok) return;
  const lines = csvLines(formatBomCsv(validation.result.value));
  assert.equal(lines.length, 3);
  assert.match(lines[1], /"spec-1";"В упаковках".*;"40";/);
  assert.match(lines[2], /"spec-2";"В упаковках".*;"4";/);
});

test('spreadsheet formula injection, CSV quotes and injected newlines are neutralized', () => {
  const state = sample();
  const result = validateDraft(state).result;
  assert.equal(result?.ok, true);
  if (!result?.ok) return;
  const mutated = structuredClone(result.value);
  mutated.bom[0].material_spec_label = ' \t=HYPERLINK("https://example.invalid", "x")\r\n,next';
  const [, line] = csvLines(formatBomCsv(mutated));
  assert.ok(line.startsWith('"\'  =HYPERLINK('));
  assert.match(line, /""https:\/\/example\.invalid""/);
  assert.match(line, /,next/);
  assert.doesNotMatch(line, /[\t\n\r]/);

  mutated.bom[0].material_spec_label = '@SUM(A1:A2)';
  assert.ok(csvLines(formatBomCsv(mutated))[1].startsWith('"\'@SUM('));
  mutated.bom[0].material_spec_label = '+SUM(A1:A2)';
  assert.ok(csvLines(formatBomCsv(mutated))[1].startsWith('"\'+SUM('));
});

test('exact numeric strings beyond spreadsheet 15-digit precision are exported as text', () => {
  const result = validateDraft(sample()).result;
  assert.equal(result?.ok, true);
  if (!result?.ok) return;
  const copy = structuredClone(result.value);
  copy.bom[0].purchase_l = '12345678901234567890.1234567890123';
  copy.bom[0].packages = 9007199254740991;
  copy.bom[0].net_l = '0.1234567890123456';
  const line = csvLines(formatBomCsv(copy))[1];
  assert.ok(line.includes('"\'12345678901234567890,1234567890123"'));
  assert.ok(line.includes('"\'9007199254740991"'));
  assert.ok(line.includes('"\'0,1234567890123456"'));
  assert.doesNotMatch(line, /e\+\d+|Infinity/);
});

test('CSV download control is available only when complete material rows exist', () => {
  const empty = createInitialState();
  assert.doesNotMatch(renderAppHtml(empty, validateDraft(empty)), /data-action="download-bom-csv"/);
  const state = sample();
  assert.match(renderAppHtml(state, validateDraft(state)), /data-action="download-bom-csv"/);
  assert.match(renderAppHtml(state, validateDraft(state)), /data-testid="csv-bom-status" role="status"/);
  const invalid = updateZoneField(state, state.zones[0].id, 'length', '1,');
  assert.doesNotMatch(renderAppHtml(invalid, validateDraft(invalid)), /data-action="download-bom-csv"/);
});
