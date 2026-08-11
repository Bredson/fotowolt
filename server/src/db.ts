import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Prisma 7 requires an explicit driver adapter — PrismaClient no longer reads
// the connection string from the schema's env("DATABASE_URL") at runtime.
// `dotenv/config` loads server/.env when DATABASE_URL isn't already set by the
// shell (e.g. the inline DATABASE_URL the `test` script passes takes priority).
//
// The libSQL adapter serves both environments from one code path: a local
// `file:` URL during development and tests, and a remote `libsql://` URL
// (Turso) in production, where TURSO_AUTH_TOKEN must also be set.
const url = process.env.DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN;

const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });

export const prisma = new PrismaClient({ adapter });
