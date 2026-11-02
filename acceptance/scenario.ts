import type { Window } from "./window";

/** The steps and observations of a use case, run against one driver's Window. */
export type ScenarioRun = (window: Window) => Promise<void>;

/** A use case, stated once and run by every driver. */
export interface Scenario {
  readonly name: string;
  readonly run: ScenarioRun;
}

const registered: Scenario[] = [];

/**
 * Registers a use case without naming a runner, so each driver's test file binds them all.
 * Decided in "State use cases as acceptance scenarios with swappable drivers", point 1.
 */
export function scenario(name: string, run: ScenarioRun): void {
  registered.push({ name, run });
}

/** Every registered use case. */
export function scenarios(): readonly Scenario[] {
  return registered;
}
