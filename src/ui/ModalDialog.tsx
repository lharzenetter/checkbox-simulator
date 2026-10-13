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
  /** Called on Escape; without it, Escape does not close the dialog. */
  onCancel?: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
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
