import { tokenize, normalize, formatVerseText, stripTags, $ } from '../../utils/helpers';
import { GAME_CONFIG } from '../../constants/config';

export function startFillGaps(text: string, area: HTMLElement): string[] {
	const words = tokenize(text);
	const gapCount = Math.max(GAME_CONFIG.MIN_GAPS, Math.floor(words.length * GAME_CONFIG.FILL_GAPS_RATIO));

	const indices = new Set<number>();
	while (indices.size < gapCount && indices.size < words.length) {
		indices.add(Math.floor(Math.random() * words.length));
	}

	const gapData: string[] = [];
	let html = '<div class="gap-text">';
	words.forEach((w, i) => {
		if (indices.has(i)) {
			const gapIdx = gapData.length;
			gapData.push(w);
			const width = Math.max(60, w.length * 12);
			html += `<input class="gap-input" data-gap="${gapIdx}" style="width:${width}px" autocomplete="off" autocapitalize="off" spellcheck="false"> `;
		} else {
			html += formatVerseText(w) + ' ';
		}
	});
	html += '</div>';

	area.innerHTML = html;
	setTimeout(() => ($<HTMLInputElement>('.gap-input'))?.focus(), 100);

	return gapData;
}

export function checkFillGaps(gapData: string[]): { accuracy: number; success: boolean } {
	const inputs = document.querySelectorAll('.gap-input') as NodeListOf<HTMLInputElement>;
	let correct = 0;

	inputs.forEach(inp => {
		const expected = gapData[Number(inp.dataset.gap)];
		const isCorrect = normalize(inp.value) === normalize(expected);
		inp.classList.toggle('correct', isCorrect);
		inp.classList.toggle('wrong', !isCorrect);
		if (!isCorrect) inp.value = stripTags(expected);
		if (isCorrect) correct++;
	});

	const accuracy = gapData.length > 0 ? correct / gapData.length : 0;
	return { accuracy, success: accuracy >= GAME_CONFIG.PASSING_ACCURACY };
}
