import Stats from '../../core/stats';
import UI from '../ui';
import { $ } from '../../utils/helpers';

const QuickStats = {
	render(): string {
		return `<div id="quickStatsContainer"></div>`;
	},

	update(): void {
		const container = $('quickStatsContainer');
		if (!container) return;

		const o = Stats.getOverview();

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
						<div class="quick-stat-num">${o.learned}</div>
						<div class="quick-stat-label muted">вивчено</div>
					</div>
					<div class="quick-stat-item">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink, var(--accent))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
						<div class="quick-stat-num">${o.accuracy}%</div>
						<div class="quick-stat-label muted">точність</div>
					</div>
				</div>
			</div>

			<button id="btnQuickGame" class="card quick-action-card">
				<span class="quick-action-icon accent-bg">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink, var(--accent))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
				</span>
				<span class="quick-action-text">
					<span class="quick-action-title">Зіграти в гру</span>
					<span class="muted" style="font-size:13px;">3 режими · заробляй XP</span>
				</span>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--faint, var(--text-muted))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
			</button>

			<button id="btnQuickAdd" class="card quick-action-card">
				<span class="quick-action-icon surface-bg">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
				</span>
				<span class="quick-action-text">
					<span class="quick-action-title">Додати вірш</span>
					<span class="muted" style="font-size:13px;">${Stats.getOverview().learned || 0} у колекції</span>
				</span>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--faint, var(--text-muted))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
			</button>
		`;

		$('btnQuickGame')?.addEventListener('click', () => UI.navigate('screenGame'));
		$('btnQuickAdd')?.addEventListener('click', () => UI.navigate('screenManage'));
	}
};

export default QuickStats;
