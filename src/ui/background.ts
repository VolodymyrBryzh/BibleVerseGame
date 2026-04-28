import './background.css';

const Background = {
	init(): void {
		// Створюємо елемент фону
		const bgElement = document.createElement('div');
		bgElement.className = 'modern-background';
		
		// Додаємо кілька декоративних елементів для ефекту (наприклад, кольорові плями)
		bgElement.innerHTML = `
			<div class="blob blob-1"></div>
			<div class="blob blob-2"></div>
			<div class="blob blob-3"></div>
			<div class="glass-overlay"></div>
		`;

		// Додаємо його на сторінку найпершим елементом (під все інше)
		document.body.prepend(bgElement);
	}
};

export default Background;
