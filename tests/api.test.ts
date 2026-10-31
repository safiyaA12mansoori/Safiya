import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import { windowA, windowOverlap } from "./helpers.js";

describe("REST API", () => {
  it("supports patient/dentist/treatment CRUD and appointment conflict responses", async () => {
    const ctx = createAppContext();
    const app = createApp(ctx);

    const patientRes = await request(app)
      .post("/api/patients")
      .send({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "555-1",
        dateOfBirth: "1815-12-10",
      })
      .expect(201);

    const dentistRes = await request(app)
      .post("/api/dentists")
      .send({
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace@clinic.example",
        phone: "555-2",
        specialty: "General",
      })
      .expect(201);

    await request(app)
      .post("/api/treatments")
      .send({
        name: "Exam",
        description: "New patient exam",
        category: "preventive",
        durationMinutes: 30,
        basePriceCents: 9000,
      })
      .expect(201);

    await request(app)
      .post("/api/appointments")
      .send({
        patientId: patientRes.body.id,
        dentistId: dentistRes.body.id,
        ...windowA,
      })
      .expect(201);

    const conflict = await request(app)
      .post("/api/appointments")
      .send({
        patientId: patientRes.body.id,
        dentistId: dentistRes.body.id,
        ...windowOverlap,
      })
      .expect(409);

    expect(conflict.body.error.code).toBe("CONFLICT");

    const check = await request(app)
      .post("/api/appointments/check-conflict")
      .send({
        dentistId: dentistRes.body.id,
        ...windowOverlap,
      })
      .expect(200);

    expect(check.body.hasConflict).toBe(true);
  });

  it("creates and pays bills via API", async () => {
    const ctx = createAppContext();
    const app = createApp(ctx);

    const patient = await request(app)
      .post("/api/patients")
      .send({
        firstName: "Bill",
        lastName: "Payor",
        email: "bill@example.com",
        phone: "555-3",
        dateOfBirth: "1990-01-01",
      })
      .expect(201);

    const created = await request(app)
      .post("/api/bills")
      .send({
        patientId: patient.body.id,
        lineItems: [
          { description: "Whitening", quantity: 1, unitPriceCents: 25000 },
        ],
      })
      .expect(201);

    expect(created.body.totals.subtotalCents).toBe(25000);

    await request(app).post(`/api/bills/${created.body.id}/issue`).expect(200);

    const paid = await request(app)
      .post(`/api/bills/${created.body.id}/payments`)
      .send({ amountCents: 25000 })
      .expect(200);

    expect(paid.body.status).toBe("paid");
  });
});
