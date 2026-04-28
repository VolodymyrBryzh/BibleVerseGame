import VersesDB from '../core/database';
import BibleLoader from '../core/loader';
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

  async fetchVerse(): Promise<void> {
    const book = $<HTMLInputElement>('addBook')?.value.trim();
    const chapter = parseInt($<HTMLInputElement>('addChapter')?.value || '0');
    const verse = parseInt($<HTMLInputElement>('addVerse')?.value || '0');

    if (!book || !chapter || !verse) return toast('Введіть книгу, розділ та вірш');

    toast('Шукаю в базі...');

    const bookSlugs: Record<string, string> = {
      'Буття': 'genesis', 'Вихід': 'exodus', 'Левит': 'leviticus', 'Числа': 'numbers', 'Повторення Закону': 'deuteronomy',
      'Псалом': 'psalms', 'Приповісті': 'proverbs', 'Єремія': 'jeremiah', 'Ісая': 'isaiah',
      'Від Матвія': 'matthew', 'Від Марка': 'mark', 'Від Луки': 'luke', 'Від Івана': 'john',
      'До Римлян': 'romans', '1-е Коринтян': '1corinthians', '2-е Коринтян': '2corinthians',
      'До Галатів': 'galatians', 'До Ефесян': 'ephesians', 'До Филипʼян': 'philippians',
      'До Колосян': 'colossians', '1-е Солунян': '1thessalonians', '2-е Солунян': '2thessalonians',
      'До Євреїв': 'hebrews', 'Якова': 'james', '1-е Петра': '1peter', '2-е Петра': '2peter',
      '1-е Івана': '1john', 'Обʼявлення': 'revelation'
    };
    
    const slug = bookSlugs[book] || book.toLowerCase();
    let foundCount = 0;

    for (const meta of TRANSLATIONS_META) {
      try {
        const url = `/bible/${meta.key}/${slug}.json`;
        console.log(`Checking local file: ${url}`);
        const resp = await fetch(url);
        if (!resp.ok) {
          console.warn(`Local file not found: ${url}`);
          continue;
        }
        
        const data = await resp.json();
        const chData = data.chapters?.find((c: any) => c.chapter === chapter);
        const vData = chData?.verses?.find((v: any) => v.verse === verse);
        
        if (vData && vData.text) {
          const el = $<HTMLTextAreaElement>(`addTrans_${meta.key}`);
          if (el) el.value = vData.text.trim();
          foundCount++;
        }
      } catch (e) {
        // Silent fail for specific translation
      }
    }

    if (foundCount > 0) {
      toast(`Знайдено перекладів: ${foundCount}`);
    } else {
      // Fallback to API if nothing found locally
      toast('В локальній базі не знайдено. Шукаю в API...');
      try {
        const apiBook = bookSlugs[book] || book;
        const url = `https://bible-api.com/${apiBook}+${chapter}:${verse}?translation=ukr`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.text) {
          const el = $<HTMLTextAreaElement>(`addTrans_ubio`); // Default to Ohienko for API
          if (el) el.value = data.text.trim();
          toast('Знайдено в API (Огієнко)');
        } else {
          toast('Ніде не знайдено');
        }
      } catch (err) {
        toast('Помилка при запиті до API');
      }
    }
  },

  async saveVerse(): Promise<void> {
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

    await VersesDB.addVerse({ 
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

  renderVerseList(verses?: BibleVerse[]): void {
    const all = verses || VersesDB.getAll();
    const countEl = $('verseCount');
    if (countEl) countEl.textContent = all.length.toString();
    
    const container = $('verseList');
    if (!container) return;
    
    if (!all.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Нічого не знайдено</p>';
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
            <div class="verse-list-tags">${transKeys} переклад(ів) ${v.tags?.length ? '· ' + v.tags.join(', ') : ''}</div>
          </div>
          <div class="verse-list-actions">
            ${isBuiltIn ? '' : `<button class="btn btn-sm btn-danger" onclick="Manage.removeVerse('${v.id}')">✕</button>`}
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  },

  handleSearch(): void {
    const query = $<HTMLInputElement>('verseSearch')?.value || '';
    const filtered = VersesDB.search(query);
    this.renderVerseList(filtered);
  },

  async removeVerse(id: string): Promise<void> {
    if (!confirm('Видалити цей вірш?')) return;
    await VersesDB.removeVerse(id);
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
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const count = await VersesDB.importVerses(content);
        toast(`Імпортовано ${count} віршів`);
        this.renderVerseList();
        UI.updateVerseFilter();
      } catch(err: any) {
        toast('Помилка імпорту: ' + err.message);
      }
    };
    reader.readAsText(file);
    input.value = '';
  },

  async importBookJSON(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        const count = await BibleLoader.loadBook(content);
        toast(`Завантажено книгу: ${content.metadata.book} (${count} віршів)`);
        this.renderVerseList();
        UI.updateVerseFilter();
      } catch (err: any) {
        toast('Помилка завантаження книги: ' + err.message);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
};

export default Manage;
