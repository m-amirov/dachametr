import { mountApp } from './ui/app.ts';

const root = document.querySelector<HTMLElement>('#app');

if (!root) throw new Error('app_root_missing');

mountApp(root);
