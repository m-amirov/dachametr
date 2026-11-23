/// <reference types="vite/client" />
import { mountApp } from './ui/app.ts';

const root = document.querySelector<HTMLElement>('#app');

if (!root) throw new Error('app_root_missing');

mountApp(root);

// Owner-only design comparison: the import is removed from production bundles.
if (import.meta.env.DEV) {
  void import('./ui/design-preview.ts').then(({ mountDesignPreview }) => mountDesignPreview());
}
