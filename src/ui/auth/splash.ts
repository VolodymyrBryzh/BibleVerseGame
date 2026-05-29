import { auth } from '../../core/firebase';
import UI from '../ui';
import { $ } from '../../utils/helpers';

const Splash = {
	show(userName?: string): void {
		document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

		const name = userName || auth.currentUser?.displayName || 'Друже';
		const firstName = name.split(' ')[0];

		let splash = $('screenSplash');
		if (!splash) {
			splash = document.createElement('div');
			splash.id = 'screenSplash';
			splash.className = 'splash-screen';
			document.querySelector('.app')?.appendChild(splash);
		}

		const hour = new Date().getHours();
		let greeting = 'Добрий день';
		if (hour < 6) greeting = 'Доброї ночі';
		else if (hour < 12) greeting = 'Доброго ранку';
		else if (hour >= 18) greeting = 'Доброго вечора';

		splash.innerHTML = `
			<div class="splash-content">
				<div class="splash-greeting">${greeting},</div>
				<div class="splash-name">${firstName}</div>
			</div>
		`;
		splash.classList.add('active');

		const nav = $('mainNav');
		if (nav) nav.style.display = 'none';

		setTimeout(() => {
			splash.classList.add('splash-fade-out');
			setTimeout(() => {
				splash.classList.remove('active', 'splash-fade-out');
				if (nav) nav.style.display = 'flex';
				UI.navigate('screenDashboard');
			}, 600);
		}, 1800);
	}
};

export default Splash;
