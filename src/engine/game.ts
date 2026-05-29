import VersesDB from '../core/database';
import Stats from '../core/stats';
import XP from '../core/xp';
import UI from '../ui/ui';
import { TRANSLATIONS_META, BibleVerse } from '../constants/bibleData';
import { toast, prepareFormattedText, formatVerseText, $ } from '../utils/helpers';

import { startWordOrder, checkWordOrder } from './modes/word-order';
import { startFillGaps, checkFillGaps } from './modes/fill-gaps';
import { startContinue, checkContinue } from './modes/continue';
import { createHintState, showHintBtn, removeHintBtn } from './hints';

const Game = {
  currentVerse: null as BibleVerse | null,
  currentTranslation: null as string | null,
  currentMode: null as string | null,
  _correctWords: [] as string[],
  _gapData: [] as string[],
  _fullText: '',
  _startTime: 0,
  _hintState: createHintState(),

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
    this._hintState = createHintState();

    const rawText = VersesDB.getTranslationText(verse, transKey);
    const text = prepareFormattedText(rawText);
    const transName = TRANSLATIONS_META.find(t => t.key === transKey)?.name || transKey;

    if (this.elements.ref) this.elements.ref.textContent = VersesDB.getReference(verse);
    if (this.elements.transName) this.elements.transName.textContent = transName;
    if (this.elements.result) this.elements.result.innerHTML = '';
    if (this.elements.actions) this.elements.actions.innerHTML = '';
    removeHintBtn();

    this._initMode(mode, text);
    UI.showScreen('screenGamePlay');
    this._setupKeys();
  },

  _initMode(mode: string, text: string): void {
    const area = this.elements.area;
    if (!area) return;

    if (mode === 'word-order') {
      if (this.elements.instruction) this.elements.instruction.textContent = 'Натисни слова у правильному порядку';
      this._correctWords = startWordOrder(text, area);
      (window as any)._gameCorrectWords = this._correctWords;
      this._showCheckBtn();
      if (this.elements.actions) showHintBtn(this._hintState, this.elements.actions);
    } else if (mode === 'fill-gaps') {
      if (this.elements.instruction) this.elements.instruction.textContent = 'Впиши пропущені слова';
      this._gapData = startFillGaps(text, area);
      this._showCheckBtn();
    } else if (mode === 'continue') {
      if (this.elements.instruction) this.elements.instruction.textContent = 'Допиши другу половину вірша';
      const result = startContinue(text, area);
      this._correctWords = result.correctWords;
      this._fullText = result.fullText;
      this._showCheckBtn();
    }
  },

  _setupKeys(): void {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const isFinished = !!this.elements.result?.innerHTML;
        if (isFinished) this.start();
        else this.check();
      }
    };
    document.removeEventListener('keydown', (window as any)._gameKeyHandler);
    (window as any)._gameKeyHandler = handler;
    document.addEventListener('keydown', handler);
  },

  _showCheckBtn(): void {
    if (this.elements.actions) {
      this.elements.actions.innerHTML = `<button class="btn btn-primary" onclick="Game.check()">Перевірити</button>`;
    }
  },

  check(): void {
    let result: { accuracy: number; success: boolean };

    if (this.currentMode === 'word-order') {
      result = checkWordOrder(this._correctWords);
      if (result.accuracy === -1) return toast('Розмісти всі слова');
      this._recordAndShow(result.success, result.accuracy, this._correctWords.join(' '));
    } else if (this.currentMode === 'fill-gaps') {
      result = checkFillGaps(this._gapData);
      this._recordAndShow(result.success, result.accuracy);
    } else if (this.currentMode === 'continue') {
      result = checkContinue(this._correctWords);
      if (result.accuracy === -1) return toast('Напиши продовження');
      this._recordAndShow(result.success, result.accuracy, this._fullText);
    }
  },

  async _recordAndShow(success: boolean, accuracy: number, correctText?: string): Promise<void> {
    const duration = Math.round((Date.now() - this._startTime) / 1000);
    let xpEarned = 0;

    if (this.currentVerse && this.currentTranslation && this.currentMode) {
      try {
        await Stats.record(this.currentVerse.id, this.currentMode, this.currentTranslation, success, accuracy, duration);
      } catch (e) {
        console.error('Stats record failed:', e);
      }
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

    if (this.elements.result) this.elements.result.innerHTML = resultHTML;

    removeHintBtn();

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
    this._hintState = createHintState();
    if (this.elements.result) this.elements.result.innerHTML = '';
    if (this.elements.actions) this.elements.actions.innerHTML = '';
    removeHintBtn();
    this._initMode(this.currentMode, text);
  }
};

export default Game;
