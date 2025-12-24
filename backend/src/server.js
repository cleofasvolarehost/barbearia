const app = require('./app');
const { PORT } = require('./config/env');
const { startDunningWorker } = require('./workers/dunningWorker');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startDunningWorker();
});
