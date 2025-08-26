import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import widgetsRouter from "./routes/widgets.js";

dotenv.config();

const app = express();
app.use(cors({ origin: ["http://localhost:3000"] }));
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "WeatherApp backend" }),
);

app.use("/widgets", widgetsRouter);

const { PORT = 5000, MONGODB_URI } = process.env;

async function main() {
  await connectDB(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`WeatherApp Backend läuft auf http://localhost:${PORT}`);
  });
}
main().catch((err) => {
  console.error("Startup-Fehler:", err);
  process.exit(1);
});
