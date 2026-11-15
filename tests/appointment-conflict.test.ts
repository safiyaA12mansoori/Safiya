import { describe, expect, it } from "vitest";
import { ConflictError, DomainError } from "../src/domain/types.js";
import { intervalsOverlap } from "../src/domain/time.js";
import {
  freshContext,
  seedBasics,
  windowA,
  windowAdjacent,
  windowBefore,
  windowOverlap,
} from "./helpers.js";

describe("intervalsOverlap", () => {
  it("detects partial overlap", () => {
    expect(
      intervalsOverlap(
        windowA.startTime,
        windowA.endTime,
        windowOverlap.startTime,
        windowOverlap.endTime,
      ),
    ).toBe(true);
  });

  it("allows back-to-back appointments (no overlap)", () => {
    expect(
      intervalsOverlap(
        windowA.startTime,
        windowA.endTime,
        windowAdjacent.startTime,
        windowAdjacent.endTime,
      ),
    ).toBe(false);
    expect(
      intervalsOverlap(
        windowA.startTime,
        windowA.endTime,
        windowBefore.startTime,
        windowBefore.endTime,
      ),
    ).toBe(false);
  });

  it("detects containment", () => {
    expect(
      intervalsOverlap(
        "2026-11-10T09:00:00.000Z",
        "2026-11-10T12:00:00.000Z",
        "2026-11-10T10:00:00.000Z",
        "2026-11-10T11:00:00.000Z",
      ),
    ).toBe(true);
  });
});

describe("AppointmentService conflict detection", () => {
  it("creates a non-conflicting appointment", () => {
    const ctx = freshContext();
    const { patient, dentist, treatment } = seedBasics(ctx);

    const appointment = ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      treatmentId: treatment.id,
      ...windowA,
    });

    expect(appointment.id).toBeTruthy();
    expect(appointment.status).toBe("scheduled");
  });

  it("rejects overlapping appointments for the same dentist", () => {
    const ctx = freshContext();
    const { patient, otherPatient, dentist, treatment } = seedBasics(ctx);

    ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      treatmentId: treatment.id,
      ...windowA,
    });

    expect(() =>
      ctx.appointments.create({
        patientId: otherPatient.id,
        dentistId: dentist.id,
        ...windowOverlap,
      }),
    ).toThrow(ConflictError);
  });

  it("allows the same time slot for a different dentist", () => {
    const ctx = freshContext();
    const { patient, otherPatient, dentist, otherDentist } = seedBasics(ctx);

    ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      ...windowA,
    });

    const second = ctx.appointments.create({
      patientId: otherPatient.id,
      dentistId: otherDentist.id,
      ...windowA,
    });

    expect(second.dentistId).toBe(otherDentist.id);
  });

  it("allows adjacent (touching) appointments for the same dentist", () => {
    const ctx = freshContext();
    const { patient, otherPatient, dentist } = seedBasics(ctx);

    ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      ...windowA,
    });

    const next = ctx.appointments.create({
      patientId: otherPatient.id,
      dentistId: dentist.id,
      ...windowAdjacent,
    });

    expect(next.startTime).toBe(windowAdjacent.startTime);
  });

  it("ignores cancelled appointments when checking conflicts", () => {
    const ctx = freshContext();
    const { patient, otherPatient, dentist } = seedBasics(ctx);

    const cancelled = ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      ...windowA,
    });
    ctx.appointments.cancel(cancelled.id);

    const replacement = ctx.appointments.create({
      patientId: otherPatient.id,
      dentistId: dentist.id,
      ...windowA,
    });

    expect(replacement.status).toBe("scheduled");
  });

  it("detects conflict on update when moving into an occupied slot", () => {
    const ctx = freshContext();
    const { patient, otherPatient, dentist } = seedBasics(ctx);

    ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      ...windowA,
    });

    const movable = ctx.appointments.create({
      patientId: otherPatient.id,
      dentistId: dentist.id,
      ...windowAdjacent,
    });

    expect(() =>
      ctx.appointments.update(movable.id, {
        startTime: windowOverlap.startTime,
        endTime: windowOverlap.endTime,
      }),
    ).toThrow(ConflictError);
  });

  it("does not conflict with itself when updating unchanged times", () => {
    const ctx = freshContext();
    const { patient, dentist } = seedBasics(ctx);

    const appointment = ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      ...windowA,
      reason: "checkup",
    });

    const updated = ctx.appointments.update(appointment.id, {
      reason: "follow-up",
    });

    expect(updated.reason).toBe("follow-up");
    expect(updated.startTime).toBe(windowA.startTime);
  });

  it("exposes hasConflict / findConflicts helpers", () => {
    const ctx = freshContext();
    const { patient, dentist } = seedBasics(ctx);

    ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      ...windowA,
    });

    expect(
      ctx.appointments.hasConflict(
        dentist.id,
        windowOverlap.startTime,
        windowOverlap.endTime,
      ),
    ).toBe(true);

    expect(
      ctx.appointments.hasConflict(
        dentist.id,
        windowAdjacent.startTime,
        windowAdjacent.endTime,
      ),
    ).toBe(false);

    const conflicts = ctx.appointments.findConflicts(
      dentist.id,
      windowOverlap.startTime,
      windowOverlap.endTime,
    );
    expect(conflicts).toHaveLength(1);
  });

  it("rejects invalid time windows", () => {
    const ctx = freshContext();
    const { patient, dentist } = seedBasics(ctx);

    expect(() =>
      ctx.appointments.create({
        patientId: patient.id,
        dentistId: dentist.id,
        startTime: windowA.endTime,
        endTime: windowA.startTime,
      }),
    ).toThrow(DomainError);
  });
});
