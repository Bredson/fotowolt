import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Prisma 7 requires an explicit driver adapter — PrismaClient no longer reads
// the connection string from the schema's env("DATABASE_URL") at runtime.
// `dotenv/config` loads server/.env when DATABASE_URL isn't already set by the
// shell (e.g. the inline DATABASE_URL the `test` script passes takes priority).
const url = process.env.DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN;

// The adapter ships two builds. The default one pulls in `@libsql/client`,
// which depends on the native `libsql` binary — that binary does not survive
// bundling into a serverless function, and importing it crashes the whole
// function before any route runs. The `/web` build talks pure HTTP instead,
// which is all a remote Turso database needs. Local development and tests use
// a `file:` URL, which only the native build can open.
const isRemote = /^(libsql|https?):/i.test(url ?? "");
const { PrismaLibSql } = isRemote
  ? await import("@prisma/adapter-libsql/web")
  : await import("@prisma/adapter-libsql");

const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });

export const prisma = new PrismaClient({ adapter });
