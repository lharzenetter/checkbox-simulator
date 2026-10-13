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
