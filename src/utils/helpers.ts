/**
 * Shared utility functions — toast notifications, text processing, DOM helpers.
 */
import { GAME_CONFIG } from '../constants/config';

interface ToastElement extends HTMLElement {
  _timer?: ReturnType<typeof setTimeout>;
}

/** Escapes special HTML characters to prevent XSS */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

/** Show a toast notification */
export function toast(msg: string): void {
  const el = document.getElementById('toast') as ToastElement | null;
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  if (el._timer) clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), GAME_CONFIG.TOAST_DURATION_MS);
}

/** Split text into words */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Strip HTML tags: completely removes <sup>...</sup> (tag and content) and strips other tags keeping their content */
export function stripTags(s: string): string {
  if (!s) return '';
  const noSup = s.replace(/<sup\b[^>]*>.*?<\/sup>/gi, '');
  return noSup.replace(/<\/?[^>]+(>|$)/g, '');
}

/** Strips circled characters and HTML tags, suitable for short text snippets */
export function cleanSnippet(text: string): string {
  if (!text) return '';
  const noCircled = text.replace(/[Ⓐ-⓿①-⑳❶-➓@]/g, '');
  return stripTags(noCircled);
}

const PUNCTUATION_REGEX = /[.,;:!?«»""\"''ʼ'()—–\-]/g;

/** Normalize a string for comparison (lowercase, strip punctuation and formatting tags) */
export function normalize(s: string): string {
  if (!s) return '';
  const stripped = stripTags(s);
  return stripped.toLowerCase().replace(PUNCTUATION_REGEX, '').trim();
}

/** Fisher-Yates Shuffle */
export function shuffle<T>(array: readonly T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** DOM Helper */
export function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/** Formats verse text to include red text spans and italic */
export function formatVerseText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[Ⓐ-⓿①-⑳❶-➓@]/g, '')
    .replace(/<r>(.*?)<\/r>/g, '<span class="red-text">$1</span>')
    .replace(/<i>(.*?)<\/i>/g, '<i class="italic-text">$1</i>');
}

/** Prepares formatted text for tokenization by wrapping each word in its own tags */
export function prepareFormattedText(text: string): string {
  if (!text) return '';
  const cleaned = text.replace(/[Ⓐ-⓿①-⑳❶-➓@]/g, '').trim();
  return cleaned.replace(/<(r|i)>(.*?)<\/\1>/g, (_, tag, content) => {
    return content
      .split(/\s+/)
      .filter((w: string) => w.trim().length > 0)
      .map((w: string) => `<${tag}>${w}</${tag}>`)
      .join(' ');
  });
}
