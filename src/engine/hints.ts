import XP from '../core/xp';
import { normalize, toast, $ } from '../utils/helpers';
import { GAME_CONFIG } from '../constants/config';

export interface HintState {
  hintsUsed: number;
  maxHints: number;
}

export function createHintState(): HintState {
  return { hintsUsed: 0, maxHints: GAME_CONFIG.MAX_HINTS };
}

export function showHintBtn(state: HintState, actions: HTMLElement): void {
  const existing = $('btnHint');
  if (existing) existing.remove();

  const hintBtn = document.createElement('button');
  hintBtn.id = 'btnHint';
  hintBtn.className = 'btn btn-sm btn-hint';
  hintBtn.innerHTML = `<svg class="hint-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>ПІДКАЗКА <span class="hint-cost">−${GAME_CONFIG.HINT_COST} XP</span> <span class="hint-count">(${state.maxHints - state.hintsUsed})</span>`;
  hintBtn.addEventListener('click', () => useHint(state));
  actions.parentElement?.insertBefore(hintBtn, actions);
}

export function removeHintBtn(): void {
  const btn = $('btnHint');
  if (btn) btn.remove();
}

function useHint(state: HintState): void {
  if (state.hintsUsed >= state.maxHints) {
    toast('Підказки закінчились');
    return;
  }
  if (!XP.deductHint()) {
    toast('Недостатньо XP');
    return;
  }
  state.hintsUsed++;

  const placed = document.querySelectorAll('#answerZone .answer-chip').length;
  const correctWords = (window as any)._gameCorrectWords as string[] | undefined;
  if (!correctWords) return;

  const nextWord = correctWords[placed];
  if (!nextWord) return;

  const chips = document.querySelectorAll('#wordBank .word-chip:not(.used)');
  for (let i = 0; i < chips.length; i++) {
    const chip = chips[i] as HTMLElement;
    const chipText = chip.textContent || '';
    if (normalize(chipText) === normalize(nextWord)) {
      chip.classList.add('hint-highlight');
      setTimeout(() => chip.classList.remove('hint-highlight'), 1500);
      break;
    }
  }

  const countEl = document.querySelector('.hint-count');
  if (countEl) countEl.textContent = `(${state.maxHints - state.hintsUsed})`;
  if (state.hintsUsed >= state.maxHints) {
    const btn = $('btnHint');
    if (btn) btn.classList.add('disabled');
  }

  const xpEl = $('xpCount');
  if (xpEl) xpEl.textContent = XP.getTotal().toString();
}
