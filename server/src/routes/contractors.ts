import { Router } from "express";
import { prisma } from "../db";
import { serializeUser } from "../serialize";
import { isValidVoivodeships } from "../voivodeships";

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
