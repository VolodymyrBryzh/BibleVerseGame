import VersesDB from '../core/database.js';
import Stats from '../core/stats.js';
import Manage from './manage.js';
import { TRANSLATIONS_META } from '../constants/bibleData.js';

const UI = {
  init() {
    this.populateTranslationFilter();
    this.updateVerseFilter();
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
    
    // Update nav
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === id);
    });
    
    if (id === 'screenStats') this.renderStats();
    if (id === 'screenManage') Manage.renderVerseList();
  },

  navigate(screenId, btn) {
    this.showScreen(screenId);
  },

  selectMode(el) {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  },

  populateTranslationFilter() {
    const sel = document.getElementById('filterTranslation');
    if (!sel) return;
    sel.innerHTML = TRANSLATIONS_META.map(t =>
      `<option value="${t.key}">${t.name}</option>`
    ).join('');
  },

  updateVerseFilter() {
    const transSel = document.getElementById('filterTranslation');
    const sel = document.getElementById('filterVerse');
    if (!transSel || !sel) return;
    
    const transKey = transSel.value;
    const prev = sel.value;
    sel.innerHTML = '<option value="all">Всі вірші (випадковий)</option>';
    
    VersesDB.getAll()
      .filter(v => v.translations[transKey])
      .forEach(v => {
        sel.innerHTML += `<option value="${v.id}">${VersesDB.getReference(v)}</option>`;
      });
      
    if (sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
  },

  renderStats() {
    const o = Stats.getOverview();
    document.getElementById('statTotal').textContent = o.total;
    document.getElementById('statAccuracy').textContent = o.accuracy + '%';
    document.getElementById('statStreak').textContent = o.streak;
    document.getElementById('statLearned').textContent = o.learned;

    // Per verse
    const perVerse = Stats.getPerVerse();
    const container = document.getElementById('verseStats');
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

    // Weak spots
    const weak = Stats.getWeakSpots();
    const weakContainer = document.getElementById('weakSpots');
    if (!weak.length) {
      weakContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Поки що недостатньо даних</p>';
    } else {
      const modeNames = { 'word-order': 'Складання', 'fill-gaps': 'Пропуски', 'continue': 'Продовження' };
      weakContainer.innerHTML = weak.map(v => {
        const worstMode = Object.entries(v.errors).sort((a,b) => b[1] - a[1])[0];
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
};

export default UI;
