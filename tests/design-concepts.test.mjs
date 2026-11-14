import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { calculatePlotDetailed } from '../src/domain/plot.ts';

const conceptSource = readFileSync(new URL('../artifacts/design-concepts/app.js', import.meta.url), 'utf8');

const scenario = {
  plot: { length_m: '20', width_m: '30' },
  zones: [
    {
      id: 'zone-1',
      length_m: '2',
      width_m: '4',
      layers: [{
        id: 'layer-1',
        material: 'soil',
        material_spec_id: 'spec-1',
        material_spec_label: 'Грунт для грядок',
        thickness_cm: '25',
        reserve_percent: '0',
        package_l: '50',
        density_kg_m3: null,
      }],
    },
    {
      id: 'zone-2',
      length_m: '2',
      width_m: '5',
      layers: [
        {
          id: 'layer-2',
          material: 'soil',
          material_spec_id: 'spec-1',
          material_spec_label: 'Грунт для грядок',
          thickness_cm: '6',
          reserve_percent: '0',
          package_l: '50',
          density_kg_m3: null,
        },
        {
          id: 'layer-3',
          material: 'sand',
          material_spec_id: 'spec-3',
          material_spec_label: 'Песок',
          thickness_cm: '10',
          reserve_percent: '5',
          package_l: '50',
          density_kg_m3: null,
        },
      ],
    },
  ],
};

function ru(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value)).replaceAll('\u00a0', ' ');
}

test('concept BOM values stay bound to the exact domain calculation', () => {
  const result = calculatePlotDetailed(scenario);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.error));
  if (!result.ok) return;

  const soil = result.value.bom.find(row => row.material_spec_id === 'spec-1');
  const sand = result.value.bom.find(row => row.material_spec_id === 'spec-3');
  assert.ok(soil);
  assert.ok(sand);

  assert.match(conceptSource, new RegExp(`${soil.packages} уп\\. × 50 л`));
  assert.match(conceptSource, new RegExp(`${ru(soil.net_l)} л чистого · ${ru(soil.purchase_l)} л с запасом`));
  assert.match(conceptSource, new RegExp(`${sand.packages} уп\\. × 50 л`));
  assert.match(conceptSource, new RegExp(`${ru(sand.net_l)} л чистого · ${ru(sand.purchase_l)} л с запасом`));
  assert.match(conceptSource, new RegExp(`'${ru(soil.net_l)} л'.*'${ru(soil.purchase_l)} л'.*'${soil.packages} × 50 л'`));
  assert.match(conceptSource, new RegExp(`'${ru(sand.net_l)} л'.*'${ru(sand.purchase_l)} л'.*'${sand.packages} × 50 л'`));
});

test('concept layer preview uses the same material stack as the scenario', () => {
  assert.match(conceptSource, /'Грунт для грядок', 'грунт', index === 1 \? '25' : '6'/);
  assert.match(conceptSource, /miniLayer\('Песок', 'песок', '10'/);
  assert.doesNotMatch(conceptSource, /miniLayer\('Щебень фракция 5–20'/);
});
