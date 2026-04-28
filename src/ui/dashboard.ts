import Stats from '../core/stats';
import VersesDB from '../core/database';
import UI from './ui';
import AuthUI from './auth';
import { $ } from '../utils/helpers';

const Dashboard = {
	init(): void {
		const html = `
			<div class="dashboard-top">
				<div class="date-row">
					<span id="currentDate" class="dashboard-date"></span>
					<div style="display:flex; gap:8px; align-items:center;">
						<div class="streak-badge">
							<span class="streak-icon">🔥</span>
							<span id="streakCount">0</span> дн.
						</div>
						<button id="btnLogout" class="logout" style="padding:4px; opacity:0.6; min-width:auto; flex:none;">
							<span class="nav-icon" style="-webkit-mask-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik01IDIxYTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDR2MmI1djE0SDV6bTcgMmwxLjQxLTEuNDFMMTQuMTcgMTNIMTFWMTFoMy4xN2wtMS43Ni0xLjc2TDE0IDhMMTkgMTNsLTUgNXoiLz48L3N2Zz4='); mask-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik01IDIxYTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDR2MmI1djE0SDV6bTcgMmwxLjQxLTEuNDFMMTQuMTcgMTNIMTFWMTFoMy4xN2wtMS43Ni0xLjc2TDE0IDhMMTkgMTNsLTUgNXoiLz48L3N2Zz4='); width:20px; height:20px;"></span>
						</button>
					</div>
				</div>
				<h1 class="dashboard-title">Слово<br>на кожен день</h1>

				<div class="progress-card">
					<div class="progress-header">
						<div class="progress-info">
							<div class="progress-label">СЬОГОДНІ</div>
							<div class="progress-stats"><span id="dailyDone">0</span> з <span id="dailyGoal">5</span> віршів</div>
						</div>
						<div class="progress-percentage"><span id="dailyPercent">0</span>%</div>
					</div>
					<div class="progress-bar-container">
						<div id="dailyProgressBar" class="progress-bar-fill" style="width: 0%;"></div>
					</div>
				</div>
			</div>

			<div class="container">
				<div id="dailyVerseContainer"></div>

				<div class="card">
					<div class="card-title">Швидкий старт</div>
					<button id="btnQuickStart" class="btn btn-primary btn-block" style="padding:16px;">
						Почати гру
					</button>
				</div>
			</div>
		`;

		const screen = document.createElement('div');
		screen.id = 'screenDashboard';
		screen.className = 'screen active';
		screen.innerHTML = html;

		const appEl = document.querySelector('.app');
		if (appEl) {
			const screenHome = document.getElementById('screenHome');
			if (screenHome) {
				appEl.insertBefore(screen, screenHome);
			} else {
				appEl.appendChild(screen);
			}
		}

		// Attach events
		$('btnLogout')?.addEventListener('click', () => AuthUI.logout());
		$('btnQuickStart')?.addEventListener('click', () => UI.navigate('screenHome'));

		this.render();
	},

	render(): void {
		console.log('Dashboard: Rendering...');
		try {
			// 1. Update Date
			const dateEl = $('currentDate');
			if (dateEl) {
				const now = new Date();
				const days = ['НЕДІЛЯ', 'ПОНЕДІЛОК', 'ВІВТОРОК', 'СЕРЕДА', 'ЧЕТВЕР', 'П’ЯТНИЦЯ', 'СУБОТА'];
				const months = ['СІЧНЯ', 'ЛЮТОГО', 'БЕРЕЗНЯ', 'КВІТНЯ', 'ТРАВНЯ', 'ЧЕРВНЯ', 'ЛИПНЯ', 'СЕРПНЯ', 'ВЕРЕСНЯ', 'ЖОВТНЯ', 'ЛИСТОПАДА', 'ГРУДНЯ'];
				dateEl.textContent = `${days[now.getDay()]} · ${now.getDate()} ${months[now.getMonth()]}`;
			}

			// 2. Update Stats (Streak & Progress)
			const o = Stats.getOverview();
			const streakEl = $('streakCount');
			if (streakEl) streakEl.textContent = (o.streak || 0).toString();

			const todayDone = o.todayDone || 0;
			const dailyGoal = 5;
			const percent = Math.min(Math.round((todayDone / dailyGoal) * 100), 100);

			const doneEl = $('dailyDone');
			if (doneEl) doneEl.textContent = todayDone.toString();

			const percentEl = $('dailyPercent');
			if (percentEl) percentEl.textContent = percent.toString();

			const barEl = $('dailyProgressBar');
			if (barEl) barEl.style.width = `${percent}%`;

			// 3. Render Daily Verse
			const container = $('dailyVerseContainer');
			if (!container) return;

			const allVerses = VersesDB.getAll();
			if (!allVerses.length) {
				container.innerHTML = '<p class="text-light">Додайте вірші у налаштуваннях, щоб почати вчити.</p>';
				return;
			}

			// Random daily verse logic
			const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
			const dailyVerse = allVerses[daySeed % allVerses.length];

			const transKeys = Object.keys(dailyVerse.translations);
			const trans = dailyVerse.translations[transKeys[0]] || '';

			container.innerHTML = `
				<div class="card" style="border-left: 4px solid var(--accent); margin-top: 10px;">
					<div class="card-title" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--accent); margin-bottom:8px;">Вірш дня</div>
					<p style="font-style: italic; margin-bottom:12px; font-size:1.1rem; line-height:1.5; color:var(--text);">"${trans}"</p>
					<div style="text-align:right; font-weight:700; color:var(--text-muted); font-size:0.9rem;">${VersesDB.getReference(dailyVerse)}</div>
				</div>
			`;
		} catch (e) {
			console.error('Dashboard: Render error', e);
		}
	}
};

export default Dashboard;
