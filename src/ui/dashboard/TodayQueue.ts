import VersesDB from '../../core/database';
import Stats from '../../core/stats';
import UI from '../ui';
import { $ } from '../../utils/helpers';

const TodayQueue = {
	render(): string {
		return `<div id="todayQueueContainer"></div>`;
	},

	update(): void {
		const container = $('todayQueueContainer');
		if (!container) return;

		const allVerses = VersesDB.getAll();
		if (!allVerses.length) {
			container.innerHTML = '';
			return;
		}

		// Build queue: all verses with their mastery progress
		const byVerse = Stats.getPerVerse();
		const queue = allVerses.slice(0, 5).map(v => {
			const stat = byVerse.find(s => s.id === v.id.toString());
			const pct = stat ? stat.pct : 0;
			const ref = VersesDB.getReference(v);
			const transKeys = Object.keys(v.translations);
			const text = v.translations[transKeys[0]] || '';
			const snippet = text.replace(/<[^>]+>/g, '').substring(0, 40) + (text.length > 40 ? '...' : '');
			const isNew = !stat || stat.total === 0;
			return { ref, snippet, pct, isNew };
		});

		container.innerHTML = `
			<div class="card today-queue-card">
				<div class="today-queue-header">
					<h3 class="today-queue-title">На сьогодні</h3>
					<span class="muted" style="font-size:13px; font-weight:600;">${queue.length} вірші</span>
				</div>
				${queue.map((v, i) => `
					<button class="today-queue-item" data-go="game" ${i ? 'style="border-top:1px solid var(--border-2, var(--border));"' : ''}>
						<span class="today-ring-wrap">
							<svg width="42" height="42" viewBox="0 0 42 42" style="transform:rotate(-90deg)">
								<circle cx="21" cy="21" r="17.5" fill="none" stroke="var(--border)" stroke-width="3.5"/>
								<circle cx="21" cy="21" r="17.5" fill="none" stroke="var(--accent)" stroke-width="3.5"
									stroke-linecap="round"
									stroke-dasharray="${2 * Math.PI * 17.5}"
									stroke-dashoffset="${2 * Math.PI * 17.5 * (1 - v.pct / 100)}"/>
							</svg>
							<span class="today-ring-num">${v.pct}</span>
						</span>
						<span class="today-queue-info">
							<span class="today-queue-ref">${v.ref}</span>
							<span class="today-queue-snippet serif">${v.snippet}</span>
						</span>
						<span class="chip ${v.isNew ? 'accent' : ''}" style="font-size:11px; padding:4px 10px;">
							${v.isNew ? 'нове' : 'повторення'}
						</span>
					</button>
				`).join('')}
			</div>
		`;

		// Bind queue item clicks
		container.querySelectorAll('[data-go="game"]').forEach(btn => {
			btn.addEventListener('click', () => UI.navigate('screenGame'));
		});
	}
};

export default TodayQueue;
