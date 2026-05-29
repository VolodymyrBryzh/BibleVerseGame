import VersesDB from '../../core/database';
import VerseOfWeek from '../../core/verse-of-week';
import { $, formatVerseText } from '../../utils/helpers';

const WeeklyVerse = {
	render(): string {
		return `
			<div id="weeklyVerseContainer" style="flex: 1; display: flex; flex-direction: column;"></div>
		`;
	},

	async update(): Promise<void> {
		const container = $('weeklyVerseContainer');
		if (!container) return;

		await VerseOfWeek.init();
		const allVerses = VersesDB.getAll();

		if (!allVerses.length) {
			container.innerHTML = `
				<div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding:32px 0; text-align:center;">
					<div style="font-family:var(--font-serif); font-style:italic; font-size:1rem; color:var(--text-muted); margin-bottom:16px;">Бібліотека порожня</div>
					<p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5;">Додайте вірші у розділі «Вірші», щоб розпочати.</p>
				</div>
			`;
			return;
		}

		const verseId = VerseOfWeek.getCurrentVerseId();
		let verse = verseId ? VersesDB.getById(verseId) : null;

		// Fallback if the saved verse was deleted
		if (!verse && allVerses.length) {
			verse = allVerses[0];
		}
		if (!verse) return;

		const transKeys = Object.keys(verse.translations);
		const trans = verse.translations[transKeys[0]] || '';
		const reference = VersesDB.getReference(verse);
		const isManual = VerseOfWeek.isManual();

		// Build verse options for the selector
		const options = allVerses.map(v =>
			`<option value="${v.id}" ${v.id.toString() === verse!.id.toString() ? 'selected' : ''}>${VersesDB.getReference(v)}</option>`
		).join('');

		container.innerHTML = `
			<div class="weekly-verse-block">
				<div class="weekly-verse-header">
					<div class="weekly-verse-label">
						<span class="weekly-verse-tag">ВІРШ ТИЖНЯ</span>
						${isManual ? '<span class="weekly-verse-manual">вручну</span>' : ''}
					</div>
					<select id="weeklyVerseSelect" class="weekly-verse-select">
						${options}
					</select>
				</div>
				<p class="weekly-verse-text">"${formatVerseText(trans)}"</p>
				<div class="weekly-verse-ref">${reference}</div>
			</div>
		`;

		// Bind the selector
		const select = $<HTMLSelectElement>('weeklyVerseSelect');
		if (select) {
			select.addEventListener('change', async () => {
				await VerseOfWeek.setManual(select.value);
				this.update();
			});
		}
	}
};

export default WeeklyVerse;
