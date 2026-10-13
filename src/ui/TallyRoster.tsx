import type { DragEvent } from "react";
import type { State } from "../core/index";
import { ROSTER, rosterLabel, truppHint } from "../world/index";
import type { RosterTally, Vehicles } from "../world/index";
import styles from "./TallyRoster.module.css";

/** The drag data type that carries a Roster Tally's id onto Check. */
export const TALLY_DRAG_TYPE = "application/x-checkbox-tally";

export function TallyRoster({
  state,
  vehicles,
  onTallyTapped,
}: {
  state: State;
  vehicles: Vehicles;
  onTallyTapped: (tally: RosterTally) => void;
}) {
  return (
    <section className={styles.roster} aria-label="Atemschutzträger">
      <h2 className={styles.heading}>Atemschutzträger</h2>
      <ol className={styles.list}>
        {ROSTER.map((tally, index) => {
          const label = rosterLabel(tally, vehicles);
          return (
            <li
              key={tally.tallyId}
              className={styles.tally}
              draggable
              onDragStart={(event: DragEvent<HTMLLIElement>) => {
                event.dataTransfer.setData(TALLY_DRAG_TYPE, tally.tallyId);
                event.dataTransfer.effectAllowed = "copy";
              }}
            >
              <kbd className={styles.shortcut}>{index + 1}</kbd>
              <span className={styles.label}>
                {label}
                <span className={styles.hint}>{truppHint(state, tally)}</span>
              </span>
              <button
                type="button"
                className={styles.tap}
                aria-label={`${label} auflegen`}
                onClick={() => {
                  onTallyTapped(tally);
                }}
              >
                Auflegen
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
