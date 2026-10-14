import { IconButton } from "./IconButton";
import { VolumeIcon, VolumeOffIcon } from "./Icons";
import styles from "./MuteToggle.module.css";

// Decided in "Decide how alarms are presented", point 7: outside the device replica, and the
// pressed, crossed-out speaker is the "Ton aus" indicator that stays visible while muted.
export function MuteToggle({
  muted,
  onToggle,
}: {
  muted: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <IconButton
        label="Stummschalten"
        tooltip={muted ? "Ton einschalten" : "Stummschalten"}
        pressed={muted}
        onClick={onToggle}
      >
        {muted ? <VolumeOffIcon /> : <VolumeIcon />}
      </IconButton>
      {/* Always mounted, so screen readers announce the text when it appears. */}
      <p className={styles.indicator} role="status">
        {muted ? "Ton aus" : ""}
      </p>
    </>
  );
}
