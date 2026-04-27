import VersesDB from './database';
import UI from '../ui/ui';
import { toast } from '../utils/helpers';

export interface Attempt {
  verseId: string;
  mode: string;
  translationKey: string;
  success: boolean;
  accuracy: number;
  ts: number;
}

export interface StatsData {
  attempts: Attempt[];
  streak: number;
  bestStreak: number;
}

const Stats = {
  _data: null as StatsData | null,

  _default(): StatsData {
    return { attempts: [], streak: 0, bestStreak: 0 };
  },

  init(): void {
    const saved = localStorage.getItem('bvg_stats');
    if (saved) {
      try { 
        this._data = JSON.parse(saved); 
      } catch(e) { 
        this._data = this._default(); 
      }
    } else {
      this._data = this._default();
    }
  },

  record(verseId: string, mode: string, translationKey: string, success: boolean, accuracy: number): void {
    if (!this._data) return;
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
    if (!this._data) return { total: 0, correct: 0, accuracy: 0, streak: 0, bestStreak: 0, learned: 0 };
    const a = this._data.attempts;
    const total = a.length;
    const correct = a.filter(x => x.success).length;
    const accuracy = total ? Math.round(correct / total * 100) : 0;
    
    // Optimization: avoid re-calculating byVerse if already done recently (or just keep it simple)
    const learned = this._getLearnedCount();
    
    return { 
      total, 
      correct, 
      accuracy, 
      streak: this._data.streak, 
      bestStreak: this._data.bestStreak, 
      learned 
    };
  },

  _getLearnedCount(): number {
    if (!this._data) return 0;
    const byVerse = this._groupByVerse();
    
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

  _groupByVerse(): Record<string, Attempt[]> {
    if (!this._data) return {};
    return this._data.attempts.reduce((acc, a) => {
      if (!acc[a.verseId]) acc[a.verseId] = [];
      acc[a.verseId].push(a);
      return acc;
    }, {} as Record<string, Attempt[]>);
  },

  getPerVerse() {
    if (!this._data) return [];
    
    const byVerse = this._data.attempts.reduce((acc, a) => {
      if (!acc[a.verseId]) acc[a.verseId] = { total: 0, correct: 0, errors: {} as Record<string, number> };
      const d = acc[a.verseId];
      d.total++;
      if (a.success) d.correct++;
      else {
        d.errors[a.mode] = (d.errors[a.mode] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, { total: number, correct: number, errors: Record<string, number> }>);

    const result = Object.entries(byVerse).map(([vid, d]) => {
      const v = VersesDB.getById(vid);
      return {
        id: vid,
        ref: v ? VersesDB.getReference(v) : vid,
        total: d.total, 
        correct: d.correct, 
        pct: Math.round(d.correct / d.total * 100),
        errors: d.errors
      };
    });

    return result.sort((a, b) => a.pct - b.pct);
  },

  getWeakSpots() {
    return this.getPerVerse()
      .filter(v => v.pct < 70 && v.total >= 2)
      .slice(0, 5);
  },

  reset(): void {
    if (!confirm('Точно скинути всю статистику?')) return;
    this._data = this._default();
    this._save();
    UI.renderStats();
    toast('Статистику скинуто');
  },

  _save(): void {
    if (this._data) {
      localStorage.setItem('bvg_stats', JSON.stringify(this._data));
    }
  }
};

export default Stats;
