import { createAppContext, type AppContext } from "../src/app-context.js";

export function freshContext(): AppContext {
  return createAppContext();
}

export function seedBasics(ctx: AppContext) {
  const patient = ctx.patients.create({
    firstName: "Pat",
    lastName: "Patient",
    email: "pat@example.com",
    phone: "555-1000",
    dateOfBirth: "1992-01-15",
  });

  const otherPatient = ctx.patients.create({
    firstName: "Other",
    lastName: "Person",
    email: "other@example.com",
    phone: "555-1001",
    dateOfBirth: "1988-06-20",
  });

  const dentist = ctx.dentists.create({
    firstName: "Dana",
    lastName: "Dentist",
    email: "dana@clinic.example",
    phone: "555-2000",
    specialty: "General",
  });

  const otherDentist = ctx.dentists.create({
    firstName: "Sam",
    lastName: "Specialist",
    email: "sam@clinic.example",
    phone: "555-2001",
    specialty: "Surgery",
  });

  const treatment = ctx.treatments.create({
    name: "Cleaning",
    description: "Routine cleaning",
    category: "preventive",
    durationMinutes: 30,
    basePriceCents: 10000,
  });

  const filling = ctx.treatments.create({
    name: "Filling",
    description: "Composite filling",
    category: "restorative",
    durationMinutes: 60,
    basePriceCents: 20000,
  });

  return { patient, otherPatient, dentist, otherDentist, treatment, filling };
}

export const windowA = {
  startTime: "2026-11-10T09:00:00.000Z",
  endTime: "2026-11-10T10:00:00.000Z",
};

export const windowOverlap = {
  startTime: "2026-11-10T09:30:00.000Z",
  endTime: "2026-11-10T10:30:00.000Z",
};

export const windowAdjacent = {
  startTime: "2026-11-10T10:00:00.000Z",
  endTime: "2026-11-10T11:00:00.000Z",
};

export const windowBefore = {
  startTime: "2026-11-10T08:00:00.000Z",
  endTime: "2026-11-10T09:00:00.000Z",
};
