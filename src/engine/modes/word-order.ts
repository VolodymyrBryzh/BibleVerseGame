import { tokenize, normalize, shuffle, formatVerseText, $ } from '../../utils/helpers';

export function startWordOrder(text: string, area: HTMLElement): string[] {
	const correctWords = tokenize(text);

	let shuffled = shuffle(correctWords);
	if (shuffled.join(' ') === correctWords.join(' ')) {
		shuffled.reverse();
	}

	area.innerHTML = `
		<div class="answer-zone" id="answerZone"></div>
		<div class="word-bank" id="wordBank">
			${shuffled.map((w, i) => `<span class="word-chip" data-idx="${i}">${formatVerseText(w)}</span>`).join('')}
		</div>
	`;

	const bank = $('wordBank');
	if (bank) {
		bank.onclick = (e) => {
			const target = e.target as HTMLElement;
			if (target.classList.contains('word-chip')) pickWord(target);
		};
	}

	return correctWords;
}

export function pickWord(el: HTMLElement): void {
	if (el.classList.contains('used')) return;
	el.classList.add('used');

	const zone = $('answerZone');
	if (!zone) return;

	const chip = document.createElement('span');
	chip.className = 'answer-chip';
	chip.innerHTML = el.innerHTML;
	chip.onclick = () => {
		el.classList.remove('used');
		chip.remove();
	};
	zone.appendChild(chip);
}

export function checkWordOrder(correctWords: string[]): { accuracy: number; success: boolean } {
	const chips = document.querySelectorAll('#answerZone .answer-chip');
	const userWords = Array.from(chips).map(c => normalize(c.textContent || ''));

	if (userWords.length !== correctWords.length) {
		return { accuracy: -1, success: false }; // -1 means "not all placed"
	}

	const correct = userWords.filter((w, i) => w === normalize(correctWords[i])).length;
	const accuracy = correct / correctWords.length;
	return { accuracy, success: accuracy === 1 };
}
