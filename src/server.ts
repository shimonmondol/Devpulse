import app from './app';
import { initDb } from './config/database';

const PORT = process.env.PORT || 5000;

const Server = async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`DevPulse server run port: ${PORT}`);
  });
};

Server();