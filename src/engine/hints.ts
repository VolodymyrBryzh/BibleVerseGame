import XP from '../core/xp';
import { normalize, toast, $ } from '../utils/helpers';

const MAX_HINTS = 3;

export interface HintState {
	hintsUsed: number;
	maxHints: number;
}

export function createHintState(): HintState {
	return { hintsUsed: 0, maxHints: MAX_HINTS };
}

export function showHintBtn(state: HintState, actions: HTMLElement): void {
	const existing = $('btnHint');
	if (existing) existing.remove();

	const hintBtn = document.createElement('button');
	hintBtn.id = 'btnHint';
	hintBtn.className = 'btn btn-sm btn-hint';
	hintBtn.innerHTML = `<span class="hint-icon">💡</span> ПІДКАЗКА <span class="hint-cost">−5 XP</span> <span class="hint-count">(${state.maxHints - state.hintsUsed})</span>`;
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

	// Find the next correct word position
	const placed = document.querySelectorAll('#answerZone .answer-chip').length;
	const correctWords = (window as any)._gameCorrectWords as string[] | undefined;
	if (!correctWords) return;

	const nextWord = correctWords[placed];
	if (!nextWord) return;

	const chips = document.querySelectorAll('#wordBank .word-chip:not(.used)');
	for (const chip of chips) {
		const chipText = (chip as HTMLElement).textContent || '';
		if (normalize(chipText) === normalize(nextWord)) {
			(chip as HTMLElement).classList.add('hint-highlight');
			setTimeout(() => (chip as HTMLElement).classList.remove('hint-highlight'), 1500);
			break;
		}
	}

	const countEl = document.querySelector('.hint-count');
	if (countEl) countEl.textContent = `(${state.maxHints - state.hintsUsed})`;
	if (state.hintsUsed >= state.maxHints) {
		const btn = $('btnHint');
		if (btn) btn.classList.add('disabled');
	}

	const xpEl = $('streakCount');
	if (xpEl) xpEl.textContent = XP.getTotal().toString();
}
