import VersesDB from '../core/database';
import Manage from './manage/index';
import Theme from './theme';
import StatsView from './stats/StatsView';
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
		StatsView.render();
	}
};

export default UI;
