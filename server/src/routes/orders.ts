import { Router } from "express";
import { prisma } from "../db";
import { serializeOrder, serializeUser } from "../serialize";
import { isValidVoivodeship } from "../voivodeships";
import { requireClient, requireUser } from "../middleware/currentUser";

export const ordersRouter = Router();

ordersRouter.post("/", requireClient, async (req, res) => {
  const { kw, description, address, voivodeship } = req.body ?? {};
  if (typeof kw !== "number" || !Number.isFinite(kw) || kw <= 0) {
    return res.status(400).json({ error: "kw must be a positive number" });
  }
  for (const [name, value] of Object.entries({ description, address })) {
    if (typeof value !== "string" || value.trim() === "") {
      return res.status(400).json({ error: `${name} is required` });
    }
  }
  if (!isValidVoivodeship(voivodeship)) {
    return res.status(400).json({ error: "voivodeship must be a valid voivodeship name" });
  }
  const order = await prisma.order.create({
    data: {
      ownerId: req.user!.id,
      kw,
      description: (description as string).trim(),
      address: (address as string).trim(),
      voivodeship,
    },
  });
  res.status(201).json(serializeOrder(order));
});

ordersRouter.get("/", requireUser, async (req, res) => {
  const user = req.user!;
  if (user.role === "CLIENT") {
    const orders = await prisma.order.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bids: { where: { status: "PENDING" } } } } },
    });
    return res.json(
      orders.map((o) => ({ ...serializeOrder(o), pendingBidCount: o._count.bids })),
    );
  }
  if (user.status !== "APPROVED") return res.status(403).json({ error: "forbidden" });
  const voivodeships = JSON.parse(user.voivodeships) as string[];
  const orders = await prisma.order.findMany({
    where: {
      status: "OPEN",
      voivodeship: { in: voivodeships },
      declines: { none: { contractorId: user.id } },
      bids: { none: { contractorId: user.id } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders.map(serializeOrder));
});

ordersRouter.get("/:id", requireUser, async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id as string } });
  if (!order) return res.status(404).json({ error: "order not found" });
  const user = req.user!;
  if (user.role === "CLIENT") {
    if (order.ownerId !== user.id) return res.status(403).json({ error: "forbidden" });
    const bids = await prisma.bid.findMany({
      where: { orderId: order.id },
      include: { contractor: true },
      orderBy: { createdAt: "asc" },
    });
    const declines = await prisma.orderDecline.findMany({
      where: { orderId: order.id },
      include: { contractor: true },
    });
    return res.json({
      ...serializeOrder(order),
      bids: bids.map((b) => ({ id: b.id, status: b.status, contractor: serializeUser(b.contractor) })),
      declines: declines.map((d) => ({ id: d.id, contractor: serializeUser(d.contractor) })),
    });
  }
  if (user.status !== "APPROVED") return res.status(403).json({ error: "forbidden" });
  const myBid = await prisma.bid.findUnique({
    where: { orderId_contractorId: { orderId: order.id, contractorId: user.id } },
  });
  res.json({
    ...serializeOrder(order),
    myBid: myBid ? { id: myBid.id, status: myBid.status } : null,
  });
});
