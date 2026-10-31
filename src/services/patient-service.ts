import type { Id, Patient } from "../domain/types.js";
import { DomainError } from "../domain/types.js";
import { MemoryStore, newId, nowIso } from "../repositories/memory-store.js";

export interface PatientInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  notes?: string;
}

function validatePatientInput(input: PatientInput): void {
  if (!input.firstName?.trim() || !input.lastName?.trim()) {
    throw new DomainError("Patient first and last name are required", "VALIDATION");
  }
  if (!input.email?.trim()) {
    throw new DomainError("Patient email is required", "VALIDATION");
  }
  if (!input.phone?.trim()) {
    throw new DomainError("Patient phone is required", "VALIDATION");
  }
  if (!input.dateOfBirth?.trim()) {
    throw new DomainError("Patient date of birth is required", "VALIDATION");
  }
}

export class PatientService {
  constructor(private readonly store: MemoryStore) {}

  list(): Patient[] {
    return this.store.listPatients().sort((a, b) =>
      a.lastName.localeCompare(b.lastName),
    );
  }

  get(id: Id): Patient {
    return this.store.getPatient(id);
  }

  create(input: PatientInput): Patient {
    validatePatientInput(input);
    const timestamp = nowIso();
    const patient: Patient = {
      id: newId(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      dateOfBirth: input.dateOfBirth.trim(),
      notes: input.notes?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.store.patients.set(patient.id, patient);
    return patient;
  }

  update(id: Id, input: Partial<PatientInput>): Patient {
    const existing = this.store.getPatient(id);
    const merged: PatientInput = {
      firstName: input.firstName ?? existing.firstName,
      lastName: input.lastName ?? existing.lastName,
      email: input.email ?? existing.email,
      phone: input.phone ?? existing.phone,
      dateOfBirth: input.dateOfBirth ?? existing.dateOfBirth,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    };
    validatePatientInput(merged);
    const updated: Patient = {
      ...existing,
      firstName: merged.firstName.trim(),
      lastName: merged.lastName.trim(),
      email: merged.email.trim().toLowerCase(),
      phone: merged.phone.trim(),
      dateOfBirth: merged.dateOfBirth.trim(),
      notes: merged.notes?.trim() || undefined,
      updatedAt: nowIso(),
    };
    this.store.patients.set(id, updated);
    return updated;
  }

  delete(id: Id): void {
    this.store.getPatient(id);
    const hasAppointments = this.store
      .listAppointments()
      .some((a) => a.patientId === id && a.status !== "cancelled");
    if (hasAppointments) {
      throw new DomainError(
        "Cannot delete patient with active appointments",
        "PATIENT_HAS_APPOINTMENTS",
      );
    }
    this.store.patients.delete(id);
  }
}
