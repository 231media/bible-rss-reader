/* eslint-disable */
import express from 'express';
import path from 'path';
import RSS from 'rss';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fullBookList from './resources/full.json';
import otBookList from './resources/ot.json';
import ntBookList from './resources/nt.json';
import translationsJSON from './resources/translations.json';
// Check if the code is running in development or production
const isDevelopment = process.env.NODE_ENV !== 'production';
// Set the resources path based on the environment

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

const app = express();
app.use(compression());
//Use Limit
app.use(limiter);
// Use Helmet
app.use(helmet());
app.use(helmet.hidePoweredBy());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"], // Only allow content from our own domain
      scriptSrc: ["'self'"], // Only allow scripts from our own domain
    },
  })
);
app.use(
  helmet.hsts({
    maxAge: 31536000, // Preferably set it for one year
    includeSubDomains: true, // Apply rule to subdomains as well
    preload: true,
  })
);

const port = 3000;
const bibleGatewaySlug = 'https://www.biblegateway.com/passage/?search=';

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

if (isDevelopment) {
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
  });
}

//localhost:3000/rssbible/ot/esv/20230801/3/feed.rss
app.get('/rssbible/:plan/:translation/:startDate/:chapters/feed.rss', (req, res) => {
  let plan = SanitizePlan(req.params.plan);
  let startDate = SanitizeDate(req.params.startDate);
  let chapters = SanitizeChapters(req.params.chapters);
  let translation = SanitizeTranslation(req.params.translation);
  let feed = new RSS({
    title: 'Bible Plan Feed',
    description: 'Go to www.bibleplanfeed.com for more information.',
    feed_url: `https://www.bibleplanfeed.com/rssbible/${plan}/${formatDateToyyyyMMdd(
      startDate
    )}/${translation}/${chapters}/feed.rss`,
    site_url: 'https://www.bibleplanfeed.com/',
    image_url: 'https://www.bibleplanfeed.com/icon.png',
    managingEditor: 'github.com/tryonlinux - Not affiliated with Bible Gateway',
    webMaster: 'github.com/tryonlinux',
    copyright: 'github.com/tryonlinux  - Not affiliated with Bible Gateway',
    language: 'en',
    categories: ['NONE'],
    pubDate: new Date().toString(),
    ttl: 60,
  });
  BuildRSSFeedItems(plan, translation, startDate, chapters).map((item: RSSItem) => {
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
//Ensure the plan is valid, if not return full
const SanitizePlan = (plan: any): 'nt' | 'ot' | 'full' => {
  const validValues: Array<'nt' | 'ot' | 'full'> = ['nt', 'ot', 'full'];
  return validValues.includes(plan) ? plan : 'full';
};

//Ensure the date is valid, if not return today
const SanitizeDate = (dateString: string): Date => {
  if (dateString.length !== 8) {
    return new Date(); // Return today's date as default
  }
  try {
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1; // months are 0-indexed in JavaScript
    const day = parseInt(dateString.substring(6, 8));

    return new Date(year, month, day);
  } catch {
    return new Date();
  }
};

//Ensure the translation is valid, if not return ESV
const SanitizeTranslation = (translation: string): string => {
  return CheckTranslation(translation) ? translation : 'ESV';
};

//Ensure the Chapter is valid, if not return 1
const SanitizeChapters = (chapters: string): number => {
  if (chapters.length > 2) {
    return 1; // Return 1 if over 99 chapters
  }

  const result = parseInt(chapters, 10);
  if (isNaN(result)) {
    return 1;
  }
  return result;
};

function formatDateToyyyyMMdd(date: Date): string {
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${MM}${dd}`;
}

// Usage:
const now = new Date();
const formattedDate = formatDateToyyyyMMdd(now);
console.log(formattedDate);

// Build the RSS Feed Items
const BuildRSSFeedItems = (
  plan: string,
  translation: string,
  startDate: Date,
  numberOfChapters: number
): RSSItem[] => {
  let daysBetween = getDaysBetween(startDate);
  let chaptersToGet = daysBetween * numberOfChapters;
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
      (index + 1) / numberOfChapters
    )} of ${plan.toUpperCase()} plan in ${translation.toUpperCase()}`,
    url: BuildBibleGatewayURL(chapter.Book, chapter.Chapter, translation),
    author: 'Bible Gateway',
    date: new Date(
      new Date().setDate(
        new Date().getDate() - 1 - (daysBetween - Math.ceil((index + 1) / numberOfChapters))
      )
    ),
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

// Check translation since this is a user field we don't want to pass bad stuff to bible gateway.
const CheckTranslation = (translation: string): boolean =>
  translationsJSON.some((item) => item.Code === translation.toUpperCase());

// Build the bible gateway url
const BuildBibleGatewayURL = (book: string, chapter: number, translation: string): string =>
  `${bibleGatewaySlug + book.replace(' ', '%20')}%20${chapter}&version=${translation}`;

//Listen on port port
app.listen(port, () => console.log(`Express is listening at http://localhost:${port}`));
