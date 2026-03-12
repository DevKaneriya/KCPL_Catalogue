import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import { seedAdminUser } from "./lib/seed";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

seedAdminUser();

export default app;
