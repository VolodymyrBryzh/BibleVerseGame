import VerseForm from './VerseForm';
import VerseList from './VerseList';
import ImportExport from './ImportExport';
import UI from '../ui';

const Manage = {
	init(): void {
		VerseForm.renderTranslationFields();
		VerseList.render();
		VerseForm.initTranslationDropdown();
	},

	// Delegated methods for onclick handlers in HTML
	onTranslationChange(): void { VerseForm.onTranslationChange(); },
	onBookChange(): void { VerseForm.onBookChange(); },
	onChapterChange(): void { VerseForm.onChapterChange(); },
	onVerseChange(): void { VerseForm.onVerseChange(); },

	async saveVerse(): Promise<void> {
		try {
			await VerseForm.saveVerse(() => {
				VerseList.render();
				UI.updateVerseFilter();
			});
		} catch (e) {
			console.error('saveVerse error:', e);
		}
	},

	renderVerseList(): void { VerseList.render(); },
	handleSearch(): void { VerseList.handleSearch(); },
	removeVerse(id: string): void { VerseList.removeVerse(id); },

	exportData(): void { ImportExport.exportData(); },
	importData(event: Event): void { ImportExport.importData(event); },
	importBookJSON(event: Event): void { ImportExport.importBookJSON(event); },
};

export default Manage;
