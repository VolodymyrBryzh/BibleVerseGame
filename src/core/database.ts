/**
 * VersesDB — data layer for storing and retrieving bible verses.
 * Manages both built-in and user-added verses via localStorage.
 */
import { BUILT_IN_VERSES, TRANSLATIONS_META, BibleVerse, TranslationMeta } from '../constants/bibleData';

const VersesDB = {
  _userVerses: [] as BibleVerse[],
  _allCache: null as BibleVerse[] | null,

  init(): void {
    const saved = localStorage.getItem('bvg_user_verses');
    if (saved) {
      try { 
        this._userVerses = JSON.parse(saved); 
      } catch(e) { 
        this._userVerses = []; 
      }
    }
  },

  getAll(): BibleVerse[] {
    if (this._allCache) return this._allCache;
    this._allCache = [...BUILT_IN_VERSES, ...this._userVerses];
    return this._allCache;
  },

  getById(id: string): BibleVerse | undefined {
    return this.getAll().find(v => v.id === id);
  },

  getReference(v: BibleVerse): string {
    return `${v.book} ${v.chapter}:${v.verse}`;
  },

  getTranslationText(verse: BibleVerse, translationKey: string): string {
    return verse.translations[translationKey] || '';
  },

  getAvailableTranslations(verse: BibleVerse): TranslationMeta[] {
    return TRANSLATIONS_META.filter(t => !!verse.translations[t.key]);
  },

  addVerse(verseObj: BibleVerse): BibleVerse {
    verseObj.id = `user-${Date.now()}`;
    this._userVerses.push(verseObj);
    this._save();
    return verseObj;
  },

  removeVerse(id: string): void {
    this._userVerses = this._userVerses.filter(v => v.id !== id);
    this._save();
  },

  isBuiltIn(id: string): boolean {
    return BUILT_IN_VERSES.some(v => v.id === id);
  },

  _save(): void {
    this._allCache = null; // Invalidate cache
    localStorage.setItem('bvg_user_verses', JSON.stringify(this._userVerses));
  },

  exportAll(): string {
    return JSON.stringify(this.getAll(), null, 2);
  },

  importVerses(json: string): number {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) throw new Error('Очікується масив');
    
    let count = 0;
    const now = Date.now();
    for (const v of data) {
      if (!v.book || !v.chapter || !v.verse || !v.translations) continue;
      // Ensure unique ID for imported verses
      v.id = `user-${now}-${count}`;
      this._userVerses.push(v as BibleVerse);
      count++;
    }
    this._save();
    return count;
  }
};

export default VersesDB;
