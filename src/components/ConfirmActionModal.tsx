import { AlertTriangle, Loader2, ShieldCheck, X } from 'lucide-react';

export interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string[];
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmActionModal({
  isOpen,
  title,
  description,
  details = [],
  confirmLabel,
  variant = 'primary',
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full sm:max-w-md overflow-hidden rounded-t-3xl sm:rounded-2xl border border-white/90 bg-[#F4F9F9] shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)] pb-safe">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-5 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                variant === 'danger'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-[#E8F6EE] text-[#0D4F3C]'
              }`}
            >
              {variant === 'danger' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </div>
            <h3 className="font-display text-sm font-bold text-slate-900 truncate">{title}</h3>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 shrink-0"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs sm:text-sm leading-relaxed text-slate-700">{description}</p>

          {details.length > 0 && (
            <ul className="space-y-1.5 rounded-xl border border-slate-200/80 bg-white p-3 text-xs text-slate-700">
              {details.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0D4F3C] shrink-0" />
                  <span className="break-words">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200/80 bg-white px-5 py-3.5">
          <button
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onConfirm}
            className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60 ${
              variant === 'danger'
                ? 'bg-rose-700 hover:bg-rose-800'
                : 'bg-[#0D4F3C] hover:bg-[#093b2d] shadow-[0_6px_16px_-4px_rgba(13,79,60,0.4)]'
            }`}
          >
            {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{isBusy ? 'Saving...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
