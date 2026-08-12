import { Router } from "express";
import { prisma } from "../db.js";
import { requireUser } from "../middleware/currentUser.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireUser, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      orderId: n.orderId,
      createdAt: n.createdAt.toISOString(),
    })),
  );
});
