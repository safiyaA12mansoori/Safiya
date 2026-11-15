import type { Dentist, Id } from "../domain/types.js";
import { DomainError } from "../domain/types.js";
import { MemoryStore, newId, nowIso } from "../repositories/memory-store.js";

export interface DentistInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  active?: boolean;
}

function validateDentistInput(input: DentistInput): void {
  if (!input.firstName?.trim() || !input.lastName?.trim()) {
    throw new DomainError("Dentist first and last name are required", "VALIDATION");
  }
  if (!input.email?.trim()) {
    throw new DomainError("Dentist email is required", "VALIDATION");
  }
  if (!input.phone?.trim()) {
    throw new DomainError("Dentist phone is required", "VALIDATION");
  }
  if (!input.specialty?.trim()) {
    throw new DomainError("Dentist specialty is required", "VALIDATION");
  }
}

export class DentistService {
  constructor(private readonly store: MemoryStore) {}

  list(): Dentist[] {
    return this.store.listDentists().sort((a, b) =>
      a.lastName.localeCompare(b.lastName),
    );
  }

  get(id: Id): Dentist {
    return this.store.getDentist(id);
  }

  create(input: DentistInput): Dentist {
    validateDentistInput(input);
    const timestamp = nowIso();
    const dentist: Dentist = {
      id: newId(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      specialty: input.specialty.trim(),
      active: input.active ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.store.dentists.set(dentist.id, dentist);
    return dentist;
  }

  update(id: Id, input: Partial<DentistInput>): Dentist {
    const existing = this.store.getDentist(id);
    const merged: DentistInput = {
      firstName: input.firstName ?? existing.firstName,
      lastName: input.lastName ?? existing.lastName,
      email: input.email ?? existing.email,
      phone: input.phone ?? existing.phone,
      specialty: input.specialty ?? existing.specialty,
      active: input.active ?? existing.active,
    };
    validateDentistInput(merged);
    const updated: Dentist = {
      ...existing,
      firstName: merged.firstName.trim(),
      lastName: merged.lastName.trim(),
      email: merged.email.trim().toLowerCase(),
      phone: merged.phone.trim(),
      specialty: merged.specialty.trim(),
      active: merged.active ?? true,
      updatedAt: nowIso(),
    };
    this.store.dentists.set(id, updated);
    return updated;
  }

  delete(id: Id): void {
    this.store.getDentist(id);
    const hasAppointments = this.store
      .listAppointments()
      .some(
        (a) =>
          a.dentistId === id &&
          a.status !== "cancelled" &&
          a.status !== "completed",
      );
    if (hasAppointments) {
      throw new DomainError(
        "Cannot delete dentist with upcoming appointments",
        "DENTIST_HAS_APPOINTMENTS",
      );
    }
    this.store.dentists.delete(id);
  }
}
