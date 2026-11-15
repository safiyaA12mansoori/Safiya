/** Parse ISO datetime and return epoch ms; throws DomainError-friendly message on invalid. */
export function toEpochMs(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid datetime: ${iso}`);
  }
  return ms;
}

/**
 * Two half-open intervals [startA, endA) and [startB, endB) overlap
 * when each starts before the other ends.
 */
export function intervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const aStart = toEpochMs(startA);
  const aEnd = toEpochMs(endA);
  const bStart = toEpochMs(startB);
  const bEnd = toEpochMs(endB);

  if (aEnd <= aStart) {
    throw new Error("Appointment end must be after start");
  }
  if (bEnd <= bStart) {
    throw new Error("Appointment end must be after start");
  }

  return aStart < bEnd && bStart < aEnd;
}
