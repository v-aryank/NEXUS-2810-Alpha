import React, { useEffect, useRef } from 'react';
import { AlertOctagon } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = 'confirm-title';
  const descId = 'confirm-desc';

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md bg-panel border border-line rounded-xl p-5 shadow-[0_0_40px_rgba(50,223,255,0.08)] space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isDanger ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent'}`}>
            <AlertOctagon size={22} aria-hidden="true" />
          </div>
          <div>
            <h3 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">Hardware confirmation required</p>
          </div>
        </div>

        <p id={descId} className="text-sm text-ink-muted leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="pressable min-h-11 px-4 py-2 text-sm font-semibold text-ink bg-elevated hover:border-accent/30 border border-line rounded-lg"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`pressable min-h-11 px-4 py-2 text-sm font-semibold rounded-lg ${
              isDanger
                ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.25)]'
                : 'bg-accent text-canvas hover:brightness-110'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
