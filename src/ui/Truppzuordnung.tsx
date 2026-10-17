import { TRUPPZUORDNUNG_MAX_LENGTH } from "../storage/index";
import type { Stores, TruppzuordnungColumn } from "../storage/index";
import styles from "./Truppzuordnung.module.css";

const COLUMNS: readonly {
  readonly column: TruppzuordnungColumn;
  readonly heading: string;
}[] = [
  { column: "ort", heading: "Ort" },
  { column: "auftrag", heading: "Auftrag" },
];

// Ruled lines under a printed heading row and with no placeholder, as on the paper fastened to
// the device (decided in "Correct the simulator against the real Checkbox").
export function Truppzuordnung({
  rows,
  onWritten,
}: {
  rows: Stores["truppzuordnung"];
  onWritten: (
    truppnummer: number,
    column: TruppzuordnungColumn,
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
        {COLUMNS.map(({ column, heading }) => (
          <span key={column} className={styles.column}>
            {heading}
          </span>
        ))}
      </div>
      {rows.map((row, index) => {
        const truppnummer = index + 1;
        return (
          <div key={truppnummer} className={styles.line}>
            <span className={styles.truppnummer} aria-hidden="true">
              {truppnummer}
            </span>
            {COLUMNS.map(({ column, heading }) => (
              <input
                key={column}
                className={styles.field}
                value={row[column]}
                maxLength={TRUPPZUORDNUNG_MAX_LENGTH}
                autoComplete="off"
                spellCheck={false}
                aria-label={`Truppzuordnung Nr. ${String(truppnummer)} ${heading}`}
                onChange={(event) => {
                  onWritten(truppnummer, column, event.target.value);
                }}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
