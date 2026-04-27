/**
 * Shared utility functions — toast notifications, text processing.
 */

/** Show a toast notification */
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

/** Split text into words */
export function tokenize(text) {
  return text.split(/\s+/).filter(w => w.length > 0);
}

/** Normalize a string for comparison (lowercase, strip punctuation) */
export function normalize(s) {
  return s.toLowerCase().replace(/[.,;:!?«»""\"''ʼ'()—–\-]/g, '').trim();
}
