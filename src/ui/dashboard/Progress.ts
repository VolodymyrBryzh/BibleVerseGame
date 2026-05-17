import Stats from '../../core/stats';
import { $ } from '../../utils/helpers';

const MONTHLY_GOAL = 4;

const Progress = {
	render(): string {
		return `
			<div class="progress-card">
				<div class="progress-header">
					<div class="progress-label">ЦЬОГО МІСЯЦЯ</div>
					<div class="progress-stats">
						<span id="monthlyDone">0</span><span class="serif-accent"> / <span id="monthlyGoal">${MONTHLY_GOAL}</span></span>
						<span class="serif-accent" style="font-size:1.35rem;"> віршів</span>
					</div>
				</div>
				<div class="progress-bar-container">
					<div id="monthlyProgressBar" class="progress-bar-fill" style="width: 0%;"></div>
				</div>
			</div>
		`;
	},

	update(): void {
		const o = Stats.getOverview();
		const monthDone = o.monthDone || 0;
		const percent = Math.min(Math.round((monthDone / MONTHLY_GOAL) * 100), 100);

		const doneEl = $('monthlyDone');
		if (doneEl) doneEl.textContent = monthDone.toString();

		const barEl = $('monthlyProgressBar');
		if (barEl) barEl.style.width = `${percent}%`;
	}
};

export default Progress;
