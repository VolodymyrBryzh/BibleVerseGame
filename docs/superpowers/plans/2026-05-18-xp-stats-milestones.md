# XP, Stats Redesign, Milestones & New Game Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add XP system, hints, daily-streak logic, milestones, a new "Продовж вірш" game mode, redesigned stats screen, and restore 4-tab navigation.

**Architecture:** XP is a simple counter stored alongside streak in localStorage + Firestore metadata. Hints are game-engine UI with XP cost. Milestones are computed from stats data (not stored separately). Stats screen is a full rewrite with streak hero, 3-column stats, 14-day activity chart, and milestones list. The new "continue" game mode gives the first half of a verse and asks the user to type the rest.

**Tech Stack:** TypeScript, Vite, Firebase Firestore, Dexie.js (IndexedDB), vanilla DOM

---

### Task 1: XP System Core (`src/core/xp.ts`)

**Files:**
- Create: `src/core/xp.ts`
- Modify: `src/core/stats.ts` (add XP to StatsOverview)

- [ ] **Step 1: Create XP module**

```typescript
// src/core/xp.ts
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestore } from './firebase';

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
    const user = getAuth().currentUser;
    if (user) {
      const ref = doc(firestore, 'users', user.uid, 'metadata', 'stats');
      getDoc(ref).then(snap => {
        const data = snap.exists() ? snap.data() : {};
        setDoc(ref, { ...data, xp: this._total }, { merge: true });
      });
    }
  },

  async syncFromFirestore(): Promise<void> {
    const user = getAuth().currentUser;
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
```

- [ ] **Step 2: Add XP to StatsOverview in stats.ts**

In `src/core/stats.ts`, add `xp: number` to the `StatsOverview` interface and import XP in `getOverview()`:

```typescript
// Add to StatsOverview interface:
xp: number;

// In getOverview(), add:
xp: XP.getTotal(),
```

- [ ] **Step 3: Initialize XP in main.ts**

In `src/main.ts`, after `Stats.init()`, add:
```typescript
XP.init();
XP.syncFromFirestore();
```

- [ ] **Step 4: Award XP on game completion**

In `src/engine/game.ts`, in `_recordAndShow()`, after `Stats.record(...)`:
```typescript
if (success) {
  const earned = XP.award(this.currentMode!);
  // Show XP earned in result UI
}
```

- [ ] **Step 5: Update Header streak badge to show XP**

In `src/ui/dashboard/Header.ts`, change `streakCount` to show XP:
```typescript
const streakEl = $('streakCount');
if (streakEl) streakEl.textContent = (overview.xp || 0).toString();
```

- [ ] **Step 6: Commit**

```bash
git add src/core/xp.ts src/core/stats.ts src/engine/game.ts src/main.ts src/ui/dashboard/Header.ts
git commit -m "feat: add XP system with mode-based rewards"
```

---

### Task 2: Daily Streak Logic (replace consecutive-success streak)

**Files:**
- Modify: `src/core/stats.ts` (rewrite streak logic)

The current streak counts consecutive successful attempts. The new logic:
- Streak increments if user completes ≥1 verse per **calendar day**
- Missing a day resets streak to 0
- One free "frozen day" per week: if user misses a day and hasn't used a freeze in the last 7 days, streak survives

- [ ] **Step 1: Add streak fields to metadata**

In `Stats.init()`, load additional fields from localStorage:
```typescript
this._lastActiveDate = localStorage.getItem('bvg_last_active_date') || '';
this._lastFreezeDate = localStorage.getItem('bvg_last_freeze_date') || '';
```

- [ ] **Step 2: Rewrite streak update logic in record()**

Replace the current streak increment/reset with daily logic:

```typescript
_updateDailyStreak(): void {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  if (this._lastActiveDate === today) return; // Already counted today

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (this._lastActiveDate === yesterday) {
    // Consecutive day
    this._streak++;
  } else if (this._lastActiveDate && this._lastActiveDate !== today) {
    // Missed day(s) — check freeze
    const daysBetween = Math.floor(
      (new Date(today).getTime() - new Date(this._lastActiveDate).getTime()) / 86400000
    );
    const freezeUsable = !this._lastFreezeDate ||
      (new Date(today).getTime() - new Date(this._lastFreezeDate).getTime()) >= 7 * 86400000;

    if (daysBetween === 2 && freezeUsable) {
      // Exactly 1 day missed, freeze available
      this._streak++;
      this._lastFreezeDate = today;
      localStorage.setItem('bvg_last_freeze_date', this._lastFreezeDate);
    } else {
      this._streak = 1; // Reset, but today counts
    }
  } else {
    this._streak = 1; // First ever activity
  }

  this._lastActiveDate = today;
  localStorage.setItem('bvg_last_active_date', this._lastActiveDate);

  if (this._streak > this._bestStreak) {
    this._bestStreak = this._streak;
    localStorage.setItem('bvg_best_streak', this._bestStreak.toString());
  }
  localStorage.setItem('bvg_streak', this._streak.toString());
}
```

- [ ] **Step 3: Call `_updateDailyStreak()` in `record()` on success**

Replace the old `if (success) this._streak++; else this._streak = 0;` with:
```typescript
if (success) this._updateDailyStreak();
```

- [ ] **Step 4: Persist freeze date to Firestore**

In the metadata sync section, add `lastActiveDate` and `lastFreezeDate` fields.

- [ ] **Step 5: Sync freeze/active dates from Firestore on init**

- [ ] **Step 6: Commit**

```bash
git add src/core/stats.ts
git commit -m "feat: daily streak with weekly freeze logic"
```

---

### Task 3: Hint System

**Files:**
- Modify: `src/engine/game.ts` (add hint button + logic)
- Modify: `src/style.css` (hint button styling)

Hints work only in `word-order` mode (highlight next correct word in the chip bank for 1.5s). Costs −5 XP per use, max 3 per verse.

- [ ] **Step 1: Add hint state to Game object**

```typescript
_hintsUsed: 0,
_maxHints: 3,
```

- [ ] **Step 2: Reset hints on game start**

In `start()`:
```typescript
this._hintsUsed = 0;
```

- [ ] **Step 3: Add hint button to game instruction area**

After `_initMode()`, if mode is `word-order`, inject hint button:
```typescript
const hintBtn = document.createElement('button');
hintBtn.id = 'btnHint';
hintBtn.className = 'btn btn-sm btn-hint';
hintBtn.innerHTML = `💡 Підказка <span class="hint-cost">−5 XP</span> <span class="hint-count">(${this._maxHints - this._hintsUsed})</span>`;
hintBtn.addEventListener('click', () => this.useHint());
```

- [ ] **Step 4: Implement `useHint()` method**

```typescript
useHint(): void {
  if (this._hintsUsed >= this._maxHints) {
    toast('Підказки закінчились');
    return;
  }
  if (!XP.deductHint()) {
    toast('Недостатньо XP');
    return;
  }
  this._hintsUsed++;

  // Find next correct word
  const placed = document.querySelectorAll('#answerZone .word-chip').length;
  const nextWord = this._correctWords[placed];
  if (!nextWord) return;

  // Highlight matching chip in bank
  const chips = document.querySelectorAll('#chipBank .word-chip:not(.used)');
  for (const chip of chips) {
    if (normalize((chip as HTMLElement).textContent || '') === normalize(nextWord)) {
      (chip as HTMLElement).classList.add('hint-highlight');
      setTimeout(() => (chip as HTMLElement).classList.remove('hint-highlight'), 1500);
      break;
    }
  }

  // Update hint button
  const countEl = document.querySelector('.hint-count');
  if (countEl) countEl.textContent = `(${this._maxHints - this._hintsUsed})`;
  if (this._hintsUsed >= this._maxHints) {
    const btn = $('btnHint');
    if (btn) btn.classList.add('disabled');
  }
},
```

- [ ] **Step 5: Add CSS for hint highlight and hint button**

```css
.hint-highlight {
  animation: hintPulse 1.5s ease-out;
  box-shadow: 0 0 0 3px var(--accent);
  background: var(--accent-bg) !important;
}

@keyframes hintPulse {
  0% { box-shadow: 0 0 0 3px var(--accent); }
  100% { box-shadow: 0 0 0 0 transparent; }
}

.btn-hint {
  font-size: 0.8rem;
  gap: 6px;
  display: inline-flex;
  align-items: center;
}
.btn-hint .hint-cost { color: var(--danger); font-size: 0.7rem; }
.btn-hint .hint-count { color: var(--text-muted); font-size: 0.7rem; }
.btn-hint.disabled { opacity: 0.4; pointer-events: none; }
```

- [ ] **Step 6: Commit**

```bash
git add src/engine/game.ts src/style.css
git commit -m "feat: hint system for word-order mode (−5 XP, max 3)"
```

---

### Task 4: New Game Mode — "Продовж вірш" (continue)

**Files:**
- Modify: `src/engine/game.ts` (add continue mode)
- Modify: `src/ui/game-setup/index.ts` (replace "Перші букви" with "Продовж вірш")

The mode shows the first ~50% of words, then a textarea. User types the rest.

- [ ] **Step 1: Remove first-letters mode references**

In `src/engine/game.ts`, remove `_startFirstLetters()` and `_checkFirstLetters()` methods.

- [ ] **Step 2: Add continue mode to game engine**

```typescript
_startContinue(text: string): void {
  const words = tokenize(text);
  const splitAt = Math.ceil(words.length / 2);
  const given = words.slice(0, splitAt);
  const expected = words.slice(splitAt);
  this._correctWords = expected;
  this._fullText = text;

  const el = this.elements;
  if (el.instruction) el.instruction.textContent = 'Допиши другу половину вірша';

  const givenHTML = given.map(w => `<span class="continue-given-word">${w}</span>`).join(' ');
  if (el.area) {
    el.area.innerHTML = `
      <div class="continue-given">${givenHTML}</div>
      <textarea id="continueInput" class="continue-textarea" rows="4"
        placeholder="Продовж вірш..."></textarea>
      <button class="btn btn-primary" onclick="Game.check()" style="margin-top:12px;">Перевірити</button>
    `;
  }
},

_checkContinue(): { accuracy: number } {
  const input = ($<HTMLTextAreaElement>('continueInput'))?.value || '';
  const userWords = tokenize(input);
  const expected = this._correctWords;

  let correct = 0;
  for (let i = 0; i < expected.length; i++) {
    if (userWords[i] && normalize(userWords[i]) === normalize(expected[i])) {
      correct++;
    }
  }

  const accuracy = expected.length > 0 ? correct / expected.length : 0;
  return { accuracy };
},
```

- [ ] **Step 3: Wire continue mode into `_initMode()` and `check()`**

In `_initMode()`:
```typescript
case 'continue': this._startContinue(text); break;
```

In `check()`:
```typescript
case 'continue': result = this._checkContinue(); break;
```

- [ ] **Step 4: Update game-setup/index.ts — replace first-letters with continue**

```typescript
<div class="mode-card" data-mode="continue">
  <div class="mode-icon">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 10H3"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M17 18H3"/></svg>
  </div>
  <div class="mode-info">
    <h3>Продовж вірш</h3>
    <p>Допиши другу половину вірша</p>
  </div>
</div>
```

- [ ] **Step 5: Add CSS for continue mode**

```css
.continue-given {
  font-size: 1.1rem;
  line-height: 1.7;
  color: var(--text);
  margin-bottom: 16px;
}
.continue-given-word { display: inline; }
.continue-textarea {
  width: 100%;
  font-size: 1rem;
  line-height: 1.6;
  font-family: var(--font-serif);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  resize: vertical;
  background: var(--bg-card);
  color: var(--text);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/engine/game.ts src/ui/game-setup/index.ts src/style.css
git commit -m "feat: add 'continue verse' game mode (+60 XP), remove first-letters"
```

---

### Task 5: XP Display in Game Mode Cards

**Files:**
- Modify: `src/ui/game-setup/index.ts` (add XP badge + difficulty label)

- [ ] **Step 1: Update mode card HTML with XP badges and difficulty**

Each mode card gets a difficulty label and XP reward badge. Update the mode-info `<p>` to include:

```typescript
// word-order card:
<div class="mode-info">
  <h3>Складання слів</h3>
  <p><span class="mode-difficulty easy">Легко</span> · <span class="mode-xp">+30 XP</span></p>
</div>

// fill-gaps card:
<div class="mode-info">
  <h3>Заповни пропуски</h3>
  <p><span class="mode-difficulty medium">Середньо</span> · <span class="mode-xp">+45 XP</span></p>
</div>

// continue card:
<div class="mode-info">
  <h3>Продовж вірш</h3>
  <p><span class="mode-difficulty hard">Складно</span> · <span class="mode-xp">+60 XP</span></p>
</div>
```

- [ ] **Step 2: Add CSS for mode difficulty and XP badges**

```css
.mode-difficulty {
  font-size: 0.8rem;
  font-style: italic;
  color: var(--text-muted);
}
.mode-xp {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/game-setup/index.ts src/style.css
git commit -m "feat: show difficulty and XP reward on mode cards"
```

---

### Task 6: Navbar — Restore 4 Tabs

**Files:**
- Modify: `src/ui/navbar.ts` (add Головна tab back, rename)
- Recreate: `src/ui/img/navbar/iconGame.svg`

- [ ] **Step 1: Update navbar HTML**

```typescript
const navHTML = `
  <div id="navIndicator" class="nav-indicator"></div>
  <button class="nav-btn active" data-screen="screenDashboard">
    <span class="nav-icon icon-home"></span>
    Головна
  </button>
  <button class="nav-btn" data-screen="screenGame">
    <span class="nav-icon icon-game"></span>
    Гра
  </button>
  <button class="nav-btn" data-screen="screenStats">
    <span class="nav-icon icon-stats"></span>
    Статистика
  </button>
  <button class="nav-btn" data-screen="screenManage">
    <span class="nav-icon icon-manage"></span>
    Вірші
  </button>
`;
```

- [ ] **Step 2: Create game icon SVG**

`src/ui/img/navbar/iconGame.svg` — a play/gamepad icon:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="6" width="20" height="12" rx="3"/>
  <circle cx="8.5" cy="12" r="1.5"/>
  <circle cx="15.5" cy="12" r="1.5"/>
</svg>
```

- [ ] **Step 3: Re-add `.icon-game` CSS rule to `navbar.css`**

```css
.icon-game {
  -webkit-mask-image: url('./img/navbar/iconGame.svg');
  mask-image: url('./img/navbar/iconGame.svg');
}
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/navbar.ts src/ui/navbar.css src/ui/img/navbar/iconGame.svg
git commit -m "feat: restore 4-tab navigation (Головна, Гра, Статистика, Вірші)"
```

---

### Task 7: Stats Screen Redesign — Streak Hero Card

**Files:**
- Modify: `index.html` (replace screenStats content)
- Modify: `src/ui/ui.ts` (update renderStats)
- Modify: `src/style.css` (stats styles)

The new stats screen has: streak gradient card (top), 3-column stats, 14-day activity chart, milestones.

- [ ] **Step 1: Replace screenStats HTML in index.html**

```html
<div class="screen" id="screenStats">
  <!-- Streak hero card -->
  <div class="stats-streak-card">
    <div class="stats-streak-number" id="statStreakDays">0</div>
    <div class="stats-streak-label">днів</div>
    <div class="stats-streak-sub" id="statStreakMsg">підряд · продовжуй.</div>
  </div>

  <!-- 3-column stats -->
  <div class="stats-3col">
    <div class="stats-3col-item">
      <div class="stats-3col-label">вивчено</div>
      <div class="stats-3col-value">
        <span class="stats-3col-num" id="statLearned2">0</span>
        <span class="stats-3col-unit">віршів</span>
      </div>
    </div>
    <div class="stats-3col-item">
      <div class="stats-3col-label">точність</div>
      <div class="stats-3col-value">
        <span class="stats-3col-num" id="statAccuracy2">0</span>
        <span class="stats-3col-unit">%</span>
      </div>
    </div>
    <div class="stats-3col-item">
      <div class="stats-3col-label">час</div>
      <div class="stats-3col-value">
        <span class="stats-3col-num" id="statTimeNum">0</span>
        <span class="stats-3col-unit" id="statTimeUnit">хв</span>
      </div>
    </div>
  </div>

  <!-- Activity chart -->
  <div class="stats-activity">
    <div class="stats-activity-title">АКТИВНІСТЬ · 14 ДНІВ</div>
    <div class="stats-activity-chart" id="activityChart"></div>
    <div class="stats-activity-labels">
      <span id="activityStart"></span>
      <span id="activityMid"></span>
      <span>СЬОГОДНІ</span>
    </div>
  </div>

  <!-- Milestones -->
  <div class="stats-milestones">
    <div class="stats-milestones-title">ВІХИ · MILESTONES</div>
    <div id="milestonesList"></div>
  </div>
</div>
```

- [ ] **Step 2: Add CSS for stats streak card**

```css
.stats-streak-card {
  position: relative;
  border-radius: 12px;
  background: var(--gradient);
  padding: 32px 24px;
  margin: 0 0 0;
  overflow: hidden;
  color: #fff;
}
.stats-streak-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.3), transparent 60%);
  mix-blend-mode: overlay;
}
.stats-streak-number {
  font-size: 5rem;
  font-weight: 800;
  line-height: 1;
  position: relative;
  z-index: 1;
  display: inline;
}
.stats-streak-label {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 2.5rem;
  display: inline;
  margin-left: 8px;
  position: relative;
  z-index: 1;
}
.stats-streak-sub {
  font-size: 0.85rem;
  opacity: 0.85;
  margin-top: 8px;
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 3: Add CSS for 3-column stats**

```css
.stats-3col {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin: 24px 0;
}
.stats-3col-item {
  padding: 24px 16px;
}
.stats-3col-item:not(:last-child) {
  border-right: 1px solid var(--border);
}
.stats-3col-label {
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  text-transform: lowercase;
  color: var(--text-muted);
  font-family: var(--font-mono, var(--font));
  margin-bottom: 8px;
}
.stats-3col-num {
  font-size: 2.8rem;
  font-weight: 700;
  line-height: 1;
  color: var(--text);
}
.stats-3col-unit {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 1rem;
  color: var(--text-muted);
  margin-left: 4px;
}
```

- [ ] **Step 4: Add CSS for activity chart**

```css
.stats-activity {
  margin: 24px 0;
  padding: 0;
}
.stats-activity-title {
  font-size: 0.7rem;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  margin-bottom: 16px;
  font-family: var(--font-mono, var(--font));
}
.stats-activity-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
}
.stats-activity-bar {
  flex: 1;
  min-width: 0;
  border-radius: 3px 3px 0 0;
  background: var(--border-strong);
  transition: height 0.3s;
}
.stats-activity-bar.today {
  background: var(--text);
}
.stats-activity-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-top: 8px;
  font-family: var(--font-mono, var(--font));
}
```

- [ ] **Step 5: Add CSS for milestones**

```css
.stats-milestones {
  margin: 24px 0;
  border-top: 1px solid var(--border);
  padding-top: 24px;
}
.stats-milestones-title {
  font-size: 0.7rem;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  margin-bottom: 16px;
  font-family: var(--font-mono, var(--font));
}
.milestone-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid var(--border);
}
.milestone-item:last-child { border-bottom: none; }
.milestone-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.5px solid var(--border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-muted);
}
.milestone-icon.completed {
  background: var(--text);
  color: var(--bg);
  border-color: var(--text);
}
.milestone-info h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}
.milestone-info p {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 2px 0 0;
  font-style: italic;
}
.milestone-check {
  margin-left: auto;
  font-size: 1.1rem;
  color: var(--text);
}
```

- [ ] **Step 6: Commit**

```bash
git add index.html src/style.css
git commit -m "feat: stats screen redesign — streak card, 3-col stats, activity chart, milestones"
```

---

### Task 8: Stats Screen — JavaScript Logic

**Files:**
- Modify: `src/ui/ui.ts` (rewrite renderStats)
- Modify: `src/core/stats.ts` (add getActivityData, time tracking)

- [ ] **Step 1: Add time tracking to Attempt interface**

In `src/core/stats.ts`, add `duration` field to Attempt:
```typescript
export interface Attempt {
  // ...existing fields...
  duration?: number; // seconds spent on attempt
}
```

- [ ] **Step 2: Track game duration in game.ts**

In `start()`: `this._startTime = Date.now();`
In `_recordAndShow()`: calculate duration and pass to `Stats.record()`.

- [ ] **Step 3: Add `getActivityData()` to Stats**

```typescript
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
```

- [ ] **Step 4: Rewrite `renderStats()` in ui.ts**

```typescript
renderStats(): void {
  const o = Stats.getOverview();

  // Streak card
  const streakNum = $('statStreakDays');
  if (streakNum) streakNum.textContent = o.streak.toString();
  const streakMsg = $('statStreakMsg');
  if (streakMsg) {
    streakMsg.textContent = o.streak > 0 ? 'підряд · продовжуй.' : 'починай серію!';
  }

  // 3-column stats
  const learned = $('statLearned2');
  if (learned) learned.textContent = o.learned.toString();
  const acc = $('statAccuracy2');
  if (acc) acc.textContent = o.accuracy.toString();

  // Time
  const totalSec = Stats.getTotalTime();
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const timeNum = $('statTimeNum');
  const timeUnit = $('statTimeUnit');
  if (timeNum && timeUnit) {
    if (mins > 0) {
      timeNum.textContent = mins.toString();
      timeUnit.textContent = `хв${secs > 0 ? secs + 'с' : ''}`;
    } else {
      timeNum.textContent = secs.toString();
      timeUnit.textContent = 'с';
    }
  }

  // Activity chart (14 days)
  const activity = Stats.getActivityData(14);
  const maxCount = Math.max(...activity.map(d => d.count), 1);
  const chartEl = $('activityChart');
  if (chartEl) {
    chartEl.innerHTML = activity.map((d, i) => {
      const h = Math.max((d.count / maxCount) * 100, 4);
      const isToday = i === activity.length - 1;
      return `<div class="stats-activity-bar${isToday ? ' today' : ''}" style="height:${h}%"></div>`;
    }).join('');
  }

  // Activity date labels
  const months = ['СІЧ','ЛЮТ','БЕР','КВІ','ТРА','ЧЕР','ЛИП','СЕР','ВЕР','ЖОВ','ЛИС','ГРУ'];
  const startEl = $('activityStart');
  if (startEl && activity[0]) {
    const d = new Date(activity[0].date);
    startEl.textContent = `${d.getDate()} ${months[d.getMonth()]}`;
  }
  const midEl = $('activityMid');
  if (midEl && activity[7]) {
    const d = new Date(activity[7].date);
    midEl.textContent = `${d.getDate()} ${months[d.getMonth()]}`;
  }

  // Milestones
  this._renderMilestones();
},
```

- [ ] **Step 5: Add `_renderMilestones()` to UI**

```typescript
_renderMilestones(): void {
  const o = Stats.getOverview();
  const container = $('milestonesList');
  if (!container) return;

  const milestones = [
    {
      icon: '🔥',
      title: 'Тиждень підряд',
      check: o.streak >= 7 || o.bestStreak >= 7,
      progress: o.streak >= 7 ? null : `${o.streak} з 7 днів`,
      completed: o.bestStreak >= 7,
    },
    {
      icon: '⭐',
      title: 'Перші 50 віршів',
      check: o.learned >= 50,
      progress: o.learned >= 50 ? null : `${o.learned} з 50 завершено`,
      completed: o.learned >= 50,
    },
    {
      icon: '✦',
      title: 'Псалмоспівець',
      check: false, // Needs psalm-specific count
      progress: '0 зі 100 псалмів',
      completed: false,
    },
  ];

  container.innerHTML = milestones.map(m => `
    <div class="milestone-item">
      <div class="milestone-icon${m.completed ? ' completed' : ''}">${m.icon}</div>
      <div class="milestone-info">
        <h3>${m.title}</h3>
        <p>${m.completed ? 'Виконано' : m.progress}</p>
      </div>
      ${m.completed ? '<span class="milestone-check">✓</span>' : ''}
    </div>
  `).join('');
},
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/ui.ts src/core/stats.ts src/engine/game.ts
git commit -m "feat: stats logic — activity chart, time tracking, milestones"
```

---

### Task 9: Acid Theme Overrides for Stats

**Files:**
- Modify: `src/style.css` (Acid theme rules for new stats components)

- [ ] **Step 1: Add Acid overrides**

```css
[data-theme="acid"] .stats-streak-card {
  background: var(--primary);
  color: var(--primary-ink);
  border: var(--border-w) solid var(--border);
  border-radius: var(--radius);
}
[data-theme="acid"] .stats-streak-number {
  font-family: var(--font-display);
}
[data-theme="acid"] .stats-streak-label {
  font-family: var(--font-display);
  font-style: normal;
  font-weight: 800;
  text-transform: uppercase;
}
[data-theme="acid"] .stats-3col {
  border-color: var(--border);
}
[data-theme="acid"] .stats-3col-item:not(:last-child) {
  border-color: var(--border);
}
[data-theme="acid"] .stats-3col-num {
  font-family: var(--font-display);
}
[data-theme="acid"] .stats-activity-bar {
  background: var(--border);
}
[data-theme="acid"] .stats-activity-bar.today {
  background: var(--primary);
}
[data-theme="acid"] .milestone-icon.completed {
  background: var(--primary);
  color: var(--primary-ink);
  border-color: var(--primary);
}
[data-theme="acid"] .stats-milestones {
  border-color: var(--border);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/style.css
git commit -m "feat: acid theme overrides for stats screen"
```

---

### Task 10: XP Earned Animation in Game Result

**Files:**
- Modify: `src/engine/game.ts` (show +XP in result)
- Modify: `src/style.css` (XP animation)

- [ ] **Step 1: Show XP earned in result banner**

In `_showResult()`, after the accuracy text, add XP earned:
```typescript
if (success) {
  const xpAmount = XP.getReward(this.currentMode!);
  resultHTML += `<div class="xp-earned">+${xpAmount} XP</div>`;
}
```

- [ ] **Step 2: Add CSS for XP earned**

```css
.xp-earned {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent);
  margin-top: 8px;
  animation: xpPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes xpPop {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/engine/game.ts src/style.css
git commit -m "feat: XP earned animation in game result"
```

---

## Execution Order

Tasks 1–2 are foundational (XP core + streak logic).
Task 3 (hints) depends on Task 1 (XP).
Task 4 (new mode) is independent.
Tasks 5–6 are UI updates.
Tasks 7–9 are the stats redesign (sequential).
Task 10 is polish.

Recommended order: **1 → 2 → 4 → 3 → 5 → 6 → 7 → 8 → 9 → 10**
