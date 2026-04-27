/**
 * VersesDB — data layer for storing and retrieving bible verses.
 * Manages both built-in and user-added verses via localStorage.
 */
import { BUILT_IN_VERSES, TRANSLATIONS_META } from '../constants/bibleData.js';

const VersesDB = {
  _userVerses: [],

  init() {
    const saved = localStorage.getItem('bvg_user_verses');
    if (saved) {
      try { this._userVerses = JSON.parse(saved); } catch(e) { this._userVerses = []; }
    }
  },

  getAll() {
    return [...BUILT_IN_VERSES, ...this._userVerses];
  },

  getById(id) {
    return this.getAll().find(v => v.id === id);
  },

  getReference(v) {
    return `${v.book} ${v.chapter}:${v.verse}`;
  },

  getTranslationText(verse, translationKey) {
    return verse.translations[translationKey] || '';
  },

  getAvailableTranslations(verse) {
    return TRANSLATIONS_META.filter(t => verse.translations[t.key]);
  },

  addVerse(verseObj) {
    verseObj.id = `user-${Date.now()}`;
    this._userVerses.push(verseObj);
    this._save();
    return verseObj;
  },

  removeVerse(id) {
    // Only allow removing user-added verses
    this._userVerses = this._userVerses.filter(v => v.id !== id);
    this._save();
  },

  isBuiltIn(id) {
    return BUILT_IN_VERSES.some(v => v.id === id);
  },

  _save() {
    localStorage.setItem('bvg_user_verses', JSON.stringify(this._userVerses));
  },

  exportAll() {
    return JSON.stringify(this.getAll(), null, 2);
  },

  importVerses(json) {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) throw new Error('Очікується масив');
    let count = 0;
    for (const v of data) {
      if (!v.book || !v.chapter || !v.verse || !v.translations) continue;
      v.id = `user-${Date.now()}-${count}`;
      this._userVerses.push(v);
      count++;
    }
    this._save();
    return count;
  }
};

export default VersesDB;
