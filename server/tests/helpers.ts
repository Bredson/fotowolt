import { prisma } from "../src/db";

export async function resetDb() {
  await prisma.notification.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.orderDecline.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
}

export async function createClient(email = "client@test.pl") {
  return prisma.user.create({
    data: { email, role: "CLIENT", status: "APPROVED" },
  });
}

export async function createContractor(
  email = "contractor@test.pl",
  opts: { status?: string; voivodeships?: string[] } = {},
) {
  return prisma.user.create({
    data: {
      email,
      role: "CONTRACTOR",
      status: opts.status ?? "APPROVED",
      companyName: "Solar Instal sp. z o.o.",
      contactName: "Jan Kowalski",
      phone: "600100200",
      voivodeships: JSON.stringify(opts.voivodeships ?? ["mazowieckie"]),
    },
  });
}

export async function createOrder(
  ownerId: string,
  opts: { voivodeship?: string; status?: string } = {},
) {
  return prisma.order.create({
    data: {
      ownerId,
      kw: 9.9,
      description: "Instalacja PV na dachu skośnym",
      address: "ul. Słoneczna 1, 00-001 Warszawa",
      voivodeship: opts.voivodeship ?? "mazowieckie",
      status: opts.status ?? "OPEN",
    },
  });
}
