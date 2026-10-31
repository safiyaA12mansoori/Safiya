import type { AppContext } from "./app-context.js";

/** Demo data for the local UI — skipped in unit tests. */
export function seedDemoData(ctx: AppContext): void {
  const alice = ctx.patients.create({
    firstName: "Alice",
    lastName: "Nguyen",
    email: "alice.nguyen@example.com",
    phone: "+1-555-0101",
    dateOfBirth: "1990-04-12",
    notes: "Prefers morning appointments",
  });

  ctx.patients.create({
    firstName: "Brian",
    lastName: "Okoye",
    email: "brian.okoye@example.com",
    phone: "+1-555-0102",
    dateOfBirth: "1985-11-03",
  });

  const drPatel = ctx.dentists.create({
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.patel@clinic.example",
    phone: "+1-555-0201",
    specialty: "General Dentistry",
  });

  ctx.dentists.create({
    firstName: "James",
    lastName: "Chen",
    email: "james.chen@clinic.example",
    phone: "+1-555-0202",
    specialty: "Orthodontics",
  });

  const cleaning = ctx.treatments.create({
    name: "Routine Cleaning",
    description: "Prophylaxis and exam",
    category: "preventive",
    durationMinutes: 45,
    basePriceCents: 12000,
  });

  ctx.treatments.create({
    name: "Composite Filling",
    description: "Tooth-colored filling",
    category: "restorative",
    durationMinutes: 60,
    basePriceCents: 18500,
  });

  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(14, 0, 0, 0);
  const end = new Date(start.getTime() + 45 * 60 * 1000);

  const appointment = ctx.appointments.create({
    patientId: alice.id,
    dentistId: drPatel.id,
    treatmentId: cleaning.id,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    reason: "Six-month checkup",
  });

  const bill = ctx.billing.create({
    patientId: alice.id,
    appointmentId: appointment.id,
    fromAppointmentTreatment: true,
  });
  ctx.billing.issue(bill.id);
}
