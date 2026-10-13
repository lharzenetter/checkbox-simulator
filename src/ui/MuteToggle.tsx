import styles from "./MuteToggle.module.css";

// Decided in "Decide how alarms are presented", point 7: outside the device replica, with a
// "Ton aus" indicator that stays visible while muted.
export function MuteToggle({
  muted,
  onToggle,
}: {
  muted: boolean;
  onToggle: () => void;
}) {
  return (
    <section className={styles.mute} aria-label="Ton">
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={muted}
        onClick={onToggle}
      >
        Stummschalten
      </button>
      {muted && (
        <p className={styles.indicator} role="status">
          Ton aus
        </p>
      )}
    </section>
  );
}
