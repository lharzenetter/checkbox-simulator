import type { DragEvent } from "react";
import type { State } from "../core/index";
import { roleCode, rosterTallys, truppHint } from "../world/index";
import type { Fahrzeug, Fahrzeuge, RosterTally } from "../world/index";
import { tallyKeyFor } from "./keyboard-bindings";
import styles from "./TallyRoster.module.css";

/** The drag data type that carries a Roster Tally's id onto Check. */
export const TALLY_DRAG_TYPE = "application/x-checkbox-tally";

export function TallyRoster({
  state,
  fahrzeuge,
  onTallyTapped,
}: {
  state: State;
  fahrzeuge: Fahrzeuge;
  onTallyTapped: (tally: RosterTally) => void;
}) {
  const tallys = rosterTallys(fahrzeuge);
  return (
    <section className={styles.roster} aria-label="Atemschutzträger">
      {fahrzeuge.map((fahrzeug) => (
        <FahrzeugCard
          key={fahrzeug.id}
          fahrzeug={fahrzeug}
          tallys={tallys.filter((tally) => tally.fahrzeugId === fahrzeug.id)}
          rosterIndexOf={(tally) => tallys.indexOf(tally)}
          state={state}
          onTallyTapped={onTallyTapped}
        />
      ))}
    </section>
  );
}

function FahrzeugCard({
  fahrzeug,
  tallys,
  rosterIndexOf,
  state,
  onTallyTapped,
}: {
  fahrzeug: Fahrzeug;
  tallys: readonly RosterTally[];
  rosterIndexOf: (tally: RosterTally) => number;
  state: State;
  onTallyTapped: (tally: RosterTally) => void;
}) {
  return (
    <section className={styles.fahrzeug} aria-label={fahrzeug.kurzname}>
      <h2 className={styles.heading}>
        <span className={styles.kurzname}>{fahrzeug.kurzname}</span>
        {fahrzeug.funkrufname !== fahrzeug.kurzname && (
          <span className={styles.funkrufname}>{fahrzeug.funkrufname}</span>
        )}
      </h2>
      <ol className={styles.fobs}>
        {tallys.map((tally) => (
          <li key={tally.tallyId} className={styles.slot}>
            <TallyFob
              tally={tally}
              kurzname={fahrzeug.kurzname}
              shortcut={tallyKeyFor(rosterIndexOf(tally))}
              state={state}
              onTapped={onTallyTapped}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

// The fob is drawn after the Tally pictured in manual 3.3: a teardrop shell with a hole
// in its tip and a round label disc, which here carries the role code.
function TallyFob({
  tally,
  kurzname,
  shortcut,
  state,
  onTapped,
}: {
  tally: RosterTally;
  kurzname: string;
  shortcut: { label: string; ariaName: string };
  state: State;
  onTapped: (tally: RosterTally) => void;
}) {
  const code = roleCode(tally);
  const hint = truppHint(state, tally);
  return (
    <>
      <button
        type="button"
        className={styles.fob}
        data-hint={hint.kind}
        data-tally-fob
        // The number keys tap the fobs, so Tab skips them.
        tabIndex={-1}
        aria-label={`${kurzname} ${code} auflegen`}
        aria-description={hint.text}
        aria-keyshortcuts={shortcut.ariaName}
        draggable
        onDragStart={(event: DragEvent<HTMLButtonElement>) => {
          event.dataTransfer.setData(TALLY_DRAG_TYPE, tally.tallyId);
          event.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() => {
          onTapped(tally);
        }}
      >
        <svg viewBox="0 2 60 82" className={styles.shape} aria-hidden="true">
          <path
            className={styles.shell}
            fillRule="evenodd"
            d="M18 16 A12 12 0 0 1 42 16 L56 48 A27 27 0 1 1 4 48 Z M35 14 A5 5 0 1 0 25 14 A5 5 0 1 0 35 14 Z"
          />
          <circle className={styles.disc} cx="30" cy="55" r="19" />
          <text className={styles.code} x="30" y="59" textAnchor="middle">
            {code}
          </text>
        </svg>
        <kbd className={styles.shortcut}>{shortcut.label}</kbd>
      </button>
      <span className={styles.hint} data-hint={hint.kind} aria-hidden="true">
        {hint.text}
      </span>
    </>
  );
}
