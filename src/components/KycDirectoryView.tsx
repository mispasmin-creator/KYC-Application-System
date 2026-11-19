import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Phone,
  Plus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  EntityType,
  KycLead,
  SALESPERSON_CATEGORIES,
  SalespersonCategory,
  TeamMember,
} from '../types/kyc';
import { filterNonAdminMembers } from '../utils/teamAccessUtils';
import { isUnregisteredGstin, validateGstin } from '../utils/validators';
import { CustomSelect } from './CustomSelect';
import { KycCompanyCard } from './KycCompanyCard';

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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageSizeInput, setPageSizeInput] = useState<string>('10');
  const [pageInput, setPageInput] = useState<string>('1');

  useEffect(() => {
    setEntityFilter(initialEntityFilter);
  }, [initialEntityFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [entityFilter, salespersonFilter, categoryFilter, globalSearchQuery]);

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

  const totalRecords = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalRecords === 0 ? 0 : (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);

  const paginatedLeads = useMemo(() => {
    return filteredLeads.slice(startIndex, endIndex);
  }, [filteredLeads, startIndex, endIndex]);

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }
    if (safePage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
  };

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);

  useEffect(() => {
    setPageInput(String(safePage));
  }, [safePage]);

  const handlePageSizeChange = (val: string) => {
    setPageSizeInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setPageSize(Math.min(500, parsed));
      setCurrentPage(1);
    }
  };

  const handlePageSizeBlur = () => {
    const parsed = parseInt(pageSizeInput, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setPageSizeInput(String(pageSize));
    } else {
      const clamped = Math.min(500, Math.max(1, parsed));
      setPageSize(clamped);
      setPageSizeInput(String(clamped));
      setCurrentPage(1);
    }
  };

  const handlePageInputSubmit = (val: string) => {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      setCurrentPage(parsed);
      setPageInput(String(parsed));
    } else {
      setPageInput(String(safePage));
    }
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
      <div className="glass-surface rounded-2xl p-3 sm:p-4 relative z-30">
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
            <div className="flex-1 sm:w-56 sm:flex-none">
              <CustomSelect
                ariaLabel="Filter by salesperson"
                value={salespersonFilter}
                onChange={setSalespersonFilter}
                align="right"
                options={[
                  { value: 'all', label: 'All Salespersons' },
                  ...salespersons.map((sp) => ({ value: sp.id, label: sp.name })),
                ]}
                placeholder="All Salespersons"
                buttonClassName="min-h-[40px] border-white/85 bg-white/85 text-xs shadow-xs"
              />
            </div>

            <div className="flex-1 sm:w-48 sm:flex-none">
              <CustomSelect
                ariaLabel="Filter by salesperson category"
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val as 'all' | SalespersonCategory)}
                align="right"
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...SALESPERSON_CATEGORIES.filter((cat) => cat.value !== 'ADMIN').map((cat) => ({
                    value: cat.value,
                    label: `${cat.label} — ${cat.fullTitle}`,
                    badge: cat.label,
                  })),
                ]}
                placeholder="All Categories"
                buttonClassName="min-h-[40px] border-white/85 bg-white/85 text-xs shadow-xs"
              />
            </div>

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
        <div className="glass-surface rounded-2xl p-10 text-center relative z-10">
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
          <div className="md:hidden space-y-3 relative z-10">
            {paginatedLeads.map((lead) => (
              <KycCompanyCard
                key={lead.id}
                lead={lead}
                onClick={onOpenLead}
              />
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block glass-surface rounded-2xl overflow-hidden relative z-10">
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
                  {paginatedLeads.map((lead) => {
                    const unregistered = isUnregisteredGstin(lead.gstin);
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
                            {unregistered ? lead.gstin || 'URP' : lead.gstin}
                          </div>
                          <div
                            className={`mt-0.5 text-[11px] ${
                              unregistered
                                ? 'text-slate-500 font-medium'
                                : gstCheck.valid
                                  ? 'text-emerald-700'
                                  : 'text-rose-700'
                            }`}
                          >
                            {unregistered
                              ? 'Unregistered (No GST)'
                              : gstCheck.valid
                                ? gstCheck.stateName
                                : 'Check GSTIN'}
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

          {/* Pagination Controls */}
          {totalRecords > 0 && (
            <div className="glass-surface rounded-2xl px-4 sm:px-5 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600 relative z-10 shadow-xs">
              {/* Left Side: Records summary + Manual Rows Input + Presets */}
              <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
                <span>
                  Showing <strong className="font-semibold text-slate-900">{startIndex + 1}</strong> to{' '}
                  <strong className="font-semibold text-slate-900">{endIndex}</strong> of{' '}
                  <strong className="font-semibold text-slate-900">{totalRecords}</strong> records
                </span>

                <span className="text-slate-300 hidden sm:inline">|</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Rows:</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={pageSizeInput}
                    onChange={(e) => handlePageSizeChange(e.target.value)}
                    onBlur={handlePageSizeBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="h-8 w-14 rounded-lg border border-slate-300 bg-white px-1 text-center font-mono text-xs font-bold text-slate-900 shadow-2xs hover:border-[#0D4F3C] focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20 transition-colors"
                    title="Enter custom rows per page"
                    placeholder="10"
                  />
                  <div className="inline-flex items-center gap-1">
                    {[10, 25, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setPageSize(preset);
                          setPageSizeInput(String(preset));
                          setCurrentPage(1);
                        }}
                        className={`h-7 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                          pageSize === preset
                            ? 'bg-[#0D4F3C] text-white shadow-2xs'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Page navigation + Manual Page jump */}
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5 mr-1">
                    <span className="text-slate-500 font-medium hidden sm:inline">Page:</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onBlur={() => handlePageInputSubmit(pageInput)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handlePageInputSubmit(pageInput);
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="h-8 w-12 rounded-lg border border-slate-300 bg-white px-1 text-center font-mono text-xs font-bold text-slate-900 shadow-2xs hover:border-[#0D4F3C] focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20 transition-colors"
                      title="Type page number to jump directly"
                    />
                    <span className="text-slate-500">/ {totalPages}</span>
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 shadow-2xs"
                      title="Previous page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((num, idx) =>
                        num === '...' ? (
                          <span key={`dots-${idx}`} className="px-1 text-slate-400 select-none">
                            …
                          </span>
                        ) : (
                          <button
                            key={`page-${num}`}
                            type="button"
                            onClick={() => setCurrentPage(Number(num))}
                            className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-semibold transition-all ${
                              safePage === num
                                ? 'bg-[#0D4F3C] text-white shadow-xs'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs'
                            }`}
                          >
                            {num}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 shadow-2xs"
                      title="Next page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
