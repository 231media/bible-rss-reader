import fs from 'fs';
import path from 'path';

export interface BibleBook {
  Book: string;
  Chapter: number;
}

const AddChapterToFeed = (book: string, chapters: number): BibleBook[] => {
  const output: BibleBook[] = [];
  for (let i = 1; i <= chapters; i += 1) {
    output.push({ Book: book, Chapter: i });
  }
  return output;
};

const ExpandBooks = (): void => {
  const data = fs.readFileSync(path.join(__dirname, 'public', 'resources', 'books.json'), 'utf8');
  const books: BibleBook[] = JSON.parse(data);
  let expandedBooks: BibleBook[] = [];
  books.forEach((book) => {
    expandedBooks = expandedBooks.concat(AddChapterToFeed(book.Book, book.Chapter));
  });
  fs.writeFileSync(
    path.resolve(__dirname, 'public', 'FullBookList.json'),
    // eslint-disable-next-line comma-dangle
    JSON.stringify(expandedBooks)
  );
};

ExpandBooks();
