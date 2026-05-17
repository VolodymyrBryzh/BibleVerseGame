import VersesDB from '../core/database';
import Stats from '../core/stats';
import Manage from './manage';
import Theme from './theme';
import { TRANSLATIONS_META } from '../constants/bibleData';
import { $ } from '../utils/helpers';
import Dashboard from './dashboard/index';
import GameSetup from './game-setup/index';

const UI = {
	init(): void {
		GameSetup.init();
		this.renderTranslationFilter();
		this.updateVerseFilter();
		this.renderStats();
		Dashboard.render();
	},

	showScreen(id: string): void {
		const screens = document.querySelectorAll('.screen');
		screens.forEach(s => s.classList.toggle('active', s.id === id));

		const navBtns = document.querySelectorAll('.nav-btn');
		let activeIndex = 0;
		navBtns.forEach((b, index) => {
			const btn = b as HTMLElement;
			const isActive = btn.dataset.screen === id;
			btn.classList.toggle('active', isActive);
			if (isActive) activeIndex = index;
		});

		const indicator = $('navIndicator');
		if (indicator) {
			indicator.style.transform = `translateX(${activeIndex * 100}%)`;
		}

		if (id === 'screenStats') this.renderStats();
		if (id === 'screenManage') Manage.renderVerseList();
		if (id === 'screenProfile') {
			const sw = $('themeSwitcher');
			if (sw) sw.innerHTML = Theme.renderSwitcher();
		}

		window.scrollTo(0, 0);
	},

	navigate(screenId: string): void {
		this.showScreen(screenId);
	},

	selectMode(el: HTMLElement): void {
		document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
		el.classList.add('selected');
	},

	renderTranslationFilter(): void {
		const sel = $<HTMLSelectElement>('filterTranslation');
		if (!sel) return;
		sel.innerHTML = TRANSLATIONS_META.map(t =>
			`<option value="${t.key}">${t.name}</option>`
		).join('');
	},

	updateVerseFilter(): void {
		const transSel = $<HTMLSelectElement>('filterTranslation');
		const sel = $<HTMLSelectElement>('filterVerse');
		if (!transSel || !sel) return;

		const transKey = transSel.value;
		const prev = sel.value;

		let html = '<option value="all">Всі вірші (випадковий)</option>';
		VersesDB.getAll()
			.filter(v => v.translations[transKey])
			.forEach(v => {
				html += `<option value="${v.id}">${VersesDB.getReference(v)}</option>`;
			});

		sel.innerHTML = html;
		if (sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
	},

	renderStats(): void {
		const o = Stats.getOverview();

		// Streak hero card
		const streakNum = $('statStreakDays');
		if (streakNum) streakNum.textContent = o.streak.toString();
		const streakMsg = $('statStreakMsg');
		if (streakMsg) {
			streakMsg.textContent = o.streak > 0 ? 'підряд · продовжуй.' : 'починай серію!';
		}

		// 3-column stats
		const learned = $('statLearned2');
		if (learned) learned.textContent = o.learned.toString();
		const acc = $('statAccuracy2');
		if (acc) acc.textContent = o.accuracy.toString();

		// Time
		const totalSec = Stats.getTotalTime();
		const hours = Math.floor(totalSec / 3600);
		const mins = Math.floor((totalSec % 3600) / 60);
		const secs = totalSec % 60;
		const timeNum = $('statTimeNum');
		const timeUnit = $('statTimeUnit');
		if (timeNum && timeUnit) {
			if (hours > 0) {
				timeNum.textContent = hours.toString();
				timeUnit.textContent = 'год';
			} else if (mins > 0) {
				timeNum.textContent = mins.toString();
				timeUnit.textContent = secs > 0 ? `хв${secs}с` : 'хв';
			} else {
				timeNum.textContent = secs.toString();
				timeUnit.textContent = 'с';
			}
		}

		// Activity chart (14 days)
		const activity = Stats.getActivityData(14);
		const maxCount = Math.max(...activity.map(d => d.count), 1);
		const chartEl = $('activityChart');
		if (chartEl) {
			chartEl.innerHTML = activity.map((d, i) => {
				const h = Math.max((d.count / maxCount) * 100, 4);
				const isToday = i === activity.length - 1;
				return `<div class="stats-activity-bar${isToday ? ' today' : ''}" style="height:${h}%"></div>`;
			}).join('');
		}

		// Activity date labels
		const months = ['СІЧ','ЛЮТ','БЕР','КВІ','ТРА','ЧЕР','ЛИП','СЕР','ВЕР','ЖОВ','ЛИС','ГРУ'];
		const startEl = $('activityStart');
		if (startEl && activity[0]) {
			const d = new Date(activity[0].date);
			startEl.textContent = `${d.getDate()} ${months[d.getMonth()]}`;
		}
		const midEl = $('activityMid');
		if (midEl && activity[7]) {
			const d = new Date(activity[7].date);
			midEl.textContent = `${d.getDate()} ${months[d.getMonth()]}`;
		}

		// Milestones
		this._renderMilestones(o);
	},

	_renderMilestones(o: ReturnType<typeof Stats.getOverview>): void {
		const container = $('milestonesList');
		if (!container) return;

		const psalmCount = Stats.getPsalmLearnedCount();

		const milestones = [
			{
				icon: '🔥',
				title: 'Тиждень підряд',
				completed: o.bestStreak >= 7,
				progress: `${Math.min(o.streak, 7)} з 7 днів`,
			},
			{
				icon: '⭐',
				title: 'Перші 50 віршів',
				completed: o.learned >= 50,
				progress: `${o.learned} з 50 завершено`,
			},
			{
				icon: '✦',
				title: 'Псалмоспівець',
				completed: psalmCount >= 100,
				progress: `${psalmCount} зі 100 псалмів`,
			},
		];

		container.innerHTML = milestones.map(m => `
			<div class="milestone-item">
				<div class="milestone-icon${m.completed ? ' completed' : ''}">${m.icon}</div>
				<div class="milestone-info">
					<h3>${m.title}</h3>
					<p>${m.completed ? 'Виконано' : m.progress}</p>
				</div>
				${m.completed ? '<span class="milestone-check">✓</span>' : ''}
			</div>
		`).join('');
	}
};

export default UI;
