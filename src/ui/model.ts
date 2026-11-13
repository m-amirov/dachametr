export type MaterialKind = 'soil' | 'sand' | 'gravel';

export interface MaterialSpecDraft {
  id: string;
  material: MaterialKind;
  label: string;
}

export interface LayerDraft {
  id: string;
  materialSpecId: string;
  thickness: string;
  reserve: string;
  packageL: string;
  density: string;
}

export interface ZoneDraft {
  id: string;
  name: string;
  length: string;
  width: string;
  layers: LayerDraft[];
}

export interface AppState {
  plot: {
    length: string;
    width: string;
  };
  zones: ZoneDraft[];
  materials: MaterialSpecDraft[];
}

const copyState = (state: AppState): AppState => ({
  plot: { ...state.plot },
  zones: state.zones.map(zone => ({
    ...zone,
    layers: zone.layers.map(layer => ({ ...layer })),
  })),
  materials: state.materials.map(material => ({ ...material })),
});

function nextId(prefix: string, ids: string[]): string {
  const used = new Set(ids);
  let index = 1;
  while (used.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

export function createInitialState(): AppState {
  return {
    plot: { length: '', width: '' },
    zones: [],
    materials: [],
  };
}

export function addZone(state: AppState): AppState {
  const next = copyState(state);
  const id = nextId('zone', next.zones.map(zone => zone.id));
  next.zones.push({ id, name: 'Новая зона', length: '', width: '', layers: [] });
  return next;
}

export function removeZone(state: AppState, zoneId: string): AppState {
  const next = copyState(state);
  next.zones = next.zones.filter(zone => zone.id !== zoneId);
  return next;
}

export function updatePlotField(state: AppState, field: 'length' | 'width', value: string): AppState {
  const next = copyState(state);
  next.plot[field] = value;
  return next;
}

export function updateZoneField(
  state: AppState,
  zoneId: string,
  field: 'name' | 'length' | 'width',
  value: string,
): AppState {
  const next = copyState(state);
  const zone = next.zones.find(item => item.id === zoneId);
  if (zone) zone[field] = value;
  return next;
}

export function addLayer(state: AppState, zoneId: string, materialSpecId?: string): AppState {
  const next = copyState(state);
  const zone = next.zones.find(item => item.id === zoneId);
  if (!zone) return next;

  const specId = materialSpecId ?? nextId('spec', next.materials.map(material => material.id));
  if (!next.materials.some(material => material.id === specId)) {
    next.materials.push({ id: specId, material: 'soil', label: '' });
  }
  const layerId = nextId('layer', next.zones.flatMap(item => item.layers.map(layer => layer.id)));
  zone.layers.push({
    id: layerId,
    materialSpecId: specId,
    thickness: '',
    reserve: '0',
    packageL: '',
    density: '',
  });
  return next;
}

export function removeLayer(state: AppState, zoneId: string, layerId: string): AppState {
  const next = copyState(state);
  const zone = next.zones.find(item => item.id === zoneId);
  if (zone) zone.layers = zone.layers.filter(layer => layer.id !== layerId);
  return next;
}

export function updateLayerField(
  state: AppState,
  zoneId: string,
  layerId: string,
  field: 'materialSpecId' | 'thickness' | 'reserve' | 'packageL' | 'density',
  value: string,
): AppState {
  const next = copyState(state);
  const layer = next.zones.find(item => item.id === zoneId)?.layers.find(item => item.id === layerId);
  if (layer) layer[field] = value;
  return next;
}

export function linkLayerToNewMaterial(state: AppState, zoneId: string, layerId: string): AppState {
  const next = copyState(state);
  const layer = next.zones.find(item => item.id === zoneId)?.layers.find(item => item.id === layerId);
  if (!layer) return next;
  const id = nextId('spec', next.materials.map(material => material.id));
  next.materials.push({ id, material: 'soil', label: '' });
  layer.materialSpecId = id;
  return next;
}

export function updateMaterialSpec(
  state: AppState,
  materialSpecId: string,
  field: 'material' | 'label',
  value: string,
): AppState {
  const next = copyState(state);
  const material = next.materials.find(item => item.id === materialSpecId);
  if (material) {
    if (field === 'material' && (value === 'soil' || value === 'sand' || value === 'gravel')) material.material = value;
    if (field === 'label') material.label = value;
  }
  return next;
}
