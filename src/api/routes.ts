import { Router } from "express";
import type { AppContext } from "../app-context.js";

export function createApiRouter(ctx: AppContext): Router {
  const router = Router();

  // —— Patients ——
  router.get("/patients", (_req, res) => {
    res.json(ctx.patients.list());
  });

  router.get("/patients/:id", (req, res) => {
    res.json(ctx.patients.get(req.params.id));
  });

  router.post("/patients", (req, res) => {
    const patient = ctx.patients.create(req.body);
    res.status(201).json(patient);
  });

  router.put("/patients/:id", (req, res) => {
    res.json(ctx.patients.update(req.params.id, req.body));
  });

  router.delete("/patients/:id", (req, res) => {
    ctx.patients.delete(req.params.id);
    res.status(204).send();
  });

  // —— Dentists ——
  router.get("/dentists", (_req, res) => {
    res.json(ctx.dentists.list());
  });

  router.get("/dentists/:id", (req, res) => {
    res.json(ctx.dentists.get(req.params.id));
  });

  router.post("/dentists", (req, res) => {
    const dentist = ctx.dentists.create(req.body);
    res.status(201).json(dentist);
  });

  router.put("/dentists/:id", (req, res) => {
    res.json(ctx.dentists.update(req.params.id, req.body));
  });

  router.delete("/dentists/:id", (req, res) => {
    ctx.dentists.delete(req.params.id);
    res.status(204).send();
  });

  // —— Treatments ——
  router.get("/treatments", (_req, res) => {
    res.json(ctx.treatments.list());
  });

  router.get("/treatments/:id", (req, res) => {
    res.json(ctx.treatments.get(req.params.id));
  });

  router.post("/treatments", (req, res) => {
    const treatment = ctx.treatments.create(req.body);
    res.status(201).json(treatment);
  });

  router.put("/treatments/:id", (req, res) => {
    res.json(ctx.treatments.update(req.params.id, req.body));
  });

  router.delete("/treatments/:id", (req, res) => {
    ctx.treatments.delete(req.params.id);
    res.status(204).send();
  });

  // —— Appointments ——
  router.get("/appointments", (_req, res) => {
    res.json(ctx.appointments.list());
  });

  router.get("/appointments/:id", (req, res) => {
    res.json(ctx.appointments.get(req.params.id));
  });

  router.get("/dentists/:id/appointments", (req, res) => {
    res.json(ctx.appointments.listForDentist(req.params.id));
  });

  router.post("/appointments/check-conflict", (req, res) => {
    const { dentistId, startTime, endTime, excludeAppointmentId } = req.body;
    const conflicts = ctx.appointments.findConflicts(
      dentistId,
      startTime,
      endTime,
      excludeAppointmentId,
    );
    res.json({
      hasConflict: conflicts.length > 0,
      conflicts,
    });
  });

  router.post("/appointments", (req, res) => {
    const appointment = ctx.appointments.create(req.body);
    res.status(201).json(appointment);
  });

  router.put("/appointments/:id", (req, res) => {
    res.json(ctx.appointments.update(req.params.id, req.body));
  });

  router.post("/appointments/:id/cancel", (req, res) => {
    res.json(ctx.appointments.cancel(req.params.id));
  });

  router.delete("/appointments/:id", (req, res) => {
    ctx.appointments.delete(req.params.id);
    res.status(204).send();
  });

  // —— Billing ——
  router.get("/bills", (_req, res) => {
    res.json(
      ctx.billing.list().map((bill) => ctx.billing.get(bill.id)),
    );
  });

  router.get("/bills/:id", (req, res) => {
    res.json(ctx.billing.get(req.params.id));
  });

  router.get("/patients/:id/bills", (req, res) => {
    res.json(
      ctx.billing
        .listForPatient(req.params.id)
        .map((bill) => ctx.billing.get(bill.id)),
    );
  });

  router.post("/bills", (req, res) => {
    const bill = ctx.billing.create(req.body);
    res.status(201).json(bill);
  });

  router.put("/bills/:id", (req, res) => {
    res.json(ctx.billing.update(req.params.id, req.body));
  });

  router.post("/bills/:id/issue", (req, res) => {
    res.json(ctx.billing.issue(req.params.id));
  });

  router.post("/bills/:id/payments", (req, res) => {
    const amount = Number(req.body.amountCents);
    res.json(ctx.billing.recordPayment(req.params.id, amount));
  });

  router.post("/bills/:id/void", (req, res) => {
    res.json(ctx.billing.void(req.params.id));
  });

  router.delete("/bills/:id", (req, res) => {
    ctx.billing.delete(req.params.id);
    res.status(204).send();
  });

  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return router;
}
