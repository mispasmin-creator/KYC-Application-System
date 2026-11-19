import {
  Building2,
  CheckCircle2,
  FileEdit,
  Mail,
  MapPin,
  Phone,
  Printer,
  Trash2,
  Users,
  Store,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { KycLead, TeamMember } from '../types/kyc';
import { formatDateTime, isUnregisteredGstin, validateGstin } from '../utils/validators';
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
  const unregistered = isUnregisteredGstin(lead.gstin);
  const gstResult = validateGstin(lead.gstin);
  const isCustomer = lead.entityType === 'customer';

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-xs print:static print:bg-white print:block ${
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
          className="flex max-h-[92dvh] sm:max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl bg-gradient-to-br from-[#EDF6F5] via-white to-[#F4F9F5] border border-white/80 shadow-2xl overflow-hidden pb-safe print:h-auto print:max-h-none print:max-w-none print:border-0 print:bg-white print:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Mobile Drag Indicator */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-white/70">
            <div className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="border-b border-white/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 py-3.5 sm:py-4 print:bg-white print:border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ${
                      isCustomer
                        ? 'bg-[#0D4F3C] text-white'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {isCustomer ? <Users className="h-3 w-3 text-[#A3F046]" /> : <Store className="h-3 w-3 text-amber-700" />}
                    <span>{isCustomer ? 'Customer' : 'Vendor'}</span>
                  </span>
                  <span className="font-mono text-xs text-[#0D4F3C] font-bold tabular-nums">
                    {lead.id}
                  </span>
                </div>

                <h2 className="mt-1.5 font-display text-lg sm:text-xl font-bold text-slate-950 break-words leading-snug">
                  {lead.companyName}
                </h2>

                <p className="mt-0.5 text-xs text-slate-600">
                  <span>{lead.industry || 'General Commercial'}</span>
                  <span className="text-slate-300"> · </span>
                  <span>{lead.city}{lead.state ? `, ${lead.state}` : ''}</span>
                </p>
              </div>

              <div className="no-print flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
                  aria-label="Close dossier"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick Action Pills Row */}
            <div className="no-print mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-[#0D4F3C] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#093b2d] shadow-xs active:scale-95 transition-all"
                >
                  <Printer className="h-3.5 w-3.5 text-[#A3F046]" />
                  <span>Print / PDF</span>
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(lead)}
                    className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 shadow-2xs active:scale-95 transition-all"
                  >
                    <FileEdit className="h-3.5 w-3.5 text-[#0D4F3C]" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDeleteLead(lead.id)}
                  className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all shrink-0"
                  title="Delete KYC Record"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5 print:overflow-visible">
            {/* Core Company Details Card */}
            <section className="rounded-2xl border border-white/85 bg-white/80 backdrop-blur-sm p-4 shadow-2xs print:border-slate-200 space-y-3.5">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block">
                  {unregistered ? 'Registration Status' : 'GSTIN & Registration Status'}
                </span>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm sm:text-base font-bold text-slate-900 tracking-wider tabular-nums select-all">
                    {unregistered ? lead.gstin || 'URP' : lead.gstin}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                      unregistered
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : gstResult.valid
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {unregistered ? null : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    <span>{unregistered ? 'Unregistered (No GSTIN)' : gstResult.message}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block">
                    Official Email
                  </span>
                  {lead.contactEmail ? (
                    <a
                      href={`mailto:${lead.contactEmail}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#0D4F3C] hover:underline break-all"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span>{lead.contactEmail}</span>
                    </a>
                  ) : (
                    <span className="mt-1 text-xs text-slate-400 block">—</span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block">
                    Saved In Vault
                  </span>
                  <span className="mt-1 text-xs sm:text-sm font-medium text-slate-800 block">
                    {formatDateTime(lead.createdAt)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block">
                  Registered Office Address
                </span>
                <div className="mt-1 flex items-start gap-2 text-xs sm:text-sm text-slate-900 leading-relaxed">
                  <MapPin className="mt-0.5 h-4 w-4 text-[#0D4F3C] shrink-0" />
                  <span>
                    {lead.address}, {lead.city}, {lead.state}
                    {lead.pincode && lead.pincode !== '000000' ? ` — ${lead.pincode}` : ''}
                  </span>
                </div>
              </div>
            </section>

            {/* Client Key Contacts & Sales Team */}
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Key Contacts &amp; Assigned Sales Team
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Manager Contact */}
                <div className="rounded-2xl border border-white/85 bg-white/80 p-3.5 shadow-2xs">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Decision Maker / Manager
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {lead.managerName || '—'}
                  </div>
                  {lead.managerPhone ? (
                    <a
                      href={`tel:${lead.managerPhone}`}
                      className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#0D4F3C] bg-emerald-50 border border-emerald-200/80 rounded-lg px-2.5 py-1 hover:bg-emerald-100 transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{lead.managerPhone}</span>
                    </a>
                  ) : (
                    <span className="mt-1 text-xs text-slate-400 block">—</span>
                  )}
                </div>

                {/* Team Leader Contact */}
                <div className="rounded-2xl border border-white/85 bg-white/80 p-3.5 shadow-2xs">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Site Team Leader
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {lead.teamLeaderName || 'Not provided'}
                  </div>
                  {lead.teamLeaderPhone ? (
                    <a
                      href={`tel:${lead.teamLeaderPhone}`}
                      className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#0D4F3C] bg-emerald-50 border border-emerald-200/80 rounded-lg px-2.5 py-1 hover:bg-emerald-100 transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{lead.teamLeaderPhone}</span>
                    </a>
                  ) : (
                    <span className="mt-1 text-xs text-slate-400 block">—</span>
                  )}
                </div>

                {/* Sales Attribution */}
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-950/[0.03] p-3.5 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#0D4F3C]">
                    Sales Hierarchy
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-[#0D4F3C]">GM</span>
                    <span className="font-semibold text-slate-900 truncate">{lead.gmName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-[#0D4F3C]">MM</span>
                    <span className="font-semibold text-slate-900 truncate">{lead.mmName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-[#0D4F3C]">TSE</span>
                    <span className="font-semibold text-slate-900 truncate">{lead.tseName || '—'}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Branch Directory */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Branch Locations ({lead.branchCount} Total)
                </h3>
              </div>
              <div className="divide-y divide-slate-100 rounded-2xl border border-white/85 bg-white/85 shadow-2xs overflow-hidden">
                {lead.branches.map((branch, idx) => (
                  <div
                    key={branch.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F6EE] font-mono text-[10px] font-bold text-[#0D4F3C] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {branch.branchName || `Branch ${idx + 1}`}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {branch.city || lead.city || '—'}
                        </div>
                      </div>
                    </div>

                    {branch.contactPhone ? (
                      <a
                        href={`tel:${branch.contactPhone}`}
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#0D4F3C] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-emerald-50 transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{branch.contactPhone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">—</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Additional Notes */}
            {lead.notes && (
              <section className="space-y-1.5 rounded-2xl border border-white/85 bg-white/80 p-4 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Additional Notes
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {lead.notes}
                </p>
              </section>
            )}

            {/* Activity History */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Record History
              </h3>
              <div className="space-y-2">
                {lead.activities
                  .slice()
                  .reverse()
                  .map((act) => (
                    <div
                      key={act.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-white/85 bg-white/70 px-3.5 py-2.5 text-xs shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900">{act.action}</div>
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
          </div>
        </div>
      </div>

      {showPrintPreview && (
        <KycPrintPreviewModal lead={lead} onClose={() => setShowPrintPreview(false)} />
      )}
    </>
  );
}
