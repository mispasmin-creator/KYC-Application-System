import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { KycLead } from '../types/kyc';
import { formatShortDate, isUnregisteredGstin, validateGstin } from '../utils/validators';

interface KycCompanyCardProps {
  lead: KycLead;
  onClick: (lead: KycLead) => void;
  className?: string;
}

export function KycCompanyCard({ lead, onClick, className = '' }: KycCompanyCardProps) {
  const unregistered = isUnregisteredGstin(lead.gstin);
  const gstCheck = validateGstin(lead.gstin);
  const isCustomer = lead.entityType === 'customer';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(lead)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(lead);
        }
      }}
      className={`group relative w-full rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 p-4 sm:p-5 text-left shadow-[0_4px_18px_-4px_rgba(15,76,82,0.08)] active:scale-[0.99] transition-all hover:border-[#0D4F3C]/50 hover:shadow-[0_8px_24px_-6px_rgba(13,79,60,0.15)] cursor-pointer ${className}`}
    >
      {/* Top Header: Badge, ID & Action Arrow */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase shrink-0 ${
              isCustomer
                ? 'bg-[#0D4F3C] text-white shadow-xs'
                : 'bg-amber-100 text-amber-900 border border-amber-300/80'
            }`}
          >
            {isCustomer ? (
              <>
                <Users className="h-3 w-3 text-[#A3F046]" />
                <span>Customer</span>
              </>
            ) : (
              <>
                <Store className="h-3 w-3 text-amber-700" />
                <span>Vendor</span>
              </>
            )}
          </span>

          <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums shrink-0">
            {lead.id}
          </span>
        </div>

        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50/80 text-[#0D4F3C] group-hover:bg-[#0D4F3C] group-hover:text-white transition-colors shrink-0">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      {/* Company Name & Location */}
      <div className="mt-3 min-w-0">
        <h3 className="font-display text-base font-bold text-slate-950 leading-snug tracking-tight group-hover:text-[#0D4F3C] transition-colors break-words">
          {lead.companyName}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700">{lead.industry || 'General Commercial'}</span>
          </span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
            <span>
              {lead.city}
              {lead.state ? `, ${lead.state}` : ''}
            </span>
          </span>
        </div>
      </div>

      {/* Dedicated GSTIN Badge (Never truncated) */}
      <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block leading-tight">
            {unregistered
              ? 'GST Status'
              : `GSTIN ${gstCheck.stateName ? `(${gstCheck.stateName})` : ''}`}
          </span>
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 tracking-wider tabular-nums block mt-0.5 select-all">
            {unregistered ? lead.gstin || 'URP' : lead.gstin}
          </span>
        </div>
        <div
          className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            unregistered
              ? 'bg-slate-100 text-slate-700 border border-slate-200'
              : gstCheck.valid
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90'
                : 'bg-amber-50 text-amber-800 border border-amber-200/90'
          }`}
        >
          {unregistered ? null : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
          <span>{unregistered ? 'Unregistered' : gstCheck.valid ? 'Verified' : 'Active'}</span>
        </div>
      </div>

      {/* Key Metrics: Branches & Manager Contact */}
      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 shadow-2xs">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
            Branches
          </span>
          <span className="font-display font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block tabular-nums">
            {lead.branchCount} {lead.branchCount === 1 ? 'Unit' : 'Units'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 min-w-0 shadow-2xs">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
            Manager
          </span>
          <span className="font-medium text-slate-900 text-xs truncate mt-0.5 block">
            {lead.managerName || '—'}
          </span>
          {lead.managerPhone && (
            <span className="font-mono text-[11px] text-slate-600 tabular-nums block truncate mt-0.5 inline-flex items-center gap-1">
              <Phone className="h-2.5 w-2.5 text-[#0D4F3C]" />
              <span>{lead.managerPhone}</span>
            </span>
          )}
        </div>
      </div>

      {/* Assigned Sales Team Footer */}
      {(lead.tseName || lead.mmName || lead.gmName) && (
        <div className="mt-2.5 rounded-xl bg-emerald-950/[0.03] border border-emerald-900/10 px-3 py-2 text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-y-1 gap-x-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {lead.tseName && (
              <span className="inline-flex items-center gap-1">
                <span className="font-mono font-bold text-[#0D4F3C]">TSE:</span>
                <span className="font-medium text-slate-800">{lead.tseName}</span>
              </span>
            )}
            {lead.mmName && (
              <span className="inline-flex items-center gap-1">
                <span className="font-mono font-bold text-[#0D4F3C]">MM:</span>
                <span className="font-medium text-slate-800">{lead.mmName}</span>
              </span>
            )}
            {lead.gmName && (
              <span className="inline-flex items-center gap-1">
                <span className="font-mono font-bold text-[#0D4F3C]">GM:</span>
                <span className="font-medium text-slate-800">{lead.gmName}</span>
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-400 tabular-nums shrink-0">
            {formatShortDate(lead.updatedAt || lead.createdAt)}
          </span>
        </div>
      )}
    </div>
  );
}
