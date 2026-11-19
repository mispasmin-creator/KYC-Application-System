import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  KeyRound,
  MapPin,
  Plus,
  Store,
  UserCheck,
  Users,
} from 'lucide-react';
import { EntityType, KycLead, NavSection, TeamMember } from '../types/kyc';
import { formatCategoryBadge } from '../utils/teamAccessUtils';
import { formatDateTime, formatShortDate } from '../utils/validators';
import { KycCompanyCard } from './KycCompanyCard';

interface OverviewViewProps {
  leads: KycLead[];
  activeUser: TeamMember;
  allowedPages?: NavSection[];
  onNavigate: (nav: NavSection, entityFilter?: 'all' | EntityType) => void;
  onOpenLead: (lead: KycLead) => void;
  onCreateNew: () => void;
  onExportCsv: () => void;
}

export function OverviewView({
  leads,
  activeUser,
  allowedPages = ['overview', 'directory', 'leaderboard', 'loginAccess'],
  onNavigate,
  onOpenLead,
  onCreateNew,
  onExportCsv,
}: OverviewViewProps) {
  const totalCompanies = leads.length;
  const customerLeads = leads.filter((l) => l.entityType === 'customer');
  const vendorLeads = leads.filter((l) => l.entityType === 'vendor');
  const totalBranches = leads.reduce((sum, l) => sum + l.branchCount, 0);
  const uniqueStates = new Set(leads.map((l) => l.state.trim()).filter(Boolean)).size;

  const recentCompanies = [...leads]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const recentEvents = leads
    .flatMap((lead) =>
      lead.activities.map((act) => ({
        ...act,
        leadId: lead.id,
        companyName: lead.companyName,
        lead,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4);


  return (
    <div className="space-y-6">
      {/* MOBILE APP-STYLE VIEW (Matching reference screen 1 & 2) */}
      <div className="md:hidden space-y-5">
        <div>
          {/* Deep Forest Emerald Hero Card */}
          <div className="mobile-hero-emerald rounded-3xl p-5 pb-11 text-white shadow-[0_18px_38px_-14px_rgba(13,79,60,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 border border-white/80 p-1.5 shadow-xs shrink-0">
                  <img
                    src="/assets/aistudio/logo__1__12f0c258.png"
                    alt="KYC System Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-emerald-100/80">KYC System</div>
                  <div className="truncate text-sm font-semibold text-white">
                    {activeUser.name}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs text-emerald-100/85">Saved Companies</div>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <span className="font-display text-4xl font-bold tracking-tight tabular-nums">
                  {totalCompanies}
                </span>
                <span className="rounded-full bg-white/12 border border-white/15 px-3 py-1 text-[11px] font-medium text-emerald-50 tabular-nums">
                  {customerLeads.length} Cust · {vendorLeads.length} Vend
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onExportCsv}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-white/12 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white active:scale-[0.98] transition-all"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#A3F046]" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={onCreateNew}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full bg-[#A3F046] px-4 py-2.5 text-xs font-bold text-[#073326] shadow-sm active:scale-[0.98] transition-all"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>New KYC</span>
              </button>
            </div>
          </div>

          {/* Overlapping Rounded White Categories Card */}
          <div className="-mt-6 mx-1 rounded-3xl bg-white p-4 shadow-[0_12px_30px_-14px_rgba(15,23,42,0.14)] border border-slate-100">
            <h2 className="font-display text-sm font-bold text-slate-900 px-1 mb-3">
              Categories
            </h2>
            <div className="grid grid-cols-4 gap-y-3.5 gap-x-2">
              <button
                type="button"
                onClick={() => onNavigate('directory', 'all')}
                className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] active:scale-95 transition-transform"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F6EE] text-[#0D4F3C]">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-slate-700 leading-tight">
                  All KYC
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('directory', 'customer')}
                className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] active:scale-95 transition-transform"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F6EE] text-[#0D4F3C]">
                  <Users className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-slate-700 leading-tight">
                  Customers
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('directory', 'vendor')}
                className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] active:scale-95 transition-transform"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F6EE] text-[#0D4F3C]">
                  <Store className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-slate-700 leading-tight">
                  Vendors
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('directory', 'all')}
                className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] active:scale-95 transition-transform"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F6EE] text-[#0D4F3C]">
                  <MapPin className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-slate-700 leading-tight">
                  {totalBranches} Sites
                </span>
              </button>

              {allowedPages.includes('leaderboard') && (
                <button
                  type="button"
                  onClick={() => onNavigate('leaderboard')}
                  className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] active:scale-95 transition-transform"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F6EE] text-[#0D4F3C]">
                    <UserCheck className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 leading-tight">
                    Team
                  </span>
                </button>
              )}

              {allowedPages.includes('loginAccess') && (
                <button
                  type="button"
                  onClick={() => onNavigate('loginAccess')}
                  className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] active:scale-95 transition-transform"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F6EE] text-[#0D4F3C]">
                    <KeyRound className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 leading-tight">
                    Access
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onCreateNew}
                className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] active:scale-95 transition-transform"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F6EE] text-[#0D4F3C]">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-slate-700 leading-tight">
                  Add KYC
                </span>
              </button>

              <button
                type="button"
                onClick={onExportCsv}
                className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] active:scale-95 transition-transform"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F6EE] text-[#0D4F3C]">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-slate-700 leading-tight">
                  Export
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Recent Companies Feed (Reference Screen 2 Card Style) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-base font-bold text-slate-900">
              Recent Companies
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('directory', 'all')}
              className="min-h-[36px] text-xs font-semibold text-[#0D4F3C]"
            >
              View All
            </button>
          </div>

          {recentCompanies.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 text-center">
              <Building2 className="mx-auto h-7 w-7 text-[#0D4F3C]" />
              <p className="mt-2 text-sm font-semibold text-slate-900">No companies saved yet</p>
              <button
                type="button"
                onClick={onCreateNew}
                className="mt-3 min-h-[44px] rounded-full bg-[#0D4F3C] px-5 py-2 text-xs font-semibold text-white"
              >
                + Add First Company
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCompanies.map((lead) => (
                <KycCompanyCard
                  key={lead.id}
                  lead={lead}
                  onClick={onOpenLead}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:block space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#0D4F3C]">
              Welcome back, {activeUser.name} ·{' '}
              {formatCategoryBadge(activeUser.salespersonCategory, activeUser.name)}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Company KYC Directory Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-white/85 bg-white/75 backdrop-blur-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#0D4F3C]" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D4F3C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#093b2d] shadow-[0_8px_18px_-6px_rgba(13,79,60,0.45)] transition-all whitespace-nowrap shrink-0"
            >
              <span>+ New KYC Entry</span>
            </button>
          </div>
        </div>

        {/* 4-column KPI strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass-surface rounded-2xl p-5 flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100/90 text-indigo-600">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">
                Saved Companies
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {totalCompanies}
              </div>
              <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                Customer & vendor profiles
              </div>
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-5 flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F6EE] text-[#0D4F3C]">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">
                Customers
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {customerLeads.length}
              </div>
              <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                Active customer records
              </div>
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-5 flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100/90 text-amber-600">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">
                Vendors
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {vendorLeads.length}
              </div>
              <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                Supplier & logistics profiles
              </div>
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-5 flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100/90 text-rose-500">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">
                Branches Mapped
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {totalBranches}
              </div>
              <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                Across {uniqueStates} states
              </div>
            </div>
          </div>
        </div>


        {/* Two-column split: Saved Companies & Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-7 glass-surface rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Recently Saved Companies
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('directory')}
                className="text-xs font-semibold text-[#0D4F3C] hover:text-emerald-950 whitespace-nowrap shrink-0"
              >
                View All
              </button>
            </div>

            {recentCompanies.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="mx-auto h-7 w-7 text-[#0D4F3C]" />
                <p className="mt-2 text-sm font-medium text-slate-900">No companies saved yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/70">
                {recentCompanies.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onOpenLead(lead)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-3.5 text-left hover:bg-white/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {lead.companyName}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-mono tabular-nums">{lead.gstin}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {lead.city}, {lead.state}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          GM: {lead.gmName} · MM: {lead.mmName} · TSE: {lead.tseName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`rounded-lg border px-2.5 py-0.5 text-xs font-medium ${
                          lead.entityType === 'customer'
                            ? 'border-emerald-200/80 bg-emerald-50/90 text-[#0D4F3C]'
                            : 'border-amber-200/80 bg-amber-50/90 text-amber-800'
                        }`}
                      >
                        {lead.entityType === 'customer' ? 'Customer' : 'Vendor'}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#0D4F3C]/70" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="lg:col-span-5 glass-surface rounded-2xl overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Recent Updates
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {recentEvents.length} latest
                </span>
              </div>

              {recentEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No updates recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-200/70">
                  {recentEvents.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onOpenLead(ev.lead)}
                      className="flex w-full items-start gap-3 px-6 py-3.5 text-left hover:bg-white/60 transition-colors"
                    >
                      <div className="mt-0.5 rounded-lg border border-white/80 bg-white/75 p-1.5 text-[#0D4F3C] shrink-0">
                        <UserCheck className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {ev.action} — {ev.companyName}
                          </span>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                            {formatShortDate(ev.timestamp)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600 line-clamp-1">
                          {ev.actorName}
                          {ev.detail ? ` · ${ev.detail}` : ''}
                        </p>
                        <span className="mt-0.5 block text-[11px] text-slate-400 tabular-nums">
                          {formatDateTime(ev.timestamp)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="m-4 rounded-2xl mobile-hero-emerald p-5 text-white flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-100/85">
                  Company KYC Vault
                </div>
                <div className="mt-1 font-display text-base font-bold leading-snug">
                  Save new Customer or Vendor details
                </div>
              </div>
              <button
                type="button"
                onClick={onCreateNew}
                className="rounded-xl bg-[#A3F046] px-4 py-2 text-xs font-bold text-[#073326] hover:bg-[#b5f564] transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                + New KYC
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
