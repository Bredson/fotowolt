import { prisma } from "../src/db.js";

async function main() {
  await prisma.user.upsert({
    where: { email: "biuro@fotowolt.pl" },
    update: {},
    create: {
      email: "biuro@fotowolt.pl",
      role: "CLIENT",
      status: "APPROVED",
      companyName: "Fotowolt",
      contactName: "Biuro Fotowolt",
    },
  });
  console.log("Seeded client account biuro@fotowolt.pl");
}

main().finally(() => prisma.$disconnect());
