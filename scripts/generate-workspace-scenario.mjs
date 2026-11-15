import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { calculatePlotDetailed } from '../src/domain/plot.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputDir = path.join(root, 'artifacts', 'dachametr-workspace');
const outputPath = path.join(outputDir, 'scenario.json');
const domainPath = path.join(root, 'src', 'domain', 'plot.ts');

const input = {
  plot: { length_m: '20', width_m: '30' },
  zones: [
    {
      id: 'bed',
      length_m: '2',
      width_m: '4',
      layers: [{
        id: 'bed-soil',
        material: 'soil',
        material_spec_id: 'workspace-soil-main',
        material_spec_label: 'Грунт для грядок',
        thickness_cm: '25',
        reserve_percent: '0',
        package_l: '50',
        density_kg_m3: null,
      }],
    },
    {
      id: 'path',
      length_m: '2',
      width_m: '5',
      layers: [
        {
          id: 'path-sand',
          material: 'sand',
          material_spec_id: 'workspace-sand-50l',
          material_spec_label: 'Песок карьерный',
          thickness_cm: '10',
          reserve_percent: '5',
          package_l: '50',
          density_kg_m3: '1500',
        },
        {
          id: 'path-gravel',
          material: 'gravel',
          material_spec_id: 'workspace-gravel-50l',
          material_spec_label: 'Щебень фракции 5–20',
          thickness_cm: '5',
          reserve_percent: '10',
          package_l: '50',
          density_kg_m3: '1400',
        },
      ],
    },
  ],
};

const calculated = calculatePlotDetailed(input);
if (!calculated.ok) throw new Error(`Scenario must calculate: ${JSON.stringify(calculated.error)}`);
const domainBytes = await readFile(domainPath);
const sourceSha256 = createHash('sha256').update(domainBytes).digest('hex');
const scenario = {
  schema: 'dachametr-workspace-scenario-v1',
  generatedBy: 'scripts/generate-workspace-scenario.mjs',
  source: { file: 'src/domain/plot.ts', sha256: sourceSha256 },
  engine: 'calculatePlotDetailed',
  labels: {
    project: 'Участок у дома',
    plot: '20 × 30 м',
    zones: { bed: 'Грядка', path: 'Дорожка' },
  },
  input,
  calculated: calculated.value,
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(scenario, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(root, outputPath)}`);
console.log(JSON.stringify(calculated.value, null, 2));
