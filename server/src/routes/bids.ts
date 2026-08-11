import { Router } from "express";
import { prisma } from "../db";
import { serializeOrder } from "../serialize";
import { requireUser, requireClient } from "../middleware/currentUser";
import { notify } from "../notifications";

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

bidsRouter.post("/:id/accept", requireClient, async (req, res) => {
  const bidId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: { order: true },
  });
  if (!bid) return res.status(404).json({ error: "bid not found" });
  if (bid.order.ownerId !== req.user!.id) return res.status(403).json({ error: "forbidden" });
  if (bid.order.status !== "OPEN") return res.status(409).json({ error: "order is not open" });

  await prisma.$transaction([
    prisma.bid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } }),
    prisma.bid.updateMany({
      where: { orderId: bid.orderId, id: { not: bid.id } },
      data: { status: "REJECTED" },
    }),
    prisma.order.update({ where: { id: bid.orderId }, data: { status: "ASSIGNED" } }),
  ]);
  await notify(
    bid.contractorId,
    "ORDER_ASSIGNED",
    `Przydzielono Ci zlecenie ${bid.order.kw} kW (${bid.order.voivodeship}).`,
    bid.orderId,
  );
  res.json({ ok: true });
});
