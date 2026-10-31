import { intervalsOverlap, toEpochMs } from "../domain/time.js";
import type {
  Appointment,
  AppointmentStatus,
  Id,
} from "../domain/types.js";
import { ConflictError, DomainError } from "../domain/types.js";
import { MemoryStore, newId, nowIso } from "../repositories/memory-store.js";

const ACTIVE_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "no_show",
];

export interface AppointmentInput {
  patientId: Id;
  dentistId: Id;
  treatmentId?: Id;
  startTime: string;
  endTime: string;
  status?: AppointmentStatus;
  reason?: string;
  notes?: string;
}

function validateWindow(startTime: string, endTime: string): void {
  let start: number;
  let end: number;
  try {
    start = toEpochMs(startTime);
    end = toEpochMs(endTime);
  } catch {
    throw new DomainError("Invalid appointment start or end time", "VALIDATION");
  }
  if (end <= start) {
    throw new DomainError("Appointment end must be after start", "VALIDATION");
  }
}

export class AppointmentService {
  constructor(private readonly store: MemoryStore) {}

  list(): Appointment[] {
    return this.store
      .listAppointments()
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  get(id: Id): Appointment {
    return this.store.getAppointment(id);
  }

  listForDentist(dentistId: Id): Appointment[] {
    this.store.getDentist(dentistId);
    return this.list().filter((a) => a.dentistId === dentistId);
  }

  /**
   * Returns true when the proposed window overlaps an existing active
   * appointment for the same dentist (excluding `excludeAppointmentId`).
   */
  hasConflict(
    dentistId: Id,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: Id,
  ): boolean {
    return this.findConflicts(dentistId, startTime, endTime, excludeAppointmentId)
      .length > 0;
  }

  findConflicts(
    dentistId: Id,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: Id,
  ): Appointment[] {
    validateWindow(startTime, endTime);
    return this.store.listAppointments().filter((existing) => {
      if (existing.dentistId !== dentistId) return false;
      if (excludeAppointmentId && existing.id === excludeAppointmentId) return false;
      if (existing.status === "cancelled") return false;
      if (!ACTIVE_STATUSES.includes(existing.status)) return false;
      return intervalsOverlap(
        startTime,
        endTime,
        existing.startTime,
        existing.endTime,
      );
    });
  }

  private assertNoConflict(
    dentistId: Id,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: Id,
  ): void {
    const conflicts = this.findConflicts(
      dentistId,
      startTime,
      endTime,
      excludeAppointmentId,
    );
    if (conflicts.length > 0) {
      throw new ConflictError(
        `Dentist already has an overlapping appointment (${conflicts[0].id}) from ${conflicts[0].startTime} to ${conflicts[0].endTime}`,
      );
    }
  }

  create(input: AppointmentInput): Appointment {
    this.store.getPatient(input.patientId);
    const dentist = this.store.getDentist(input.dentistId);
    if (!dentist.active) {
      throw new DomainError("Cannot book with an inactive dentist", "DENTIST_INACTIVE");
    }
    if (input.treatmentId) {
      const treatment = this.store.getTreatment(input.treatmentId);
      if (!treatment.active) {
        throw new DomainError("Cannot book an inactive treatment", "TREATMENT_INACTIVE");
      }
    }
    validateWindow(input.startTime, input.endTime);
    this.assertNoConflict(input.dentistId, input.startTime, input.endTime);

    const timestamp = nowIso();
    const appointment: Appointment = {
      id: newId(),
      patientId: input.patientId,
      dentistId: input.dentistId,
      treatmentId: input.treatmentId,
      startTime: input.startTime,
      endTime: input.endTime,
      status: input.status ?? "scheduled",
      reason: input.reason?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.store.appointments.set(appointment.id, appointment);
    return appointment;
  }

  update(id: Id, input: Partial<AppointmentInput>): Appointment {
    const existing = this.store.getAppointment(id);
    const patientId = input.patientId ?? existing.patientId;
    const dentistId = input.dentistId ?? existing.dentistId;
    const startTime = input.startTime ?? existing.startTime;
    const endTime = input.endTime ?? existing.endTime;
    const status = input.status ?? existing.status;

    this.store.getPatient(patientId);
    this.store.getDentist(dentistId);
    if (input.treatmentId) {
      this.store.getTreatment(input.treatmentId);
    }
    validateWindow(startTime, endTime);

    if (status !== "cancelled") {
      this.assertNoConflict(dentistId, startTime, endTime, id);
    }

    const updated: Appointment = {
      ...existing,
      patientId,
      dentistId,
      treatmentId:
        input.treatmentId !== undefined ? input.treatmentId : existing.treatmentId,
      startTime,
      endTime,
      status,
      reason:
        input.reason !== undefined
          ? input.reason.trim() || undefined
          : existing.reason,
      notes:
        input.notes !== undefined
          ? input.notes.trim() || undefined
          : existing.notes,
      updatedAt: nowIso(),
    };
    this.store.appointments.set(id, updated);
    return updated;
  }

  cancel(id: Id): Appointment {
    return this.update(id, { status: "cancelled" });
  }

  delete(id: Id): void {
    this.store.getAppointment(id);
    this.store.appointments.delete(id);
  }
}
