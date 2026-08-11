import { prisma } from "./db";
import { notify } from "./notifications";

export const AUTO_DECLINE_DAYS = 3;

export async function autoDeclineStaleOrders() {
  const cutoff = new Date(Date.now() - AUTO_DECLINE_DAYS * 24 * 60 * 60 * 1000);
  const staleOrders = await prisma.order.findMany({
    where: { status: "OPEN", createdAt: { lt: cutoff } },
    include: { bids: true, declines: true },
  });
  for (const order of staleOrders) {
    const matchingContractors = await prisma.user.findMany({
      where: {
        role: "CONTRACTOR",
        status: "APPROVED",
        voivodeships: { contains: `"${order.voivodeship}"` },
      },
    });
    for (const contractor of matchingContractors) {
      const acted =
        order.bids.some((b) => b.contractorId === contractor.id) ||
        order.declines.some((d) => d.contractorId === contractor.id);
      if (acted) continue;
      await prisma.orderDecline.create({
        data: { orderId: order.id, contractorId: contractor.id },
      });
      await notify(
        order.ownerId,
        "ORDER_DECLINED",
        `${contractor.companyName} nie podjął zlecenia ${order.kw} kW (${order.voivodeship}) w ciągu ${AUTO_DECLINE_DAYS} dni — odrzucono automatycznie.`,
        order.id,
      );
    }
  }
}
