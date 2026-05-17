import './style.css';
// ui
import AuthUI from './ui/auth/index';
import UI from './ui/ui';
import Manage from './ui/manage';
import Background from './ui/background';
import Navbar from './ui/navbar';
import Dashboard from './ui/dashboard/index';
import Theme from './ui/theme';
// core
import Stats from './core/stats';
import VersesDB from './core/database';
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
	AuthUI.init();
	Background.init();
	Navbar.init();
	Dashboard.init();
});
