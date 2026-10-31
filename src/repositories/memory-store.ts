import { v4 as uuidv4 } from "uuid";
import type {
  Appointment,
  Bill,
  Dentist,
  Id,
  Patient,
  Treatment,
} from "../domain/types.js";
import { NotFoundError } from "../domain/types.js";

export function newId(): Id {
  return uuidv4();
}

export function nowIso(): string {
  return new Date().toISOString();
}

type EntityMap<T extends { id: Id }> = Map<Id, T>;

function requireEntity<T extends { id: Id }>(
  map: EntityMap<T>,
  resource: string,
  id: Id,
): T {
  const entity = map.get(id);
  if (!entity) {
    throw new NotFoundError(resource, id);
  }
  return entity;
}

export class MemoryStore {
  readonly patients: EntityMap<Patient> = new Map();
  readonly dentists: EntityMap<Dentist> = new Map();
  readonly appointments: EntityMap<Appointment> = new Map();
  readonly treatments: EntityMap<Treatment> = new Map();
  readonly bills: EntityMap<Bill> = new Map();

  clear(): void {
    this.patients.clear();
    this.dentists.clear();
    this.appointments.clear();
    this.treatments.clear();
    this.bills.clear();
  }

  getPatient(id: Id): Patient {
    return requireEntity(this.patients, "Patient", id);
  }

  getDentist(id: Id): Dentist {
    return requireEntity(this.dentists, "Dentist", id);
  }

  getAppointment(id: Id): Appointment {
    return requireEntity(this.appointments, "Appointment", id);
  }

  getTreatment(id: Id): Treatment {
    return requireEntity(this.treatments, "Treatment", id);
  }

  getBill(id: Id): Bill {
    return requireEntity(this.bills, "Bill", id);
  }

  listPatients(): Patient[] {
    return [...this.patients.values()];
  }

  listDentists(): Dentist[] {
    return [...this.dentists.values()];
  }

  listAppointments(): Appointment[] {
    return [...this.appointments.values()];
  }

  listTreatments(): Treatment[] {
    return [...this.treatments.values()];
  }

  listBills(): Bill[] {
    return [...this.bills.values()];
  }
}
