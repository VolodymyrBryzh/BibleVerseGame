import UI from '../ui';
import { $ } from '../../utils/helpers';

const QuickStart = {
	render(): string {
		return `
			<div class="card" style="margin-top: 12px;">
				<div class="card-title" style="margin-bottom: 8px;">Швидкий старт</div>
				<button id="btnQuickStart" class="btn btn-primary btn-block" style="padding:14px;">
					Почати гру
				</button>
			</div>
		`;
	},

	update(): void {
		$('btnQuickStart')?.addEventListener('click', () => UI.navigate('screenHome'));
	}
};

export default QuickStart;
