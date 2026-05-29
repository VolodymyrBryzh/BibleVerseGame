import { tokenize, normalize, formatVerseText, $ } from '../../utils/helpers';

export function startContinue(text: string, area: HTMLElement): { correctWords: string[]; fullText: string } {
	const words = tokenize(text);
	const splitAt = Math.ceil(words.length / 2);
	const given = words.slice(0, splitAt);
	const expected = words.slice(splitAt);

	const givenHTML = given.map(w => formatVerseText(w)).join(' ');
	area.innerHTML = `
		<div class="continue-given">${givenHTML}</div>
		<textarea id="continueInput" class="continue-textarea" rows="4"
			placeholder="Продовж вірш..."></textarea>
	`;

	setTimeout(() => ($('continueInput') as HTMLTextAreaElement)?.focus(), 100);

	return { correctWords: expected, fullText: text };
}

export function checkContinue(correctWords: string[]): { accuracy: number; success: boolean } {
	const input = $<HTMLTextAreaElement>('continueInput');
	const userText = input?.value.trim() || '';

	if (!userText) return { accuracy: -1, success: false }; // -1 means empty

	const userWords = tokenize(userText);
	let correct = 0;
	for (let i = 0; i < correctWords.length; i++) {
		if (userWords[i] && normalize(userWords[i]) === normalize(correctWords[i])) correct++;
	}

	const accuracy = correctWords.length > 0 ? correct / correctWords.length : 0;
	return { accuracy, success: accuracy >= 0.8 };
}
