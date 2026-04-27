/**
 * Shared utility functions — toast notifications, text processing.
 */

interface ToastElement extends HTMLElement {
  _timer?: number;
}

/** Show a toast notification */
export function toast(msg: string): void {
  const el = document.getElementById('toast') as ToastElement;
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  if (el._timer) clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2200) as unknown as number;
}

/** Split text into words */
export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0);
}

/** Normalize a string for comparison (lowercase, strip punctuation) */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[.,;:!?«»""\"''ʼ'()—–\-]/g, '').trim();
}

/** Fisher-Yates Shuffle */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** DOM Helper */
export function $<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T;
}
