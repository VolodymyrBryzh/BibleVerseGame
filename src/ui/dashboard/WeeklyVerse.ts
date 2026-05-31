import VersesDB from '../../core/database';
import VerseOfWeek from '../../core/verse-of-week';
import UI from '../ui';
import { TRANSLATIONS_META } from '../../constants/bibleData';
import { $, formatVerseText } from '../../utils/helpers';

const WeeklyVerse = {
	render(): string {
		return `<div id="weeklyVerseContainer"></div>`;
	},

	async update(): Promise<void> {
		const container = $('weeklyVerseContainer');
		if (!container) return;

		await VerseOfWeek.init();
		const allVerses = VersesDB.getAll();

		if (!allVerses.length) {
			container.innerHTML = `
				<div class="card" style="text-align:center; padding:32px 20px;">
					<p class="serif" style="font-style:italic; font-size:1rem; color:var(--text-muted); margin-bottom:12px;">Бібліотека порожня</p>
					<p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5;">Додайте вірші у розділі «Вірші», щоб розпочати.</p>
				</div>
			`;
			return;
		}

		const verseId = VerseOfWeek.getCurrentVerseId();
		let verse = verseId ? VersesDB.getById(verseId) : null;
		if (!verse) verse = allVerses[0];
		if (!verse) return;

		const transKeys = Object.keys(verse.translations);
		const transKey = transKeys[0] || '';
		const trans = verse.translations[transKey] || '';
		const reference = VersesDB.getReference(verse);
		const transName = TRANSLATIONS_META.find(t => t.key === transKey)?.name || transKey;

		// Build verse selector options
		const options = allVerses.map(v =>
			`<option value="${v.id}" ${v.id.toString() === verse!.id.toString() ? 'selected' : ''}>${VersesDB.getReference(v)}</option>`
		).join('');

		container.innerHTML = `
			<div class="verse-hero-card card">
				<div class="verse-hero-gradient">
					<div class="verse-hero-top">
						<span class="verse-hero-label">ВІРШ ДНЯ</span>
						<select id="weeklyVerseSelect" class="verse-hero-select">${options}</select>
					</div>
					<p class="verse-hero-text serif"><span class="verse-quote-open">«</span>${formatVerseText(trans)}<span class="verse-quote-close">»</span></p>
					<div class="verse-hero-bottom">
						<span class="verse-hero-ref">${reference}</span>
						<span class="verse-hero-trans">${transName}</span>
					</div>
				</div>
				<div class="verse-hero-action">
					<button id="btnVerseHeroStart" class="btn-primary">Вивчати зараз <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;vertical-align:middle;"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
				</div>
			</div>
		`;

		const select = $<HTMLSelectElement>('weeklyVerseSelect');
		if (select) {
			select.addEventListener('change', async () => {
				await VerseOfWeek.setManual(select.value);
				this.update();
			});
		}

		const startBtn = $('btnVerseHeroStart');
		if (startBtn) {
			startBtn.addEventListener('click', () => UI.navigate('screenGame'));
		}
	}
};

export default WeeklyVerse;
