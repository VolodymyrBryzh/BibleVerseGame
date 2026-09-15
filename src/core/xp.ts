import { auth, db as firestore } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GAME_CONFIG } from '../constants/config';

const XP = {
  _total: 0,

  init(): void {
    this._total = parseInt(localStorage.getItem(GAME_CONFIG.STORAGE_KEYS.XP) || '0', 10);
  },

  getTotal(): number {
    return this._total;
  },

  getReward(mode: string): number {
    return GAME_CONFIG.XP_REWARDS[mode] || GAME_CONFIG.DEFAULT_XP_REWARD;
  },

  award(mode: string): number {
    const amount = this.getReward(mode);
    this._total += amount;
    this._persist();
    return amount;
  },

  deductHint(): boolean {
    if (this._total < GAME_CONFIG.HINT_COST) return false;
    this._total -= GAME_CONFIG.HINT_COST;
    this._persist();
    return true;
  },

  _persist(): void {
    localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.XP, this._total.toString());
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
        localStorage.setItem(GAME_CONFIG.STORAGE_KEYS.XP, this._total.toString());
      }
    }
  }
};

export default XP;
