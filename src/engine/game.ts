import VersesDB from '../core/database';
import Stats from '../core/stats';
import XP from '../core/xp';
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
  _startTime: 0,
  _hintsUsed: 0,
  _maxHints: 3,

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
    this._startTime = Date.now();
    this._hintsUsed = 0;

    const rawText = VersesDB.getTranslationText(verse, transKey);
    const text = prepareFormattedText(rawText);
    const transName = TRANSLATIONS_META.find(t => t.key === transKey)?.name || transKey;

    if (this.elements.ref) this.elements.ref.textContent = VersesDB.getReference(verse);
    if (this.elements.transName) this.elements.transName.textContent = transName;
    if (this.elements.result) this.elements.result.innerHTML = '';
    if (this.elements.actions) this.elements.actions.innerHTML = '';
    const oldHint = $('btnHint');
    if (oldHint) oldHint.remove();

    this._initMode(mode, text);
    UI.showScreen('screenGamePlay');
    this._setupKeys();
  },

  _initMode(mode: string, text: string): void {
    if (mode === 'word-order') this._startWordOrder(text);
    else if (mode === 'fill-gaps') this._startFillGaps(text);
    else if (mode === 'continue') this._startContinue(text);
  },

  _setupKeys(): void {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const isFinished = !!this.elements.result?.innerHTML;
        if (isFinished) {
          this.start();
        } else {
          this.check();
        }
      }
    };
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

    const bank = $('wordBank');
    if (bank) {
      bank.onclick = (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('word-chip')) this._pickWord(target);
      };
    }

    this._showCheckBtn();
    this._showHintBtn();
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

  // --- CONTINUE VERSE ---
  _startContinue(text: string): void {
    if (this.elements.instruction) this.elements.instruction.textContent = 'Допиши другу половину вірша';
    const words = tokenize(text);
    const splitAt = Math.ceil(words.length / 2);
    const given = words.slice(0, splitAt);
    const expected = words.slice(splitAt);
    this._correctWords = expected;
    this._fullText = text;

    const givenHTML = given.map(w => formatVerseText(w)).join(' ');
    if (this.elements.area) {
      this.elements.area.innerHTML = `
        <div class="continue-given">${givenHTML}</div>
        <textarea id="continueInput" class="continue-textarea" rows="4"
          placeholder="Продовж вірш..."></textarea>
      `;
    }
    this._showCheckBtn();
    setTimeout(() => ($('continueInput') as HTMLTextAreaElement)?.focus(), 100);
  },

  _checkContinue(): void {
    const input = $<HTMLTextAreaElement>('continueInput');
    const userText = input?.value.trim() || '';
    if (!userText) return toast('Напиши продовження');

    const userWords = tokenize(userText);
    const expected = this._correctWords;
    let correct = 0;
    for (let i = 0; i < expected.length; i++) {
      if (userWords[i] && normalize(userWords[i]) === normalize(expected[i])) correct++;
    }
    const accuracy = expected.length > 0 ? correct / expected.length : 0;
    const success = accuracy >= 0.8;

    this._recordAndShow(success, accuracy, this._fullText);
  },

  // --- HINTS ---
  _showHintBtn(): void {
    if (this.currentMode !== 'word-order') return;
    const actions = this.elements.actions;
    if (!actions) return;

    const hintBtn = document.createElement('button');
    hintBtn.id = 'btnHint';
    hintBtn.className = 'btn btn-sm btn-hint';
    hintBtn.innerHTML = `<span class="hint-icon">💡</span> Підказка <span class="hint-cost">−5 XP</span> <span class="hint-count">(${this._maxHints - this._hintsUsed})</span>`;
    hintBtn.addEventListener('click', () => this.useHint());
    actions.parentElement?.insertBefore(hintBtn, actions);
  },

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

    const placed = document.querySelectorAll('#answerZone .answer-chip').length;
    const nextWord = this._correctWords[placed];
    if (!nextWord) return;

    const chips = document.querySelectorAll('#wordBank .word-chip:not(.used)');
    for (const chip of chips) {
      const chipText = (chip as HTMLElement).textContent || '';
      if (normalize(chipText) === normalize(nextWord)) {
        (chip as HTMLElement).classList.add('hint-highlight');
        setTimeout(() => (chip as HTMLElement).classList.remove('hint-highlight'), 1500);
        break;
      }
    }

    const countEl = document.querySelector('.hint-count');
    if (countEl) countEl.textContent = `(${this._maxHints - this._hintsUsed})`;
    if (this._hintsUsed >= this._maxHints) {
      const btn = $('btnHint');
      if (btn) btn.classList.add('disabled');
    }

    // Update header XP display
    const xpEl = $('streakCount');
    if (xpEl) xpEl.textContent = XP.getTotal().toString();
  },

  _showCheckBtn(): void {
    if (this.elements.actions) {
      this.elements.actions.innerHTML = `<button class="btn btn-primary" onclick="Game.check()">Перевірити</button>`;
    }
  },

  check(): void {
    if (this.currentMode === 'word-order') this._checkWordOrder();
    else if (this.currentMode === 'fill-gaps') this._checkFillGaps();
    else if (this.currentMode === 'continue') this._checkContinue();
  },

  async _recordAndShow(success: boolean, accuracy: number, correctText?: string): Promise<void> {
    const duration = Math.round((Date.now() - this._startTime) / 1000);
    let xpEarned = 0;

    if (this.currentVerse && this.currentTranslation && this.currentMode) {
      await Stats.record(this.currentVerse.id, this.currentMode, this.currentTranslation, success, accuracy, duration);
      if (success) {
        xpEarned = XP.award(this.currentMode);
      }
    }
    this._showResult(success, accuracy, correctText, xpEarned);
  },

  _showResult(success: boolean, accuracy: number, correctText?: string, xpEarned?: number): void {
    const pct = Math.round(accuracy * 100);
    let cls = 'error', msg = `${pct}% — спробуй ще раз`;

    if (success && accuracy === 1) { cls = 'success'; msg = `Чудово! 100% правильно!`; }
    else if (success) { cls = 'success'; msg = `Добре! ${pct}% правильно`; }
    else if (accuracy >= 0.5) { cls = 'partial'; msg = `Майже! ${pct}% правильно`; }

    let resultHTML = `<div class="result-banner ${cls}">${msg}</div>`;
    if (xpEarned && xpEarned > 0) {
      resultHTML += `<div class="xp-earned">+${xpEarned} XP</div>`;
    }
    if (correctText && !success) {
      resultHTML += `<div class="correct-answer"><strong>Правильна відповідь:</strong><br>${formatVerseText(correctText)}</div>`;
    }

    if (this.elements.result) {
      this.elements.result.innerHTML = resultHTML;
    }

    // Remove hint button if present
    const hintBtn = $('btnHint');
    if (hintBtn) hintBtn.remove();

    // Update header XP
    const xpEl = $('streakCount');
    if (xpEl) xpEl.textContent = XP.getTotal().toString();

    if (this.elements.actions) {
      this.elements.actions.innerHTML = `
        <button class="btn btn-primary" onclick="Game.start()">Наступний</button>
        <button class="btn" onclick="Game._retry()">Повторити</button>
        <button class="btn" onclick="UI.showScreen('screenDashboard')">Меню</button>
      `;
    }
  },

  _retry(): void {
    if (!this.currentVerse || !this.currentTranslation || !this.currentMode) return;
    const rawText = VersesDB.getTranslationText(this.currentVerse, this.currentTranslation);
    const text = prepareFormattedText(rawText);
    this._startTime = Date.now();
    this._hintsUsed = 0;
    if (this.elements.result) this.elements.result.innerHTML = '';
    if (this.elements.actions) this.elements.actions.innerHTML = '';
    const hintBtn = $('btnHint');
    if (hintBtn) hintBtn.remove();
    this._initMode(this.currentMode, text);
    this._showCheckBtn();
    if (this.currentMode === 'word-order') this._showHintBtn();
  }
};

export default Game;
