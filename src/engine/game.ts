import VersesDB from '../core/database';
import Stats from '../core/stats';
import UI from '../ui/ui';
import { TRANSLATIONS_META, BibleVerse } from '../constants/bibleData';
import { toast, tokenize, normalize, shuffle, prepareFormattedText, formatVerseText, $ } from '../utils/helpers';

const Game = {
  currentVerse: null as BibleVerse | null,
  currentTranslation: null as string | null,
  currentMode: null as string | null,
  _correctWords: [] as string[],
  _gapData: [] as string[],
  _fullText: '',

  // Cache elements
  elements: {
    get area() { return $('gameArea'); },
    get result() { return $('gameResult'); },
    get actions() { return $('gameActions'); },
    get instruction() { return $('gameInstruction'); },
    get ref() { return $('gameRef'); },
    get transName() { return $('gameTransName'); }
  },

  start(): void {
    const modeCard = document.querySelector('.mode-card.selected') as HTMLElement;
    const mode = modeCard?.dataset.mode;
    if (!mode) return toast('Обери режим');

    const transKey = ($<HTMLSelectElement>('filterTranslation'))?.value || '';
    const verseFilter = ($<HTMLSelectElement>('filterVerse'))?.value || '';

    let verses = VersesDB.getAll().filter(v => v.translations[transKey]);
    if (!verses.length) return toast('Немає віршів для цього перекладу');

    const verse = verseFilter === 'all' 
      ? verses[Math.floor(Math.random() * verses.length)]
      : VersesDB.getById(verseFilter);

    if (!verse || !verse.translations[transKey]) return toast('Вірш не знайдено');

    this.currentVerse = verse;
    this.currentTranslation = transKey;
    this.currentMode = mode;

    const rawText = VersesDB.getTranslationText(verse, transKey);
    const text = prepareFormattedText(rawText);
    const transName = TRANSLATIONS_META.find(t => t.key === transKey)?.name || transKey;

    if (this.elements.ref) this.elements.ref.textContent = VersesDB.getReference(verse);
    if (this.elements.transName) this.elements.transName.textContent = transName;
    if (this.elements.result) this.elements.result.innerHTML = '';
    if (this.elements.actions) this.elements.actions.innerHTML = '';

    this._initMode(mode, text);
    UI.showScreen('screenGame');
    
    // Global key listener for the game
    this._setupKeys();
  },

  _initMode(mode: string, text: string): void {
    if (mode === 'word-order') this._startWordOrder(text);
    else if (mode === 'fill-gaps') this._startFillGaps(text);
    else if (mode === 'first-letters') this._startFirstLetters(text);
  },

  _setupKeys(): void {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // If results are shown, 'Enter' goes to next
        const isFinished = !!this.elements.result?.innerHTML;
        if (isFinished) {
          this.start();
        } else {
          this.check();
        }
      }
    };
    // Remove old handler if exists (not strictly necessary with this architecture but good practice)
    document.removeEventListener('keydown', (window as any)._gameKeyHandler);
    (window as any)._gameKeyHandler = handler;
    document.addEventListener('keydown', handler);
  },

  // --- WORD ORDER ---
  _startWordOrder(text: string): void {
    if (this.elements.instruction) this.elements.instruction.textContent = 'Натисни слова у правильному порядку';
    this._correctWords = tokenize(text);
    
    let shuffled = shuffle(this._correctWords);
    if (shuffled.join(' ') === this._correctWords.join(' ')) {
      shuffled.reverse();
    }

    const area = this.elements.area;
    if (!area) return;

    area.innerHTML = `
      <div class="answer-zone" id="answerZone"></div>
      <div class="word-bank" id="wordBank">
        ${shuffled.map((w, i) => `<span class="word-chip" data-idx="${i}">${formatVerseText(w)}</span>`).join('')}
      </div>
    `;

    // Event delegation for word bank
    const bank = $('wordBank');
    if (bank) {
      bank.onclick = (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('word-chip')) this._pickWord(target);
      };
    }

    this._showCheckBtn();
  },

  _pickWord(el: HTMLElement): void {
    if (el.classList.contains('used')) return;
    el.classList.add('used');
    
    const zone = $('answerZone');
    if (!zone) return;

    const chip = document.createElement('span');
    chip.className = 'answer-chip';
    chip.innerHTML = el.innerHTML;
    chip.onclick = () => {
      el.classList.remove('used');
      chip.remove();
    };
    zone.appendChild(chip);
  },

  _checkWordOrder(): void {
    const chips = document.querySelectorAll('#answerZone .answer-chip');
    const userWords = Array.from(chips).map(c => c.innerHTML || '');

    if (userWords.length !== this._correctWords.length) return toast('Розмісти всі слова');

    let correct = userWords.filter((w, i) => w === this._correctWords[i]).length;
    const accuracy = correct / this._correctWords.length;
    const success = accuracy === 1;

    this._recordAndShow(success, accuracy, this._correctWords.join(' '));
  },

  // --- FILL GAPS ---
  _startFillGaps(text: string): void {
    if (this.elements.instruction) this.elements.instruction.textContent = 'Впиши пропущені слова';
    const words = tokenize(text);
    const gapCount = Math.max(2, Math.floor(words.length * 0.3));
    
    const indices = new Set<number>();
    while (indices.size < gapCount) indices.add(Math.floor(Math.random() * words.length));

    this._gapData = [];
    let html = '<div class="gap-text">';
    words.forEach((w, i) => {
      if (indices.has(i)) {
        const gapIdx = this._gapData.length;
        this._gapData.push(w);
        const width = Math.max(60, w.length * 12);
        html += `<input class="gap-input" data-gap="${gapIdx}" style="width:${width}px" autocomplete="off" autocapitalize="off" spellcheck="false"> `;
      } else {
        html += formatVerseText(w) + ' ';
      }
    });
    html += '</div>';
    
    if (this.elements.area) this.elements.area.innerHTML = html;
    this._showCheckBtn();

    setTimeout(() => ($('.gap-input') as HTMLInputElement)?.focus(), 100);
  },

  _checkFillGaps(): void {
    const inputs = document.querySelectorAll('.gap-input') as NodeListOf<HTMLInputElement>;
    let correct = 0;
    inputs.forEach(inp => {
      const expected = this._gapData[Number(inp.dataset.gap)];
      const isCorrect = normalize(inp.value) === normalize(expected);
      inp.classList.toggle('correct', isCorrect);
      inp.classList.toggle('wrong', !isCorrect);
      if (!isCorrect) inp.value = expected;
      if (isCorrect) correct++;
    });

    const accuracy = correct / this._gapData.length;
    const success = accuracy >= 0.8;
    this._recordAndShow(success, accuracy);
  },

  // --- FIRST LETTERS ---
  _startFirstLetters(text: string): void {
    if (this.elements.instruction) this.elements.instruction.textContent = 'Бачиш перші букви — напиши повні слова';
    const words = tokenize(text);
    this._fullText = text;
    this._correctWords = words;

    const hints = words.map(w => {
      const clean = w.replace(/<\/?[ri]>/g, '');
      const firstChar = clean.charAt(0);
      return firstChar.toUpperCase() + '___';
    });

    if (this.elements.area) {
      this.elements.area.innerHTML = `
        <div class="first-letters-hint">${hints.join(' ')}</div>
        <textarea class="continue-area" id="firstLettersInput" placeholder="Напиши весь вірш..."></textarea>
      `;
    }
    this._showCheckBtn();
    setTimeout(() => ($('firstLettersInput') as HTMLTextAreaElement)?.focus(), 100);
  },

  _checkFirstLetters(): void {
    const input = $<HTMLTextAreaElement>('firstLettersInput');
    const userText = input?.value.trim() || '';
    if (!userText) return toast('Напиши вірш');

    const expectedWords = this._correctWords;
    const userWords = tokenize(userText);
    let correct = 0;
    for (let i = 0; i < expectedWords.length; i++) {
      if (userWords[i] && normalize(userWords[i]) === normalize(expectedWords[i])) correct++;
    }
    const accuracy = expectedWords.length > 0 ? correct / expectedWords.length : 0;
    const success = accuracy >= 0.8;

    this._recordAndShow(success, accuracy, this._fullText);
  },

  _showCheckBtn(): void {
    if (this.elements.actions) {
      this.elements.actions.innerHTML = `<button class="btn btn-primary" onclick="Game.check()">Перевірити</button>`;
    }
  },

  check(): void {
    if (this.currentMode === 'word-order') this._checkWordOrder();
    else if (this.currentMode === 'fill-gaps') this._checkFillGaps();
    else if (this.currentMode === 'first-letters') this._checkFirstLetters();
  },

  async _recordAndShow(success: boolean, accuracy: number, correctText?: string): Promise<void> {
    if (this.currentVerse && this.currentTranslation && this.currentMode) {
      await Stats.record(this.currentVerse.id, this.currentMode, this.currentTranslation, success, accuracy);
    }
    this._showResult(success, accuracy, correctText);
  },

  _showResult(success: boolean, accuracy: number, correctText?: string): void {
    const pct = Math.round(accuracy * 100);
    let cls = 'error', msg = `${pct}% — спробуй ще раз`;
    
    if (success && accuracy === 1) { cls = 'success'; msg = `Чудово! 100% правильно!`; }
    else if (success) { cls = 'success'; msg = `Добре! ${pct}% правильно`; }
    else if (accuracy >= 0.5) { cls = 'partial'; msg = `Майже! ${pct}% правильно`; }

    if (this.elements.result) {
      this.elements.result.innerHTML = `
        <div class="result-banner ${cls}">${msg}</div>
        ${correctText && !success ? `<div class="correct-answer"><strong>Правильна відповідь:</strong><br>${formatVerseText(correctText)}</div>` : ''}
      `;
    }

    if (this.elements.actions) {
      this.elements.actions.innerHTML = `
        <button class="btn btn-primary" onclick="Game.start()">Наступний</button>
        <button class="btn" onclick="Game._retry()">Повторити</button>
        <button class="btn" onclick="UI.showScreen('screenHome')">Меню</button>
      `;
    }
  },

  _retry(): void {
    if (!this.currentVerse || !this.currentTranslation || !this.currentMode) return;
    const text = VersesDB.getTranslationText(this.currentVerse, this.currentTranslation);
    if (this.elements.result) this.elements.result.innerHTML = '';
    if (this.elements.actions) this.elements.actions.innerHTML = '';
    this._initMode(this.currentMode, text);
    this._showCheckBtn();
  }
};

export default Game;
