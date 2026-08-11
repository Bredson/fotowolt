import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createClient, createContractor, resetDb } from "./helpers";

const app = createApp();

beforeEach(resetDb);

describe("POST /auth/login", () => {
  it("logs in an existing user by email", async () => {
    const user = await createClient("biuro@fotowolt.pl");
    const res = await request(app).post("/auth/login").send({ email: "biuro@fotowolt.pl" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, role: "CLIENT", voivodeships: [] });
  });

  it("returns 404 for unknown email", async () => {
    const res = await request(app).post("/auth/login").send({ email: "nikt@nigdzie.pl" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /auth/me", () => {
  it("returns the current user from x-user-id header", async () => {
    const user = await createContractor("firma@test.pl", { voivodeships: ["łódzkie"] });
    const res = await request(app).get("/auth/me").set("x-user-id", user.id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, role: "CONTRACTOR", voivodeships: ["łódzkie"] });
  });

  it("returns 401 without a valid x-user-id", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });
});
