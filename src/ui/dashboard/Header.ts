import Stats from '../../core/stats';
import UI from '../ui';
import { $ } from '../../utils/helpers';

const Header = {
	render(): string {
		return `
			<div class="date-row">
				<span id="currentDate" class="dashboard-date"></span>
				<div style="display:flex; gap:18px; align-items:center;">
					<div class="streak-badge">
						<span class="streak-icon">🔥</span>
						<span id="streakCount">0</span> дн.
					</div>
					<button id="btnProfile" style="all:unset; cursor:pointer; display:flex;">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);">
							<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
						</svg>
					</button>
				</div>
			</div>
			<!-- Editorial title -->
			<div class="hero-editorial">
				<p style="margin:0; font-family:var(--font-serif); font-style:italic; font-size:1rem; color:var(--text-muted); font-weight:400;">Слово на сьогодні.</p>
				<h1 class="dashboard-title" style="margin-top:8px;">
					Вивчай<br>
					<span style="font-family:var(--font-serif); font-style:italic; font-weight:400;">Святе Письмо</span><br>
					без зусиль.
				</h1>
				<p style="margin:14px 0 0; max-width:280px; font-size:0.8rem; color:var(--text-muted); line-height:1.5;">Декілька хвилин на день — і вірш залишається в пам'яті назавжди.</p>
			</div>
			<!-- Acid title -->
			<div class="hero-acid">
				<h1 class="dashboard-title">
					СЛОВО<br><span class="acid-highlight">живе.</span>
				</h1>
				<p style="margin:14px 0 0; max-width:280px; font-size:0.85rem; color:var(--text-muted); line-height:1.4; font-weight:500;">Вивчай Святе Письмо як гру. По одному віршу за раз.</p>
			</div>
		`;
	},

	update(): void {
		const dateEl = $('currentDate');
		if (dateEl) {
			const now = new Date();
			const days = ['НЕДІЛЯ', 'ПОНЕДІЛОК', 'ВІВТОРОК', 'СЕРЕДА', 'ЧЕТВЕР', "П’ЯТНИЦЯ", 'СУБОТА'];
			const months = ['СІЧНЯ', 'ЛЮТОГО', 'БЕРЕЗНЯ', 'КВІТНЯ', 'ТРАВНЯ', 'ЧЕРВНЯ', 'ЛИПНЯ', 'СЕРПНЯ', 'ВЕРЕСНЯ', 'ЖОВТНЯ', 'ЛИСТОПАДА', 'ГРУДНЯ'];
			dateEl.textContent = `${days[now.getDay()]} · ${now.getDate()} ${months[now.getMonth()]}`;
		}

		const streakEl = $('streakCount');
		const overview = Stats.getOverview();
		if (streakEl) streakEl.textContent = (overview.streak || 0).toString();

		$('btnProfile')?.addEventListener('click', () => UI.navigate('screenProfile'));
	}
};

export default Header;
