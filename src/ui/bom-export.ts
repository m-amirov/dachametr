import type { DetailedCalculated } from '../domain/plot.ts';
import type { AppState, MaterialKind } from './model.ts';
import { formatRuNumber, formatUnit } from './format.ts';

const MATERIAL_LABELS: Record<MaterialKind, string> = {
  soil: 'Грунт',
  sand: 'Песок',
  gravel: 'Щебень',
};

function plainLabel(value: string): string {
  return value.replace(/[\r\n\t\u0000-\u001f\u007f]+/g, ' ').trim();
}

/** Plain-text purchase list from an already validated exact-domain calculation.
 * No draft value is recalculated, inferred or rounded for clipboard output.
 */
export function formatBomForClipboard(state: AppState, value: DetailedCalculated): string {
  if (value.bom.length === 0) return '';
  const lines = [
    'Дачаметр — ведомость закупки',
    `Участок: ${formatUnit(value.plot_area_m2, 'м²')}`,
    `Зон: ${state.zones.length}`,
  ];
  if (value.areas_exceed_plot) {
    lines.push('Внимание: суммарная площадь зон превышает площадь участка; зоны не размещены на плане.');
  }
  lines.push('', 'Материалы:');

  value.bom.forEach((row, index) => {
    // material_spec_id distinguishes variants even when names happen to match.
    const purchase = row.package_l === null
      ? `${formatUnit(row.purchase_l, 'л')} россыпью / по объёму`
      : row.packages === null
        ? 'Количество упаковок не рассчитано'
        : `${formatRuNumber(row.packages)} уп. × ${formatUnit(row.package_l, 'л')}`;

    lines.push(
      `${index + 1}. ${plainLabel(row.material_spec_label)} (${MATERIAL_LABELS[row.material]}, ${row.material_spec_id})`,
      `   Нужно с запасом: ${formatUnit(row.purchase_l, 'л')}`,
      `   Купить: ${purchase}`,
      `   Фактически в упаковках: ${formatUnit(row.packed_volume_l, 'л')}`,
      `   Излишек: ${formatUnit(row.surplus_l, 'л')}`,
    );
    if (row.mass_required_kg !== null) {
      lines.push(`   Масса: ${formatUnit(row.mass_required_kg, 'кг')} требуется${row.mass_purchased_kg !== null ? ` / ${formatUnit(row.mass_purchased_kg, 'кг')} закуплено` : ''}`);
    }
  });
  lines.push('', 'Расчёт основан на введённых размерах, запасе и характеристиках материалов. Цены и строительные нормы не подставляются.');
  return lines.join('\n');
}
