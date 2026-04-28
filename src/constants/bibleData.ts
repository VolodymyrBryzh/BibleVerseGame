/**
 * Bible data constants — translation metadata and built-in verses.
 */


export interface TranslationMeta {
	key: string;
	name: string;
}

export interface VerseTranslations {
	[key: string]: string;
}

export interface BibleVerse {
	id: string;
	book: string;
	chapter: number;
	verse: number;
	tags: string[];
	translations: VerseTranslations;
}

export const TRANSLATIONS_META: TranslationMeta[] = [
	{ key: 'nup', name: 'Новий український переклад' },
	{ key: 'ubio', name: 'Переклад Івана Огієнка' },
	{ key: 'cuv', name: 'Сучасний переклад' },
	{ key: 'umt', name: 'Свята Біблія: Сучасною мовою' }
];


