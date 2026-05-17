import VersesDB from '../core/database';
import BibleLoader from '../core/loader';
import UI from './ui';
import { TRANSLATIONS_META, BibleVerse } from '../constants/bibleData';
import { toast, $, formatVerseText } from '../utils/helpers';

const Manage = {
	editingId: null as string | null,
	currentBookData: null as any,
	currentVerseTranslations: {} as Record<string, string>,
	_bookDropdownVersion: 0,
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

	_hasText(v: any): boolean {
		const t = v?.text;
		if (typeof t === 'string') return t.trim() !== '';
		if (Array.isArray(t)) return t.some((p: any) => {
			if (typeof p === 'string') return p.trim() !== '';
			if (typeof p === 'object' && p !== null) return Object.values(p).some((val: any) => typeof val === 'string' && val.trim() !== '');
			return false;
		});
		return false;
	},

	async _fetchJSON(url: string): Promise<any | null> {
		try {
			const resp = await fetch(url);
			if (!resp.ok) return null;
			const ct = resp.headers.get('content-type') || '';
			if (!ct.includes('json')) return null;
			return await resp.json();
		} catch { return null; }
	},

	async initTranslationDropdown(): Promise<void> {
		const select = $<HTMLSelectElement>('addSearchTranslation');
		if (!select) return;

		select.innerHTML = '<option value="">Перевірка...</option>';

		const validTranslations = await Promise.all(TRANSLATIONS_META.map(async (t) => {
			const codes = this.bookCodes;
			const testCodes = [codes[0], codes[18], codes[39]]; // gen, psa, mat

			for (const code of testCodes) {
				const data = await this._fetchJSON(`/bible/${t.key}/${code}.json`);
				if (data?.chapters?.some((ch: any) => ch.verses?.some((v: any) => this._hasText(v)))) {
					return t;
				}
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
		const version = ++this._bookDropdownVersion;
		const transKey = $<HTMLSelectElement>('addSearchTranslation')?.value || 'ubio';
		const select = $<HTMLSelectElement>('addBook');
		if (!select) return;

		select.innerHTML = '<option value="">Завантаження...</option>';
		this.bookNameMap = {};

		const checks = this.bookCodes.map(async (code) => {
			const data = await this._fetchJSON(`/bible/${transKey}/${code}.json`);
			if (!data) return null;

			const bookName = data.metadata?.book || code;
			const hasAnyContent = data.chapters?.some((ch: any) =>
				ch.verses?.some((v: any) => this._hasText(v))
			);

			if (hasAnyContent) return { bookName, code };
			return null;
		});

		const results = await Promise.all(checks);
		if (version !== this._bookDropdownVersion) return;

		this.bookNameMap = {};
		select.innerHTML = '<option value="">Оберіть книгу...</option>';

		results.forEach(r => {
			if (r) {
				this.bookNameMap[r.bookName] = r.code;
				const opt = document.createElement('option');
				opt.value = r.bookName;
				opt.textContent = r.bookName;
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
			const data = await this._fetchJSON(`/bible/${transKey}/${code}.json`);
			if (!data) throw new Error();
			this.currentBookData = data;

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
				if (this._hasText(v)) {
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
		const transKey = $<HTMLSelectElement>('addSearchTranslation')?.value || 'ubio';
		this.currentVerseTranslations = {};
		
		try {
			const data = await this._fetchJSON(`/bible/${transKey}/${code}.json`);
			if (data) {
				const chData = data.chapters?.find((c: any) => c.chapter === chapter);
				const vData = chData?.verses?.find((v: any) => v.verse === verse);

				const el = $('previewTransMain');
				if (el && vData?.text) {
					const text = vData.text;
					let tagged = '';
					if (typeof text === 'string') {
						tagged = text.trim();
					} else if (Array.isArray(text)) {
						tagged = text.map((part: any) => {
							if (typeof part === 'string') return part;
							if (part.red) return `<r>${part.red}</r>`;
							if (part.italic || part.i) return `<i>${part.italic || part.i}</i>`;
							if (part.text) return part.text;
							return '';
						}).join('');
					}
					
					this.currentVerseTranslations[transKey] = tagged;
					el.innerHTML = formatVerseText(tagged);
					toast('Текст завантажено');
				} else if (el) {
					el.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Текст не знайдено</span>';
				}
			}
		} catch (e) { 
			toast('Помилка завантаження тексту');
		}
	},

	renderTranslationFields(): void {
		const container = $('addTranslations');
		if (!container) return;

		container.innerHTML = `
			<div class="translation-preview-block" style="margin-bottom: 16px;">
				<div id="previewTransMain" class="verse-preview-text" style="padding: 16px; background: var(--bg-selected); border-radius: var(--radius-sm); border: 2px solid var(--accent-light); min-height: 60px; color: var(--text); line-height: 1.6; font-size: 1.1rem;">
					<span style="color: var(--text-muted); font-style: italic; font-size: 0.95rem;">Оберіть книгу та вірш...</span>
				</div>
			</div>
		`;
	},

	async saveVerse(): Promise<void> {
		const book = $<HTMLSelectElement>('addBook')?.value;
		const chapter = parseInt($<HTMLSelectElement>('addChapter')?.value || '0');
		const verse = parseInt($<HTMLSelectElement>('addVerse')?.value || '0');
		const tags = $<HTMLInputElement>('addTags')?.value.split(',').map(s => s.trim()).filter(Boolean) || [];

		if (!book || !chapter || !verse) return toast('Заповніть всі поля');

		const translations: Record<string, string> = { ...this.currentVerseTranslations };
		const hasAny = Object.keys(translations).length > 0;

		if (!hasAny) return toast('Текст перекладів не завантажено');

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
