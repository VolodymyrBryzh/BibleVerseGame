const STORAGE_KEY = 'bv-theme';

type ThemeId = 'editorial' | 'acid';

const THEMES: Record<ThemeId, { name: string; desc: string; preview: string }> = {
	editorial: {
		name: 'Editorial Soft',
		desc: 'Мінімалізм, serif-акценти, градієнтні смуги',
		preview: 'linear-gradient(105deg, #B07BD8, #FF5E8E, #FF8A5A, #FFC56B)',
	},
	acid: {
		name: 'Acid Brutal',
		desc: 'Лайм, коралл, жирні бордери, Unbounded',
		preview: 'linear-gradient(135deg, #D4FF3A 0%, #FF5E3A 50%, #3A6BFF 100%)',
	},
};

const Theme = {
	current: 'editorial' as ThemeId,

	init(): void {
		const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
		this.current = saved && THEMES[saved] ? saved : 'editorial';
		this._apply();
	},

	set(id: ThemeId): void {
		if (!THEMES[id]) return;
		this.current = id;
		localStorage.setItem(STORAGE_KEY, id);
		this._apply();
		this.updateSwitcherUI();
	},

	toggle(): void {
		this.set(this.current === 'editorial' ? 'acid' : 'editorial');
	},

	_apply(): void {
		if (this.current === 'acid') {
			document.documentElement.setAttribute('data-theme', 'acid');
		} else {
			document.documentElement.removeAttribute('data-theme');
		}
	},

	renderSwitcher(): string {
		return Object.entries(THEMES).map(([id, t]) => `
			<button class="theme-option ${id === this.current ? 'active' : ''}" data-theme-id="${id}" onclick="Theme.set('${id}')">
				<div class="theme-option-preview" style="background:${t.preview};"></div>
				<div class="theme-option-name">${t.name}</div>
				<div class="theme-option-desc">${t.desc}</div>
			</button>
		`).join('');
	},

	updateSwitcherUI(): void {
		document.querySelectorAll('.theme-option').forEach(el => {
			const btn = el as HTMLElement;
			btn.classList.toggle('active', btn.dataset.themeId === this.current);
		});
	}
};

export default Theme;
