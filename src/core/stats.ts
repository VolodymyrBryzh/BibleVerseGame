import VersesDB, { db, Attempt } from './database';
import UI from '../ui/ui';
import XP from './xp';
import { toast } from '../utils/helpers';
import { db as fdb, auth } from './firebase';
import { collection, getDocs, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';

export interface StatsOverview {
  total: number;
  correct: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  learned: number;
  todayDone: number;
  monthDone: number;
  xp: number;
}

const Stats = {
  _attempts: [] as Attempt[],
  _streak: 0,
  _bestStreak: 0,
  _lastActiveDate: '',
  _lastFreezeDate: '',

  async init(): Promise<void> {
    console.log('Stats: Initializing...');

    this._streak = parseInt(localStorage.getItem('bvg_streak') || '0');
    this._bestStreak = parseInt(localStorage.getItem('bvg_best_streak') || '0');
    this._lastActiveDate = localStorage.getItem('bvg_last_active_date') || '';
    this._lastFreezeDate = localStorage.getItem('bvg_last_freeze_date') || '';

    await this.refreshCache();
    console.log('Stats: Local Ready.');

    if (auth.currentUser) {
      this.syncFromFirestore().then(() => {
        console.log('Stats: Background sync complete.');
        this.refreshCache().then(() => {
          if ((window as any).Dashboard) (window as any).Dashboard.render();
        });
      }).catch(e => console.error('Stats: Background sync failed', e));
    }
  },

  async syncFromFirestore(): Promise<void> {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    console.log('Stats: Syncing from Firestore for UID:', uid);

    try {
      const metaRef = doc(fdb, `users/${uid}/metadata`, 'stats');
      const metaSnap = await getDoc(metaRef);
      if (metaSnap.exists()) {
        const data = metaSnap.data();
        this._streak = data.streak || 0;
        this._bestStreak = data.bestStreak || 0;
        this._lastActiveDate = data.lastActiveDate || '';
        this._lastFreezeDate = data.lastFreezeDate || '';
        console.log('Stats: Metadata loaded', { streak: this._streak });
      }

      const colRef = collection(fdb, `users/${uid}/stats`);
      const snapshot = await getDocs(colRef);

      const attempts: Attempt[] = [];
      snapshot.forEach(doc => {
        attempts.push({ id: doc.id, ...doc.data() } as Attempt);
      });

      console.log(`Stats: Loaded ${attempts.length} attempts from cloud.`);

      await db.stats.clear();
      if (attempts.length > 0) {
        await db.stats.bulkAdd(attempts);
      }
    } catch (e) {
      console.error('Stats: Sync error', e);
      throw e;
    }
  },

  async refreshCache(): Promise<void> {
    this._attempts = await db.stats.orderBy('ts').toArray();
  },

  _updateDailyStreak(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this._lastActiveDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (this._lastActiveDate === yesterday) {
      this._streak++;
    } else if (this._lastActiveDate && this._lastActiveDate !== today) {
      const daysBetween = Math.floor(
        (new Date(today).getTime() - new Date(this._lastActiveDate).getTime()) / 86400000
      );
      const freezeUsable = !this._lastFreezeDate ||
        (new Date(today).getTime() - new Date(this._lastFreezeDate).getTime()) >= 7 * 86400000;

      if (daysBetween === 2 && freezeUsable) {
        this._streak++;
        this._lastFreezeDate = today;
        localStorage.setItem('bvg_last_freeze_date', this._lastFreezeDate);
      } else {
        this._streak = 1;
      }
    } else {
      this._streak = 1;
    }

    this._lastActiveDate = today;
    localStorage.setItem('bvg_last_active_date', this._lastActiveDate);

    if (this._streak > this._bestStreak) {
      this._bestStreak = this._streak;
      localStorage.setItem('bvg_best_streak', this._bestStreak.toString());
    }
    localStorage.setItem('bvg_streak', this._streak.toString());
  },

  async record(verseId: string, mode: string, translationKey: string, success: boolean, accuracy: number, duration?: number): Promise<void> {
    const attempt: Attempt = {
      verseId: verseId.toString(),
      mode,
      translationKey,
      success,
      accuracy,
      ts: Date.now(),
      duration: duration || 0,
    };

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      await addDoc(collection(fdb, `users/${uid}/stats`), attempt);

      if (success) this._updateDailyStreak();

      await setDoc(doc(fdb, `users/${uid}/metadata`, 'stats'), {
        streak: this._streak,
        bestStreak: this._bestStreak,
        lastActiveDate: this._lastActiveDate,
        lastFreezeDate: this._lastFreezeDate,
        xp: XP.getTotal(),
        lastUpdated: Date.now()
      });
    } else {
      await db.stats.add(attempt);
      if (success) this._updateDailyStreak();
      localStorage.setItem('bvg_streak', this._streak.toString());
      localStorage.setItem('bvg_best_streak', this._bestStreak.toString());
    }

    await this.refreshCache();
  },

  getOverview(): StatsOverview {
    const total = this._attempts.length;
    const correct = this._attempts.filter(x => x.success).length;
    const accuracy = total ? Math.round(correct / total * 100) : 0;
    const learned = this._getLearnedCount();

    const today = new Date().setHours(0, 0, 0, 0);
    const todayDone = this._attempts.filter(x => {
      const d = new Date(x.ts).setHours(0, 0, 0, 0);
      return d === today && x.success;
    }).length;

    const monthDone = this._getMonthlyLearnedCount();

    return {
      total,
      correct,
      accuracy,
      streak: this._streak,
      bestStreak: this._bestStreak,
      learned,
      todayDone,
      monthDone,
      xp: XP.getTotal(),
    };
  },

  getActivityData(days: number = 14): { date: string; count: number }[] {
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayStart = new Date(dateStr).getTime();
      const dayEnd = dayStart + 86400000;
      const count = this._attempts.filter(a => a.ts >= dayStart && a.ts < dayEnd).length;
      result.push({ date: dateStr, count });
    }
    return result;
  },

  getTotalTime(): number {
    return this._attempts.reduce((sum, a) => sum + (a.duration || 0), 0);
  },

  getPsalmLearnedCount(): number {
    const byVerse = this._groupByVerse();
    let count = 0;
    for (const vid in byVerse) {
      const verse = VersesDB.getById(vid);
      if (!verse) continue;
      const isPsalm = /Псал|Psalm|Psa/i.test(verse.book);
      if (!isPsalm) continue;
      const arr = byVerse[vid];
      const last5 = arr.slice(-5);
      const pct = last5.filter(x => x.accuracy >= 0.8).length / last5.length;
      if (pct >= 0.8) count++;
    }
    return count;
  },

  _getLearnedCount(): number {
    const byVerse = this._groupByVerse();
    let count = 0;
    for (const vid in byVerse) {
      const arr = byVerse[vid];
      const last5 = arr.slice(-5);
      if (last5.length >= 5 && last5.filter(x => x.accuracy >= 0.8).length / last5.length >= 0.8) count++;
    }
    return count;
  },

  _getMonthlyLearnedCount(): number {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthTs = monthStart.getTime();

    const byVerse = this._groupByVerse();
    let count = 0;
    for (const vid in byVerse) {
      const arr = byVerse[vid];
      const last5 = arr.slice(-5);
      if (last5.length < 5) continue;
      const successRate = last5.filter(x => x.accuracy >= 0.8).length / last5.length;
      if (successRate < 0.8) continue;
      const hasMonthActivity = arr.some(a => a.ts >= monthTs);
      if (hasMonthActivity) count++;
    }
    return count;
  },

  getFreezeState(): { available: boolean; daysSinceUsed: number } {
    if (!this._lastFreezeDate) return { available: true, daysSinceUsed: 999 };
    const today = new Date();
    const lastFreeze = new Date(this._lastFreezeDate);
    const daysSinceUsed = Math.floor((today.getTime() - lastFreeze.getTime()) / 86400000);
    return { available: daysSinceUsed >= 7, daysSinceUsed };
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

    if (auth.currentUser) {
        toast('Скидання хмарної статистики наразі недоступне');
        return;
    }

    await db.stats.clear();
    this._streak = 0;
    this._bestStreak = 0;
    this._lastActiveDate = '';
    this._lastFreezeDate = '';
    localStorage.setItem('bvg_streak', '0');
    localStorage.setItem('bvg_best_streak', '0');
    localStorage.setItem('bvg_last_active_date', '');
    localStorage.setItem('bvg_last_freeze_date', '');
    localStorage.setItem('bvg_xp', '0');
    await this.refreshCache();
    UI.renderStats();
    toast('Статистику скинуто');
  }
};

export default Stats;
