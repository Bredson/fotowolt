import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createClient, createContractor, createOrder, resetDb } from "./helpers";

const app = createApp();

beforeEach(resetDb);

function backdateOrder(orderId: string, days: number) {
  return prisma.order.update({
    where: { id: orderId },
    data: { createdAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
  });
}

describe("auto-decline after 3 days", () => {
  it("auto-declines a stale order for an inactive contractor and notifies the client", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    const order = await createOrder(client.id);
    await backdateOrder(order.id, 4);

    const res = await request(app).get("/orders").set("x-user-id", contractor.id);
    expect(res.body).toHaveLength(0);

    const decline = await prisma.orderDecline.findUnique({
      where: { orderId_contractorId: { orderId: order.id, contractorId: contractor.id } },
    });
    expect(decline).not.toBeNull();

    const clientNotifications = await prisma.notification.findMany({
      where: { userId: client.id, type: "ORDER_DECLINED" },
    });
    expect(clientNotifications).toHaveLength(1);
  });

  it("does not touch contractors who already submitted a bid", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    const order = await createOrder(client.id);
    await request(app).post(`/orders/${order.id}/bids`).set("x-user-id", contractor.id);
    await backdateOrder(order.id, 4);

    await request(app).get("/orders").set("x-user-id", contractor.id);

    const decline = await prisma.orderDecline.findUnique({
      where: { orderId_contractorId: { orderId: order.id, contractorId: contractor.id } },
    });
    expect(decline).toBeNull();
  });

  it("does not create a second decline for an explicitly declined order", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    const order = await createOrder(client.id);
    await request(app).post(`/orders/${order.id}/decline`).set("x-user-id", contractor.id);
    await backdateOrder(order.id, 4);

    await request(app).get("/orders").set("x-user-id", contractor.id);

    const declines = await prisma.orderDecline.findMany({ where: { orderId: order.id } });
    expect(declines).toHaveLength(1);
  });

  it("leaves fresh orders untouched", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    await createOrder(client.id);

    const res = await request(app).get("/orders").set("x-user-id", contractor.id);
    expect(res.body).toHaveLength(1);
  });
});
