import { tokenize, normalize, formatVerseText, stripTags, $ } from '../../utils/helpers';

export function startFillGaps(text: string, area: HTMLElement): string[] {
	const words = tokenize(text);
	const gapCount = Math.max(2, Math.floor(words.length * 0.3));

	const indices = new Set<number>();
	while (indices.size < gapCount) indices.add(Math.floor(Math.random() * words.length));

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
	setTimeout(() => ($('.gap-input') as HTMLInputElement)?.focus(), 100);

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

	const accuracy = correct / gapData.length;
	return { accuracy, success: accuracy >= 0.8 };
}
