import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// eslint-disable-next-line no-console
app.listen(port, () => console.log(`Express is listening at http://localhost:${port}`));
