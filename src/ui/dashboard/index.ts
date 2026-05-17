import Header from './Header';
import Progress from './Progress';
import DailyVerse from './DailyVerse';
import UI from '../ui';
import { TRANSLATIONS_META } from '../../constants/bibleData';
import VersesDB from '../../core/database';
import { $ } from '../../utils/helpers';

const Dashboard = {
	init(): void {
		const html = `
			<div class="dashboard-top">
				${Header.render()}
			</div>
			${Progress.render()}
			<div class="container">
				<div id="dailyVerseContainer">
					${DailyVerse.render()}
				</div>

				<div id="dashModeSection" class="dash-section">
					<div class="section-head">
						<span class="section-head-small section-head-step">
							<span class="section-step-editorial">КРОК 01</span>
							<span class="section-step-acid"><span class="section-step-num">01</span></span>
						</span>
						<div class="section-head-title">
							<span class="section-title-editorial">Режим · <span class="section-head-italic">game mode</span></span>
							<span class="section-title-acid">ОБЕРИ ВАЙБ</span>
						</div>
					</div>
					<div class="mode-grid" id="dashModeGrid">
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
							<span class="section-title-editorial">Налаштування · <span class="section-head-italic">settings</span></span>
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
					<button class="btn btn-primary btn-block" id="btnDashStart">
						<span class="cta-text-editorial">ПОЧАТИ ГРУ</span>
						<span class="cta-text-acid">ПОЇХАЛИ ⚡</span>
					</button>
				</div>
			</div>
		`;

		const screen = document.createElement('div');
		screen.id = 'screenDashboard';
		screen.className = 'screen';
		screen.innerHTML = html;

		const appEl = document.querySelector('.app');
		if (appEl) {
			const screenHome = document.getElementById('screenHome');
			if (screenHome) {
				appEl.insertBefore(screen, screenHome);
				screenHome.style.display = 'none';
			} else {
				appEl.appendChild(screen);
			}
		}

		this.render();
		this._bindEvents();
	},

	_bindEvents(): void {
		const modeGrid = $('dashModeGrid');
		if (modeGrid) {
			modeGrid.addEventListener('click', (e) => {
				const card = (e.target as HTMLElement).closest('.mode-card') as HTMLElement;
				if (card) UI.selectMode(card);
			});
		}

		const startBtn = $('btnDashStart');
		if (startBtn) {
			startBtn.addEventListener('click', () => {
				(window as any).Game.start();
			});
		}

		const transSel = $<HTMLSelectElement>('filterTranslation');
		if (transSel) {
			transSel.addEventListener('change', () => UI.updateVerseFilter());
		}
	},

	render(): void {
		Header.update();
		Progress.update();
		DailyVerse.update();
	}
};

export default Dashboard;
