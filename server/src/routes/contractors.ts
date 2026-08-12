import type { Response } from "express";
import { Router } from "express";
import { prisma } from "../db.js";
import { serializeUser } from "../serialize.js";
import { isValidVoivodeships } from "../voivodeships.js";
import { requireClient } from "../middleware/currentUser.js";

export const contractorsRouter = Router();

contractorsRouter.post("/register", async (req, res) => {
  const { email, companyName, contactName, phone, voivodeships } = req.body ?? {};
  for (const [name, value] of Object.entries({ email, companyName, contactName, phone })) {
    if (typeof value !== "string" || value.trim() === "") {
      return res.status(400).json({ error: `${name} is required` });
    }
  }
  if (!isValidVoivodeships(voivodeships)) {
    return res.status(400).json({ error: "voivodeships must be a non-empty list of valid names" });
  }
  const normalizedEmail = (email as string).trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: "email already registered" });

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      role: "CONTRACTOR",
      status: "PENDING",
      companyName: (companyName as string).trim(),
      contactName: (contactName as string).trim(),
      phone: (phone as string).trim(),
      voivodeships: JSON.stringify(voivodeships),
    },
  });
  res.status(201).json(serializeUser(user));
});

contractorsRouter.get("/", requireClient, async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const contractors = await prisma.user.findMany({
    where: { role: "CONTRACTOR", ...(status ? { status } : {}) },
    orderBy: { email: "asc" },
  });
  res.json(contractors.map(serializeUser));
});

async function setContractorStatus(id: string, status: string, res: Response) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "CONTRACTOR") {
    return res.status(404).json({ error: "contractor not found" });
  }
  const updated = await prisma.user.update({ where: { id }, data: { status } });
  res.json(serializeUser(updated));
}

contractorsRouter.post("/:id/approve", requireClient, (req, res) =>
  setContractorStatus(req.params.id as string, "APPROVED", res),
);

contractorsRouter.post("/:id/reject", requireClient, (req, res) =>
  setContractorStatus(req.params.id as string, "REJECTED", res),
);

contractorsRouter.patch("/:id/voivodeships", requireClient, async (req, res) => {
  const { voivodeships } = req.body ?? {};
  if (!isValidVoivodeships(voivodeships)) {
    return res.status(400).json({ error: "voivodeships must be a non-empty list of valid names" });
  }
  const user = await prisma.user.findUnique({ where: { id: req.params.id as string } });
  if (!user || user.role !== "CONTRACTOR") {
    return res.status(404).json({ error: "contractor not found" });
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { voivodeships: JSON.stringify(voivodeships) },
  });
  res.json(serializeUser(updated));
});
