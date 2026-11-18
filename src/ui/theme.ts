const STORAGE_MODE_KEY = 'bv-theme-mode';

export type ThemeMode = 'light' | 'dark';

const MODES: Record<ThemeMode, { name: string; desc: string; preview: string }> = {
	light: {
		name: 'Світла',
		desc: 'Чистий фон «Ясне небо», синій акцент',
		preview: 'linear-gradient(135deg, #EEF3FB 0%, #FFFFFF 100%)',
	},
	dark: {
		name: 'Темна',
		desc: 'Глибокий нічний фон, контрастний текст',
		preview: 'linear-gradient(135deg, #0B0F19 0%, #151D30 100%)',
	},
};

const Theme = {
	currentMode: 'light' as ThemeMode,

	init(): void {
		const savedMode = localStorage.getItem(STORAGE_MODE_KEY) as ThemeMode | null;
		this.currentMode = savedMode === 'dark' ? 'dark' : 'light';
		this._apply();
	},

	toggle(): void {
		this.setMode(this.currentMode === 'light' ? 'dark' : 'light');
	},

	setMode(mode: ThemeMode): void {
		this.currentMode = mode;
		localStorage.setItem(STORAGE_MODE_KEY, mode);
		this._apply();
		this.updateSwitcherUI();
	},

	_apply(): void {
		document.documentElement.setAttribute('data-theme', 'sky');
		document.documentElement.setAttribute('data-theme-mode', this.currentMode);
	},

	renderSwitcher(): string {
		return Object.entries(MODES).map(([mode, t]) => `
			<button class="theme-option ${mode === this.currentMode ? 'active' : ''}" data-theme-mode="${mode}" onclick="Theme.setMode('${mode}')">
				<div class="theme-option-preview" style="background:${t.preview}; border:1px solid var(--border);"></div>
				<div class="theme-option-name">${t.name}</div>
				<div class="theme-option-desc">${t.desc}</div>
			</button>
		`).join('');
	},

	updateSwitcherUI(): void {
		document.querySelectorAll('.theme-option').forEach(el => {
			const btn = el as HTMLElement;
			btn.classList.toggle('active', btn.dataset.themeMode === this.currentMode);
		});
	}
};

export default Theme;
