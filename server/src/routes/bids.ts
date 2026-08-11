import { Router } from "express";
import { prisma } from "../db";
import { serializeOrder } from "../serialize";
import { requireUser } from "../middleware/currentUser";

export const bidsRouter = Router();

bidsRouter.get("/mine", requireUser, async (req, res) => {
  if (req.user!.role !== "CONTRACTOR") return res.status(403).json({ error: "forbidden" });
  const bids = await prisma.bid.findMany({
    where: { contractorId: req.user!.id },
    include: { order: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(bids.map((b) => ({ id: b.id, status: b.status, order: serializeOrder(b.order) })));
});
