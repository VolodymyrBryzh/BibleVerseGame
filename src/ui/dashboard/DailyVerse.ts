import VersesDB from '../../core/database';
import { $, formatVerseText } from '../../utils/helpers';

const DailyVerse = {
	render(): string {
		return `
			<div id="dailyVerseContainer" style="flex: 1; display: flex; flex-direction: column;"></div>
		`;
	},

	async update(): Promise<void> {
		const container = $('dailyVerseContainer');
		if (!container) return;

		const allVerses = VersesDB.getAll();
		
		// 1. Шукаємо в бібліотеці
		let dailyVerse = allVerses.find(v => v.book === 'PSA' && v.chapter === 33 && v.verse === 21);
		let trans = '';
		let reference = 'ПСАЛМИ 33:21';

		if (dailyVerse) {
			const transKeys = Object.keys(dailyVerse.translations);
			trans = dailyVerse.translations[transKeys[0]] || '';
			reference = VersesDB.getReference(dailyVerse);
		} else {
			// 2. Якщо в бібліотеці немає, вантажимо напряму з файлу
			try {
				const resp = await fetch('/bible/ubio/psa.json');
				if (resp.ok) {
					const data = await resp.json();
					const chData = data.chapters?.find((c: any) => c.chapter === 33);
					const vData = chData?.verses?.find((v: any) => v.verse === 21);
					if (vData && vData.text) {
						// Обробка як рядка, так і масиву (як ми робили в Manage)
						const text = vData.text;
						if (typeof text === 'string') {
							trans = text;
						} else if (Array.isArray(text)) {
							trans = text.map((part: any) => {
								if (typeof part === 'string') return part;
								if (part.red) return `<r>${part.red}</r>`;
								if (part.italic || part.i) return `<i>${part.italic || part.i}</i>`;
								return '';
							}).join('');
						}
					}
				}
			} catch (e) {
				console.error('Failed to fetch fallback daily verse', e);
			}
		}

		// 3. Якщо фіксований вірш не знайдено і бібліотека порожня
		if (!trans && !allVerses.length) {
			container.innerHTML = `
				<div class="card empty-state" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align:center; padding: 24px 20px; background: var(--bg-card); border: 2px dashed var(--accent-light); opacity: 0.8; margin-top: 0px;">
					<div style="font-size: 2.5rem; margin-bottom: 12px;">📖</div>
					<p style="font-weight: 700; color: var(--text); margin-bottom: 4px; font-size: 1.05rem;">Ваша бібліотека порожня</p>
					<p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.4;">Додайте вірші у налаштуваннях, щоб розпочати навчання.</p>
				</div>
			`;
			return;
		}

		// 4. Якщо фіксований не вдалося завантажити, але є інші вірші - беремо випадковий
		if (!trans && allVerses.length) {
			const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
			dailyVerse = allVerses[daySeed % allVerses.length];
			const transKeys = Object.keys(dailyVerse.translations);
			trans = dailyVerse.translations[transKeys[0]] || '';
			reference = VersesDB.getReference(dailyVerse);
		}

		container.innerHTML = `
			<div class="card" style="flex: 1; display: flex; flex-direction: column; border-left: 4px solid var(--accent); margin-top: 0px; overflow-y: auto;">
				<div class="card-title" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--accent); margin-bottom:12px; flex: 0 0 auto;">Вірш дня</div>
				<div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
					<p style="margin-bottom:16px; font-size:1.15rem; line-height:1.5; color:var(--text);">"${formatVerseText(trans)}"</p>
					<div style="text-align:right; font-weight:700; color:var(--text-muted); font-size:0.95rem;">${reference}</div>
				</div>
			</div>
		`;
	}
};

export default DailyVerse;
