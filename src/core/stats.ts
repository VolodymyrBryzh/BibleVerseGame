import VersesDB, { db, Attempt } from './database';
import UI from '../ui/ui';
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
}

const Stats = {
  _attempts: [] as Attempt[],
  _streak: 0,
  _bestStreak: 0,

  async init(): Promise<void> {
    console.log('Stats: Initializing...');
    
    // Load simple streak from localStorage for instant display
    this._streak = parseInt(localStorage.getItem('bvg_streak') || '0');
    this._bestStreak = parseInt(localStorage.getItem('bvg_best_streak') || '0');
    
    await this.refreshCache();
    console.log('Stats: Local Ready.');

    // Background sync
    if (auth.currentUser) {
      this.syncFromFirestore().then(() => {
        console.log('Stats: Background sync complete.');
        this.refreshCache().then(() => {
          if ((window as any).UI) (window as any).UI.renderDashboard();
        });
      }).catch(e => console.error('Stats: Background sync failed', e));
    }
  },

  async syncFromFirestore(): Promise<void> {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    console.log('Stats: Syncing from Firestore for UID:', uid);
    
    try {
      // 1. Load Metadata (Streaks)
      const metaRef = doc(fdb, `users/${uid}/metadata`, 'stats');
      const metaSnap = await getDoc(metaRef);
      if (metaSnap.exists()) {
        const data = metaSnap.data();
        this._streak = data.streak || 0;
        this._bestStreak = data.bestStreak || 0;
        console.log('Stats: Metadata loaded', { streak: this._streak });
      }

      // 2. Load Recent Attempts
      const colRef = collection(fdb, `users/${uid}/stats`);
      // Simple query first to avoid potential index issues on new projects
      const snapshot = await getDocs(colRef);
      
      const attempts: Attempt[] = [];
      snapshot.forEach(doc => {
        attempts.push({ id: doc.id, ...doc.data() } as Attempt);
      });
      
      console.log(`Stats: Loaded ${attempts.length} attempts from cloud.`);

      // Update local cache
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

  async record(verseId: string, mode: string, translationKey: string, success: boolean, accuracy: number): Promise<void> {
    const attempt: Attempt = {
      verseId: verseId.toString(),
      mode,
      translationKey,
      success,
      accuracy,
      ts: Date.now()
    };

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      // Save attempt
      await addDoc(collection(fdb, `users/${uid}/stats`), attempt);
      
      // Update streaks
      if (success) {
        this._streak++;
        this._bestStreak = Math.max(this._bestStreak, this._streak);
      } else {
        this._streak = 0;
      }

      // Save metadata
      await setDoc(doc(fdb, `users/${uid}/metadata`, 'stats'), {
        streak: this._streak,
        bestStreak: this._bestStreak,
        lastUpdated: Date.now()
      });
    } else {
      await db.stats.add(attempt);
      if (success) {
        this._streak++;
        this._bestStreak = Math.max(this._bestStreak, this._streak);
      } else {
        this._streak = 0;
      }
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
    
    if (auth.currentUser) {
        // We probably shouldn't bulk delete in a simple way for Firestore here for now
        // or we use a batch. But let's keep it simple.
        toast('Скидання хмарної статистики наразі недоступне');
        return;
    }

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
