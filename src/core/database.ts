import Dexie, { Table } from 'dexie';
import { BUILT_IN_VERSES, BibleVerse } from '../constants/bibleData';
import { db as fdb, auth } from './firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc, query, where, writeBatch } from 'firebase/firestore';

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
}

export const db = new BibleDatabase();

const VersesDB = {
  _cache: [] as BibleVerse[],

  async init(): Promise<void> {
    console.log('VersesDB: Initializing...');
    
    // Load local data first for instant UI
    const count = await db.verses.count();
    if (count === 0 && !auth.currentUser) {
      console.log('VersesDB: Seeding local DB with built-ins');
      await db.verses.bulkAdd(BUILT_IN_VERSES);
    }
    
    await this.refreshCache();
    console.log(`VersesDB: Local Ready. Cache has ${this._cache.length} verses.`);

    // Start background sync if logged in
    if (auth.currentUser) {
      this.syncFromFirestore().then(() => {
        console.log('VersesDB: Background sync complete.');
        this.refreshCache().then(() => UI.renderDashboard());
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

      if (verses.length === 0) {
        console.log('VersesDB: New user detected. Seeding cloud DB...');
        const batch = writeBatch(fdb);
        for (const v of BUILT_IN_VERSES) {
          const { id, ...data } = v;
          const newDocRef = doc(collection(fdb, `users/${uid}/verses`));
          batch.set(newDocRef, data);
          verses.push({ id: newDocRef.id, ...data } as BibleVerse);
        }
        await batch.commit();
        console.log('VersesDB: Cloud seed complete.');
      }

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
    return `${v.book} ${v.chapter}:${v.verse}`;
  },

  async addVerse(verseObj: BibleVerse): Promise<string> {
    let finalId: string;
    
    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      const { id, ...data } = verseObj;
      const docRef = await addDoc(collection(fdb, `users/${uid}/verses`), data);
      finalId = docRef.id;
    } else {
      const id = await db.verses.add(verseObj);
      finalId = id.toString();
    }

    await this.refreshCache();
    if (auth.currentUser) await this.init(); // Refresh from cloud to be sure
    return finalId;
  },

  async removeVerse(id: string): Promise<void> {
    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      await deleteDoc(doc(fdb, `users/${uid}/verses`, id));
    } else {
      const numericId = parseInt(id);
      if (!isNaN(numericId)) {
        await db.verses.delete(numericId);
      } else {
        await db.verses.where('id').equals(id).delete();
      }
    }
    await this.refreshCache();
    if (auth.currentUser) await this.init();
  },

  isBuiltIn(id: string): boolean {
    return BUILT_IN_VERSES.some(v => v.id.toString() === id.toString());
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
