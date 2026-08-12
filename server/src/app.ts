import express from "express";
import cors from "cors";
import { currentUser } from "./middleware/currentUser.js";
import { authRouter } from "./routes/auth.js";
import { contractorsRouter } from "./routes/contractors.js";
import { ordersRouter } from "./routes/orders.js";
import { bidsRouter } from "./routes/bids.js";
import { notificationsRouter } from "./routes/notifications.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(currentUser);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/auth", authRouter);
  app.use("/contractors", contractorsRouter);
  app.use("/orders", ordersRouter);
  app.use("/bids", bidsRouter);
  app.use("/notifications", notificationsRouter);

  return app;
}
