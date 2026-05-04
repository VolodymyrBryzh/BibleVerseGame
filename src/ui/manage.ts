import VersesDB from '../core/database';
import BibleLoader from '../core/loader';
import UI from './ui';
import { TRANSLATIONS_META, BibleVerse } from '../constants/bibleData';
import { toast, $ } from '../utils/helpers';

const Manage = {
	editingId: null as string | null,
	currentBookData: null as any,
	bookCodes: [
		'gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa',
		'1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro',
		'ecc', 'sng', 'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo',
		'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal',
		'mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph',
		'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas',
		'1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'
	],
	// Dynamic mapping: Book Name -> Code (populated during initBookDropdown)
	bookNameMap: {} as Record<string, string>,

	init(): void {
		this.renderTranslationFields();
		this.renderVerseList();
		this.initTranslationDropdown();
	},

	async initTranslationDropdown(): Promise<void> {
		const select = $<HTMLSelectElement>('addSearchTranslation');
		if (!select) return;

		select.innerHTML = '<option value="">Перевірка...</option>';

		// Check which translations have at least one valid book
		const validTranslations = await Promise.all(TRANSLATIONS_META.map(async (t) => {
			// We only need to find ONE book with content to consider the translation valid
			// To speed up, we check Genesis first, then others if needed
			const codes = this.bookCodes;
			const testCodes = [codes[0], codes[18], codes[39]]; // gen, psa, mat

			for (const code of testCodes) {
				try {
					const resp = await fetch(`/bible/${t.key}/${code}.json`);
					if (resp.ok) {
						const data = await resp.json();
						const hasContent = data.chapters?.some((ch: any) =>
							ch.verses?.some((v: any) => v.text && v.text.trim() !== '')
						);
						if (hasContent) return t;
					}
				} catch (e) { }
			}
			return null;
		}));

		const filtered = validTranslations.filter(Boolean) as typeof TRANSLATIONS_META;

		if (filtered.length === 0) {
			select.innerHTML = '<option value="">Немає доступних перекладів</option>';
			return;
		}

		select.innerHTML = filtered.map(t =>
			`<option value="${t.key}">${t.name}</option>`
		).join('');

		this.initBookDropdown();
	},

	onTranslationChange(): void {
		this.initBookDropdown();
	},

	async initBookDropdown(): Promise<void> {
		const transKey = $<HTMLSelectElement>('addSearchTranslation')?.value || 'ubio';
		const select = $<HTMLSelectElement>('addBook');
		if (!select) return;

		this.bookNameMap = {};
		const checks = this.bookCodes.map(async (code) => {
			try {
				const resp = await fetch(`/bible/${transKey}/${code}.json`);
				if (!resp.ok) return null;

				const data = await resp.json();
				const bookName = data.metadata?.book || code;
				const hasAnyContent = data.chapters?.some((ch: any) =>
					ch.verses?.some((v: any) => v.text && v.text.trim() !== '')
				);

				if (hasAnyContent) {
					this.bookNameMap[bookName] = code;
					return bookName;
				}
				return null;
			} catch (e) {
				return null;
			}
		});

		const results = await Promise.all(checks);
		select.innerHTML = '<option value="">Оберіть книгу...</option>';

		results.forEach(name => {
			if (name) {
				const opt = document.createElement('option');
				opt.value = name;
				opt.textContent = name;
				select.appendChild(opt);
			}
		});
	},

	async onBookChange(): Promise<void> {
		const transKey = $<HTMLSelectElement>('addSearchTranslation')?.value || 'ubio';
		const book = $<HTMLSelectElement>('addBook')?.value;
		const chSelect = $<HTMLSelectElement>('addChapter');
		const vSelect = $<HTMLSelectElement>('addVerse');
		if (!chSelect || !vSelect) return;

		chSelect.innerHTML = '<option value="">--</option>';
		vSelect.innerHTML = '<option value="">--</option>';
		this.currentBookData = null;

		if (!book) return;

		const code = this.bookNameMap[book];
		try {
			const resp = await fetch(`/bible/${transKey}/${code}.json`);
			if (!resp.ok) throw new Error();
			this.currentBookData = await resp.json();

			this.currentBookData.chapters.forEach((ch: any) => {
				// Only show chapter if it has at least one non-empty verse
				const hasContent = ch.verses.some((v: any) => v.text && v.text.trim() !== '');
				if (hasContent) {
					const opt = document.createElement('option');
					opt.value = ch.chapter.toString();
					opt.textContent = ch.chapter.toString();
					chSelect.appendChild(opt);
				}
			});
		} catch (e) {
			toast('Помилка завантаження книги');
		}
	},

	onChapterChange(): void {
		const chapter = $<HTMLSelectElement>('addChapter')?.value;
		const vSelect = $<HTMLSelectElement>('addVerse');
		if (!vSelect || !this.currentBookData) return;

		vSelect.innerHTML = '<option value="">--</option>';
		if (!chapter) return;

		const chData = this.currentBookData.chapters.find((c: any) => c.chapter.toString() === chapter);
		if (chData) {
			chData.verses.forEach((v: any) => {
				// Only show verses that have text
				if (v.text && v.text.trim() !== '') {
					const opt = document.createElement('option');
					opt.value = v.verse.toString();
					opt.textContent = v.verse.toString();
					vSelect.appendChild(opt);
				}
			});
		}
	},

	async onVerseChange(): Promise<void> {
		const book = $<HTMLSelectElement>('addBook')?.value;
		const chapter = parseInt($<HTMLSelectElement>('addChapter')?.value || '0');
		const verse = parseInt($<HTMLSelectElement>('addVerse')?.value || '0');
		if (!book || !chapter || !verse) return;

		toast('Завантажую текст...');

		const code = this.bookNameMap[book];
		let foundCount = 0;

		for (const meta of TRANSLATIONS_META) {
			try {
				const url = `/bible/${meta.key}/${code}.json`;
				const resp = await fetch(url);
				if (!resp.ok) continue;

				const data = await resp.json();
				const chData = data.chapters?.find((c: any) => c.chapter === chapter);
				const vData = chData?.verses?.find((v: any) => v.verse === verse);

				const el = $<HTMLTextAreaElement>(`addTrans_${meta.key}`);
				if (el) {
					el.value = vData?.text?.trim() || '';
					if (el.value) foundCount++;
				}
			} catch (e) { }
		}

		if (foundCount > 0) toast(`Текст завантажено (${foundCount})`);
		else toast('Текст не знайдено');
	},

	renderTranslationFields(): void {
		const container = $('addTranslations');
		if (!container) return;

		container.innerHTML = TRANSLATIONS_META.map(t => `
			<div class="translation-block">
				<h4>${t.name}</h4>
				<div class="form-group" style="margin:0">
					<textarea id="addTrans_${t.key}" placeholder="Текст перекладу (необовʼязково)"></textarea>
				</div>
			</div>
		`).join('');
	},

	async saveVerse(): Promise<void> {
		const book = $<HTMLSelectElement>('addBook')?.value;
		const chapter = parseInt($<HTMLSelectElement>('addChapter')?.value || '0');
		const verse = parseInt($<HTMLSelectElement>('addVerse')?.value || '0');
		const tags = $<HTMLInputElement>('addTags')?.value.split(',').map(s => s.trim()).filter(Boolean) || [];

		if (!book || !chapter || !verse) return toast('Заповніть всі поля');

		const translations: Record<string, string> = {};
		let hasAny = false;

		TRANSLATIONS_META.forEach(t => {
			const el = $<HTMLTextAreaElement>(`addTrans_${t.key}`);
			const text = el?.value.trim() || '';
			if (text) {
				translations[t.key] = text;
				hasAny = true;
			}
		});

		if (!hasAny) return toast('Додайте хоча б один переклад');

		await VersesDB.addVerse({
			id: Date.now().toString(),
			book,
			chapter,
			verse,
			tags,
			translations
		} as BibleVerse);

		toast('Вірш додано!');
		this._clearForm();
		this.renderVerseList();
		UI.updateVerseFilter();
	},

	_clearForm(): void {
		const book = $<HTMLSelectElement>('addBook');
		const chapter = $<HTMLSelectElement>('addChapter');
		const verse = $<HTMLSelectElement>('addVerse');
		const tags = $<HTMLInputElement>('addTags');

		if (book) book.value = '';
		if (chapter) chapter.innerHTML = '<option value="">--</option>';
		if (verse) verse.innerHTML = '<option value="">--</option>';
		if (tags) tags.value = '';

		TRANSLATIONS_META.forEach(t => {
			const el = $<HTMLTextAreaElement>(`addTrans_${t.key}`);
			if (el) el.value = '';
		});
	},

	renderVerseList(verses?: BibleVerse[]): void {
		const all = verses || VersesDB.getAll();
		const countEl = $('verseCount');
		if (countEl) countEl.textContent = all.length.toString();

		const container = $('verseList');
		if (!container) return;

		if (!all.length) {
			container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Нічого не знайдено</p>';
			return;
		}

		// Optimization: Build entire HTML string first
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
		this.renderVerseList(filtered);
	},

	async removeVerse(id: string): Promise<void> {
		if (!confirm('Видалити цей вірш?')) return;
		await VersesDB.removeVerse(id);
		this.renderVerseList();
		UI.updateVerseFilter();
		toast('Вірш видалено');
	},

	exportData(): void {
		const json = VersesDB.exportAll();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `bible-verses-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
		toast('Експортовано!');
	},

	importData(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const content = e.target?.result as string;
				const count = await VersesDB.importVerses(content);
				toast(`Імпортовано ${count} віршів`);
				this.renderVerseList();
				UI.updateVerseFilter();
			} catch (err: any) {
				toast('Помилка імпорту: ' + err.message);
			}
		};
		reader.readAsText(file);
		input.value = '';
	},

	async importBookJSON(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const content = JSON.parse(e.target?.result as string);
				const count = await BibleLoader.loadBook(content);
				toast(`Завантажено книгу: ${content.metadata.book} (${count} віршів)`);
				this.renderVerseList();
				UI.updateVerseFilter();
			} catch (err: any) {
				toast('Помилка завантаження книги: ' + err.message);
			}
		};
		reader.readAsText(file);
		input.value = '';
	}
};

export default Manage;
