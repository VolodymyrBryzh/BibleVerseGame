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

/** Normalize a string for comparison (lowercase, strip punctuation and formatting tags) */
export function normalize(s: string): string {
  const stripped = s.replace(/<\/?[ri]>/g, ''); // Strip <r> or <i> tags
  return stripped.toLowerCase().replace(/[.,;:!?«»""\"''ʼ'()—–\-]/g, '').trim();
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

/** Formats verse text to include red text spans and italic */
export function formatVerseText(text: string): string {
  return text
    .replace(/<r>(.*?)<\/r>/g, '<span class="red-text">$1</span>')
    .replace(/<i>(.*?)<\/i>/g, '<i class="italic-text">$1</i>');
}

/** Prepares formatted text for tokenization by wrapping each word in its own tags */
export function prepareFormattedText(text: string): string {
  return text.replace(/<(r|i)>(.*?)<\/\1>/g, (_, tag, content) => {
    return content.split(/\s+/).map((w: string) => w.trim() ? `<${tag}>${w}</${tag}>` : '').join(' ');
  });
}
