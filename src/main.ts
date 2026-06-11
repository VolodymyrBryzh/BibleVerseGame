import './style.css';
// ui
import AuthUI from './ui/auth/index';
import UI from './ui/ui';
import Manage from './ui/manage/index';
import Background from './ui/background';
import Navbar from './ui/navbar';
import Dashboard from './ui/dashboard/index';
import Theme from './ui/theme';
// core
import Stats from './core/stats';
import XP from './core/xp';
import VersesDB from './core/database';
import Notifications from './core/notifications';
// engine
import Game from './engine/game';

// Expose to window for inline HTML event handlers
(window as any).UI = UI;
(window as any).Manage = Manage;
(window as any).AuthUI = AuthUI;
(window as any).Stats = Stats;
(window as any).VersesDB = VersesDB;
(window as any).Game = Game;
(window as any).Dashboard = Dashboard;
(window as any).Theme = Theme;

// Initialize app through AuthUI
document.addEventListener('DOMContentLoaded', () => {
	Theme.init();
	XP.init();
	AuthUI.init();
	Background.init();
	Navbar.init();
	Dashboard.init();
	Notifications.init();

	const notifyToggle = document.getElementById('notifyToggle') as HTMLInputElement;
	if (notifyToggle) {
		notifyToggle.checked = Notifications.isEnabled();
		notifyToggle.addEventListener('change', async () => {
			await Notifications.toggle();
			notifyToggle.checked = Notifications.isEnabled();
		});
	}

	// Register service worker for PWA support
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('/firebase-messaging-sw.js')
			.catch(err => console.error('PWA ServiceWorker registration failed', err));
	}
});
