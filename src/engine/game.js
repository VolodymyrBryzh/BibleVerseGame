import VersesDB from '../core/database.js';
import Stats from '../core/stats.js';
import UI from '../ui/ui.js';
import { TRANSLATIONS_META } from '../constants/bibleData.js';
import { toast, tokenize, normalize } from '../utils/helpers.js';

const Game = {
  currentVerse: null,
  currentTranslation: null,
  currentMode: null,
  _correctWords: [],
  _gapData: [],
  _continueExpected: '',
  _fullText: '',

  start() {
    const modeCard = document.querySelector('.mode-card.selected');
    const mode = modeCard ? modeCard.dataset.mode : null;
    if (!mode) return toast('Обери режим');

    const transKey = document.getElementById('filterTranslation').value;
    const verseFilter = document.getElementById('filterVerse').value;

    let verses = VersesDB.getAll().filter(v => v.translations[transKey]);
    if (!verses.length) return toast('Немає віршів для цього перекладу');

    let verse;
    if (verseFilter === 'all') {
      verse = verses[Math.floor(Math.random() * verses.length)];
    } else {
      verse = VersesDB.getById(verseFilter);
      if (!verse || !verse.translations[transKey]) return toast('Вірш не знайдено');
    }

    this.currentVerse = verse;
    this.currentTranslation = transKey;
    this.currentMode = mode;

    const text = VersesDB.getTranslationText(verse, transKey);
    const transName = TRANSLATIONS_META.find(t => t.key === transKey)?.name || transKey;

    document.getElementById('gameRef').textContent = VersesDB.getReference(verse);
    document.getElementById('gameTransName').textContent = transName;
    document.getElementById('gameResult').innerHTML = '';
    document.getElementById('gameActions').innerHTML = '';

    if (mode === 'word-order') this._startWordOrder(text);
    else if (mode === 'fill-gaps') this._startFillGaps(text);
    else if (mode === 'continue') this._startContinue(text);

    UI.showScreen('screenGame');
  },

  // --- WORD ORDER ---
  _startWordOrder(text) {
    document.getElementById('gameInstruction').textContent = 'Натисни слова у правильному порядку';
    this._correctWords = tokenize(text);
    const shuffled = [...this._correctWords].sort(() => Math.random() - 0.5);
    // Ensure shuffled is actually different
    if (shuffled.join(' ') === this._correctWords.join(' ')) {
      shuffled.reverse();
    }

    let html = '<div class="answer-zone" id="answerZone"></div>';
    html += '<div class="word-bank" id="wordBank">';
    shuffled.forEach((w, i) => {
      html += `<span class="word-chip" data-idx="${i}" onclick="Game._pickWord(this)">${w}</span>`;
    });
    html += '</div>';
    document.getElementById('gameArea').innerHTML = html;
    this._showCheckBtn();
  },

  _pickWord(el) {
    if (el.classList.contains('used')) return;
    el.classList.add('used');
    const zone = document.getElementById('answerZone');
    const chip = document.createElement('span');
    chip.className = 'answer-chip';
    chip.textContent = el.textContent;
    chip.dataset.srcIdx = el.dataset.idx;
    chip.onclick = () => {
      el.classList.remove('used');
      chip.remove();
    };
    zone.appendChild(chip);
  },

  _checkWordOrder() {
    const chips = document.querySelectorAll('#answerZone .answer-chip');
    const userWords = Array.from(chips).map(c => c.textContent);

    if (userWords.length !== this._correctWords.length) {
      return toast('Розмісти всі слова');
    }

    let correct = 0;
    for (let i = 0; i < this._correctWords.length; i++) {
      if (userWords[i] === this._correctWords[i]) correct++;
    }
    const accuracy = correct / this._correctWords.length;
    const success = accuracy === 1;

    Stats.record(this.currentVerse.id, 'word-order', this.currentTranslation, success, accuracy);
    this._showResult(success, accuracy, this._correctWords.join(' '));
  },

  // --- FILL GAPS ---
  _startFillGaps(text) {
    document.getElementById('gameInstruction').textContent = 'Впиши пропущені слова';
    const words = tokenize(text);
    const gapCount = Math.max(2, Math.floor(words.length * 0.3));
    const indices = new Set();
    while (indices.size < gapCount) {
      indices.add(Math.floor(Math.random() * words.length));
    }

    this._gapData = [];
    let html = '<div class="gap-text">';
    words.forEach((w, i) => {
      if (indices.has(i)) {
        const gapIdx = this._gapData.length;
        this._gapData.push(w);
        const width = Math.max(60, w.length * 12);
        html += `<input class="gap-input" data-gap="${gapIdx}" style="width:${width}px" autocomplete="off" autocapitalize="off" spellcheck="false"> `;
      } else {
        html += w + ' ';
      }
    });
    html += '</div>';
    document.getElementById('gameArea').innerHTML = html;
    this._showCheckBtn();

    // Focus first gap
    const firstInput = document.querySelector('.gap-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  },

  _checkFillGaps() {
    const inputs = document.querySelectorAll('.gap-input');
    let correct = 0;
    inputs.forEach(inp => {
      const expected = this._gapData[parseInt(inp.dataset.gap)];
      const userVal = inp.value.trim();
      const isCorrect = normalize(userVal) === normalize(expected);
      inp.classList.remove('correct', 'wrong');
      inp.classList.add(isCorrect ? 'correct' : 'wrong');
      if (!isCorrect) inp.value = expected;
      if (isCorrect) correct++;
    });
    const accuracy = correct / this._gapData.length;
    const success = accuracy >= 0.8;
    Stats.record(this.currentVerse.id, 'fill-gaps', this.currentTranslation, success, accuracy);
    this._showResult(success, accuracy);
  },

  // --- CONTINUE ---
  _startContinue(text) {
    document.getElementById('gameInstruction').textContent = 'Допиши продовження вірша';
    const words = tokenize(text);
    const showCount = Math.max(3, Math.floor(words.length * 0.25));
    const prompt = words.slice(0, showCount).join(' ') + '...';
    this._continueExpected = words.slice(showCount).join(' ');
    this._fullText = text;

    let html = `<div class="verse-prompt">${prompt}</div>`;
    html += `<textarea class="continue-area" id="continueInput" placeholder="Продовжуй тут..."></textarea>`;
    document.getElementById('gameArea').innerHTML = html;
    this._showCheckBtn();
  },

  _checkContinue() {
    const userText = document.getElementById('continueInput').value.trim();
    if (!userText) return toast('Напиши продовження');

    const expectedWords = tokenize(this._continueExpected);
    const userWords = tokenize(userText);
    let correct = 0;
    const len = Math.max(expectedWords.length, userWords.length);
    for (let i = 0; i < expectedWords.length; i++) {
      if (userWords[i] && normalize(userWords[i]) === normalize(expectedWords[i])) correct++;
    }
    const accuracy = len > 0 ? correct / expectedWords.length : 0;
    const success = accuracy >= 0.7;

    Stats.record(this.currentVerse.id, 'continue', this.currentTranslation, success, accuracy);
    this._showResult(success, accuracy, this._fullText);
  },

  _showCheckBtn() {
    document.getElementById('gameActions').innerHTML =
      `<button class="btn btn-primary" onclick="Game.check()">Перевірити</button>`;
  },

  check() {
    if (this.currentMode === 'word-order') this._checkWordOrder();
    else if (this.currentMode === 'fill-gaps') this._checkFillGaps();
    else if (this.currentMode === 'continue') this._checkContinue();
  },

  _showResult(success, accuracy, correctText) {
    const pct = Math.round(accuracy * 100);
    let cls, msg;
    if (success && accuracy === 1) { cls = 'success'; msg = `Чудово! 100% правильно!`; }
    else if (success) { cls = 'success'; msg = `Добре! ${pct}% правильно`; }
    else if (accuracy >= 0.5) { cls = 'partial'; msg = `Майже! ${pct}% правильно`; }
    else { cls = 'error'; msg = `${pct}% — спробуй ще раз`; }

    let resultHtml = `<div class="result-banner ${cls}">${msg}</div>`;
    if (correctText && !success) {
      resultHtml += `<div class="correct-answer"><strong>Правильна відповідь:</strong><br>${correctText}</div>`;
    }
    document.getElementById('gameResult').innerHTML = resultHtml;
    document.getElementById('gameActions').innerHTML = `
      <button class="btn btn-primary" onclick="Game.start()">Наступний</button>
      <button class="btn" onclick="Game._retry()">Повторити</button>
      <button class="btn" onclick="UI.showScreen('screenHome')">Меню</button>
    `;
  },

  _retry() {
    const text = VersesDB.getTranslationText(this.currentVerse, this.currentTranslation);
    document.getElementById('gameResult').innerHTML = '';
    document.getElementById('gameActions').innerHTML = '';
    if (this.currentMode === 'word-order') this._startWordOrder(text);
    else if (this.currentMode === 'fill-gaps') this._startFillGaps(text);
    else if (this.currentMode === 'continue') this._startContinue(text);
    this._showCheckBtn();
  }
};

export default Game;
