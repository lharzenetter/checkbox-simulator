import { TRUPPZUORDNUNG_MAX_LENGTH } from "../storage/index";
import type { Stores, TruppzuordnungEntry } from "../storage/index";
import styles from "./Truppzuordnung.module.css";

// Ruled lines under a printed heading row and with no placeholder, as on the paper fastened to
// the device (decided in "Correct the simulator against the real Checkbox").
export function Truppzuordnung({
  entries,
  onWritten,
}: {
  entries: Stores["truppzuordnung"];
  onWritten: (
    truppnummer: number,
    column: keyof TruppzuordnungEntry,
    text: string,
  ) => void;
}) {
  return (
    <section
      className={styles.truppzuordnung}
      aria-label="Truppzuordnung"
      data-truppzuordnung
    >
      <div className={styles.heading} aria-hidden="true">
        <span className={styles.truppnummer}>Nr.</span>
        <span className={styles.column}>Ort</span>
        <span className={styles.column}>Auftrag</span>
      </div>
      {entries.map((entry, index) => {
        const truppnummer = index + 1;
        const label = `Truppzuordnung Nr. ${String(truppnummer)}`;
        return (
          <div key={truppnummer} className={styles.line}>
            <span className={styles.truppnummer} aria-hidden="true">
              {truppnummer}
            </span>
            <input
              className={styles.field}
              value={entry.ort}
              maxLength={TRUPPZUORDNUNG_MAX_LENGTH}
              autoComplete="off"
              spellCheck={false}
              aria-label={`${label} Ort`}
              onChange={(event) => {
                onWritten(truppnummer, "ort", event.target.value);
              }}
            />
            <input
              className={styles.field}
              value={entry.auftrag}
              maxLength={TRUPPZUORDNUNG_MAX_LENGTH}
              autoComplete="off"
              spellCheck={false}
              aria-label={`${label} Auftrag`}
              onChange={(event) => {
                onWritten(truppnummer, "auftrag", event.target.value);
              }}
            />
          </div>
        );
      })}
    </section>
  );
}
