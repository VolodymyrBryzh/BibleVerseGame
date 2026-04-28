import Dexie, { Table } from 'dexie';
import { BUILT_IN_VERSES, BibleVerse } from '../constants/bibleData';

/**
 * BibleDatabase — a robust IndexedDB implementation using Dexie.js.
 * This is a "normal" database for web applications, supporting
 * proper indexing and larger datasets than localStorage.
 */
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
  id?: number;
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
    // Check if we have built-in verses in DB, if not — seed them
    const count = await db.verses.count();
    if (count === 0) {
      await db.verses.bulkAdd(BUILT_IN_VERSES);
    }
    await this.refreshCache();
  },

  async refreshCache(): Promise<void> {
    this._cache = await db.verses.toArray();
  },

  getAll(): BibleVerse[] {
    return this._cache;
  },

  getById(id: string): BibleVerse | undefined {
    // Note: in IndexedDB id might be numeric, but our system uses strings too.
    return this._cache.find(v => v.id.toString() === id.toString());
  },

  getReference(v: BibleVerse): string {
    return `${v.book} ${v.chapter}:${v.verse}`;
  },

  async addVerse(verseObj: BibleVerse): Promise<string> {
    const id = await db.verses.add(verseObj);
    await this.refreshCache();
    return id.toString();
  },

  async removeVerse(id: string): Promise<void> {
    // Only allow removing non-built-in? Or just anything.
    // For now, allow removing by id.
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      await db.verses.delete(numericId);
    } else {
      await db.verses.where('id').equals(id).delete();
    }
    await this.refreshCache();
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
      // Remove ID from imported verses to let Dexie generate new numeric IDs
      const { id, ...verseData } = v;
      await db.verses.add(verseData as BibleVerse);
      count++;
    }
    await this.refreshCache();
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
