import VersesDB from '../../core/database';
import UI from '../ui';
import { BibleVerse } from '../../constants/bibleData';
import { toast, $, escapeHtml } from '../../utils/helpers';

const VerseList = {
	render(verses?: BibleVerse[]): void {
		const all = verses || VersesDB.getAll();
		const countEl = $('verseCount');
		if (countEl) countEl.textContent = all.length.toString();

		const container = $('verseList');
		if (!container) return;

		if (!all.length) {
			container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Нічого не знайдено</p>';
			return;
		}

		const html = all.map(v => {
			const ref = escapeHtml(VersesDB.getReference(v));
			const tagsStr = v.tags?.length ? '· ' + v.tags.map(t => escapeHtml(t)).join(', ') : '';
			const transKeys = Object.keys(v.translations).length;
			const safeId = escapeHtml(v.id.toString());
			return `
				<div class="verse-list-item">
					<div>
						<div class="verse-list-ref">${ref}</div>
						<div class="verse-list-tags">${transKeys} переклад(ів) ${tagsStr}</div>
					</div>
					<div class="verse-list-actions">
						<button class="btn btn-sm btn-danger btn-remove-verse" data-verse-id="${safeId}">✕</button>
					</div>
				</div>
			`;
		}).join('');

		container.innerHTML = html;

		container.querySelectorAll('.btn-remove-verse').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const id = (e.currentTarget as HTMLElement).dataset.verseId;
				if (id) this.removeVerse(id);
			});
		});
	},

	handleSearch(): void {
		const query = $<HTMLInputElement>('verseSearch')?.value || '';
		const filtered = VersesDB.search(query);
		this.render(filtered);
	},

	async removeVerse(id: string): Promise<void> {
		if (!confirm('Видалити цей вірш?')) return;
		await VersesDB.removeVerse(id);
		this.render();
		UI.updateVerseFilter();
		toast('Вірш видалено');
	}
};

export default VerseList;
