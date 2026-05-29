const STORAGE_KEY = 'bv-theme';

type ThemeId = 'sky' | 'acid';

const THEMES: Record<ThemeId, { name: string; desc: string; preview: string }> = {
	sky: {
		name: 'Ясне небо',
		desc: 'М\'яка синьо-блакитна, мінімалізм, serif-акценти',
		preview: 'linear-gradient(135deg, #5B8DEF 0%, #7FA8F4 55%, #9DBDF7 100%)',
	},
	acid: {
		name: 'Acid Brutal',
		desc: 'Лайм, коралл, жирні бордери, Unbounded',
		preview: 'linear-gradient(135deg, #D4FF3A 0%, #FF5E3A 50%, #3A6BFF 100%)',
	},
};

const Theme = {
	current: 'sky' as ThemeId,

	init(): void {
		const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
		// Migrate old 'editorial' theme to 'sky'
		const resolved = (saved as string) === 'editorial' ? 'sky' : saved;
		this.current = resolved && THEMES[resolved as ThemeId] ? resolved as ThemeId : 'sky';
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
		this.set(this.current === 'sky' ? 'acid' : 'sky');
	},

	_apply(): void {
		document.documentElement.setAttribute('data-theme', this.current);
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
