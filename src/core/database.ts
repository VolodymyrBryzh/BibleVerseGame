import Dexie, { Table } from 'dexie';
import { BibleVerse } from '../constants/bibleData';
const GUEST_STORAGE_KEY = 'guestVerses';
function loadGuestVerses(): BibleVerse[] {
	const json = localStorage.getItem(GUEST_STORAGE_KEY);
	if (!json) return [];
	try { return JSON.parse(json) as BibleVerse[]; } catch { return []; }
}
function saveGuestVerses(verses: BibleVerse[]): void {
	localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(verses));
}
import { db as fdb, auth } from './firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

export class BibleDatabase extends Dexie {
	verses!: Table<BibleVerse>;
	stats!: Table<Attempt>;

	constructor() {
		super('BibleVerseGameDB');
		this.version(1).stores({
			verses: '++id, book, chapter, verse, *tags',
			stats: '++id, verseId, mode, ts'
		});
	}
}

export interface Attempt {
	id?: number | string;
	verseId: string;
	mode: string;
	translationKey: string;
	success: boolean;
	accuracy: number;
	ts: number;
	duration?: number;
}

export const db = new BibleDatabase();

const VersesDB = {
	_cache: [] as BibleVerse[],

	async init(): Promise<void> {
		console.log('VersesDB: Initializing...');

		// Note: No built-in verses are loaded anymore.
		// Load guest verses from localStorage if not logged in
		if (!auth.currentUser) {
			const stored = loadGuestVerses();
			if (stored.length) {
				await db.verses.clear();
				await db.verses.bulkAdd(stored);
				await this.refreshCache();
				console.log(`VersesDB: Loaded ${stored.length} guest verses from localStorage.`);
			}
		}
		await this.refreshCache();
		console.log(`VersesDB: Local Ready. Cache has ${this._cache.length} verses.`);

		// Start background sync if logged in
		if (auth.currentUser) {
			this.syncFromFirestore().then(() => {
				console.log('VersesDB: Background sync complete.');
				this.refreshCache().then(() => {
					if ((window as any).Dashboard) (window as any).Dashboard.render();
				});
			}).catch(e => console.error('VersesDB: Background sync failed', e));
		}
	},

	async syncFromFirestore(): Promise<void> {
		if (!auth.currentUser) return;
		const uid = auth.currentUser.uid;
		console.log('VersesDB: Syncing from Firestore for UID:', uid);

		try {
			const colRef = collection(fdb, `users/${uid}/verses`);
			const snapshot = await getDocs(colRef);

			const verses: BibleVerse[] = [];
			snapshot.forEach(doc => {
				verses.push({ id: doc.id, ...doc.data() } as BibleVerse);
			});

			console.log(`VersesDB: Found ${verses.length} verses in cloud.`);



			await db.verses.clear();
			if (verses.length > 0) {
				await db.verses.bulkAdd(verses);
			}
		} catch (e) {
			console.error('VersesDB: Sync error', e);
			throw e;
		}
	},

	async refreshCache(): Promise<void> {
		this._cache = await db.verses.toArray();
	},

	getAll(): BibleVerse[] {
		return this._cache;
	},

	getById(id: string): BibleVerse | undefined {
		return this._cache.find(v => v.id.toString() === id.toString());
	},

	getReference(v: BibleVerse): string {
		const base = `${v.book} ${v.chapter}:${v.verse}`;
		return v.verseTo && v.verseTo > v.verse ? `${base}-${v.verseTo}` : base;
	},

	async addVerse(verseObj: BibleVerse): Promise<string> {
		let finalId: string;

		if (auth.currentUser) {
			const uid = auth.currentUser.uid;
			const { id, ...data } = verseObj;
			const docRef = await addDoc(collection(fdb, `users/${uid}/verses`), data);
			finalId = docRef.id;
			// Add to in-memory cache immediately (no full re-sync needed)
			this._cache.push({ ...data, id: finalId } as BibleVerse);
		} else {
			const id = await db.verses.add(verseObj);
			finalId = id.toString();
			await this.refreshCache();
			saveGuestVerses(this._cache);
		}

		return finalId;
	},

	async removeVerse(id: string): Promise<void> {
		if (auth.currentUser) {
			const uid = auth.currentUser.uid;
			await deleteDoc(doc(fdb, `users/${uid}/verses`, id));
			// Remove from in-memory cache immediately
			this._cache = this._cache.filter(v => v.id.toString() !== id.toString());
		} else {
			const numericId = parseInt(id);
			if (!isNaN(numericId)) {
				await db.verses.delete(numericId);
			} else {
				await db.verses.where('id').equals(id).delete();
			}
			await this.refreshCache();
			saveGuestVerses(this._cache);
		}
		if ((window as any).Dashboard) (window as any).Dashboard.render();
	},



	getTranslationText(verse: BibleVerse, translationKey: string): string {
		return verse.translations[translationKey] || '';
	},

	exportAll(): string {
		return JSON.stringify(this.getAll(), null, 2);
	},

	async importVerses(json: string): Promise<number> {
		const data = JSON.parse(json);
		if (!Array.isArray(data)) throw new Error('Очікується масив');
		let count = 0;
		for (const v of data) {
			if (!v.book || !v.chapter || !v.verse || !v.translations) continue;
			await this.addVerse(v);
			count++;
		}
		// After import, ensure persistence for guest mode
		if (!auth.currentUser) saveGuestVerses(this._cache);
		return count;
	},

	search(query: string): BibleVerse[] {
		const q = query.toLowerCase();
		return this._cache.filter(v =>
			v.book.toLowerCase().includes(q) ||
			(v.tags && v.tags.some(t => t.toLowerCase().includes(q))) ||
			Object.values(v.translations).some(t => t.toLowerCase().includes(q))
		);
	}
};

export default VersesDB;
