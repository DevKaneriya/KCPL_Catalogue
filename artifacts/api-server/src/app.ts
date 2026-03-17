import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";
import { seedAdminUser } from "./lib/seed";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API server is running. Use /api/healthz or /api/products.",
  });
});

app.use("/api", router);

seedAdminUser();

export default app;
