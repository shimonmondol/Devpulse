import app from './app';
import { initDb } from './config/database';

const PORT = process.env.PORT || 5000;

const Server = async () => {
  // Ensure table components are built securely prior to runtime connection bindings
  await initDb();

  app.listen(PORT, () => {
    console.log(`DevPulse server run port: ${PORT}`);
  });
};

Server();