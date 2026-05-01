import VersesDB from '../../core/database';
import { $ } from '../../utils/helpers';

const DailyVerse = {
	render(): string {
		return `<div id="dailyVerseContainer"></div>`;
	},

	update(): void {
		const container = $('dailyVerseContainer');
		if (!container) return;

		const allVerses = VersesDB.getAll();
		
		if (!allVerses.length) {
			container.innerHTML = `
				<div class="card empty-state" style="text-align:center; padding: 24px 20px; background: var(--bg-card); border: 2px dashed var(--accent-light); opacity: 0.8; margin-top: 0px;">
					<div style="font-size: 2.5rem; margin-bottom: 12px;">📖</div>
					<p style="font-weight: 700; color: var(--text); margin-bottom: 4px; font-size: 1.05rem;">Ваша бібліотека порожня</p>
					<p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.4;">Додайте вірші у налаштуваннях, щоб розпочати навчання.</p>
				</div>
			`;
			return;
		}

		// Логіка випадкового вірша на день
		const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
		const dailyVerse = allVerses[daySeed % allVerses.length];

		const transKeys = Object.keys(dailyVerse.translations);
		const trans = dailyVerse.translations[transKeys[0]] || '';

		container.innerHTML = `
			<div class="card" style="border-left: 4px solid var(--accent); margin-top: 0px;">
				<div class="card-title" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--accent); margin-bottom:8px;">Вірш дня</div>
				<p style="font-style: italic; margin-bottom:12px; font-size:1.1rem; line-height:1.5; color:var(--text);">"${trans}"</p>
				<div style="text-align:right; font-weight:700; color:var(--text-muted); font-size:0.9rem;">${VersesDB.getReference(dailyVerse)}</div>
			</div>
		`;
	}
};

export default DailyVerse;
