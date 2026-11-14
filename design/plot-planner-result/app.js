const toast = document.querySelector('.mock-toast');
let toastTimer;

function showToast() {
  if (!toast) return;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2200);
}

document.querySelectorAll('[data-action="mock"]').forEach((control) => {
  control.addEventListener('click', (event) => {
    event.preventDefault();
    showToast();
  });
});

document.querySelectorAll('details > summary').forEach((summary) => {
  summary.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
    }
  });
});

const dock = document.querySelector('.result-dock a[href="#result"]');
if (dock) {
  dock.addEventListener('click', () => {
    window.setTimeout(() => document.querySelector('#result button')?.focus({ preventScroll: true }), 350);
  });
}

// Local design spike: on narrow screens, only one zone is expanded by default.
// Native <details> remains keyboard-accessible, with no hidden or duplicated form.
const zoneCards = Array.from(document.querySelectorAll('details.zone-card'));
const isMobileLayout = window.matchMedia('(max-width: 720px)');
if (isMobileLayout.matches) {
  zoneCards.forEach((card, index) => { card.open = index === 0; });
}
zoneCards.forEach((card) => {
  card.addEventListener('toggle', () => {
    if (!card.open || !isMobileLayout.matches) return;
    for (const other of zoneCards) {
      if (other !== card) other.open = false;
    }
  });
});
