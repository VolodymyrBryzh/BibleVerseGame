import Header from './Header';
import Progress from './Progress';
import WeeklyVerse from './WeeklyVerse';
import TodayQueue from './TodayQueue';
import QuickStats from './QuickStats';

const Dashboard = {
	init(): void {
		const html = `
			<div class="dashboard-topbar">
				${Header.render()}
			</div>
			<div class="dashboard-scroll">
				<div class="dashboard-pad">
					${WeeklyVerse.render()}
					${TodayQueue.render()}
					${QuickStats.render()}
					${Progress.render()}
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
	},

	render(): void {
		Header.update();
		WeeklyVerse.update();
		TodayQueue.update();
		QuickStats.update();
		Progress.update();
	}
};

export default Dashboard;
