import { auth, db as firestore } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const XP_REWARDS: Record<string, number> = {
  'word-order': 30,
  'fill-gaps': 45,
  'continue': 60,
};

const HINT_COST = 5;

const XP = {
  _total: 0,

  init(): void {
    this._total = parseInt(localStorage.getItem('bvg_xp') || '0', 10);
  },

  getTotal(): number {
    return this._total;
  },

  getReward(mode: string): number {
    return XP_REWARDS[mode] || 30;
  },

  award(mode: string): number {
    const amount = XP_REWARDS[mode] || 30;
    this._total += amount;
    this._persist();
    return amount;
  },

  deductHint(): boolean {
    if (this._total < HINT_COST) return false;
    this._total -= HINT_COST;
    this._persist();
    return true;
  },

  _persist(): void {
    localStorage.setItem('bvg_xp', this._total.toString());
    const user = auth.currentUser;
    if (user) {
      const ref = doc(firestore, 'users', user.uid, 'metadata', 'stats');
      getDoc(ref).then(snap => {
        const data = snap.exists() ? snap.data() : {};
        setDoc(ref, { ...data, xp: this._total }, { merge: true });
      });
    }
  },

  async syncFromFirestore(): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(firestore, 'users', user.uid, 'metadata', 'stats');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const cloudXP = snap.data().xp || 0;
      if (cloudXP > this._total) {
        this._total = cloudXP;
        localStorage.setItem('bvg_xp', this._total.toString());
      }
    }
  }
};

export default XP;
