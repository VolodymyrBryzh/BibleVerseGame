import VersesDB, { db, Attempt } from './database';
import UI from '../ui/ui';
import XP from './xp';
import { toast } from '../utils/helpers';
import { GAME_CONFIG } from '../constants/config';
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

export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const ONE_DAY_MS = 86_400_000;

const Stats = {
  _attempts: [] as Attempt[],
  _streak: 0,
  _bestStreak: 0,
  _lastActiveDate: '',
  _lastFreezeDate: '',

  async init(): Promise<void> {
    this._streak = parseInt(localStorage.getItem(GAME_CONFIG.STORAGE_KEYS.STREAK) || '0', 10);
    this._bestStreak = parseInt(localStorage.getItem(GAME_CONFIG.STORAGE_KEYS.BEST_STREAK) || '0', 10);
    this._lastActiveDate = localStorage.getItem(GAME_CONFIG.STORAGE_KEYS.LAST_ACTIVE_DATE) || '';
    this._lastFreezeDate = localStorage.getItem(GAME_CONFIG.STORAGE_KEYS.LAST_FREEZE_DATE) || '';

    this._checkStreakExpiry();
    await this.refreshCache();

    if (auth.currentUser) {
      this.syncFromFirestore()
        .then(() => {
          this.refreshCache().then(() => {
            if ((window as any).Dashboard) (window as any).Dashboard.render();
          });
        })
        .catch(e => console.error('Stats: Background sync failed', e));
    }
  },

  async syncFromFirestore(): Promise<void> {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    try {
      const metaRef = doc(fdb, `users/${uid}/metadata`, 'stats');
      const metaSnap = await getDoc(metaRef);
      if (metaSnap.exists()) {
        const data = metaSnap.data();
        this._streak = data.streak || 0;
        this._bestStreak = data.bestStreak || 0;
        this._lastActiveDate = data.lastActiveDate || '';
        this._lastFreezeDate = data.lastFreezeDate || '';
      }

      const colRef = collection(fdb, `users/${uid}/stats`);
      const snapshot = await getDocs(colRef);

      const attempts: Attempt[] = [];
      snapshot.forEach(d => {
        attempts.push({ id: d.id, ...d.data() } as Attempt);
      });

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

  _checkStreakExpiry(): void {
    if (!this._lastActiveDate || this._streak === 0) return;
    const today = getLocalDateString();
    if (this._lastActiveDate === today) return;

    const daysBetween = Math.floor(
      (new Date(today).getTime() - new Date(this._lastActiveDate).getTime()) / ONE_DAY_MS
    );

    if (daysBetween <= 1) return;

    if (daysBetween === 2) {
      const freezeUsable = !this._lastFreezeDate ||
        (new Date(today).getTime() - new Date(this._lastFreezeDate).getTime()) >= GAME_CONFIG.FREEZE_COOLDOWN_DAYS * ONE_DAY_MS;
      if (freezeUsable) return;
    }

    this._streak = 0;
    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.STREAK, '0');
  },

  _updateDailyStreak(): void {
    const today = getLocalDateString();
    if (this._lastActiveDate === today) return;

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalDateString(yesterdayDate);

    if (this._lastActiveDate === yesterday) {
      this._streak++;
    } else if (this._lastActiveDate && this._lastActiveDate !== today) {
      const daysBetween = Math.floor(
        (new Date(today).getTime() - new Date(this._lastActiveDate).getTime()) / ONE_DAY_MS
      );
      const freezeUsable = !this._lastFreezeDate ||
        (new Date(today).getTime() - new Date(this._lastFreezeDate).getTime()) >= GAME_CONFIG.FREEZE_COOLDOWN_DAYS * ONE_DAY_MS;

      if (daysBetween === 2 && freezeUsable) {
        this._streak++;
        this._lastFreezeDate = today;
        localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.LAST_FREEZE_DATE, this._lastFreezeDate);
      } else {
        this._streak = 1;
      }
    } else {
      this._streak = 1;
    }

    this._lastActiveDate = today;
    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.LAST_ACTIVE_DATE, this._lastActiveDate);

    if (this._streak > this._bestStreak) {
      this._bestStreak = this._streak;
      localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.BEST_STREAK, this._bestStreak.toString());
    }
    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.STREAK, this._streak.toString());
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

    await db.stats.add(attempt);
    if (success) this._updateDailyStreak();

    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.STREAK, this._streak.toString());
    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.BEST_STREAK, this._bestStreak.toString());
    await this.refreshCache();

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      try {
        await addDoc(collection(fdb, `users/${uid}/stats`), attempt);
        await setDoc(doc(fdb, `users/${uid}/metadata`, 'stats'), {
          streak: this._streak,
          bestStreak: this._bestStreak,
          lastActiveDate: this._lastActiveDate,
          lastFreezeDate: this._lastFreezeDate,
          xp: XP.getTotal(),
          lastUpdated: Date.now()
        }, { merge: true });
      } catch (e: any) {
        console.warn('Firestore stats sync failed:', e?.message);
      }
    }
  },

  getOverview(): StatsOverview {
    const total = this._attempts.length;
    const correct = this._attempts.filter(x => x.success).length;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    const learned = this._getLearnedCount();

    const todayStr = getLocalDateString();
    const todayDone = this._attempts.filter(x => {
      return x.success && getLocalDateString(new Date(x.ts)) === todayStr;
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

  /**
   * Optimized 14-day activity aggregation: O(N) single-pass Map indexing instead of O(14 * N)
   */
  getActivityData(days: number = GAME_CONFIG.ACTIVITY_DAYS): { date: string; count: number }[] {
    const countsByDate = new Map<string, number>();
    for (let i = 0; i < this._attempts.length; i++) {
      const dateKey = getLocalDateString(new Date(this._attempts[i].ts));
      countsByDate.set(dateKey, (countsByDate.get(dateKey) || 0) + 1);
    }

    const result: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      result.push({ date: dateStr, count: countsByDate.get(dateStr) || 0 });
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
      if (!verse || !/Псал|Psalm|Psa/i.test(verse.book)) continue;
      const arr = byVerse[vid];
      const last5 = arr.slice(-5);
      if (last5.length < 5) continue;
      const rate = last5.filter(x => x.accuracy >= GAME_CONFIG.PASSING_ACCURACY).length / last5.length;
      if (rate >= GAME_CONFIG.PASSING_ACCURACY) count++;
    }
    return count;
  },

  _getLearnedCount(): number {
    const byVerse = this._groupByVerse();
    let count = 0;
    for (const vid in byVerse) {
      const arr = byVerse[vid];
      const last5 = arr.slice(-5);
      if (last5.length >= 5) {
        const rate = last5.filter(x => x.accuracy >= GAME_CONFIG.PASSING_ACCURACY).length / last5.length;
        if (rate >= GAME_CONFIG.PASSING_ACCURACY) count++;
      }
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
      const successRate = last5.filter(x => x.accuracy >= GAME_CONFIG.PASSING_ACCURACY).length / last5.length;
      if (successRate < GAME_CONFIG.PASSING_ACCURACY) continue;
      if (arr.some(a => a.ts >= monthTs)) count++;
    }
    return count;
  },

  getFreezeState(): { available: boolean; daysSinceUsed: number } {
    if (!this._lastFreezeDate) return { available: true, daysSinceUsed: 999 };
    const today = new Date();
    const lastFreeze = new Date(this._lastFreezeDate);
    const daysSinceUsed = Math.floor((today.getTime() - lastFreeze.getTime()) / ONE_DAY_MS);
    return { available: daysSinceUsed >= GAME_CONFIG.FREEZE_COOLDOWN_DAYS, daysSinceUsed };
  },

  _groupByVerse(): Record<string, Attempt[]> {
    const map: Record<string, Attempt[]> = {};
    for (let i = 0; i < this._attempts.length; i++) {
      const a = this._attempts[i];
      if (!map[a.verseId]) map[a.verseId] = [];
      map[a.verseId].push(a);
    }
    return map;
  },

  getPerVerse() {
    const byVerse = this._attempts.reduce((acc, a) => {
      if (!acc[a.verseId]) acc[a.verseId] = { total: 0, correct: 0, errors: {} as Record<string, number> };
      const d = acc[a.verseId];
      d.total++;
      if (a.success) d.correct++;
      else d.errors[a.mode] = (d.errors[a.mode] || 0) + 1;
      return acc;
    }, {} as Record<string, { total: number; correct: number; errors: Record<string, number> }>);

    return Object.entries(byVerse).map(([vid, d]) => {
      const v = VersesDB.getById(vid);
      return {
        id: vid,
        ref: v ? VersesDB.getReference(v) : vid,
        total: d.total,
        correct: d.correct,
        pct: Math.round((d.correct / d.total) * 100),
        errors: d.errors
      };
    }).sort((a, b) => a.pct - b.pct);
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

    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.STREAK, '0');
    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.BEST_STREAK, '0');
    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.LAST_ACTIVE_DATE, '');
    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.LAST_FREEZE_DATE, '');
    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.XP, '0');

    await this.refreshCache();
    UI.renderStats();
    toast('Статистику скинуто');
  }
};

export default Stats;
