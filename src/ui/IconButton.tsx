import type { ReactNode } from "react";
import styles from "./IconButton.module.css";

// The tooltip is drawn in CSS rather than with `title`, so it also shows on keyboard focus
// and without the native delay.
export function IconButton({
  label,
  tooltip = label,
  pressed,
  keyShortcuts,
  onClick,
  children,
}: {
  label: string;
  tooltip?: string;
  pressed?: boolean;
  keyShortcuts?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      aria-pressed={pressed}
      aria-keyshortcuts={keyShortcuts}
      onClick={onClick}
    >
      {children}
      <span className={styles.tooltip} aria-hidden="true">
        {tooltip}
      </span>
    </button>
  );
}
