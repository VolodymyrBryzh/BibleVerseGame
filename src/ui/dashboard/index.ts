import Header from './Header';
import Progress from './Progress';
import DailyVerse from './DailyVerse';
import QuickStart from './QuickStart';

const Dashboard = {
	init(): void {
		const html = `
			<div class="dashboard-top">
				${Header.render()}
				${Progress.render()}
			</div>
			<div class="container">
				<div id="dailyVerseContainer">
					${DailyVerse.render()}
				</div>
				<!-- ${QuickStart.render()} -->
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
			} else {
				appEl.appendChild(screen);
			}
		}

		this.render();
	},

	render(): void {
		Header.update();
		Progress.update();
		DailyVerse.update();
		// QuickStart.update();
	}
};

export default Dashboard;
