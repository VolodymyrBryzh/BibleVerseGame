import Header from './Header';
import Progress from './Progress';
import WeeklyVerse from './WeeklyVerse';

const Dashboard = {
	init(): void {
		const html = `
			<div class="dashboard-top">
				${Header.render()}
			</div>
			${Progress.render()}
			<div class="container">
				${WeeklyVerse.render()}
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
		Progress.update();
		WeeklyVerse.update();
	}
};

export default Dashboard;
