import { MemoryStore } from "./repositories/memory-store.js";
import { AppointmentService } from "./services/appointment-service.js";
import { BillingService } from "./services/billing-service.js";
import { DentistService } from "./services/dentist-service.js";
import { PatientService } from "./services/patient-service.js";
import { TreatmentService } from "./services/treatment-service.js";

export interface AppContext {
  store: MemoryStore;
  patients: PatientService;
  dentists: DentistService;
  appointments: AppointmentService;
  treatments: TreatmentService;
  billing: BillingService;
}

export function createAppContext(store = new MemoryStore()): AppContext {
  return {
    store,
    patients: new PatientService(store),
    dentists: new DentistService(store),
    appointments: new AppointmentService(store),
    treatments: new TreatmentService(store),
    billing: new BillingService(store),
  };
}
