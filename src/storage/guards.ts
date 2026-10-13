import type { Atemschutztraeger, Einsatzstatus } from "../core/index";

// Keyed by every member of the union, so a member added to the core fails the typecheck here.
const EINSATZSTATUS_MEMBERS: Readonly<Record<Einsatzstatus, true>> = {
  bereitschaft: true,
  anmarsch: true,
  einsatzzielErreicht: true,
  rueckmarsch: true,
};

export function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isMemberOf<Member extends string>(
  members: Readonly<Record<Member, true>>,
  value: unknown,
): value is Member {
  return typeof value === "string" && Object.hasOwn(members, value);
}

export function isEinsatzstatus(value: unknown): value is Einsatzstatus {
  return isMemberOf(EINSATZSTATUS_MEMBERS, value);
}

export function isAtemschutztraeger(
  value: unknown,
): value is Atemschutztraeger {
  return (
    isRecord(value) &&
    typeof value.tallyId === "string" &&
    typeof value.name === "string"
  );
}

// Browser storage may be blocked (SecurityError) or full (QuotaExceededError); the simulator
// still runs without it, as if the stores were empty.
export function readItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

// ASSUMPTION: a write the browser refuses is dropped silently, so the session runs on unsaved;
// decided in the issue #28 branch review.
export function tryWrite(write: () => void): void {
  try {
    write();
  } catch {
    // Dropped; see above.
  }
}
