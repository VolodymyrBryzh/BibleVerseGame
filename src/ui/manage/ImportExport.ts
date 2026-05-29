import VersesDB from '../../core/database';
import BibleLoader from '../../core/loader';
import UI from '../ui';
import { toast } from '../../utils/helpers';

const ImportExport = {
	exportData(): void {
		const json = VersesDB.exportAll();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `bible-verses-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
		toast('Експортовано!');
	},

	importData(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const content = e.target?.result as string;
				const count = await VersesDB.importVerses(content);
				toast(`Імпортовано ${count} віршів`);
				(window as any).Manage?.renderVerseList();
				UI.updateVerseFilter();
			} catch (err: any) {
				toast('Помилка імпорту: ' + err.message);
			}
		};
		reader.readAsText(file);
		input.value = '';
	},

	async importBookJSON(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const content = JSON.parse(e.target?.result as string);
				const count = await BibleLoader.loadBook(content);
				toast(`Завантажено книгу: ${content.metadata.book} (${count} віршів)`);
				(window as any).Manage?.renderVerseList();
				UI.updateVerseFilter();
			} catch (err: any) {
				toast('Помилка завантаження книги: ' + err.message);
			}
		};
		reader.readAsText(file);
		input.value = '';
	}
};

export default ImportExport;
