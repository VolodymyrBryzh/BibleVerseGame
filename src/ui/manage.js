import VersesDB from '../core/database.js';
import UI from './ui.js';
import { TRANSLATIONS_META } from '../constants/bibleData.js';
import { toast } from '../utils/helpers.js';

const Manage = {
  editingId: null,

  init() {
    this.renderTranslationFields();
    this.renderVerseList();
  },

  renderTranslationFields() {
    const container = document.getElementById('addTranslations');
    if (!container) return;
    container.innerHTML = TRANSLATIONS_META.map(t => `
      <div class="translation-block">
        <h4>${t.name}</h4>
        <div class="form-group" style="margin:0">
          <textarea id="addTrans_${t.key}" placeholder="Текст перекладу (необовʼязково)"></textarea>
        </div>
      </div>
    `).join('');
  },

  saveVerse() {
    const book = document.getElementById('addBook').value.trim();
    const chapter = parseInt(document.getElementById('addChapter').value);
    const verse = parseInt(document.getElementById('addVerse').value);
    const tags = document.getElementById('addTags').value.split(',').map(s => s.trim()).filter(Boolean);

    if (!book || !chapter || !verse) return toast('Заповни книгу, розділ і вірш');

    const translations = {};
    let hasAny = false;
    for (const t of TRANSLATIONS_META) {
      const text = document.getElementById(`addTrans_${t.key}`).value.trim();
      if (text) { translations[t.key] = text; hasAny = true; }
    }
    if (!hasAny) return toast('Додай хоча б один переклад');

    VersesDB.addVerse({ book, chapter, verse, tags, translations });
    toast('Вірш додано!');

    // Clear form
    document.getElementById('addBook').value = '';
    document.getElementById('addChapter').value = '';
    document.getElementById('addVerse').value = '';
    document.getElementById('addTags').value = '';
    for (const t of TRANSLATIONS_META) {
      document.getElementById(`addTrans_${t.key}`).value = '';
    }

    this.renderVerseList();
    UI.updateVerseFilter();
  },

  renderVerseList() {
    const all = VersesDB.getAll();
    const countEl = document.getElementById('verseCount');
    if (countEl) countEl.textContent = all.length;
    
    const container = document.getElementById('verseList');
    if (!container) return;
    
    if (!all.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Немає віршів</p>';
      return;
    }
    container.innerHTML = all.map(v => {
      const ref = VersesDB.getReference(v);
      const transKeys = Object.keys(v.translations).length;
      const isBuiltIn = VersesDB.isBuiltIn(v.id);
      return `
        <div class="verse-list-item">
          <div>
            <div class="verse-list-ref">${ref}</div>
            <div class="verse-list-tags">${transKeys} переклад(ів) · ${v.tags?.join(', ') || ''}</div>
          </div>
          <div class="verse-list-actions">
            ${isBuiltIn ? '' : `<button class="btn btn-sm btn-danger" onclick="Manage.removeVerse('${v.id}')">✕</button>`}
          </div>
        </div>
      `;
    }).join('');
  },

  removeVerse(id) {
    if (!confirm('Видалити цей вірш?')) return;
    VersesDB.removeVerse(id);
    this.renderVerseList();
    UI.updateVerseFilter();
    toast('Вірш видалено');
  },

  exportData() {
    const json = VersesDB.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bible-verses-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Експортовано!');
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const count = VersesDB.importVerses(e.target.result);
        toast(`Імпортовано ${count} віршів`);
        this.renderVerseList();
        UI.updateVerseFilter();
      } catch(err) {
        toast('Помилка імпорту: ' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }
};

export default Manage;
