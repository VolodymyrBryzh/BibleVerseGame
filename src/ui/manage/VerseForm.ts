import { TRANSLATIONS_META } from '../../constants/bibleData';
import VersesDB from '../../core/database';
import { toast, $, formatVerseText } from '../../utils/helpers';

const BOOK_CODES = [
	'gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa',
	'1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro',
	'ecc', 'sng', 'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo',
	'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal',
	'mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph',
	'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas',
	'1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'
];

const VerseForm = {
	currentBookData: null as any,
	currentVerseTranslations: {} as Record<string, string>,
	bookNameMap: {} as Record<string, string>,
	_bookDropdownVersion: 0,

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

	_extractTaggedText(vData: any): string {
		const text = vData.text;
		if (typeof text === 'string') return text.trim();
		if (Array.isArray(text)) {
			return text.map((part: any) => {
				if (typeof part === 'string') return part;
				if (part.red) return `<r>${part.red}</r>`;
				if (part.italic || part.i) return `<i>${part.italic || part.i}</i>`;
				if (part.text) return part.text;
				return '';
			}).join('');
		}
		return '';
	},

	async initTranslationDropdown(): Promise<void> {
		const select = $<HTMLSelectElement>('addSearchTranslation');
		if (!select) return;

		select.innerHTML = '<option value="">Перевірка...</option>';

		const validTranslations = await Promise.all(TRANSLATIONS_META.map(async (t) => {
			const testCodes = [BOOK_CODES[0], BOOK_CODES[18], BOOK_CODES[39]];
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

		const checks = BOOK_CODES.map(async (code) => {
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
		const vToSelect = $<HTMLSelectElement>('addVerseTo');
		if (vToSelect) vToSelect.innerHTML = '<option value="">--</option>';
		this.currentBookData = null;

		if (!book) return;

		const code = this.bookNameMap[book];
		try {
			const data = await this._fetchJSON(`/bible/${transKey}/${code}.json`);
			if (!data) throw new Error();
			this.currentBookData = data;

			this.currentBookData.chapters.forEach((ch: any) => {
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
		const vToSelect = $<HTMLSelectElement>('addVerseTo');
		if (!vSelect || !this.currentBookData) return;

		vSelect.innerHTML = '<option value="">--</option>';
		if (vToSelect) vToSelect.innerHTML = '<option value="">--</option>';
		if (!chapter) return;

		const chData = this.currentBookData.chapters.find((c: any) => c.chapter.toString() === chapter);
		if (chData) {
			chData.verses.forEach((v: any) => {
				if (this._hasText(v)) {
					const opt = document.createElement('option');
					opt.value = v.verse.toString();
					opt.textContent = v.verse.toString();
					vSelect.appendChild(opt);
					if (vToSelect) vToSelect.appendChild(opt.cloneNode(true));
				}
			});
		}
	},

	async onVerseChange(): Promise<void> {
		const book = $<HTMLSelectElement>('addBook')?.value;
		const chapter = parseInt($<HTMLSelectElement>('addChapter')?.value || '0');
		const verseFrom = parseInt($<HTMLSelectElement>('addVerse')?.value || '0');
		const verseTo = parseInt($<HTMLSelectElement>('addVerseTo')?.value || '0') || verseFrom;
		if (!book || !chapter || !verseFrom) return;

		toast('Завантажую текст...');

		const code = this.bookNameMap[book];
		const transKey = $<HTMLSelectElement>('addSearchTranslation')?.value || 'ubio';
		this.currentVerseTranslations = {};

		try {
			const data = await this._fetchJSON(`/bible/${transKey}/${code}.json`);
			if (data) {
				const chData = data.chapters?.find((c: any) => c.chapter === chapter);
				const el = $('previewTransMain');
				const start = Math.min(verseFrom, verseTo);
				const end = Math.max(verseFrom, verseTo);

				let allTagged = '';
				for (let v = start; v <= end; v++) {
					const vData = chData?.verses?.find((vr: any) => vr.verse === v);
					if (vData?.text) {
						const tagged = this._extractTaggedText(vData);
						if (tagged) allTagged += (allTagged ? ' ' : '') + tagged;
					}
				}

				if (el && allTagged) {
					this.currentVerseTranslations[transKey] = allTagged;
					el.innerHTML = formatVerseText(allTagged);
					const count = end - start + 1;
					toast(count > 1 ? `Завантажено ${count} віршів` : 'Текст завантажено');
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

	async saveVerse(onSaved: () => void): Promise<void> {
		const book = $<HTMLSelectElement>('addBook')?.value;
		const chapter = parseInt($<HTMLSelectElement>('addChapter')?.value || '0');
		const verseFrom = parseInt($<HTMLSelectElement>('addVerse')?.value || '0');
		const verseTo = parseInt($<HTMLSelectElement>('addVerseTo')?.value || '0') || verseFrom;
		const verse = verseFrom;
		const tags = $<HTMLInputElement>('addTags')?.value.split(',').map(s => s.trim()).filter(Boolean) || [];

		if (!book || !chapter || !verse) return toast('Заповніть всі поля');

		const translations: Record<string, string> = { ...this.currentVerseTranslations };
		const hasAny = Object.keys(translations).length > 0;

		if (!hasAny) return toast('Текст перекладів не завантажено');

		try {
			const endVerse = Math.max(verseFrom, verseTo);
			const verseData: any = {
				id: Date.now().toString(),
				book,
				chapter,
				verse,
				tags,
				translations
			};
			if (endVerse > verseFrom) verseData.verseTo = endVerse;

			console.log('Saving verse:', JSON.stringify(verseData));
			await VersesDB.addVerse(verseData);

			toast('Вірш додано!');
			this.clearForm();
			onSaved();
		} catch (e: any) {
			console.error('Failed to save verse:', e?.message || e, e);
			toast('Помилка: ' + (e?.message || 'невідома'));
		}
	},

	clearForm(): void {
		const book = $<HTMLSelectElement>('addBook');
		const chapter = $<HTMLSelectElement>('addChapter');
		const verse = $<HTMLSelectElement>('addVerse');
		const verseTo = $<HTMLSelectElement>('addVerseTo');
		const tags = $<HTMLInputElement>('addTags');

		if (book) book.value = '';
		if (chapter) chapter.innerHTML = '<option value="">--</option>';
		if (verse) verse.innerHTML = '<option value="">--</option>';
		if (verseTo) verseTo.innerHTML = '<option value="">--</option>';
		if (tags) tags.value = '';

		TRANSLATIONS_META.forEach(t => {
			const el = $<HTMLTextAreaElement>(`addTrans_${t.key}`);
			if (el) el.value = '';
		});
	}
};

export default VerseForm;
