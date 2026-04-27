import VersesDB from './database.js';
import UI from '../ui/ui.js';
import { toast } from '../utils/helpers.js';

const Stats = {
  _data: null,

  _default() {
    return { attempts: [], streak: 0, bestStreak: 0 };
  },

  init() {
    const saved = localStorage.getItem('bvg_stats');
    if (saved) {
      try { this._data = JSON.parse(saved); } catch(e) { this._data = this._default(); }
    } else {
      this._data = this._default();
    }
  },

  record(verseId, mode, translationKey, success, accuracy) {
    this._data.attempts.push({
      verseId, mode, translationKey, success, accuracy,
      ts: Date.now()
    });
    if (success) {
      this._data.streak++;
      this._data.bestStreak = Math.max(this._data.bestStreak, this._data.streak);
    } else {
      this._data.streak = 0;
    }
    this._save();
  },

  getOverview() {
    const a = this._data.attempts;
    const total = a.length;
    const correct = a.filter(x => x.success).length;
    const accuracy = total ? Math.round(correct / total * 100) : 0;
    const learned = this._getLearnedCount();
    return { total, correct, accuracy, streak: this._data.streak, bestStreak: this._data.bestStreak, learned };
  },

  _getLearnedCount() {
    const byVerse = {};
    for (const a of this._data.attempts) {
      if (!byVerse[a.verseId]) byVerse[a.verseId] = [];
      byVerse[a.verseId].push(a);
    }
    let count = 0;
    for (const vid in byVerse) {
      const arr = byVerse[vid];
      if (arr.length >= 3) {
        const last5 = arr.slice(-5);
        const pct = last5.filter(x => x.success).length / last5.length;
        if (pct >= 0.8) count++;
      }
    }
    return count;
  },

  getPerVerse() {
    const byVerse = {};
    for (const a of this._data.attempts) {
      if (!byVerse[a.verseId]) byVerse[a.verseId] = { total: 0, correct: 0, errors: {} };
      byVerse[a.verseId].total++;
      if (a.success) byVerse[a.verseId].correct++;
      if (!a.success) {
        byVerse[a.verseId].errors[a.mode] = (byVerse[a.verseId].errors[a.mode] || 0) + 1;
      }
    }
    const result = [];
    for (const vid in byVerse) {
      const v = VersesDB.getById(vid);
      const d = byVerse[vid];
      const pct = Math.round(d.correct / d.total * 100);
      result.push({
        id: vid,
        ref: v ? VersesDB.getReference(v) : vid,
        total: d.total, correct: d.correct, pct,
        errors: d.errors
      });
    }
    result.sort((a, b) => a.pct - b.pct);
    return result;
  },

  getWeakSpots() {
    const perVerse = this.getPerVerse();
    return perVerse.filter(v => v.pct < 70 && v.total >= 2).slice(0, 5);
  },

  reset() {
    if (!confirm('Точно скинути всю статистику?')) return;
    this._data = this._default();
    this._save();
    UI.renderStats();
    toast('Статистику скинуто');
  },

  _save() {
    localStorage.setItem('bvg_stats', JSON.stringify(this._data));
  }
};

export default Stats;
