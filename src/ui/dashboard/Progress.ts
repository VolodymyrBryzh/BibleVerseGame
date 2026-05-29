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
						<span class="serif-accent progress-unit"> віршів</span>
					</div>
				</div>
				<div class="progress-bar-container">
					<div id="monthlyProgressBar" class="progress-bar-fill" style="width: 0%;"></div>
				</div>
				<div class="progress-footer">
					<div class="streak-info">
						<span class="streak-icon">🔥</span>
						<span id="streakDays">0</span> днів
					</div>
					<div class="freeze-info" id="freezeInfo">
						<span class="freeze-icon">❄️</span>
						<span id="freezeStatus">Доступно</span>
					</div>
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

		const streakEl = $('streakDays');
		if (streakEl) streakEl.textContent = o.streak.toString();

		const freezeStatus = $('freezeStatus');
		const freezeInfo = $('freezeInfo');
		if (freezeStatus && freezeInfo) {
			const freezeState = Stats.getFreezeState();
			if (freezeState.available) {
				freezeStatus.textContent = 'Доступно';
				freezeInfo.classList.remove('freeze-used');
				freezeInfo.classList.add('freeze-available');
			} else {
				const daysLeft = 7 - freezeState.daysSinceUsed;
				freezeStatus.textContent = `через ${daysLeft} дн.`;
				freezeInfo.classList.remove('freeze-available');
				freezeInfo.classList.add('freeze-used');
			}
		}
	}
};

export default Progress;
