import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createContractor, resetDb } from "./helpers";

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
