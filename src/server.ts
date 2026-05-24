import dotenv from "dotenv";
dotenv.config();
import app from "./app";
import { initDb } from "./config/database";

const PORT = process.env.PORT || 5000;
const Server = async () => {
  try {
    await initDb();
    console.log("DB connected");
  } catch (err) {
    console.error("DB init failed but server continues", err);
  }

  app.listen(PORT, () => {
    console.log(`DevPulse server run port: ${PORT}`);
  });
};

Server();