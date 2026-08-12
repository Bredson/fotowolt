import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createClient } from "@libsql/client";

// Prisma's CLI cannot talk to libsql:// URLs (P1013 — unrecognized scheme), so
// `prisma db push` is not an option against Turso. Instead we generate the DDL
// from the very same schema file and apply it with the libSQL client directly.
// Seeding afterwards goes through Prisma normally (`npm run db:seed`), because
// the runtime client already speaks libSQL.

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("DATABASE_URL is not set (expected a libsql:// or file: URL).");
  process.exit(1);
}
if (url.startsWith("libsql://") && !authToken) {
  console.error("TURSO_AUTH_TOKEN is required for a libsql:// database.");
  process.exit(1);
}

function generateDdl(): string[] {
  const raw = execFileSync(
    "npx",
    ["prisma", "migrate", "diff", "--from-empty", "--to-schema", "prisma/schema.prisma", "--script"],
    { encoding: "utf8" },
  );
  return raw
    .split(";")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--") && !line.startsWith("Loaded Prisma config"))
        .join("\n")
        .trim(),
    )
    .filter((statement) => statement.length > 0);
}

async function main() {
  const client = createClient({ url: url!, ...(authToken ? { authToken } : {}) });
  const statements = generateDdl();
  console.log(`Applying ${statements.length} statements to ${url!.split("?")[0]}`);

  let created = 0;
  let skipped = 0;
  for (const statement of statements) {
    try {
      await client.execute(statement);
      created += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists/i.test(message)) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  console.log(`Done — ${created} created, ${skipped} already existed.`);
  console.log("Next: run `npm run db:seed` with the same DATABASE_URL/TURSO_AUTH_TOKEN.");
}

main().catch((error) => {
  const status = (error as { cause?: { status?: number } })?.cause?.status;
  if (status === 401 || status === 400) {
    console.error(
      [
        "",
        status === 401
          ? "Turso odrzucił token (HTTP 401) — token ma poprawny format, ale nie daje dostępu do tej bazy."
          : "Turso odrzucił token (HTTP 400) — token jest zniekształcony (np. ucięty przy kopiowaniu).",
        "",
        "Najczęstsza przyczyna: użyty został token konta (API / platform token)",
        "zamiast tokenu bazy danych. To dwie różne rzeczy — do połączenia z bazą",
        "potrzebny jest token bazy, wygenerowany poleceniem:",
        "",
        "    turso db tokens create <nazwa-bazy>",
        "",
        "Nazwę bazy sprawdzisz przez `turso db list`. Upewnij się też, że token",
        "nie wygasł i że nie skopiował się razem ze spacją lub znakiem nowej linii.",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
