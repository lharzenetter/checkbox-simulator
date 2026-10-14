import { useEffect, useRef } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import styles from "./ModalDialog.module.css";

// A native modal <dialog>: it keeps focus inside and makes the rest of the page inert.
export function ModalDialog({
  title,
  onCancel,
  children,
}: {
  title: string;
  // Called on Escape; without it, Escape does not close the dialog.
  onCancel?: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
      // An overflowing body is itself focusable and would take the initial focus from the
      // first field.
      dialog
        .querySelector<HTMLElement>(
          "input:enabled, select:enabled, textarea:enabled, button:enabled",
        )
        ?.focus();
    }
  }, []);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    onCancel?.();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={title}
      onCancel={handleCancel}
    >
      <h2 className={styles.title}>{title}</h2>
      {children}
    </dialog>
  );
}

// The dialog's content; it scrolls when it does not fit.
export function ModalBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}

// The dialog's buttons, kept in view while the body scrolls.
export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className={styles.footer}>{children}</div>;
}
