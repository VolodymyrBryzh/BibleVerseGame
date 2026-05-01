import Stats from '../../core/stats';
import UI from '../ui';
import { $ } from '../../utils/helpers';

const Header = {
	render(): string {
		return `
			<div class="date-row">
				<span id="currentDate" class="dashboard-date"></span>
				<div style="display:flex; gap:8px; align-items:center;">
					<div class="streak-badge">
						<span class="streak-icon">🔥</span>
						<span id="streakCount">0</span> дн.
					</div>
					<button id="btnProfile" class="profile-btn" style="padding:4px; opacity:0.8; min-width:auto; flex:none; background:none; border:none; color:var(--accent);">
						<span class="nav-icon" style="-webkit-mask-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDNjMS42NiAwIDMgMS4zNCAzIDNzLTEuMzQgMy0zIDMtMy0xLjM0LTMtMyAxLjM0LTMgMy0zem0wIDE0LjJjLTIuNSAwLTQuNzEtMS4yOC02LTMuMjIuMDMtMS45OSA0LTMuMDggNi0zLjA4IDEuOTkgMCA1Ljk3IDEuMDkgNiAzLjA4LTEuMjkgMS45NC0zLjUgMy4yMi02IDMuMjJ6Ii8+PC9zdmc+'); mask-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDNjMS42NiAwIDMgMS4zNCAzIDNzLTEuMzQgMy0zIDMtMy0xLjM0LTMtMyAxLjM0LTMgMy0zem0wIDE0LjJjLTIuNSAwLTQuNzEtMS4yOC02LTMuMjIuMDMtMS45OSA0LTMuMDggNi0zLjA4IDEuOTkgMCA1Ljk3IDEuMDkgNiAzLjA4LTEuMjkgMS45NC0zLjUgMy4yMi02IDMuMjJ6Ii8+PC9zdmc+'); width:28px; height:28px;"></span>
					</button>
				</div>
			</div>
			<h1 class="dashboard-title">Слово<br>на кожен день</h1>
		`;
	},

	update(): void {
		const dateEl = $('currentDate');
		if (dateEl) {
			const now = new Date();
			const days = ['НЕДІЛЯ', 'ПОНЕДІЛОК', 'ВІВТОРОК', 'СЕРЕДА', 'ЧЕТВЕР', 'П’ЯТНИЦЯ', 'СУБОТА'];
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
