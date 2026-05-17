import Stats from '../../core/stats';
import UI from '../ui';
import Theme from '../theme';
import { $ } from '../../utils/helpers';

const Header = {
	render(): string {
		return `
			<div class="date-row">
				<span id="currentDate" class="dashboard-date"></span>
				<div style="display:flex; gap:12px; align-items:center;">
					<button id="btnThemeToggle" class="theme-tumbler" aria-label="Theme">
						<span class="theme-tumbler-knob"></span>
					</button>
					<div class="streak-badge">
						<span class="xp-fire">🔥</span>
						<span id="streakCount">0</span>
					</div>
					<button id="btnProfile" class="header-icon-btn" aria-label="Profile">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
						</svg>
					</button>
				</div>
			</div>
			<div class="hero-editorial">
				<p class="hero-subtitle" id="heroSubtitle"></p>
				<h1 class="dashboard-title" id="heroTitle"></h1>
				<p class="hero-desc" id="heroDesc"></p>
				<div class="hero-cta">
					<button id="btnHeroStart" class="btn-outline-pill">
						<span id="heroCTAText"></span>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
					</button>
				</div>
			</div>
			<div class="hero-acid">
				<h1 class="dashboard-title" id="heroTitleAcid"></h1>
				<p class="hero-desc hero-desc--acid" id="heroDescAcid"></p>
			</div>
		`;
	},

	update(): void {
		const dateEl = $('currentDate');
		if (dateEl) {
			const now = new Date();
			const days = ['НЕДІЛЯ', 'ПОНЕДІЛОК', 'ВІВТОРОК', 'СЕРЕДА', 'ЧЕТВЕР', 'ПʼЯТНИЦЯ', 'СУБОТА'];
			const months = ['СІЧНЯ', 'ЛЮТОГО', 'БЕРЕЗНЯ', 'КВІТНЯ', 'ТРАВНЯ', 'ЧЕРВНЯ', 'ЛИПНЯ', 'СЕРПНЯ', 'ВЕРЕСНЯ', 'ЖОВТНЯ', 'ЛИСТОПАДА', 'ГРУДНЯ'];
			dateEl.textContent = `${days[now.getDay()]} · ${now.getDate()} ${months[now.getMonth()]}`;
		}

		// Ukrainian text via unicode escapes to avoid encoding issues
		const subtitle = $('heroSubtitle');
		if (subtitle) subtitle.textContent = 'Слово на сьогодні.';

		const title = $('heroTitle');
		if (title) title.innerHTML = 'Вивчай<br><span class="dashboard-title-italic">Святе Письмо</span><br>без зусиль.';

		const desc = $('heroDesc');
		if (desc) desc.textContent = 'Декілька хвилин на день — і вірш залишається в памʼяті назавжди.';

		const ctaText = $('heroCTAText');
		if (ctaText) ctaText.textContent = 'ПОЧАТИ';

		const titleAcid = $('heroTitleAcid');
		if (titleAcid) titleAcid.innerHTML = 'СЛОВО<br><span class="acid-highlight">живе.</span>';

		const descAcid = $('heroDescAcid');
		if (descAcid) descAcid.textContent = 'Вивчай Святе Письмо. По одному віршу за раз — і Слово залишиться в тобі.';

		const streakEl = $('streakCount');
		const overview = Stats.getOverview();
		if (streakEl) streakEl.textContent = (overview.xp || 0).toString();

		const profileBtn = $('btnProfile');
		if (profileBtn && !profileBtn.dataset.bound) {
			profileBtn.dataset.bound = '1';
			profileBtn.addEventListener('click', () => UI.navigate('screenProfile'));
		}

		const themeBtn = $('btnThemeToggle');
		if (themeBtn && !themeBtn.dataset.bound) {
			themeBtn.dataset.bound = '1';
			themeBtn.addEventListener('click', () => Theme.toggle());
		}

		const heroStartBtn = $('btnHeroStart');
		if (heroStartBtn && !heroStartBtn.dataset.bound) {
			heroStartBtn.dataset.bound = '1';
			heroStartBtn.addEventListener('click', () => {
				UI.navigate('screenGame');
			});
		}
	}
};

export default Header;
