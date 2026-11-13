---
name: interaction-reliability
description: "Use when implementing or auditing responsive calculators, touch/pointer controls, form lifecycle, state persistence, copy/share/print, reload/back actions and real mobile or tablet browser behavior."
---

# Browser interactions and lifecycle reliability
1. Before change capture actual browser/devices, user path and expected state. Eskizno-derived regression classes: click/change not firing on Huawei/Yandex Browser, tablet bottom clipping and unexpected reload.
2. Design state machine: empty/editing/valid/error/result/loading(if needed), unknown or disabled action; a click or UI highlight is not proof of persisted result.
3. Keep raw input string while typing (ru-RU comma, `1,`, backspace), validate separately and preserve cursor/focus; base-number math is typed and independent of React.
4. Route/navigation/back/reload/share URL: versioned schema, safe decode and deterministic restoration, no PII; invalid URL becomes actionable error, not corrupted result.
5. Touch/scroll/pinch/long press: constrain hit targets, distinguish scroll vs drag, respect pointercancel; avoid global wheel handlers and hijacking browser zoom; no accidental calculation update from gestures.
6. Responsive viewport/zoom/keyboard/soft keyboard: test 320,390,768,1024,1440; 200%/400% when applicable; portrait and landscape, modal overlay, sticky action and footer.
7. Capture live screenshot plus console/network errors for current SHA. Chrome desktop emulation is not evidence for Huawei/Yandex Browser device: mark physical test BLOCKED if inaccessible.
8. Test input errors, copy/print/share permission failures and reload during editing; bounded retries only for genuinely idempotent local actions, never auto-submit an uncertain external action.
Exit: browser-observed critical user journey + state preservation evidence; otherwise BLOCKED_INTERACTION_EVIDENCE.
