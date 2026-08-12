import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createClient, createContractor, createOrder, resetDb } from "./helpers.js";

const app = createApp();

beforeEach(resetDb);

describe("POST /orders/:id/bids", () => {
  it("creates a PENDING bid", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    const res = await request(app)
      .post(`/orders/${order.id}/bids`)
      .set("x-user-id", contractor.id);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "PENDING", orderId: order.id });
  });

  it("rejects a duplicate bid with 409", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    await request(app).post(`/orders/${order.id}/bids`).set("x-user-id", contractor.id);
    const res = await request(app)
      .post(`/orders/${order.id}/bids`)
      .set("x-user-id", contractor.id);
    expect(res.status).toBe(409);
  });

  it("rejects bidding on a non-open order with 409", async () => {
    const client = await createClient();
    const order = await createOrder(client.id, { status: "ASSIGNED" });
    const contractor = await createContractor();
    const res = await request(app)
      .post(`/orders/${order.id}/bids`)
      .set("x-user-id", contractor.id);
    expect(res.status).toBe(409);
  });

  it("forbids a PENDING contractor", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor("p@test.pl", { status: "PENDING" });
    const res = await request(app)
      .post(`/orders/${order.id}/bids`)
      .set("x-user-id", contractor.id);
    expect(res.status).toBe(403);
  });
});

describe("POST /orders/:id/decline", () => {
  it("hides the order from the contractor's list", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    const declineRes = await request(app)
      .post(`/orders/${order.id}/decline`)
      .set("x-user-id", contractor.id);
    expect(declineRes.status).toBe(200);

    const listRes = await request(app).get("/orders").set("x-user-id", contractor.id);
    expect(listRes.body).toHaveLength(0);
  });

  it("is idempotent", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    await request(app).post(`/orders/${order.id}/decline`).set("x-user-id", contractor.id);
    const res = await request(app)
      .post(`/orders/${order.id}/decline`)
      .set("x-user-id", contractor.id);
    expect(res.status).toBe(200);
  });
});

describe("GET /bids/mine", () => {
  it("lists the contractor's bids with orders", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    await request(app).post(`/orders/${order.id}/bids`).set("x-user-id", contractor.id);

    const res = await request(app).get("/bids/mine").set("x-user-id", contractor.id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].order.id).toBe(order.id);
  });

  it("forbids clients", async () => {
    const client = await createClient();
    const res = await request(app).get("/bids/mine").set("x-user-id", client.id);
    expect(res.status).toBe(403);
  });
});

describe("POST /bids/:id/accept", () => {
  it("accepts one bid, rejects the rest and assigns the order", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const c1 = await createContractor("c1@test.pl");
    const c2 = await createContractor("c2@test.pl");
    const bid1 = await prisma.bid.create({ data: { orderId: order.id, contractorId: c1.id } });
    const bid2 = await prisma.bid.create({ data: { orderId: order.id, contractorId: c2.id } });

    const res = await request(app).post(`/bids/${bid1.id}/accept`).set("x-user-id", client.id);
    expect(res.status).toBe(200);

    const updated1 = await prisma.bid.findUniqueOrThrow({ where: { id: bid1.id } });
    const updated2 = await prisma.bid.findUniqueOrThrow({ where: { id: bid2.id } });
    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated1.status).toBe("ACCEPTED");
    expect(updated2.status).toBe("REJECTED");
    expect(updatedOrder.status).toBe("ASSIGNED");
  });

  it("forbids a client who does not own the order", async () => {
    const owner = await createClient("owner@test.pl");
    const other = await createClient("other@test.pl");
    const order = await createOrder(owner.id);
    const c1 = await createContractor("c1@test.pl");
    const bid = await prisma.bid.create({ data: { orderId: order.id, contractorId: c1.id } });

    const res = await request(app).post(`/bids/${bid.id}/accept`).set("x-user-id", other.id);
    expect(res.status).toBe(403);
  });

  it("returns 409 when the order is already assigned", async () => {
    const client = await createClient();
    const order = await createOrder(client.id, { status: "ASSIGNED" });
    const c1 = await createContractor("c1@test.pl");
    const bid = await prisma.bid.create({ data: { orderId: order.id, contractorId: c1.id } });

    const res = await request(app).post(`/bids/${bid.id}/accept`).set("x-user-id", client.id);
    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown bid", async () => {
    const client = await createClient();
    const res = await request(app).post("/bids/nie-ma/accept").set("x-user-id", client.id);
    expect(res.status).toBe(404);
  });
});
