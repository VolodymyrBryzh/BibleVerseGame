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

		let dailyVerse = allVerses.find(v => v.book === 'PSA' && v.chapter === 33 && v.verse === 21);
		let trans = '';
		let reference = 'ПСАЛМИ 33:21';

		if (dailyVerse) {
			const transKeys = Object.keys(dailyVerse.translations);
			trans = dailyVerse.translations[transKeys[0]] || '';
			reference = VersesDB.getReference(dailyVerse);
		} else {
			try {
				const resp = await fetch('/bible/ubio/psa.json');
				if (resp.ok) {
					const data = await resp.json();
					const chData = data.chapters?.find((c: any) => c.chapter === 33);
					const vData = chData?.verses?.find((v: any) => v.verse === 21);
					if (vData && vData.text) {
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

		if (!trans && !allVerses.length) {
			container.innerHTML = `
				<div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding:32px 0; text-align:center;">
					<div style="font-family:var(--font-serif); font-style:italic; font-size:1rem; color:var(--text-muted); margin-bottom:16px;">Бібліотека порожня</div>
					<p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5;">Додайте вірші у розділі «Вірші», щоб розпочати.</p>
				</div>
			`;
			return;
		}

		if (!trans && allVerses.length) {
			const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
			dailyVerse = allVerses[daySeed % allVerses.length];
			const transKeys = Object.keys(dailyVerse.translations);
			trans = dailyVerse.translations[transKeys[0]] || '';
			reference = VersesDB.getReference(dailyVerse);
		}

		container.innerHTML = `
			<div style="padding:32px 0; border-left:1px solid var(--border);">
				<div style="padding-left:20px;">
					<div style="font-family:var(--font-mono); font-size:0.625rem; letter-spacing:1.2px; color:var(--text-muted); font-weight:500; text-transform:uppercase; margin-bottom:12px;">Вірш дня</div>
					<p style="font-family:var(--font-serif); font-style:italic; font-size:1.1rem; line-height:1.5; color:var(--text-light); margin-bottom:16px;">"${formatVerseText(trans)}"</p>
					<div style="font-family:var(--font-mono); font-size:0.68rem; font-weight:500; color:var(--text-muted); letter-spacing:0.6px;">${reference}</div>
				</div>
			</div>
		`;
	}
};

export default DailyVerse;
