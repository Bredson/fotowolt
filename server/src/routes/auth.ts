import { Router } from "express";
import { prisma } from "../db.js";
import { serializeUser } from "../serialize.js";
import { requireUser } from "../middleware/currentUser.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== "string" || email.trim() === "") {
    return res.status(400).json({ error: "email is required" });
  }
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json(serializeUser(user));
});

authRouter.get("/me", requireUser, (req, res) => {
  res.json(serializeUser(req.user!));
});
