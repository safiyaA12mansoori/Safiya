import type { Id, Treatment, TreatmentCategory } from "../domain/types.js";
import { DomainError } from "../domain/types.js";
import { MemoryStore, newId, nowIso } from "../repositories/memory-store.js";

const CATEGORIES: TreatmentCategory[] = [
  "preventive",
  "restorative",
  "cosmetic",
  "surgical",
  "orthodontic",
  "other",
];

export interface TreatmentInput {
  name: string;
  description: string;
  category: TreatmentCategory;
  durationMinutes: number;
  basePriceCents: number;
  active?: boolean;
}

function validateTreatmentInput(input: TreatmentInput): void {
  if (!input.name?.trim()) {
    throw new DomainError("Treatment name is required", "VALIDATION");
  }
  if (!CATEGORIES.includes(input.category)) {
    throw new DomainError(
      `Invalid treatment category: ${input.category}`,
      "VALIDATION",
    );
  }
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new DomainError("Duration must be a positive number of minutes", "VALIDATION");
  }
  if (!Number.isFinite(input.basePriceCents) || input.basePriceCents < 0) {
    throw new DomainError("Base price must be a non-negative amount in cents", "VALIDATION");
  }
}

export class TreatmentService {
  constructor(private readonly store: MemoryStore) {}

  list(): Treatment[] {
    return this.store.listTreatments().sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id: Id): Treatment {
    return this.store.getTreatment(id);
  }

  create(input: TreatmentInput): Treatment {
    validateTreatmentInput(input);
    const timestamp = nowIso();
    const treatment: Treatment = {
      id: newId(),
      name: input.name.trim(),
      description: (input.description ?? "").trim(),
      category: input.category,
      durationMinutes: input.durationMinutes,
      basePriceCents: Math.round(input.basePriceCents),
      active: input.active ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.store.treatments.set(treatment.id, treatment);
    return treatment;
  }

  update(id: Id, input: Partial<TreatmentInput>): Treatment {
    const existing = this.store.getTreatment(id);
    const merged: TreatmentInput = {
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      category: input.category ?? existing.category,
      durationMinutes: input.durationMinutes ?? existing.durationMinutes,
      basePriceCents: input.basePriceCents ?? existing.basePriceCents,
      active: input.active ?? existing.active,
    };
    validateTreatmentInput(merged);
    const updated: Treatment = {
      ...existing,
      name: merged.name.trim(),
      description: (merged.description ?? "").trim(),
      category: merged.category,
      durationMinutes: merged.durationMinutes,
      basePriceCents: Math.round(merged.basePriceCents),
      active: merged.active ?? true,
      updatedAt: nowIso(),
    };
    this.store.treatments.set(id, updated);
    return updated;
  }

  delete(id: Id): void {
    this.store.getTreatment(id);
    this.store.treatments.delete(id);
  }
}
