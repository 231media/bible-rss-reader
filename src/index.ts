import express from 'express';
import path from 'path';

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

app.get('/:startDate/:plan/:translation/:chapters/feed.rss', (req, res) => {
  res.send(`${req.params.plan} ${req.params.startDate} ${req.params.chapters}`);
});
// eslint-disable-next-line no-console
app.listen(port, () => console.log(`Express is listening at http://localhost:${port}`));

const BuildRSSFeed = (
  plan: string,
  translation: string,
  startDate: Date,
  numberOfChapters: number
): void => {};

// Check translation since this is a user field we don't want to pass bad stuff to bible gateway.
const CheckTranslation = (translation: string): boolean => {};
const BuildBibleGatewayURL = (book: string, chapter: number, translation: string): string => {
  return `https://www.biblegateway.com/passage/?search=${book.replace(
    ' ',
    '%20'
  )}%20${chapter}&version=${translation}`;
};
