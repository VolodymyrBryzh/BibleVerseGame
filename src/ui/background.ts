import './background.css';

const Background = {
	init(): void {
		const bgElement = document.createElement('div');
		bgElement.className = 'modern-background';
		document.body.prepend(bgElement);
	}
};

export default Background;
