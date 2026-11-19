import { ArrowUpRight, FileSpreadsheet, Phone, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  EntityType,
  KycLead,
  SALESPERSON_CATEGORIES,
  SalespersonCategory,
  TeamMember,
} from '../types/kyc';
import { filterNonAdminMembers } from '../utils/teamAccessUtils';
import { validateGstin } from '../utils/validators';

interface KycDirectoryViewProps {
  leads: KycLead[];
  totalLeadsCount: number;
  teamMembers: TeamMember[];
  initialEntityFilter?: 'all' | EntityType;
  globalSearchQuery: string;
  onClearGlobalSearch: () => void;
  onOpenLead: (lead: KycLead) => void;
  onCreateNew: () => void;
  onExportFiltered: (filtered: KycLead[]) => void;
}

export function KycDirectoryView({
  leads,
  totalLeadsCount,
  teamMembers,
  initialEntityFilter = 'all',
  globalSearchQuery,
  onClearGlobalSearch,
  onOpenLead,
  onCreateNew,
  onExportFiltered,
}: KycDirectoryViewProps) {
  const [entityFilter, setEntityFilter] = useState<'all' | EntityType>(initialEntityFilter);
  const [salespersonFilter, setSalespersonFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SalespersonCategory>('all');

  useEffect(() => {
    setEntityFilter(initialEntityFilter);
  }, [initialEntityFilter]);

  const salespersons = useMemo(() => {
    const entries = new Map<string, string>();
    filterNonAdminMembers(teamMembers).forEach((m) => {
      entries.set(`id:${m.id}`, `${m.name} (${m.salespersonCategory})`);
    });
    leads.forEach((l) => {
      if (l.gmName && (!l.gmId || !entries.has(`id:${l.gmId}`))) {
        entries.set(l.gmId ? `id:${l.gmId}` : `name:${l.gmName.toLowerCase()}`, `${l.gmName} (GM)`);
      }
      if (l.mmName && (!l.mmId || !entries.has(`id:${l.mmId}`))) {
        entries.set(l.mmId ? `id:${l.mmId}` : `name:${l.mmName.toLowerCase()}`, `${l.mmName} (MM)`);
      }
      if (l.tseName && (!l.tseId || !entries.has(`id:${l.tseId}`))) {
        entries.set(
          l.tseId ? `id:${l.tseId}` : `name:${l.tseName.toLowerCase()}`,
          `${l.tseName} (TSE)`
        );
      }
    });
    return Array.from(entries.entries()).map(([key, name]) => ({ id: key, name }));
  }, [leads, teamMembers]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (entityFilter !== 'all' && lead.entityType !== entityFilter) return false;
      if (salespersonFilter !== 'all') {
        if (salespersonFilter.startsWith('id:')) {
          const targetId = salespersonFilter.slice(3);
          const matchedMember = teamMembers.find((m) => m.id === targetId);
          const lowerMemberName = matchedMember?.name.trim().toLowerCase() ?? '';
          const matchesId =
            lead.salespersonId === targetId ||
            lead.gmId === targetId ||
            lead.mmId === targetId ||
            lead.tseId === targetId;
          const matchesName =
            Boolean(lowerMemberName) &&
            (lead.gmName.trim().toLowerCase() === lowerMemberName ||
              lead.mmName.trim().toLowerCase() === lowerMemberName ||
              lead.tseName.trim().toLowerCase() === lowerMemberName);
          if (!matchesId && !matchesName) return false;
        } else if (salespersonFilter.startsWith('name:')) {
          const targetName = salespersonFilter.slice(5);
          const matchesName =
            lead.gmName.trim().toLowerCase() === targetName ||
            lead.mmName.trim().toLowerCase() === targetName ||
            lead.tseName.trim().toLowerCase() === targetName;
          if (!matchesName) return false;
        }
      }
      if (categoryFilter !== 'all' && lead.salespersonCategory !== categoryFilter) return false;
      return true;
    });
  }, [leads, teamMembers, entityFilter, salespersonFilter, categoryFilter]);

  const hasActiveFilters =
    globalSearchQuery.trim() !== '' ||
    entityFilter !== 'all' ||
    salespersonFilter !== 'all' ||
    categoryFilter !== 'all';

  const clearFilters = () => {
    onClearGlobalSearch();
    setEntityFilter('all');
    setSalespersonFilter('all');
    setCategoryFilter('all');
  };

  return (
    <div className="space-y-5">
      {/* Mobile Feature Banner matching reference screen 2 */}
      <div className="md:hidden mobile-hero-emerald rounded-3xl p-5 text-white flex items-center justify-between gap-3 shadow-[0_14px_30px_-14px_rgba(13,79,60,0.45)]">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-100/80">
            Company KYC Vault
          </div>
          <div className="mt-1 font-display text-xl font-bold leading-snug tabular-nums">
            {filteredLeads.length} Saved {filteredLeads.length === 1 ? 'Company' : 'Companies'}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onExportFiltered(filteredLeads)}
            disabled={filteredLeads.length === 0}
            aria-label="Export CSV"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 border border-white/20 text-white disabled:opacity-40 active:scale-95 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#A3F046]" />
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="min-h-[44px] inline-flex items-center gap-1 rounded-full bg-[#A3F046] px-4 py-2 text-xs font-bold text-[#073326] active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Customer & Vendor KYC Directory
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onExportFiltered(filteredLeads)}
            disabled={filteredLeads.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/85 bg-white/75 backdrop-blur-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#0D4F3C]" />
            <span>Export CSV ({filteredLeads.length})</span>
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0D4F3C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#093b2d] shadow-[0_8px_18px_-6px_rgba(13,79,60,0.45)] transition-all whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New KYC Entry</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-surface rounded-2xl p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex w-full sm:w-auto items-center rounded-xl border border-white/80 bg-emerald-950/[0.04] p-1">
            {(['all', 'customer', 'vendor'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEntityFilter(type)}
                className={`flex-1 sm:flex-none min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                  entityFilter === type
                    ? 'bg-white text-[#0D4F3C] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'all' ? 'All Types' : type === 'customer' ? 'Customers' : 'Vendors'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
              aria-label="Filter by salesperson"
              className="flex-1 sm:flex-none min-h-[40px] rounded-xl border border-white/85 bg-white/85 px-3 py-1.5 text-base sm:text-xs font-medium text-slate-700 focus:border-[#0D4F3C] focus:outline-none"
            >
              <option value="all">All Salespersons</option>
              {salespersons.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | SalespersonCategory)}
              aria-label="Filter by salesperson category"
              className="flex-1 sm:flex-none min-h-[40px] rounded-xl border border-white/85 bg-white/85 px-3 py-1.5 text-base sm:text-xs font-medium text-slate-700 focus:border-[#0D4F3C] focus:outline-none"
            >
              <option value="all">All Categories</option>
              {SALESPERSON_CATEGORIES.filter((cat) => cat.value !== 'ADMIN').map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label} — {cat.fullTitle}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-[40px] text-xs font-semibold text-[#0D4F3C] hover:text-emerald-950 px-2 py-1.5 whitespace-nowrap shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredLeads.length === 0 ? (
        <div className="glass-surface rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            {totalLeadsCount === 0 ? 'No KYC records added yet' : 'No matching records found'}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreateNew}
                className="min-h-[44px] rounded-xl bg-[#0D4F3C] px-5 py-2 text-xs font-semibold text-white"
              >
                + Add First Company
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Deal-Style Cards */}
          <div className="md:hidden space-y-3">
            {filteredLeads.map((lead) => {
              const gstCheck = validateGstin(lead.gstin);
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onOpenLead(lead)}
                  className="w-full rounded-2xl bg-white border border-slate-200/80 p-4 text-left shadow-xs active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-slate-900 truncate">
                        {lead.companyName}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 truncate">
                        {lead.industry} · {lead.city}, {lead.state}
                      </div>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[#0D4F3C] shrink-0">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400">GSTIN</div>
                      <div className="font-mono font-semibold text-slate-800 truncate tabular-nums">
                        {lead.gstin}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Branches</div>
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">
                        {lead.branchCount}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400">Manager</div>
                      <div className="font-medium text-slate-800 truncate">
                        {lead.managerName || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        gstCheck.valid ? 'bg-[#A3F046]' : 'bg-amber-400'
                      }`}
                      style={{ width: gstCheck.valid ? '78%' : '45%' }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Phone className="h-3 w-3 text-[#0D4F3C]" />
                      {lead.managerPhone || '—'}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-semibold shrink-0 ${
                        lead.entityType === 'customer'
                          ? 'bg-[#0D4F3C] text-white'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {lead.entityType === 'customer' ? 'Customer' : 'Vendor'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block glass-surface rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-emerald-950/[0.03] text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-4 whitespace-nowrap">Company & Location</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Type</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">GSTIN</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-right">Branches</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Manager Contact</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Team Leader</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Sales Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {filteredLeads.map((lead) => {
                    const gstCheck = validateGstin(lead.gstin);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => onOpenLead(lead)}
                        className="cursor-pointer hover:bg-white/65 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 max-w-[260px] truncate">
                            {lead.companyName}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 whitespace-nowrap">
                            <span>{lead.industry}</span>
                            <span aria-hidden="true"> · </span>
                            <span>
                              {lead.city}, {lead.state}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-0.5 text-xs font-medium ${
                              lead.entityType === 'customer'
                                ? 'border-emerald-200/80 bg-emerald-50/90 text-[#0D4F3C]'
                                : 'border-amber-200/80 bg-amber-50/90 text-amber-800'
                            }`}
                          >
                            {lead.entityType === 'customer' ? 'Customer' : 'Vendor'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono text-xs font-medium text-slate-800 tabular-nums">
                            {lead.gstin}
                          </div>
                          <div
                            className={`mt-0.5 text-[11px] ${
                              gstCheck.valid ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {gstCheck.valid ? gstCheck.stateName : 'Check GSTIN'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {lead.branchCount}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs font-medium text-slate-900">{lead.managerName}</div>
                          <div className="font-mono text-xs text-slate-500 tabular-nums">
                            {lead.managerPhone}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs font-medium text-slate-900">
                            {lead.teamLeaderName || '—'}
                          </div>
                          <div className="font-mono text-xs text-slate-500 tabular-nums">
                            {lead.teamLeaderPhone || '—'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs font-medium text-slate-900">
                            TSE: {lead.tseName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            <span>GM: {lead.gmName}</span>
                            <span aria-hidden="true"> · </span>
                            <span>MM: {lead.mmName}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
