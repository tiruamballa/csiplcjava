import { useEffect, useRef } from "react";

export default function ConfirmDialog({
  title, message, confirmLabel = "Delete", busyLabel = "Deleting…", tone = "danger", busy, onConfirm, onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title"
           onClick={(e) => e.stopPropagation()}>
        <h3 id="dlg-title">{title}</h3>
        <p>{message}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`btn ${tone === "primary" ? "btn-primary" : "btn-danger"}`} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
