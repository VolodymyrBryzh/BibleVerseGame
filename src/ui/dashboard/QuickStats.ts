import Stats from '../../core/stats';
import VersesDB from '../../core/database';
import { $ } from '../../utils/helpers';

const QuickStats = {
	render(): string {
		return `<div id="quickStatsContainer"></div>`;
	},

	update(): void {
		const container = $('quickStatsContainer');
		if (!container) return;

		const o = Stats.getOverview();
		const freezeState = Stats.getFreezeState();
		const verseCount = VersesDB.getAll().length;

		container.innerHTML = `
			<div class="card quick-stats-card">
				<div class="quick-stats-row">
					<div class="quick-stat-item">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink, var(--accent))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/></svg>
						<div class="quick-stat-num">${o.streak}</div>
						<div class="quick-stat-label muted">днів підряд</div>
					</div>
					<div class="quick-stat-item">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink, var(--accent))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
						<div class="quick-stat-num">${verseCount}</div>
						<div class="quick-stat-label muted">вивчено</div>
					</div>
					<div class="quick-stat-item">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink, var(--accent))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
						<div class="quick-stat-num">${o.accuracy}%</div>
						<div class="quick-stat-label muted">точність</div>
					</div>
				</div>
				<div class="quick-stats-freeze">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>
					<span>${freezeState.available ? 'Замороження доступне' : 'Замороження через ' + (7 - freezeState.daysSinceUsed) + ' дн.'}</span>
				</div>
			</div>
		`;
	}
};

export default QuickStats;
