import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createContractor, resetDb, createClient } from "./helpers";

const app = createApp();

beforeEach(resetDb);

const validBody = {
  email: "nowa@firma.pl",
  companyName: "Nowa Energia sp. z o.o.",
  contactName: "Anna Nowak",
  phone: "500600700",
  voivodeships: ["mazowieckie", "łódzkie"],
};

describe("POST /contractors/register", () => {
  it("creates a PENDING contractor", async () => {
    const res = await request(app).post("/contractors/register").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      role: "CONTRACTOR",
      status: "PENDING",
      companyName: validBody.companyName,
      voivodeships: ["mazowieckie", "łódzkie"],
    });
  });

  it("rejects missing fields", async () => {
    const res = await request(app)
      .post("/contractors/register")
      .send({ ...validBody, companyName: "" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid voivodeships", async () => {
    const res = await request(app)
      .post("/contractors/register")
      .send({ ...validBody, voivodeships: ["narnia"] });
    expect(res.status).toBe(400);
  });

  it("rejects an empty voivodeship list (obszar działania is mandatory)", async () => {
    const res = await request(app)
      .post("/contractors/register")
      .send({ ...validBody, voivodeships: [] });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email with 409", async () => {
    await createContractor("nowa@firma.pl");
    const res = await request(app).post("/contractors/register").send(validBody);
    expect(res.status).toBe(409);
  });
});

describe("contractor management (client only)", () => {
  it("lists contractors filtered by status", async () => {
    const client = await createClient();
    await createContractor("a@firma.pl", { status: "PENDING" });
    await createContractor("b@firma.pl", { status: "APPROVED" });

    const res = await request(app)
      .get("/contractors?status=PENDING")
      .set("x-user-id", client.id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBe("a@firma.pl");
  });

  it("forbids contractors from listing", async () => {
    const contractor = await createContractor();
    const res = await request(app).get("/contractors").set("x-user-id", contractor.id);
    expect(res.status).toBe(403);
  });

  it("approves a pending contractor", async () => {
    const client = await createClient();
    const pending = await createContractor("a@firma.pl", { status: "PENDING" });
    const res = await request(app)
      .post(`/contractors/${pending.id}/approve`)
      .set("x-user-id", client.id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");
  });

  it("rejects a pending contractor", async () => {
    const client = await createClient();
    const pending = await createContractor("a@firma.pl", { status: "PENDING" });
    const res = await request(app)
      .post(`/contractors/${pending.id}/reject`)
      .set("x-user-id", client.id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REJECTED");
  });

  it("updates a contractor's voivodeships", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    const res = await request(app)
      .patch(`/contractors/${contractor.id}/voivodeships`)
      .set("x-user-id", client.id)
      .send({ voivodeships: ["śląskie", "opolskie"] });
    expect(res.status).toBe(200);
    expect(res.body.voivodeships).toEqual(["śląskie", "opolskie"]);
  });

  it("rejects invalid voivodeship update", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    const res = await request(app)
      .patch(`/contractors/${contractor.id}/voivodeships`)
      .set("x-user-id", client.id)
      .send({ voivodeships: [] });
    expect(res.status).toBe(400);
  });

  it("returns 404 when approving a non-contractor id", async () => {
    const client = await createClient();
    const res = await request(app)
      .post(`/contractors/${client.id}/approve`)
      .set("x-user-id", client.id);
    expect(res.status).toBe(404);
  });
});
