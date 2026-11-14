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
