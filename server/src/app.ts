import express from "express";
import cors from "cors";
import { currentUser } from "./middleware/currentUser";
import { authRouter } from "./routes/auth";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(currentUser);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/auth", authRouter);

  return app;
}
