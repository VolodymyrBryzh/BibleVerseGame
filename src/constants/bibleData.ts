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
	{ key: 'cuv', name: 'Біблія: Сучасний переклад' },
	{ key: 'ubio', name: 'Біблія в пер. Івана Огієнка 1962' },
	{ key: 'ukrk', name: 'Біблія в пер. П.Куліша та І.Пулюя, 1905' },
	{ key: 'umt', name: 'Свята Біблія: Сучасною мовою' },
	{ key: 'нпу', name: 'Новий Переклад Українською' },
	{ key: 'нуп', name: 'Переклад. Ю. Попченка.' },
	{ key: 'утт', name: 'Переклад Р. Турконяка' }
];


