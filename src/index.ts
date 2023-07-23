/* eslint-disable */
import express from 'express';
import path from 'path';
import fs from 'fs';
import RSS from 'rss';

import translationsJSON from './resources/translations.json';
// Check if the code is running in development or production
const isDevelopment = process.env.NODE_ENV !== 'production';
// Set the resources path based on the environment
const resourcesPath = isDevelopment ? './resources/' : './resources/';

const app = express();
const port = 3003;
const bibleGatewaySlug = 'https://www.biblegateway.com/passage/?search=';

const fullBookList = GetBookList('full');
const otBookList = GetBookList('ot');
const ntBookList = GetBookList('nt');

interface BookListMap {
  full: typeof fullBookList;
  ot: typeof otBookList;
  nt: typeof ntBookList;
  [key: string]: typeof fullBookList | typeof otBookList | typeof ntBookList;
}
interface BookChapter {
  Book: string;
  Chapter: number;
}

interface RSSItem {
  title: string;
  description: string;
  url: string;
  author: string;
  date: Date;
}

function GetBookList(listName: string) {
  // Get absolute path to the file

  const filePath = path.join(__dirname, `${resourcesPath + listName}.json`);

  // Read file synchronously
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent);
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

//localhost:3003/ot/esv/20220101/10/feed.rss
app.get('/:plan/:translation/:startDate/:chapters/feed.rss', (req, res) => {
  let feed = new RSS({
    title: 'Bible Plan Feed',
    description: 'Go to www.bibleplanfeed.com for more information.',
    feed_url: `https://www.bibleplanfeed.com/${req.params.plan}/${req.params.startDate}/${req.params.chapters}/feed.rss`,
    site_url: 'https://www.bibleplanfeed.com/',
    image_url: 'https://www.bibleplanfeed.com/icon.png',
    managingEditor: 'Jordan Tryon',
    webMaster: 'Jordan Tryon',
    copyright: 'Jordan Tryon',
    language: 'en',
    categories: ['NONE'],
    pubDate: new Date().toString(),
    ttl: 60,
  });
  BuildRSSFeedItems(
    req.params.plan,
    req.params.translation,
    parseDate(req.params.startDate),
    parseInt(req.params.chapters)
  ).map((item: RSSItem) => {
    feed.item({
      title: item.title,
      description: item.description,
      url: item.url,
      author: item.author,
      date: item.date,
    });
  });

  res.type('application/rss+xml');
  res.send(feed.xml({ indent: true }));
});

// Build the RSS Feed Items
const BuildRSSFeedItems = (
  plan: string,
  translation: string,
  startDate: Date,
  numberOfChapters: number
): RSSItem[] => {
  translation = CheckTranslation(translation) ? translation : 'ESV';
  let chaptersToGet = getDaysBetween(startDate) * numberOfChapters;
  let bookList;
  const bookListMap: BookListMap = {
    full: fullBookList,
    ot: otBookList,
    nt: ntBookList,
  };

  bookList = bookListMap[plan] || fullBookList;

  const processChapter = (chapter: BookChapter, index: number): RSSItem => ({
    title: `${chapter.Book} ${chapter.Chapter}`,
    description: `Day ${Math.ceil(
      (index + 1) / 10
    )} of ${plan.toUpperCase()} plan in ${translation.toUpperCase()}`,
    url: BuildBibleGatewayURL(chapter.Book, chapter.Chapter, translation),
    author: 'Bible Gateway',
    date: new Date(),
  });

  return bookList.slice(0, chaptersToGet).map(processChapter);
};

// Get the number of days between the start date and today
function getDaysBetween(date: Date): number {
  const now = new Date(); // current date
  now.setHours(0, 0, 0, 0); // reset hours to ensure accurate comparison

  const diffInMilliSeconds = Math.abs(now.getTime() - date.getTime());
  return Math.floor(diffInMilliSeconds / (1000 * 60 * 60 * 24));
}

// Parse the date string from the url
function parseDate(dateString: string): Date {
  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6)) - 1; // months are 0-indexed in JavaScript
  const day = parseInt(dateString.substring(6, 8));

  return new Date(year, month, day);
}
// Check translation since this is a user field we don't want to pass bad stuff to bible gateway.
const CheckTranslation = (translation: string): boolean =>
  translationsJSON.some((item) => item.Code === translation.toUpperCase());

// Build the bible gateway url
const BuildBibleGatewayURL = (book: string, chapter: number, translation: string): string =>
  `${bibleGatewaySlug + book.replace(' ', '%20')}%20${chapter}&version=${translation}`;

//Listen on port port
app.listen(port, () => console.log(`Express is listening at http://localhost:${port}`));
