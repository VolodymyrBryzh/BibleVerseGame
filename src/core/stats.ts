import VersesDB, { db, Attempt } from './database';
import UI from '../ui/ui';
import { toast } from '../utils/helpers';

export interface StatsOverview {
  total: number;
  correct: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  learned: number;
}

const Stats = {
  _attempts: [] as Attempt[],
  _streak: 0,
  _bestStreak: 0,

  async init(): Promise<void> {
    // Migration from localStorage
    const saved = localStorage.getItem('bvg_stats');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.attempts && data.attempts.length > 0) {
          // Check if DB already has stats to avoid double migration
          const dbCount = await db.stats.count();
          if (dbCount === 0) {
            await db.stats.bulkAdd(data.attempts);
          }
        }
        this._streak = data.streak || 0;
        this._bestStreak = data.bestStreak || 0;
        // Optionally clear localStorage after migration
        // localStorage.removeItem('bvg_stats'); 
      } catch (e) {
        console.error('Migration failed', e);
      }
    } else {
      // Load streak from a separate simple storage or calculate it
      this._streak = parseInt(localStorage.getItem('bvg_streak') || '0');
      this._bestStreak = parseInt(localStorage.getItem('bvg_best_streak') || '0');
    }

    await this.refreshCache();
  },

  async refreshCache(): Promise<void> {
    this._attempts = await db.stats.orderBy('ts').toArray();
  },

  async record(verseId: string, mode: string, translationKey: string, success: boolean, accuracy: number): Promise<void> {
    const attempt: Attempt = {
      verseId: verseId.toString(),
      mode,
      translationKey,
      success,
      accuracy,
      ts: Date.now()
    };

    await db.stats.add(attempt);
    
    if (success) {
      this._streak++;
      this._bestStreak = Math.max(this._bestStreak, this._streak);
    } else {
      this._streak = 0;
    }

    // Keep streak in localStorage for quick access/persistence of simple values
    localStorage.setItem('bvg_streak', this._streak.toString());
    localStorage.setItem('bvg_best_streak', this._bestStreak.toString());

    await this.refreshCache();
  },

  getOverview(): StatsOverview {
    const total = this._attempts.length;
    const correct = this._attempts.filter(x => x.success).length;
    const accuracy = total ? Math.round(correct / total * 100) : 0;
    const learned = this._getLearnedCount();
    
    // Calculate verses done today (based on local date)
    const today = new Date().setHours(0, 0, 0, 0);
    const todayDone = this._attempts.filter(x => {
      const d = new Date(x.ts).setHours(0, 0, 0, 0);
      return d === today && x.success;
    }).length;

    return { 
      total, 
      correct, 
      accuracy, 
      streak: this._streak, 
      bestStreak: this._bestStreak, 
      learned,
      todayDone
    };
  },

  _getLearnedCount(): number {
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
    return this._attempts.reduce((acc, a) => {
      if (!acc[a.verseId]) acc[a.verseId] = [];
      acc[a.verseId].push(a);
      return acc;
    }, {} as Record<string, Attempt[]>);
  },

  getPerVerse() {
    const byVerse = this._attempts.reduce((acc, a) => {
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

  async reset(): Promise<void> {
    if (!confirm('Точно скинути всю статистику?')) return;
    await db.stats.clear();
    this._streak = 0;
    this._bestStreak = 0;
    localStorage.setItem('bvg_streak', '0');
    localStorage.setItem('bvg_best_streak', '0');
    await this.refreshCache();
    UI.renderStats();
    toast('Статистику скинуто');
  }
};

export default Stats;
