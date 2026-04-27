import './style.css';

import VersesDB from './core/database';
import Stats from './core/stats';
import Game from './engine/game';
import UI from './ui/ui';
import Manage from './ui/manage';

// Expose to window for inline HTML event handlers
(window as any).VersesDB = VersesDB;
(window as any).Stats = Stats;
(window as any).Game = Game;
(window as any).UI = UI;
(window as any).Manage = Manage;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  VersesDB.init();
  Stats.init();
  UI.init();
  Manage.init();
});
