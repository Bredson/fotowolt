import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createClient, createContractor, createOrder, resetDb } from "./helpers";

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
