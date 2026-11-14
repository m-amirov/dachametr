import { Exact } from '../domain/exact.ts';
import type { AppState, MaterialKind, ZoneDraft } from './model.ts';

/** Presentation-only, proportional illustration of entered layer thicknesses.
 * It is not a site plan or a recommendation about construction order.
 * Never feed these numbers back into purchasing formulas.
 */
export interface LayerSlice {
  id: string;
  material: MaterialKind;
  label: string;
  thicknessCm: string;
}
export interface LayerDiagram {
  layers: LayerSlice[];
  totalThicknessCm: string;
}

const ZERO = new Exact(0n);

export function buildLayerDiagram(state: AppState, zone: ZoneDraft): LayerDiagram | null {
  // A single material needs no comparative diagram and would add mobile scroll.
  if (zone.layers.length < 2) return null;
  const layers: LayerSlice[] = [];
  let total = ZERO;
  for (const layer of zone.layers) {
    const spec = state.materials.find(item => item.id === layer.materialSpecId);
    if (!spec) return null;
    // Only exact, finite, positive decimal input may influence a visual proportion.
    const normalized = layer.thickness.trim().replace(',', '.');
    if (!/^[0-9]+(?:\.[0-9]+)?$/.test(normalized)) return null;
    let thickness: Exact;
    try { thickness = Exact.decimal(normalized); }
    catch { return null; }
    if (thickness.compare(ZERO) <= 0) return null;
    const thicknessCm = thickness.toString();
    layers.push({
      id: layer.id,
      material: spec.material,
      label: spec.label.trim() || ({ soil: 'Грунт', sand: 'Песок', gravel: 'Щебень' } as const)[spec.material],
      thicknessCm,
    });
    total = total.add(thickness);
  }
  return { layers, totalThicknessCm: total.toString() };
}
