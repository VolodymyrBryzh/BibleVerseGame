import Stats from '../../core/stats';
import { $ } from '../../utils/helpers';

const Progress = {
	render(): string {
		return `
			<div class="progress-card">
				<div class="progress-header">
					<div class="progress-label">СЬОГОДНІ</div>
					<div class="progress-stats">
						<span id="dailyDone">0</span><span class="serif-accent"> / <span id="dailyGoal">5</span></span>
						<span class="serif-accent" style="font-size:1.35rem;"> віршів</span>
					</div>
				</div>
				<div class="progress-bar-container">
					<div id="dailyProgressBar" class="progress-bar-fill" style="width: 0%;"></div>
				</div>
			</div>
		`;
	},

	update(): void {
		const o = Stats.getOverview();
		const todayDone = o.todayDone || 0;
		const dailyGoal = 5;
		const percent = Math.min(Math.round((todayDone / dailyGoal) * 100), 100);

		const doneEl = $('dailyDone');
		if (doneEl) doneEl.textContent = todayDone.toString();

		const barEl = $('dailyProgressBar');
		if (barEl) barEl.style.width = `${percent}%`;
	}
};

export default Progress;
