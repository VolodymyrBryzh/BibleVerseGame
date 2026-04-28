import './navbar.css';
import UI from './ui';

const Navbar = {
	init(): void {
		const navHTML = `
			<div id="navIndicator" class="nav-indicator"></div>
			<button class="nav-btn active" data-screen="screenDashboard">
				<span class="nav-icon icon-home"></span>
				Головна
			</button>
			<button id="navBtnGame" class="nav-btn" data-screen="screenHome">
				<span class="nav-icon icon-game"></span>
				Гра
			</button>
			<button class="nav-btn" data-screen="screenStats">
				<span class="nav-icon icon-stats"></span>
				Статистика
			</button>
			<button class="nav-btn" data-screen="screenManage">
				<span class="nav-icon icon-manage"></span>
				Вірші
			</button>
		`;

		const navContainer = document.createElement('div');
		navContainer.id = 'mainNav';
		navContainer.className = 'bottom-nav';
		navContainer.style.display = 'none'; // Will be managed by AuthUI
		navContainer.innerHTML = navHTML;

		// Attach event listeners directly, avoiding inline onclick attributes
		const buttons = navContainer.querySelectorAll('.nav-btn');
		buttons.forEach(btn => {
			btn.addEventListener('click', (e) => {
				const screen = (e.currentTarget as HTMLElement).dataset.screen;
				if (screen) {
					UI.navigate(screen);
				}
			});
		});

		const appEl = document.querySelector('.app');
		if (appEl) {
			appEl.appendChild(navContainer);
		} else {
			document.body.appendChild(navContainer);
		}
	}
};

export default Navbar;
