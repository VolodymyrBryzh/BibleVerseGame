import VersesDB from '../core/database';
import UI from './ui';
import { TRANSLATIONS_META, BibleVerse } from '../constants/bibleData';
import { toast, $ } from '../utils/helpers';

const Manage = {
  editingId: null as string | null,

  init(): void {
    this.renderTranslationFields();
    this.renderVerseList();
  },

  renderTranslationFields(): void {
    const container = $('addTranslations');
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

  saveVerse(): void {
    const bookEl = $<HTMLInputElement>('addBook');
    const chapterEl = $<HTMLInputElement>('addChapter');
    const verseEl = $<HTMLInputElement>('addVerse');
    const tagsEl = $<HTMLInputElement>('addTags');

    const book = bookEl?.value.trim() || '';
    const chapter = parseInt(chapterEl?.value || '0');
    const verse = parseInt(verseEl?.value || '0');
    const tags = tagsEl?.value.split(',').map(s => s.trim()).filter(Boolean) || [];

    if (!book || isNaN(chapter) || isNaN(verse)) return toast('Заповни книгу, розділ і вірш');

    const translations: Record<string, string> = {};
    let hasAny = false;
    
    TRANSLATIONS_META.forEach(t => {
      const el = $<HTMLTextAreaElement>(`addTrans_${t.key}`);
      const text = el?.value.trim() || '';
      if (text) { 
        translations[t.key] = text; 
        hasAny = true; 
      }
    });

    if (!hasAny) return toast('Додай хоча б один переклад');

    VersesDB.addVerse({ 
      id: '', 
      book, 
      chapter, 
      verse, 
      tags, 
      translations 
    } as BibleVerse);
    
    toast('Вірш додано!');
    this._clearForm();
    this.renderVerseList();
    UI.updateVerseFilter();
  },

  _clearForm(): void {
    ['addBook', 'addChapter', 'addVerse', 'addTags'].forEach(id => {
      const el = $<HTMLInputElement>(id);
      if (el) el.value = '';
    });
    TRANSLATIONS_META.forEach(t => {
      const el = $<HTMLTextAreaElement>(`addTrans_${t.key}`);
      if (el) el.value = '';
    });
  },

  renderVerseList(): void {
    const all = VersesDB.getAll();
    const countEl = $('verseCount');
    if (countEl) countEl.textContent = all.length.toString();
    
    const container = $('verseList');
    if (!container) return;
    
    if (!all.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Немає віршів</p>';
      return;
    }

    // Optimization: Build entire HTML string first
    const html = all.map(v => {
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
    
    container.innerHTML = html;
  },

  removeVerse(id: string): void {
    if (!confirm('Видалити цей вірш?')) return;
    VersesDB.removeVerse(id);
    this.renderVerseList();
    UI.updateVerseFilter();
    toast('Вірш видалено');
  },

  exportData(): void {
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

  importData(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const count = VersesDB.importVerses(content);
        toast(`Імпортовано ${count} віршів`);
        this.renderVerseList();
        UI.updateVerseFilter();
      } catch(err: any) {
        toast('Помилка імпорту: ' + err.message);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
};

export default Manage;
