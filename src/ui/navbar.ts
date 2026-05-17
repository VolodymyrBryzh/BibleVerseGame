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
			<button class="nav-btn" data-screen="screenGame">
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
		navContainer.style.display = 'none';
		navContainer.innerHTML = navHTML;

		const buttons = navContainer.querySelectorAll('.nav-btn');
		buttons.forEach(btn => {
			btn.addEventListener('click', (e) => {
				const el = e.currentTarget as HTMLElement;
				const screen = el.dataset.screen;
				if (screen) {
					UI.navigate(screen);
				}
			});
		});

		document.body.appendChild(navContainer);
	}
};

export default Navbar;
