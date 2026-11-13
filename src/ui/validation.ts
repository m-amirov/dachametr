import { calculatePlotDetailed, type CalcResult, type DetailedCalculated, type PlotInput } from '../domain/plot.ts';
import type { AppState } from './model.ts';

export interface DraftFieldError {
  code: string;
  path: string;
  message: string;
}

export interface DraftValidation {
  valid: boolean;
  errors: DraftFieldError[];
  domainInput: PlotInput;
  result: CalcResult<DetailedCalculated> | null;
}

const errorMessages: Record<string, string> = {
  required: 'Заполните поле.',
  invalid_number: 'Введите число: например, 2 или 2,5.',
  input_too_long: 'Значение слишком длинное.',
  precision_exceeded: 'Оставьте не больше 12 знаков после запятой.',
  out_of_range: 'Значение выходит за технический диапазон.',
  invalid_material_spec_label: 'Добавьте название варианта материала.',
  conflicting_material_spec_definition: 'У одного варианта должны совпадать тип и название.',
  package_count_overflow: 'Слишком большой объём для безопасного подсчёта упаковок.',
  too_many_zones: 'Слишком много зон для этого прототипа.',
  too_many_layers: 'Слишком много слоёв в одной зоне.',
};

function optionalValue(value: string): string | null {
  return value.trim() === '' ? null : value;
}

export function buildDomainInput(state: AppState): PlotInput {
  return {
    plot: {
      length_m: state.plot.length,
      width_m: state.plot.width,
    },
    zones: state.zones.map(zone => ({
      id: zone.id,
      length_m: zone.length,
      width_m: zone.width,
      layers: zone.layers.map(layer => {
        const material = state.materials.find(spec => spec.id === layer.materialSpecId);
        return {
          id: layer.id,
          material: material?.material ?? 'soil',
          material_spec_id: layer.materialSpecId,
          material_spec_label: material?.label ?? '',
          thickness_cm: layer.thickness,
          reserve_percent: layer.reserve,
          package_l: optionalValue(layer.packageL),
          density_kg_m3: optionalValue(layer.density),
        };
      }),
    })),
  };
}

export function messageForError(code: string): string {
  return errorMessages[code] ?? 'Проверьте введённые данные.';
}

export function validateDraft(state: AppState): DraftValidation {
  const domainInput = buildDomainInput(state);
  const result = calculatePlotDetailed(domainInput);
  if (result.ok) return { valid: true, errors: [], domainInput, result };
  return {
    valid: false,
    errors: [{ code: result.error.code, path: result.error.path, message: messageForError(result.error.code) }],
    domainInput,
    result: null,
  };
}
