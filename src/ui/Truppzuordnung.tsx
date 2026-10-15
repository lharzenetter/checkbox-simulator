import { TRUPPZUORDNUNG_MAX_LENGTH } from "../storage/index";
import type { Stores } from "../storage/index";
import styles from "./Truppzuordnung.module.css";

// Plain ruled lines with no heading or placeholder, as on the paper fastened to the device.
export function Truppzuordnung({
  entries,
  onWritten,
}: {
  entries: Stores["truppzuordnung"];
  onWritten: (truppnummer: number, entry: string) => void;
}) {
  return (
    <section
      className={styles.truppzuordnung}
      aria-label="Truppzuordnung"
      data-truppzuordnung
    >
      {entries.map((entry, index) => {
        const truppnummer = index + 1;
        return (
          <div key={truppnummer} className={styles.line}>
            <span className={styles.truppnummer} aria-hidden="true">
              {truppnummer}
            </span>
            <input
              className={styles.entry}
              value={entry}
              maxLength={TRUPPZUORDNUNG_MAX_LENGTH}
              autoComplete="off"
              spellCheck={false}
              aria-label={`Truppzuordnung Nr. ${String(truppnummer)}`}
              onChange={(event) => {
                onWritten(truppnummer, event.target.value);
              }}
            />
          </div>
        );
      })}
    </section>
  );
}
