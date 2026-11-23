/**
 * Opt-in local design comparison. Never load on an indexable build.
 * Preview choices are purely presentational; calculation and share hashes stay intact.
 */
export type DesignPreviewVariant = 'rayon' | 'atlas' | 'ledger';

const PARAM = 'dm-variant';
const VARIANTS: ReadonlyArray<{ id: DesignPreviewVariant; label: string; description: string }> = [
  { id: 'rayon', label: 'Rayon Workspace', description: 'Утверждённая рабочая композиция' },
  { id: 'atlas', label: 'Полевой атлас', description: 'Редакционная геометрия и измерения' },
  { id: 'ledger', label: 'Ведомость материалов', description: 'Акцент на закупочных итогах' },
];

function knownVariant(value: string | null): DesignPreviewVariant {
  return value === 'atlas' || value === 'ledger' ? value : 'rayon';
}

export function mountDesignPreview(): void {
  // Production builds exclude this module via import.meta.env.DEV in main.ts.
  // The extra host guard also prevents exposing the selector on a remote Vite dev server.
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return;

  const host = document.querySelector<HTMLElement>('#app');
  if (!host || document.getElementById('dm-design-preview')) return;

  const bar = document.createElement('section');
  bar.id = 'dm-design-preview';
  bar.className = 'dm-design-preview-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Примерка дизайна');
  bar.setAttribute('data-testid', 'dm-design-preview');

  const heading = document.createElement('strong');
  heading.textContent = 'Примерка дизайна · только локально';
  bar.append(heading);

  const controls = document.createElement('div');
  controls.className = 'dm-design-preview-options';
  const buttons = new Map<DesignPreviewVariant, HTMLButtonElement>();

  for (const variant of VARIANTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.previewVariant = variant.id;
    button.textContent = variant.label;
    button.title = variant.description;
    button.addEventListener('click', () => {
      const url = new URL(window.location.href);
      if (variant.id === 'rayon') url.searchParams.delete(PARAM);
      else url.searchParams.set(PARAM, variant.id);
      window.history.pushState(window.history.state, '', url);
      syncFromUrl();
    });
    controls.append(button);
    buttons.set(variant.id, button);
  }
  bar.append(controls);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'dm-design-preview-close';
  close.textContent = 'Скрыть панель';
  close.addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('select');
    window.history.pushState(window.history.state, '', url);
    syncFromUrl();
  });
  bar.append(close);
  host.before(bar);

  function syncFromUrl(): void {
    const url = new URL(window.location.href);
    const variant = knownVariant(url.searchParams.get(PARAM));
    const shouldShow = url.searchParams.has('select');
    // No dataset at all in the default view: exact visual baseline is preserved.
    if (variant === 'rayon') delete document.documentElement.dataset.dmPreview;
    else document.documentElement.dataset.dmPreview = variant;
    bar.hidden = !shouldShow;
    for (const [id, button] of buttons) {
      button.setAttribute('aria-pressed', String(id === variant));
    }
  }

  window.addEventListener('popstate', syncFromUrl);
  syncFromUrl();
}
