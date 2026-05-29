import Stats from '../../core/stats';
import XP from '../../core/xp';
import UI from '../ui';
import Theme from '../theme';
import { auth } from '../../core/firebase';
import { $ } from '../../utils/helpers';

const Header = {
	render(): string {
		return `
			<div class="topbar">
				<span id="currentDate" class="topbar-date"></span>
				<div class="topbar-right">
					<button id="btnThemeToggle" class="icon-btn" aria-label="Theme">
						<svg id="themeIconSun" class="theme-icon theme-icon--sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
						</svg>
						<svg id="themeIconMoon" class="theme-icon theme-icon--moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
						</svg>
					</button>
					<div class="xp-pill">
						<span class="xp-k">XP</span>
						<span id="xpCount">0</span>
					</div>
					<button id="btnProfile" class="icon-btn" aria-label="Profile">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
						</svg>
					</button>
				</div>
			</div>
			<div class="dash-greeting">
				<div>
					<div class="eyebrow" id="greetingTime"></div>
					<h1 class="screen-title" id="greetingName"></h1>
				</div>
				<div class="streak-chip" id="streakChip">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/></svg>
					<span id="streakDays">0</span> дн.
				</div>
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

		const hour = new Date().getHours();
		let greeting = 'Доброго дня';
		if (hour < 5) greeting = 'Доброї ночі';
		else if (hour < 12) greeting = 'Доброго ранку';
		else if (hour >= 17) greeting = 'Доброго вечора';

		const greetingTime = $('greetingTime');
		if (greetingTime) greetingTime.textContent = greeting;

		const greetingName = $('greetingName');
		if (greetingName) {
			const name = auth.currentUser?.displayName || 'Друже';
			const firstName = name.split(' ')[0];
			greetingName.textContent = `Привіт, ${firstName}!`;
		}

		const overview = Stats.getOverview();

		const xpEl = $('xpCount');
		if (xpEl) xpEl.textContent = XP.getTotal().toString();

		const streakEl = $('streakDays');
		if (streakEl) streakEl.textContent = overview.streak.toString();

		// Bind buttons
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
	}
};

export default Header;
