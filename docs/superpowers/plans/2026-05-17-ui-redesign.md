# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Dashboard into separate Home and Game screens, switch from daily to monthly progress (4 verses/month), remove English text, replace theme toggle with tumbler, remove black icon backgrounds in mode cards.

**Architecture:** Dashboard currently renders one screen (`screenDashboard`) containing hero+progress+dailyVerse+modeSelection+settings+startButton. We split it into two screens: `screenDashboard` (home: header, progress, daily verse) and `screenGame` (mode selection, settings, start button). The existing `screenGame` in `index.html` (the active game play screen) will be renamed to `screenGamePlay` to avoid ID conflict. Navbar button for "Гра" will point to the new `screenGame` instead of scrolling within dashboard.

**Tech Stack:** TypeScript, Vite, CSS (no framework)

---

### File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/ui/game-setup/index.ts` | New Game setup screen (mode selection, settings, start button) |
| Modify | `src/ui/dashboard/index.ts` | Remove game sections, keep only header+progress+dailyVerse |
| Modify | `src/ui/dashboard/Header.ts` | Replace theme SVG toggle with tumbler, update acid hero text |
| Modify | `src/ui/dashboard/Progress.ts` | Change from daily (5) to monthly (4) goal |
| Modify | `src/core/stats.ts` | Add `monthDone` to `StatsOverview` |
| Modify | `src/ui/navbar.ts` | Point "Гра" to `screenGame`, remove `data-scroll` |
| Modify | `src/ui/ui.ts` | Import GameSetup, handle `screenGame` navigation |
| Modify | `src/style.css` | Remove `.mode-card.selected .mode-icon` black bg in acid, add tumbler CSS |
| Modify | `index.html` | Rename `screenGame` → `screenGamePlay` |
| Modify | `src/engine/game.ts` | Update references from `screenGame` to `screenGamePlay` |

---

### Task 1: Add `monthDone` to Stats

**Files:**
- Modify: `src/core/stats.ts:7-15` (StatsOverview interface)
- Modify: `src/core/stats.ts:130-151` (getOverview method)

- [ ] **Step 1: Add `monthDone` to StatsOverview interface**

In `src/core/stats.ts`, add `monthDone` to the interface:

```typescript
export interface StatsOverview {
  total: number;
  correct: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  learned: number;
  todayDone: number;
  monthDone: number;
}
```

- [ ] **Step 2: Compute `monthDone` in getOverview()**

In `src/core/stats.ts`, update `getOverview()` to calculate monthly successes:

```typescript
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

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthDone = this._attempts.filter(x => x.ts >= monthStart && x.success).length;

    return { 
      total, 
      correct, 
      accuracy, 
      streak: this._streak, 
      bestStreak: this._bestStreak, 
      learned,
      todayDone,
      monthDone
    };
  },
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/worker/Documents/Claude/Projects/BibleVerseGame && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/core/stats.ts
git commit -m "feat: add monthDone to StatsOverview"
```

---

### Task 2: Update Progress to monthly goal

**Files:**
- Modify: `src/ui/dashboard/Progress.ts`

- [ ] **Step 1: Update render() to show monthly progress**

Replace the entire `Progress` object in `src/ui/dashboard/Progress.ts`:

```typescript
import Stats from '../../core/stats';
import { $ } from '../../utils/helpers';

const MONTHLY_GOAL = 4;

const Progress = {
	render(): string {
		return `
			<div class="progress-card">
				<div class="progress-header">
					<div class="progress-label">ЦЬОГО МІСЯЦЯ</div>
					<div class="progress-stats">
						<span id="monthlyDone">0</span><span class="serif-accent"> / <span id="monthlyGoal">${MONTHLY_GOAL}</span></span>
						<span class="serif-accent" style="font-size:1.35rem;"> віршів</span>
					</div>
				</div>
				<div class="progress-bar-container">
					<div id="monthlyProgressBar" class="progress-bar-fill" style="width: 0%;"></div>
				</div>
			</div>
		`;
	},

	update(): void {
		const o = Stats.getOverview();
		const monthDone = o.monthDone || 0;
		const percent = Math.min(Math.round((monthDone / MONTHLY_GOAL) * 100), 100);

		const doneEl = $('monthlyDone');
		if (doneEl) doneEl.textContent = monthDone.toString();

		const barEl = $('monthlyProgressBar');
		if (barEl) barEl.style.width = `${percent}%`;
	}
};

export default Progress;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worker/Documents/Claude/Projects/BibleVerseGame && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/dashboard/Progress.ts
git commit -m "feat: switch progress from daily 5 to monthly 4 verses"
```

---

### Task 3: Update Header — tumbler + text changes

**Files:**
- Modify: `src/ui/dashboard/Header.ts`
- Modify: `src/style.css` (add tumbler CSS)

- [ ] **Step 1: Replace theme toggle SVG with tumbler in Header.ts**

In `src/ui/dashboard/Header.ts`, replace the theme toggle button (lines 12-17) with:

```html
<button id="btnThemeToggle" class="theme-tumbler" aria-label="Theme">
	<span class="theme-tumbler-knob"></span>
</button>
```

The full `render()` return should be:

```typescript
render(): string {
    return `
        <div class="date-row">
            <span id="currentDate" class="dashboard-date"></span>
            <div style="display:flex; gap:12px; align-items:center;">
                <button id="btnThemeToggle" class="theme-tumbler" aria-label="Theme">
                    <span class="theme-tumbler-knob"></span>
                </button>
                <div class="streak-badge">
                    <svg class="streak-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4-1 4 2 5 3 5 0-3-1-7 0-11z"/></svg>
                    <span id="streakCount">0</span>
                </div>
                <button id="btnProfile" class="header-icon-btn" aria-label="Profile">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="hero-editorial">
            <p class="hero-subtitle" id="heroSubtitle"></p>
            <h1 class="dashboard-title" id="heroTitle"></h1>
            <p class="hero-desc" id="heroDesc"></p>
            <div class="hero-cta">
                <button id="btnHeroStart" class="btn-outline-pill">
                    <span id="heroCTAText"></span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
            </div>
        </div>
        <div class="hero-acid">
            <h1 class="dashboard-title" id="heroTitleAcid"></h1>
            <p class="hero-desc hero-desc--acid" id="heroDescAcid"></p>
        </div>
    `;
},
```

- [ ] **Step 2: Update acid hero text in Header.ts update()**

In `src/ui/dashboard/Header.ts`, change line 75 from:
```typescript
if (descAcid) descAcid.textContent = 'Вивчай Святе Письмо як гру. По одному віршу за раз — і Слово залишиться в тобі.';
```
to:
```typescript
if (descAcid) descAcid.textContent = 'Вивчай Святе Письмо. По одному віршу за раз — і Слово залишиться в тобі.';
```

- [ ] **Step 3: Update heroStartBtn to navigate to game screen**

In `src/ui/dashboard/Header.ts`, change the hero start button handler (lines 94-99) from:
```typescript
heroStartBtn.addEventListener('click', () => {
    const gameSection = document.getElementById('dashModeSection');
    if (gameSection) gameSection.scrollIntoView({ behavior: 'smooth' });
});
```
to:
```typescript
heroStartBtn.addEventListener('click', () => {
    UI.navigate('screenGame');
});
```

- [ ] **Step 4: Add tumbler CSS to style.css**

Find the `.theme-toggle-btn` styles in `src/style.css` and add these new styles nearby (after the existing theme toggle styles):

```css
/* Theme tumbler */
.theme-tumbler {
    width: 44px;
    height: 24px;
    background: var(--border-strong);
    border: none;
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    padding: 0;
    transition: background 0.3s;
}

.theme-tumbler-knob {
    display: block;
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.3s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

[data-theme="acid"] .theme-tumbler {
    background: var(--primary);
}

[data-theme="acid"] .theme-tumbler-knob {
    transform: translateX(20px);
    background: var(--accent);
}
```

- [ ] **Step 5: Remove old `.theme-toggle-btn` and `.theme-toggle-icon` CSS** if they exist in `src/style.css`

Search for and remove: `.theme-toggle-btn`, `.theme-toggle-icon`, `.theme-toggle-icon--editorial`, `.theme-toggle-icon--acid` CSS rules.

- [ ] **Step 6: Verify build**

Run: `cd /Users/worker/Documents/Claude/Projects/BibleVerseGame && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/ui/dashboard/Header.ts src/style.css
git commit -m "feat: replace theme toggle with tumbler, fix acid hero text"
```

---

### Task 4: Create Game Setup screen

**Files:**
- Create: `src/ui/game-setup/index.ts`

- [ ] **Step 1: Create the GameSetup module**

Create `src/ui/game-setup/index.ts`:

```typescript
import UI from '../ui';
import { $ } from '../../utils/helpers';

const GameSetup = {
    init(): void {
        const html = `
            <div class="container">
                <div class="dash-section">
                    <div class="section-head">
                        <span class="section-head-small section-head-step">
                            <span class="section-step-editorial">КРОК 01</span>
                            <span class="section-step-acid"><span class="section-step-num">01</span></span>
                        </span>
                        <div class="section-head-title">
                            <span class="section-title-editorial">Обери режим</span>
                            <span class="section-title-acid">ОБЕРИ РЕЖИМ</span>
                        </div>
                    </div>
                    <div class="mode-grid" id="gameModeGrid">
                        <div class="mode-card selected" data-mode="word-order">
                            <div class="mode-icon">🔀</div>
                            <div class="mode-info">
                                <h3>Складання слів</h3>
                                <p>Відновити правильний порядок слів</p>
                            </div>
                        </div>
                        <div class="mode-card" data-mode="fill-gaps">
                            <div class="mode-icon">✏️</div>
                            <div class="mode-info">
                                <h3>Заповни пропуски</h3>
                                <p>Вписати приховані слова</p>
                            </div>
                        </div>
                        <div class="mode-card" data-mode="first-letters">
                            <div class="mode-icon">🔤</div>
                            <div class="mode-info">
                                <h3>Перші букви</h3>
                                <p>Бачиш лише першу букву — згадай слово</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dash-section">
                    <div class="section-head">
                        <span class="section-head-small section-head-step">
                            <span class="section-step-editorial">КРОК 02</span>
                            <span class="section-step-acid"><span class="section-step-num">02</span></span>
                        </span>
                        <div class="section-head-title">
                            <span class="section-title-editorial">Налаштування</span>
                            <span class="section-title-acid">НАЛАШТУЙ</span>
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-label">Переклад</div>
                        <select id="filterTranslation"></select>
                    </div>
                    <div class="filter-row">
                        <div class="filter-label">Вірш</div>
                        <select id="filterVerse">
                            <option value="all">Всі вірші (випадковий)</option>
                        </select>
                    </div>
                </div>

                <div class="dash-cta">
                    <button class="btn btn-primary btn-block" id="btnGameStart">
                        <span class="cta-text-editorial">ПОЧАТИ ГРУ</span>
                        <span class="cta-text-acid">ПОЇХАЛИ ⚡</span>
                    </button>
                </div>
            </div>
        `;

        const screen = document.createElement('div');
        screen.id = 'screenGame';
        screen.className = 'screen';
        screen.innerHTML = html;

        const appEl = document.querySelector('.app');
        if (appEl) appEl.appendChild(screen);

        this._bindEvents();
    },

    _bindEvents(): void {
        const modeGrid = $('gameModeGrid');
        if (modeGrid) {
            modeGrid.addEventListener('click', (e) => {
                const card = (e.target as HTMLElement).closest('.mode-card') as HTMLElement;
                if (card) UI.selectMode(card);
            });
        }

        const startBtn = $('btnGameStart');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                (window as any).Game.start();
            });
        }

        const transSel = $<HTMLSelectElement>('filterTranslation');
        if (transSel) {
            transSel.addEventListener('change', () => UI.updateVerseFilter());
        }
    }
};

export default GameSetup;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worker/Documents/Claude/Projects/BibleVerseGame && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/game-setup/index.ts
git commit -m "feat: create separate GameSetup screen"
```

---

### Task 5: Remove game sections from Dashboard

**Files:**
- Modify: `src/ui/dashboard/index.ts`

- [ ] **Step 1: Strip game sections from Dashboard.init()**

Replace the entire `Dashboard` object in `src/ui/dashboard/index.ts`:

```typescript
import Header from './Header';
import Progress from './Progress';
import DailyVerse from './DailyVerse';
import { $ } from '../../utils/helpers';

const Dashboard = {
    init(): void {
        const html = `
            <div class="dashboard-top">
                ${Header.render()}
            </div>
            ${Progress.render()}
            <div class="container">
                <div id="dailyVerseContainer">
                    ${DailyVerse.render()}
                </div>
            </div>
        `;

        const screen = document.createElement('div');
        screen.id = 'screenDashboard';
        screen.className = 'screen';
        screen.innerHTML = html;

        const appEl = document.querySelector('.app');
        if (appEl) {
            const screenHome = document.getElementById('screenHome');
            if (screenHome) {
                appEl.insertBefore(screen, screenHome);
                screenHome.style.display = 'none';
            } else {
                appEl.appendChild(screen);
            }
        }

        this.render();
    },

    render(): void {
        Header.update();
        Progress.update();
        DailyVerse.update();
    }
};

export default Dashboard;
```

Note: removed imports of `UI`, `TRANSLATIONS_META`, `VersesDB` and all `_bindEvents()` since game-related logic is now in GameSetup.

- [ ] **Step 2: Verify build**

Run: `cd /Users/worker/Documents/Claude/Projects/BibleVerseGame && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/dashboard/index.ts
git commit -m "refactor: strip game sections from Dashboard, now home-only"
```

---

### Task 6: Rename screenGame → screenGamePlay in HTML and engine

**Files:**
- Modify: `index.html`
- Modify: `src/engine/game.ts`

- [ ] **Step 1: Check current screenGame usage in index.html**

Search for `screenGame` in `index.html` and rename the game play screen div from `id="screenGame"` to `id="screenGamePlay"`.

- [ ] **Step 2: Update all references in game.ts**

Search for `screenGame` in `src/engine/game.ts` and replace with `screenGamePlay`. This includes any `UI.showScreen('screenGame')` or `document.getElementById('screenGame')` calls.

- [ ] **Step 3: Search for any other references**

Run: `grep -rn "screenGame" src/ index.html --include="*.ts" --include="*.html" | grep -v "screenGamePlay" | grep -v "screenGameSetup" | grep -v node_modules`

Fix any remaining references that should point to `screenGamePlay` (the active game play screen) vs `screenGame` (the new setup screen).

- [ ] **Step 4: Verify build**

Run: `cd /Users/worker/Documents/Claude/Projects/BibleVerseGame && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add index.html src/engine/game.ts
git commit -m "refactor: rename screenGame to screenGamePlay for game play screen"
```

---

### Task 7: Wire up Navbar and UI

**Files:**
- Modify: `src/ui/navbar.ts`
- Modify: `src/ui/ui.ts`
- Modify: `src/main.ts` (if GameSetup.init() needs to be called)

- [ ] **Step 1: Update Navbar to point "Гра" to screenGame**

In `src/ui/navbar.ts`, change line 12 from:
```html
<button id="navBtnGame" class="nav-btn" data-screen="screenDashboard" data-scroll="dashModeSection">
```
to:
```html
<button id="navBtnGame" class="nav-btn" data-screen="screenGame">
```

Also remove the `data-scroll` handling logic from the click handler (lines 40-43):
```typescript
btn.addEventListener('click', (e) => {
    const el = e.currentTarget as HTMLElement;
    const screen = el.dataset.screen;
    if (screen) {
        UI.navigate(screen);
    }
});
```

- [ ] **Step 2: Import and init GameSetup in UI or main.ts**

In `src/ui/ui.ts`, add import and initialization:

Add at top:
```typescript
import GameSetup from './game-setup/index';
```

In `init()`, add `GameSetup.init()` call and move `renderTranslationFilter`/`updateVerseFilter` to run after GameSetup creates the filter elements:

```typescript
init(): void {
    GameSetup.init();
    this.renderTranslationFilter();
    this.updateVerseFilter();
    this.renderStats();
    Dashboard.render();
},
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/worker/Documents/Claude/Projects/BibleVerseGame && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/ui/navbar.ts src/ui/ui.ts
git commit -m "feat: wire navbar to separate Game screen, init GameSetup"
```

---

### Task 8: Remove black icon background in mode cards (Acid theme)

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Update acid mode-icon selected style**

In `src/style.css`, find the rule at line ~1399:
```css
[data-theme="acid"] .mode-card.selected .mode-icon {
    background: var(--accent);
    color: var(--primary);
    border: var(--border-w) solid var(--border);
    transform: rotate(-4deg);
}
```

Change to remove the dark background, use a lighter highlight:
```css
[data-theme="acid"] .mode-card.selected .mode-icon {
    background: var(--primary-ink);
    color: var(--primary);
    border: var(--border-w) solid var(--primary);
    transform: rotate(-4deg);
}
```

Also check the base `.mode-card.selected .mode-icon` at line ~435 — if needed, ensure Editorial doesn't have a jarring black background either. Current state uses `var(--accent)` which is fine for Editorial.

- [ ] **Step 2: Commit**

```bash
git add src/style.css
git commit -m "fix: remove dark icon background on selected mode cards in acid theme"
```

---

### Task 9: Visual verification

- [ ] **Step 1: Start dev server**

Run: `cd /Users/worker/Documents/Claude/Projects/BibleVerseGame && npm run dev`

- [ ] **Step 2: Test Editorial theme**

Open in browser. Verify:
- Home tab shows: header, monthly progress (0/4 віршів), daily verse
- No game mode selection on Home
- Game tab shows: mode selection, settings (no English text), start button
- Theme toggle is a tumbler
- Section titles say "Обери режим" and "Налаштування" (no English)

- [ ] **Step 3: Test Acid theme**

Toggle to Acid theme. Verify:
- Same separate Home/Game screens
- Hero text says "Вивчай Святе Письмо." (without "як гру")
- "ОБЕРИ РЕЖИМ" (not "ОБЕРИ ВАЙБ")
- Mode card icons don't have black/dark background when selected
- Monthly progress shows 0/4

- [ ] **Step 4: Test game flow**

Click start from Game tab. Verify game launches and plays correctly. After completing a verse, verify monthly counter increments.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final UI redesign verification"
```
