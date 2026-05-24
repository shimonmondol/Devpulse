import app from './app.js';
import { initDb } from './config/db.js';

const PORT = process.env.PORT || 5000;

const Server = async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`DevPulse server run on port: ${PORT}`);
  });
};

Server();