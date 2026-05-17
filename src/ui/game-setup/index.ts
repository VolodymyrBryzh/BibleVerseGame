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
