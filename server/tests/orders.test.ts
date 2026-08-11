import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createClient, createContractor, createOrder, resetDb } from "./helpers";

const app = createApp();

beforeEach(resetDb);

describe("POST /orders", () => {
  it("creates an order as client", async () => {
    const client = await createClient();
    const res = await request(app)
      .post("/orders")
      .set("x-user-id", client.id)
      .send({
        kw: 12.5,
        description: "Instalacja PV 12,5 kW",
        address: "ul. Polna 5, Płock",
        voivodeship: "mazowieckie",
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ kw: 12.5, status: "OPEN", voivodeship: "mazowieckie" });
  });

  it("rejects invalid payloads", async () => {
    const client = await createClient();
    const base = { kw: 10, description: "x", address: "y", voivodeship: "mazowieckie" };
    for (const bad of [
      { ...base, kw: 0 },
      { ...base, kw: "dziesięć" },
      { ...base, description: "" },
      { ...base, address: "" },
      { ...base, voivodeship: "narnia" },
    ]) {
      const res = await request(app).post("/orders").set("x-user-id", client.id).send(bad);
      expect(res.status).toBe(400);
    }
  });

  it("forbids contractors from creating orders", async () => {
    const contractor = await createContractor();
    const res = await request(app)
      .post("/orders")
      .set("x-user-id", contractor.id)
      .send({ kw: 10, description: "x", address: "y", voivodeship: "mazowieckie" });
    expect(res.status).toBe(403);
  });
});

describe("GET /orders", () => {
  it("client sees own orders with pending bid count", async () => {
    const client = await createClient();
    await createOrder(client.id);
    const res = await request(app).get("/orders").set("x-user-id", client.id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].pendingBidCount).toBe(0);
  });

  it("approved contractor sees only OPEN orders in own voivodeships", async () => {
    const client = await createClient();
    await createOrder(client.id, { voivodeship: "mazowieckie" });
    await createOrder(client.id, { voivodeship: "śląskie" });
    await createOrder(client.id, { voivodeship: "mazowieckie", status: "ASSIGNED" });
    const contractor = await createContractor("f@test.pl", { voivodeships: ["mazowieckie"] });

    const res = await request(app).get("/orders").set("x-user-id", contractor.id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].voivodeship).toBe("mazowieckie");
    expect(res.body[0].status).toBe("OPEN");
  });

  it("forbids a PENDING contractor", async () => {
    const contractor = await createContractor("f@test.pl", { status: "PENDING" });
    const res = await request(app).get("/orders").set("x-user-id", contractor.id);
    expect(res.status).toBe(403);
  });
});

describe("GET /orders/:id", () => {
  it("owner gets order with bids and declines arrays", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const res = await request(app).get(`/orders/${order.id}`).set("x-user-id", client.id);
    expect(res.status).toBe(200);
    expect(res.body.bids).toEqual([]);
    expect(res.body.declines).toEqual([]);
  });

  it("contractor gets order with myBid: null", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    const res = await request(app).get(`/orders/${order.id}`).set("x-user-id", contractor.id);
    expect(res.status).toBe(200);
    expect(res.body.myBid).toBeNull();
  });

  it("returns 404 for unknown order", async () => {
    const client = await createClient();
    const res = await request(app).get("/orders/nie-ma").set("x-user-id", client.id);
    expect(res.status).toBe(404);
  });

  it("forbids a PENDING contractor from viewing an order", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor("p@test.pl", { status: "PENDING" });
    const res = await request(app).get(`/orders/${order.id}`).set("x-user-id", contractor.id);
    expect(res.status).toBe(403);
  });

  it("forbids a non-owning client from viewing another client's order", async () => {
    const owner = await createClient("owner@test.pl");
    const other = await createClient("other@test.pl");
    const order = await createOrder(owner.id);
    const res = await request(app).get(`/orders/${order.id}`).set("x-user-id", other.id);
    expect(res.status).toBe(403);
  });
});
