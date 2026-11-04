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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

function validatePatientInput(input: PatientInput): void {
  if (!input.firstName?.trim() || !input.lastName?.trim()) {
    throw new DomainError("Patient first and last name are required", "VALIDATION");
  }
  if (!input.email?.trim()) {
    throw new DomainError("Patient email is required", "VALIDATION");
  }
  if (!EMAIL_RE.test(input.email.trim())) {
    throw new DomainError("Patient email is invalid", "INVALID_EMAIL");
  }
  if (!input.phone?.trim()) {
    throw new DomainError("Patient phone is required", "VALIDATION");
  }
  if (!input.dateOfBirth?.trim()) {
    throw new DomainError("Patient date of birth is required", "VALIDATION");
  }
  if (!DOB_RE.test(input.dateOfBirth.trim())) {
    throw new DomainError(
      "Patient date of birth must be YYYY-MM-DD",
      "INVALID_DATE_OF_BIRTH",
    );
  }
  const dob = Date.parse(`${input.dateOfBirth.trim()}T00:00:00.000Z`);
  if (Number.isNaN(dob)) {
    throw new DomainError("Patient date of birth is invalid", "INVALID_DATE_OF_BIRTH");
  }
  if (dob > Date.now()) {
    throw new DomainError(
      "Patient date of birth cannot be in the future",
      "INVALID_DATE_OF_BIRTH",
    );
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
    const hasPrescriptions = this.store
      .listPrescriptions()
      .some((p) => p.patientId === id && p.status !== "cancelled");
    if (hasPrescriptions) {
      throw new DomainError(
        "Cannot delete patient with active prescriptions",
        "PATIENT_HAS_PRESCRIPTIONS",
      );
    }
    this.store.patients.delete(id);
  }
}
