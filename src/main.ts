import './style.css';
import AuthUI from './ui/auth';
import UI from './ui/ui';
import Manage from './ui/manage';
import Stats from './core/stats';
import VersesDB from './core/database';
import Game from './engine/game';
import Background from './ui/background';

// Expose to window for inline HTML event handlers
(window as any).UI = UI;
(window as any).Manage = Manage;
(window as any).AuthUI = AuthUI;
(window as any).Stats = Stats;
(window as any).VersesDB = VersesDB;
(window as any).Game = Game;

// Initialize app through AuthUI
document.addEventListener('DOMContentLoaded', () => {
  Background.init(); // Спершу ініціалізуємо фон
  AuthUI.init();
});
