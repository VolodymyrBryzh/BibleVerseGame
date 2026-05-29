import VersesDB from '../../core/database';
import UI from '../ui';
import { BibleVerse } from '../../constants/bibleData';
import { toast, $ } from '../../utils/helpers';

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
			const ref = VersesDB.getReference(v);
			const transKeys = Object.keys(v.translations).length;
			return `
				<div class="verse-list-item">
					<div>
						<div class="verse-list-ref">${ref}</div>
						<div class="verse-list-tags">${transKeys} переклад(ів) ${v.tags?.length ? '· ' + v.tags.join(', ') : ''}</div>
					</div>
					<div class="verse-list-actions">
						<button class="btn btn-sm btn-danger" onclick="Manage.removeVerse('${v.id}')">✕</button>
					</div>
				</div>
			`;
		}).join('');

		container.innerHTML = html;
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
