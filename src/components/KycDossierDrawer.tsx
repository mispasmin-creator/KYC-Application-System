import {
  Building2,
  CheckCircle2,
  FileEdit,
  Mail,
  MapPin,
  Phone,
  Printer,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { KycLead, TeamMember } from '../types/kyc';
import { formatDateTime, validateGstin } from '../utils/validators';
import { KycPrintPreviewModal } from './KycPrintPreviewModal';

interface KycDossierDrawerProps {
  lead: KycLead | null;
  activeUser: TeamMember;
  onClose: () => void;
  onEdit: (lead: KycLead) => void;
  onDeleteLead: (leadId: string) => void;
}

export function KycDossierDrawer({
  lead,
  activeUser,
  onClose,
  onEdit,
  onDeleteLead,
}: KycDossierDrawerProps) {
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    setShowPrintPreview(false);
  }, [lead?.id]);

  if (!lead) return null;

  const canEdit = Boolean(activeUser);
  const gstResult = validateGstin(lead.gstin);

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-900/40 backdrop-blur-xs print:static print:bg-white print:block ${
          showPrintPreview ? 'print:hidden' : ''
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lead.companyName}
        className="flex max-h-[92dvh] sm:max-h-[90dvh] w-full max-w-2xl flex-col rounded-3xl bg-gradient-to-br from-[#EDF6F5] via-white to-[#F4F9F5] border border-white/80 shadow-2xl overflow-hidden pb-safe print:h-auto print:max-h-none print:max-w-none print:border-0 print:bg-white print:shadow-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/75 bg-white/70 backdrop-blur-md px-4 sm:px-6 py-4 print:bg-white print:border-slate-200">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs text-[#0D4F3C] font-semibold tabular-nums">
                {lead.id}
              </span>
              <span
                className={`rounded-lg border px-2.5 py-0.5 text-xs font-medium ${
                  lead.entityType === 'customer'
                    ? 'border-emerald-200/80 bg-[#E8F6EE] text-[#0D4F3C]'
                    : 'border-amber-200/80 bg-amber-50/90 text-amber-800'
                }`}
              >
                {lead.entityType === 'customer' ? 'Customer' : 'Vendor'}
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-lg sm:text-xl font-bold text-slate-900 truncate">
              {lead.companyName}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              <span>{lead.industry}</span>
              <span aria-hidden="true"> · </span>
              <span>
                GM: {lead.gmName} · MM: {lead.mmName} · TSE: {lead.tseName}
              </span>
            </p>
          </div>

          <div className="no-print flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print"
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white shadow-xs"
            >
              <Printer className="h-4 w-4 text-[#0D4F3C]" />
              <span className="hidden sm:inline">Print</span>
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(lead)}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white shadow-xs"
              >
                <FileEdit className="h-4 w-4 text-[#0D4F3C]" />
                <span>Edit</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-white/80 hover:text-slate-900"
              aria-label="Close dossier"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 print:overflow-visible">
          {/* Core Company Details Grid */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-white/85 bg-white/65 p-4 print:border-slate-200">
            <div>
              <div className="text-xs font-medium text-slate-500">GSTIN & Registration State</div>
              <div className="mt-1 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {lead.gstin}
              </div>
              <div
                className={`mt-0.5 inline-flex items-center gap-1 text-xs ${
                  gstResult.valid ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{gstResult.message}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">Industry / Category</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {lead.industry}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                Saved on {formatDateTime(lead.createdAt)}
              </div>
            </div>

            <div className="sm:col-span-2 pt-3 border-t border-slate-200/70">
              <div className="text-xs font-medium text-slate-500">Registered Office Address</div>
              <div className="mt-1 flex items-start gap-2 text-sm text-slate-900">
                <MapPin className="mt-0.5 h-4 w-4 text-[#0E7B86] shrink-0" />
                <span>
                  {lead.address}, {lead.city}, {lead.state} — {lead.pincode}
                </span>
              </div>
            </div>
          </section>

          {/* Stakeholders & Sales Team */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-900">
              Client Key Contacts & Sales Team
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/85 bg-white/70 p-3.5 print:border-slate-200">
                <div className="text-[11px] font-medium text-slate-500">Manager</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{lead.managerName}</div>
                <div className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-slate-700 tabular-nums">
                  <Phone className="h-3 w-3 text-[#0E7B86]" />
                  <span>{lead.managerPhone}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/85 bg-white/70 p-3.5 print:border-slate-200">
                <div className="text-[11px] font-medium text-slate-500">Team Leader</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {lead.teamLeaderName || 'Not provided'}
                </div>
                <div className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-slate-700 tabular-nums">
                  <Phone className="h-3 w-3 text-[#0E7B86]" />
                  <span>{lead.teamLeaderPhone || '—'}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-teal-200/70 bg-teal-50/60 p-3.5 print:border-slate-200">
                <div className="text-[11px] font-medium text-[#0B6D77]">Sales Team</div>
                <div className="mt-1.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-[#0B6D77]">GM</span>
                    <span className="font-medium text-slate-900 truncate">{lead.gmName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-[#0B6D77]">MM</span>
                    <span className="font-medium text-slate-900 truncate">{lead.mmName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-[#0B6D77]">TSE</span>
                    <span className="font-medium text-slate-900 truncate">{lead.tseName}</span>
                  </div>
                </div>
              </div>
            </div>

            {lead.contactEmail && (
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                <Mail className="h-3.5 w-3.5 text-[#0E7B86]" />
                <span>{lead.contactEmail}</span>
              </div>
            )}
          </section>

          {/* Branch Directory */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900">
                Branch Footprint ({lead.branchCount} Total)
              </h3>
            </div>
            <div className="divide-y divide-slate-200/70 rounded-2xl border border-white/85 bg-white/70 overflow-hidden print:border-slate-200">
              {lead.branches.map((branch, idx) => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-3.5 w-3.5 text-[#0E7B86] shrink-0" />
                    <span className="font-mono text-slate-400 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="font-medium text-slate-900 truncate">{branch.branchName}</span>
                    <span className="text-slate-500">· {branch.city}</span>
                  </div>
                  <span className="font-mono text-slate-700 tabular-nums shrink-0">
                    {branch.contactPhone || '—'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {lead.notes && (
            <section className="space-y-1.5 rounded-2xl border border-white/85 bg-white/60 p-4 print:border-slate-200">
              <h3 className="text-xs font-semibold text-slate-900">Additional Notes</h3>
              <p className="text-xs leading-relaxed text-slate-700">{lead.notes}</p>
            </section>
          )}

          {/* Record History */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-900">Record History</h3>
            <div className="space-y-2">
              {lead.activities
                .slice()
                .reverse()
                .map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-white/85 bg-white/65 px-4 py-2.5 text-xs print:border-slate-200"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{act.action}</div>
                      <div className="mt-0.5 text-slate-600">
                        {act.actorName}
                        {act.detail ? ` — ${act.detail}` : ''}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                      {formatDateTime(act.timestamp)}
                    </span>
                  </div>
                ))}
            </div>
          </section>

          {canEdit && (
            <div className="no-print pt-4 border-t border-slate-200/70 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onDeleteLead(lead.id)}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100/70"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Record</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

      {showPrintPreview && (
        <KycPrintPreviewModal lead={lead} onClose={() => setShowPrintPreview(false)} />
      )}
    </>
  );
}
