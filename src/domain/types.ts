export type Id = string;

export interface Patient {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dentist {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: Id;
  patientId: Id;
  dentistId: Id;
  treatmentId?: Id;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TreatmentCategory =
  | "preventive"
  | "restorative"
  | "cosmetic"
  | "surgical"
  | "orthodontic"
  | "other";

export interface Treatment {
  id: Id;
  name: string;
  description: string;
  category: TreatmentCategory;
  durationMinutes: number;
  basePriceCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BillStatus = "draft" | "issued" | "partially_paid" | "paid" | "void";

export interface BillLineItem {
  id: Id;
  description: string;
  quantity: number;
  unitPriceCents: number;
  treatmentId?: Id;
}

export interface Bill {
  id: Id;
  patientId: Id;
  appointmentId?: Id;
  lineItems: BillLineItem[];
  status: BillStatus;
  amountPaidCents: number;
  issuedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillTotals {
  subtotalCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
}

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}
