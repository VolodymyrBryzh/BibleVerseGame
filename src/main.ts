import './style.css';

import VersesDB from './core/database';
import Stats from './core/stats';
import Game from './engine/game';
import UI from './ui/ui';
import Manage from './ui/manage';
import AuthUI from './ui/auth';

// Expose to window for inline HTML event handlers
(window as any).VersesDB = VersesDB;
(window as any).Stats = Stats;
(window as any).Game = Game;
(window as any).UI = UI;
(window as any).Manage = Manage;
(window as any).AuthUI = AuthUI;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  AuthUI.init();
  await VersesDB.init();
  await Stats.init();
  UI.init();
  Manage.init();
});
