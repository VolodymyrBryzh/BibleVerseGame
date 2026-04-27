import './style.css';

import VersesDB from './core/database.js';
import Stats from './core/stats.js';
import Game from './engine/game.js';
import UI from './ui/ui.js';
import Manage from './ui/manage.js';

// Expose to window for inline HTML event handlers
window.VersesDB = VersesDB;
window.Stats = Stats;
window.Game = Game;
window.UI = UI;
window.Manage = Manage;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  VersesDB.init();
  Stats.init();
  UI.init();
  Manage.init();
});
