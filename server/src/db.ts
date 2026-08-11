import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prisma 7 requires an explicit driver adapter — PrismaClient no longer reads
// the connection string from the schema's env("DATABASE_URL") at runtime.
// `dotenv/config` loads server/.env when DATABASE_URL isn't already set by the
// shell (e.g. the inline DATABASE_URL the `test` script passes takes priority).
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });

export const prisma = new PrismaClient({ adapter });
