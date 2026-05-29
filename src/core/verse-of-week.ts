import VersesDB from './database';
import { auth, db as fdb } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'bvg_verse_of_week';

interface VerseOfWeekData {
	verseId: string;
	weekNumber: number;
	isManual: boolean;
}

function getCurrentWeekNumber(): number {
	const now = new Date();
	const start = new Date(now.getFullYear(), 0, 1);
	const diff = now.getTime() - start.getTime();
	return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

const VerseOfWeek = {
	_data: null as VerseOfWeekData | null,

	async init(): Promise<void> {
		// Load from localStorage first
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) this._data = JSON.parse(stored);
		} catch { /* ignore */ }

		// Sync from Firestore if logged in
		if (auth.currentUser) {
			try {
				const ref = doc(fdb, `users/${auth.currentUser.uid}/metadata`, 'verseOfWeek');
				const snap = await getDoc(ref);
				if (snap.exists()) {
					this._data = snap.data() as VerseOfWeekData;
					this._persist();
				}
			} catch (e) {
				console.error('VerseOfWeek: Sync error', e);
			}
		}
	},

	getCurrentVerseId(): string | null {
		const currentWeek = getCurrentWeekNumber();

		// If we have data and it's manual or from the current week, use it
		if (this._data) {
			if (this._data.isManual && this._data.weekNumber === currentWeek) {
				return this._data.verseId;
			}
			if (!this._data.isManual && this._data.weekNumber === currentWeek) {
				return this._data.verseId;
			}
		}

		// Auto-select a verse for this week
		const allVerses = VersesDB.getAll();
		if (!allVerses.length) return null;

		const index = currentWeek % allVerses.length;
		const verse = allVerses[index];

		this._data = {
			verseId: verse.id.toString(),
			weekNumber: currentWeek,
			isManual: false,
		};
		this._persist();

		return verse.id.toString();
	},

	async setManual(verseId: string): Promise<void> {
		this._data = {
			verseId,
			weekNumber: getCurrentWeekNumber(),
			isManual: true,
		};
		this._persist();
		await this._syncToFirestore();
	},

	isManual(): boolean {
		return this._data?.isManual ?? false;
	},

	_persist(): void {
		if (this._data) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
		}
	},

	async _syncToFirestore(): Promise<void> {
		if (!auth.currentUser || !this._data) return;
		try {
			const ref = doc(fdb, `users/${auth.currentUser.uid}/metadata`, 'verseOfWeek');
			await setDoc(ref, this._data);
		} catch (e) {
			console.error('VerseOfWeek: Save error', e);
		}
	}
};

export default VerseOfWeek;
