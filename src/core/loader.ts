import VersesDB, { db } from './database';
import { BibleVerse } from '../constants/bibleData';
import { toast } from '../utils/helpers';

export interface BibleBookJSON {
  metadata: {
    book: string;
    translation: string;
    language: string;
  };
  chapters: {
    chapter: number;
    verses: {
      verse: number;
      text: string;
    }[];
  }[];
}

const BibleLoader = {
  /**
   * Loads a full book JSON into the database.
   * By default, it adds all verses to the learning list (verses table).
   */
  async loadBook(jsonData: BibleBookJSON): Promise<number> {
    const { book, translation } = jsonData.metadata;
    const versesToStore: BibleVerse[] = [];

    jsonData.chapters.forEach(ch => {
      ch.verses.forEach(v => {
        versesToStore.push({
          id: `${translation}-${book}-${ch.chapter}-${v.verse}`.toLowerCase(),
          book,
          chapter: ch.chapter,
          verse: v.verse,
          tags: [book.toLowerCase()],
          translations: {
            [translation]: v.text
          }
        });
      });
    });

    try {
      // Use bulkPut to avoid duplicates and update existing ones
      await db.verses.bulkPut(versesToStore);
      await VersesDB.refreshCache();
      return versesToStore.length;
    } catch (err) {
      console.error('Failed to load book', err);
      throw err;
    }
  },

  /**
   * Utility to fetch a local JSON file and load it
   */
  async loadLocalFile(path: string): Promise<void> {
    try {
      const resp = await fetch(path);
      const data = await resp.json();
      const count = await this.loadBook(data);
      toast(`Завантажено книгу: ${data.metadata.book} (${count} віршів)`);
    } catch (err) {
      toast('Помилка завантаження файлу');
    }
  }
};

export default BibleLoader;
