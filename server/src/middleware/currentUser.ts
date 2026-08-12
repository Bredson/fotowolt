import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import { prisma } from "../db.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export async function currentUser(req: Request, _res: Response, next: NextFunction) {
  const id = req.header("x-user-id");
  if (id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) req.user = user;
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  next();
}

export function requireClient(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  if (req.user.role !== "CLIENT") return res.status(403).json({ error: "forbidden" });
  next();
}

export function requireApprovedContractor(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  if (req.user.role !== "CONTRACTOR" || req.user.status !== "APPROVED") {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}
