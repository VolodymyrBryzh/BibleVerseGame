const STORAGE_KEY = 'bv-theme';
const STORAGE_MODE_KEY = 'bv-theme-mode';

type ThemeId = 'sky' | 'acid';
type ThemeMode = 'light' | 'dark';

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
	currentMode: 'light' as ThemeMode,

	init(): void {
		const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
		// Migrate old 'editorial' theme to 'sky'
		const resolved = (saved as string) === 'editorial' ? 'sky' : saved;
		this.current = resolved && THEMES[resolved as ThemeId] ? resolved as ThemeId : 'sky';

		const savedMode = localStorage.getItem(STORAGE_MODE_KEY) as ThemeMode | null;
		this.currentMode = savedMode === 'dark' ? 'dark' : 'light';

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
		this.setMode(this.currentMode === 'light' ? 'dark' : 'light');
	},

	setMode(mode: ThemeMode): void {
		this.currentMode = mode;
		localStorage.setItem(STORAGE_MODE_KEY, mode);
		this._apply();
	},

	_apply(): void {
		document.documentElement.setAttribute('data-theme', this.current);
		document.documentElement.setAttribute('data-theme-mode', this.currentMode);
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

