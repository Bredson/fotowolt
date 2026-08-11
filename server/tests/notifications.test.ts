import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createClient, createContractor, createOrder, resetDb } from "./helpers";

const app = createApp();

beforeEach(resetDb);

function notificationsFor(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

const orderBody = {
  kw: 10,
  description: "Instalacja PV",
  address: "Warszawa",
  voivodeship: "mazowieckie",
};

describe("system notifications", () => {
  it("notifies matching APPROVED contractors about a new order", async () => {
    const client = await createClient();
    const matching = await createContractor("a@x.pl", { voivodeships: ["mazowieckie"] });
    const otherArea = await createContractor("b@x.pl", { voivodeships: ["śląskie"] });
    const pending = await createContractor("c@x.pl", {
      status: "PENDING",
      voivodeships: ["mazowieckie"],
    });

    await request(app).post("/orders").set("x-user-id", client.id).send(orderBody);

    const forMatching = await notificationsFor(matching.id);
    expect(forMatching).toHaveLength(1);
    expect(forMatching[0].type).toBe("NEW_ORDER");
    expect(await notificationsFor(otherArea.id)).toHaveLength(0);
    expect(await notificationsFor(pending.id)).toHaveLength(0);
  });

  it("does not match partial voivodeship names (pomorskie vs kujawsko-pomorskie)", async () => {
    const client = await createClient();
    const kp = await createContractor("kp@x.pl", { voivodeships: ["kujawsko-pomorskie"] });
    await request(app)
      .post("/orders")
      .set("x-user-id", client.id)
      .send({ ...orderBody, voivodeship: "pomorskie" });
    expect(await notificationsFor(kp.id)).toHaveLength(0);
  });

  it("notifies the client when a contractor submits readiness", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    await request(app).post(`/orders/${order.id}/bids`).set("x-user-id", contractor.id);

    const forClient = await notificationsFor(client.id);
    expect(forClient).toHaveLength(1);
    expect(forClient[0].type).toBe("BID_SUBMITTED");
    expect(forClient[0].orderId).toBe(order.id);
  });

  it("notifies the client exactly once when a contractor declines", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    await request(app).post(`/orders/${order.id}/decline`).set("x-user-id", contractor.id);
    await request(app).post(`/orders/${order.id}/decline`).set("x-user-id", contractor.id);

    const forClient = await notificationsFor(client.id);
    expect(forClient).toHaveLength(1);
    expect(forClient[0].type).toBe("ORDER_DECLINED");
  });

  it("notifies the contractor when their bid is accepted", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    const bid = await prisma.bid.create({
      data: { orderId: order.id, contractorId: contractor.id },
    });
    await request(app).post(`/bids/${bid.id}/accept`).set("x-user-id", client.id);

    const forContractor = await notificationsFor(contractor.id);
    expect(forContractor).toHaveLength(1);
    expect(forContractor[0].type).toBe("ORDER_ASSIGNED");
  });
});

describe("GET /notifications", () => {
  it("returns only own notifications", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    await prisma.notification.create({
      data: { userId: client.id, type: "BID_SUBMITTED", message: "dla klienta" },
    });
    await prisma.notification.create({
      data: { userId: contractor.id, type: "NEW_ORDER", message: "dla wykonawcy" },
    });

    const res = await request(app).get("/notifications").set("x-user-id", contractor.id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].message).toBe("dla wykonawcy");
  });

  it("requires auth", async () => {
    const res = await request(app).get("/notifications");
    expect(res.status).toBe(401);
  });
});
