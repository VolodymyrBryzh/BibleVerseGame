import VersesDB from '../core/database';
import Stats from '../core/stats';
import Manage from './manage';
import { TRANSLATIONS_META } from '../constants/bibleData';
import { $ } from '../utils/helpers';

const UI = {
  init(): void {
    this.renderTranslationFilter();
    this.updateVerseFilter();
    this.renderStats();
    this.renderDashboard();
  },

  renderDashboard(): void {
    console.log('UI: Rendering Dashboard...');
    try {
      // 1. Update Date
      const dateEl = $('currentDate');
      if (dateEl) {
        const now = new Date();
        const days = ['НЕДІЛЯ', 'ПОНЕДІЛОК', 'ВІВТОРОК', 'СЕРЕДА', 'ЧЕТВЕР', 'П’ЯТНИЦЯ', 'СУБОТА'];
        const months = ['СІЧНЯ', 'ЛЮТОГО', 'БЕРЕЗНЯ', 'КВІТНЯ', 'ТРАВНЯ', 'ЧЕРВНЯ', 'ЛИПНЯ', 'СЕРПНЯ', 'ВЕРЕСНЯ', 'ЖОВТНЯ', 'ЛИСТОПАДА', 'ГРУДНЯ'];
        dateEl.textContent = `${days[now.getDay()]} · ${now.getDate()} ${months[now.getMonth()]}`;
      }

      // 2. Update Stats (Streak & Progress)
      const o = Stats.getOverview();
      const streakEl = $('streakCount');
      if (streakEl) streakEl.textContent = (o.streak || 0).toString();
      
      const todayDone = o.todayDone || 0;
      const dailyGoal = 5;
      const percent = Math.min(Math.round((todayDone / dailyGoal) * 100), 100);

      const doneEl = $('dailyDone');
      if (doneEl) doneEl.textContent = todayDone.toString();
      
      const percentEl = $('dailyPercent');
      if (percentEl) percentEl.textContent = percent.toString();
      
      const barEl = $('dailyProgressBar');
      if (barEl) barEl.style.width = `${percent}%`;

      // 3. Render Daily Verse
      const container = $('dailyVerseContainer');
      if (!container) return;

      const allVerses = VersesDB.getAll();
      console.log(`UI: Found ${allVerses.length} verses for dashboard.`);
      
      if (!allVerses.length) {
        container.innerHTML = '<p class="text-light">Додайте вірші у налаштуваннях, щоб почати вчити.</p>';
        return;
      }
      
      // Random daily verse logic
      const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const dailyVerse = allVerses[daySeed % allVerses.length];
      
      const transKeys = Object.keys(dailyVerse.translations);
      const trans = dailyVerse.translations[transKeys[0]] || '';

      container.innerHTML = `
        <div class="card" style="border-left: 4px solid var(--accent); margin-top: 10px;">
          <div class="card-title" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--accent); margin-bottom:8px;">Вірш дня</div>
          <p style="font-style: italic; margin-bottom:12px; font-size:1.1rem; line-height:1.5; color:#2c2e35;">"${trans}"</p>
          <div style="text-align:right; font-weight:700; color:var(--text-muted); font-size:0.9rem;">${VersesDB.getReference(dailyVerse)}</div>
        </div>
      `;
    } catch (e) {
      console.error('UI: Render Dashboard error', e);
    }
  },

  showScreen(id: string): void {
    // Optimization: only update classes if screen changes or needs refresh
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    
    // Update nav
    const navBtns = document.querySelectorAll('.nav-btn');
    let activeIndex = 0;
    navBtns.forEach((b, index) => {
      const btn = b as HTMLElement;
      const isActive = btn.dataset.screen === id;
      btn.classList.toggle('active', isActive);
      if (isActive) activeIndex = index;
    });

    // Move indicator
    const indicator = $('navIndicator');
    if (indicator) {
      // 200% = 2 * 12.5% (indicator width) = 25% (button width)
      indicator.style.transform = `translateX(${activeIndex * 200}%)`;
    }

    
    // Specific screen logic
    if (id === 'screenStats') this.renderStats();
    if (id === 'screenManage') Manage.renderVerseList();
    
    // Auto-scroll to top when switching screens
    window.scrollTo(0, 0);
  },

  navigate(screenId: string): void {
    this.showScreen(screenId);
  },

  selectMode(el: HTMLElement): void {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  },

  renderTranslationFilter(): void {
    const sel = $<HTMLSelectElement>('filterTranslation');
    if (!sel) return;
    sel.innerHTML = TRANSLATIONS_META.map(t =>
      `<option value="${t.key}">${t.name}</option>`
    ).join('');
  },

  updateVerseFilter(): void {
    const transSel = $<HTMLSelectElement>('filterTranslation');
    const sel = $<HTMLSelectElement>('filterVerse');
    if (!transSel || !sel) return;
    
    const transKey = transSel.value;
    const prev = sel.value;
    
    let html = '<option value="all">Всі вірші (випадковий)</option>';
    VersesDB.getAll()
      .filter(v => v.translations[transKey])
      .forEach(v => {
        html += `<option value="${v.id}">${VersesDB.getReference(v)}</option>`;
      });
    
    sel.innerHTML = html;
    if (sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
  },

  renderStats(): void {
    const o = Stats.getOverview();
    const map = {
      'statTotal': o.total,
      'statAccuracy': o.accuracy + '%',
      'statStreak': o.streak,
      'statLearned': o.learned
    };

    Object.entries(map).forEach(([id, val]) => {
      const el = $(id);
      if (el) el.textContent = val.toString();
    });

    // Per verse progress
    const perVerse = Stats.getPerVerse();
    const container = $('verseStats');
    if (container) {
      if (!perVerse.length) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Зіграй хоча б раз</p>';
      } else {
        container.innerHTML = perVerse.map(v => {
          let badge = 'strong', badgeText = 'Вивчено';
          if (v.pct < 50) { badge = 'weak'; badgeText = 'Потребує роботи'; }
          else if (v.pct < 80) { badge = 'medium'; badgeText = 'В процесі'; }
          return `
            <div class="verse-stat-row">
              <div>
                <span class="verse-stat-ref">${v.ref}</span>
                <span class="weak-badge ${badge}">${badgeText}</span>
              </div>
              <span class="verse-stat-pct">${v.pct}% (${v.total})</span>
            </div>
          `;
        }).join('');
      }
    }

    // Weak spots optimization
    const weak = Stats.getWeakSpots();
    const weakContainer = $('weakSpots');
    if (weakContainer) {
      if (!weak.length) {
        weakContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Поки що недостатньо даних</p>';
      } else {
        const modeNames: Record<string, string> = { 
          'word-order': 'Складання', 
          'fill-gaps': 'Пропуски', 
          'continue': 'Продовження' 
        };
        weakContainer.innerHTML = weak.map(v => {
          const errors = Object.entries(v.errors).sort((a,b) => b[1] - a[1]);
          const worstMode = errors[0];
          const modeHint = worstMode ? ` · найбільше помилок: ${modeNames[worstMode[0]] || worstMode[0]}` : '';
          return `
            <div class="verse-stat-row">
              <span class="verse-stat-ref">${v.ref}</span>
              <span style="font-size:0.8rem;color:var(--danger)">${v.pct}%${modeHint}</span>
            </div>
          `;
        }).join('');
      }
    }
  }
};

export default UI;
