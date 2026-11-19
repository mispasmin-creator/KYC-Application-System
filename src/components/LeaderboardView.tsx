import {
  ArrowUpRight,
  Award,
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  KycLead,
  MasterSalesPerson,
  SalespersonCategory,
  TeamMember,
} from '../types/kyc';
import {
  formatCategoryBadge,
  isLeadSubmittedBySalesperson,
  isProtectedAdminMember,
} from '../utils/teamAccessUtils';
import { formatShortDate, isUnregisteredGstin } from '../utils/validators';

interface LeaderboardViewProps {
  leads: KycLead[];
  teamMembers?: TeamMember[];
  masterTeam?: MasterSalesPerson[];
  activeUser: TeamMember;
  globalSearchQuery: string;
  onOpenLead?: (lead: KycLead) => void;
  onNavigateToDirectory?: (salespersonName: string) => void;
}

interface RepStats {
  member: TeamMember;
  leads: KycLead[];
  totalCompanies: number;
  customerCount: number;
  vendorCount: number;
  totalBranchesBrought: number;
}

export function LeaderboardView({
  leads,
  masterTeam = [],
  activeUser,
  globalSearchQuery,
  onOpenLead,
  onNavigateToDirectory,
}: LeaderboardViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | SalespersonCategory>('all');
  const [selectedMemberStats, setSelectedMemberStats] = useState<RepStats | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageSizeInput, setPageSizeInput] = useState<string>('10');
  const [pageInput, setPageInput] = useState<string>('1');

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, globalSearchQuery]);

  const salesTeamMembers = useMemo(() => {
    const list: TeamMember[] = [];
    const seenNames = new Set<string>();

    // 1. Official Master Sheet sales team members (GM, MM, TSE) — pure Master roster data
    for (const mp of masterTeam) {
      const nameKey = mp.name.trim().toLowerCase();
      if (!nameKey || seenNames.has(nameKey)) continue;
      seenNames.add(nameKey);
      list.push({
        id: mp.id,
        name: mp.name.trim(),
        email: '',
        phone: '',
        role: mp.category === 'GM' ? 'manager' : 'salesperson',
        salespersonCategory: mp.category,
        territory: mp.firm.trim() || '—',
        status: 'active',
        allowedPages: ['overview', 'directory', 'leaderboard'],
      });
    }

    // 2. Any sales reps assigned in existing KYC records who are not yet in masterTeam
    for (const lead of leads) {
      const reps: Array<{ name: string; category: SalespersonCategory }> = [
        { name: lead.gmName, category: 'GM' },
        { name: lead.mmName, category: 'MM' },
        { name: lead.tseName, category: 'TSE' },
        { name: lead.salespersonName, category: lead.salespersonCategory || 'TSE' },
      ];
      for (const rep of reps) {
        const cleanName = rep.name.trim();
        const nameKey = cleanName.toLowerCase();
        if (!nameKey || seenNames.has(nameKey) || rep.category === 'ADMIN') continue;
        seenNames.add(nameKey);
        list.push({
          id: `lead-rep-${nameKey.replace(/[^a-z0-9]/g, '-')}`,
          name: cleanName,
          email: '',
          phone: '',
          role: rep.category === 'GM' ? 'manager' : 'salesperson',
          salespersonCategory: rep.category,
          territory: '—',
          status: 'active',
          allowedPages: ['overview', 'directory', 'leaderboard'],
        });
      }
    }

    // When a non-admin user is logged in, restrict the roster and performance view to their own account
    if (!isProtectedAdminMember(activeUser)) {
      const activeName = activeUser.name.trim().toLowerCase();
      const activeId = activeUser.id ? String(activeUser.id).trim().toLowerCase() : '';
      const scoped = list.filter(
        (m) =>
          (activeId && m.id.trim().toLowerCase() === activeId) ||
          (activeName && m.name.trim().toLowerCase() === activeName)
      );
      if (scoped.length > 0) {
        return scoped;
      }
      return [activeUser];
    }

    return list;
  }, [masterTeam, leads, activeUser]);

  const repRows: RepStats[] = useMemo(() => {
    return salesTeamMembers
      .filter((member) =>
        categoryFilter === 'all' ? true : member.salespersonCategory === categoryFilter
      )
      .map((member) => {
        // Strictly count KYC records submitted/filled by this salesperson user account
        // Do NOT count members merely selected as GM, MM, or TSE in the form
        const repLeads = leads.filter((l) => isLeadSubmittedBySalesperson(l, member));
        const totalCompanies = repLeads.length;
        const customerCount = repLeads.filter((l) => l.entityType === 'customer').length;
        const vendorCount = repLeads.filter((l) => l.entityType === 'vendor').length;
        const totalBranchesBrought = repLeads.reduce((sum, l) => sum + l.branchCount, 0);

        return {
          member,
          leads: repLeads,
          totalCompanies,
          customerCount,
          vendorCount,
          totalBranchesBrought,
        };
      })
      .filter((row) => {
        const q = globalSearchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          row.totalCompanies > 0 ||
          row.member.name.toLowerCase().includes(q) ||
          row.member.territory.toLowerCase().includes(q) ||
          row.member.salespersonCategory.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (b.totalCompanies !== a.totalCompanies) return b.totalCompanies - a.totalCompanies;
        if (b.totalBranchesBrought !== a.totalBranchesBrought) {
          return b.totalBranchesBrought - a.totalBranchesBrought;
        }
        return a.member.name.localeCompare(b.member.name);
      });
  }, [leads, salesTeamMembers, globalSearchQuery, categoryFilter]);

  const topContributor = repRows.find((r) => r.totalCompanies > 0) ?? repRows[0];
  const totalMappedBranches = leads.reduce((sum, l) => sum + l.branchCount, 0);

  const totalRecords = repRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalRecords === 0 ? 0 : (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);

  const paginatedReps = useMemo(() => {
    return repRows.slice(startIndex, endIndex);
  }, [repRows, startIndex, endIndex]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="hidden md:block font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Sales Team & KYC Records
        </h1>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 w-full md:w-auto">
          <div className="inline-flex flex-1 sm:flex-none items-center rounded-xl border border-white/80 bg-white/60 backdrop-blur-md p-1">
            {(['all', 'GM', 'MM', 'TSE'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`flex-1 sm:flex-none min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-white text-[#0D4F3C] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Summary Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="glass-surface rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100/90 text-amber-600">
            <Award className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Top KYC Contributor
            </div>
            <div className="mt-1 font-display text-lg font-bold text-slate-900 truncate">
              {topContributor ? topContributor.member.name : '—'}
            </div>
            <div className="mt-0.5 text-xs text-slate-600 tabular-nums">
              {topContributor
                ? `${topContributor.totalCompanies} companies · ${topContributor.totalBranchesBrought} branches`
                : 'No data yet'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:contents">
          <div className="glass-surface rounded-2xl p-4 sm:p-5 flex items-start gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100/90 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Team Roster
              </div>
              <div className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                {salesTeamMembers.length}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-600 tabular-nums truncate">
                {salesTeamMembers.filter((m) => m.salespersonCategory === 'GM').length} GM ·{' '}
                {salesTeamMembers.filter((m) => m.salespersonCategory === 'MM').length} MM ·{' '}
                {salesTeamMembers.filter((m) => m.salespersonCategory === 'TSE').length} TSE
              </div>
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-4 sm:p-5 flex items-start gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F6EE] text-[#0D4F3C]">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Branches
              </div>
              <div className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                {totalMappedBranches}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-600 tabular-nums truncate">
                {leads.length} companies
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {repRows.length === 0 ? (
          <div className="glass-surface rounded-2xl p-8 text-center text-xs text-slate-500">
            {globalSearchQuery.trim()
              ? `No team members match "${globalSearchQuery.trim()}".`
              : 'No team members added yet.'}
          </div>
        ) : (
          paginatedReps.map((row, index) => {
            const isProtectedAdmin = isProtectedAdminMember(row.member);
            const rank = startIndex + index + 1;
            return (
              <div
                key={row.member.id}
                onClick={() => setSelectedMemberStats(row)}
                className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 p-4 shadow-[0_4px_16px_-4px_rgba(15,76,82,0.06)] space-y-3 cursor-pointer active:scale-[0.99] hover:border-emerald-400 transition-all"
                title={`Click to view clients of ${row.member.name}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                          rank === 1
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : rank === 2
                              ? 'bg-slate-100 text-slate-800 border border-slate-300'
                              : rank === 3
                                ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        No. {rank}
                      </span>
                      <span className="font-display text-sm font-bold text-slate-950 truncate">
                        {row.member.name}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                          isProtectedAdmin
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-[#E8F6EE] text-[#0D4F3C] border border-emerald-200'
                        }`}
                      >
                        {formatCategoryBadge(row.member.salespersonCategory, row.member.name)}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                      {row.member.territory && (
                        <span className="font-medium text-slate-700">{row.member.territory}</span>
                      )}
                      {row.member.territory && (row.member.phone || row.member.email) && (
                        <span>·</span>
                      )}
                      {(row.member.phone || row.member.email) && (
                        <span className="font-mono text-[11px] text-slate-500">
                          {row.member.phone || row.member.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {row.totalCompanies > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F6EE] px-2.5 py-1 text-[11px] font-bold text-[#0D4F3C]">
                        <span>{row.totalCompanies} Clients</span>
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">0 Clients</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-center text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total</div>
                    <div className="font-mono font-bold text-slate-900 text-sm tabular-nums mt-0.5">
                      {row.totalCompanies}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cust</div>
                    <div className="font-mono font-bold text-[#0D4F3C] text-sm tabular-nums mt-0.5">
                      {row.customerCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Vend</div>
                    <div className="font-mono font-bold text-amber-700 text-sm tabular-nums mt-0.5">
                      {row.vendorCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Sites</div>
                    <div className="font-mono font-bold text-slate-700 text-sm tabular-nums mt-0.5">
                      {row.totalBranchesBrought}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass-surface rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 bg-emerald-950/[0.03] text-xs font-semibold text-slate-600">
                <th className="py-3.5 px-4 whitespace-nowrap">Team Member</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Territory</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right">Total KYC</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right">Customers</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right">Vendors</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right">Branches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {repRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-xs text-slate-500">
                    {globalSearchQuery.trim()
                      ? `No team members match "${globalSearchQuery.trim()}".`
                      : 'No team members added yet.'}
                  </td>
                </tr>
              ) : (
                paginatedReps.map((row, index) => {
                  const isProtectedAdmin = isProtectedAdminMember(row.member);
                  const rank = startIndex + index + 1;
                  return (
                    <tr
                      key={row.member.id}
                      onClick={() => setSelectedMemberStats(row)}
                      className="hover:bg-emerald-50/60 transition-colors cursor-pointer group"
                      title={`Click to view clients filled by ${row.member.name}`}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums shrink-0 min-w-[54px]">
                            No. {rank}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 group-hover:text-[#0D4F3C] transition-colors">
                                {row.member.name}
                              </span>
                              {row.totalCompanies > 0 && (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-[#E8F6EE] px-1.5 py-0.5 text-[10px] font-bold text-[#0D4F3C]">
                                  <span>{row.totalCompanies} Clients</span>
                                  <ArrowUpRight className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                              {row.member.phone || row.member.email || (row.totalCompanies > 0 ? 'Click to view client list' : 'No clients submitted')}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-0.5 font-mono text-xs font-semibold ${
                            isProtectedAdmin
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              : 'border-emerald-200/80 bg-emerald-50/90 text-[#0D4F3C]'
                          }`}
                        >
                          {formatCategoryBadge(row.member.salespersonCategory, row.member.name)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {row.member.territory || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {row.totalCompanies}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs text-[#0D4F3C] tabular-nums">
                        {row.customerCount}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs text-amber-700 tabular-nums">
                        {row.vendorCount}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {row.totalBranchesBrought}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalRecords > 0 && (
        <div className="glass-surface rounded-2xl px-4 sm:px-5 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600 relative z-10 shadow-xs">
          {/* Left Side: Summary + Manual Rows Input + Presets */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <span>
              Showing <strong className="font-semibold text-slate-900">{startIndex + 1}</strong> to{' '}
              <strong className="font-semibold text-slate-900">{endIndex}</strong> of{' '}
              <strong className="font-semibold text-slate-900">{totalRecords}</strong> team members
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

      {/* Member Clients Drill-Down Modal */}
      {selectedMemberStats && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedMemberStats(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Clients of ${selectedMemberStats.member.name}`}
        >
          <div className="w-full max-w-2xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#F0F6F5] border border-white/90 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Mobile Drag Pill */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-white/95">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-4">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 truncate">
                    {selectedMemberStats.member.name}
                  </h2>
                  <span className="inline-flex rounded-md border border-emerald-200/80 bg-emerald-50/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#0D4F3C]">
                    {formatCategoryBadge(
                      selectedMemberStats.member.salespersonCategory,
                      selectedMemberStats.member.name
                    )}
                  </span>
                  {selectedMemberStats.member.territory && selectedMemberStats.member.territory !== '—' && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{selectedMemberStats.member.territory}</span>
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Total {selectedMemberStats.leads.length}{' '}
                  {selectedMemberStats.leads.length === 1 ? 'Client Company' : 'Client Companies'}{' '}
                  submitted under this user ID
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMemberStats(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 shrink-0"
                aria-label="Close client list"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Stats Strip */}
            {selectedMemberStats.leads.length > 0 && (
              <div className="grid grid-cols-3 border-b border-slate-200/70 bg-white px-4 sm:px-6 py-2.5 text-center text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total KYC</span>
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {selectedMemberStats.totalCompanies}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Customers</span>
                  <span className="font-mono text-sm font-bold text-[#0D4F3C] tabular-nums">
                    {selectedMemberStats.customerCount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Vendors</span>
                  <span className="font-mono text-sm font-bold text-amber-700 tabular-nums">
                    {selectedMemberStats.vendorCount}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Body - List of Clients */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {selectedMemberStats.leads.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    No KYC Entries Found
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    {selectedMemberStats.member.name} ke user ID se abhi tak koi KYC form fill nahi hua hai.
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    (Form me GM, MM ya TSE select hone par credit count nahi hota; credit sirf form submit karne wale user ko milta hai.)
                  </p>
                </div>
              ) : (
                selectedMemberStats.leads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => {
                      setSelectedMemberStats(null);
                      onOpenLead?.(lead);
                    }}
                    className="group rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-[#0D4F3C] hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${
                              lead.entityType === 'vendor'
                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                : 'border-emerald-200 bg-[#E8F6EE] text-[#0D4F3C]'
                            }`}
                          >
                            {lead.entityType === 'vendor' ? 'Vendor' : 'Customer'}
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#0D4F3C]">
                            {lead.id}
                          </span>
                          <span className="text-[11px] text-slate-400">·</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Saved on {formatShortDate(lead.createdAt)}
                          </span>
                        </div>

                        <h4 className="mt-1.5 font-display text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0D4F3C] transition-colors">
                          {lead.companyName}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {lead.industry}
                        </p>
                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400 group-hover:bg-[#0D4F3C] group-hover:text-white transition-colors shrink-0">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {isUnregisteredGstin(lead.gstin) ? 'GST Status & Location' : 'GSTIN & Location'}
                        </span>
                        <div className="font-mono text-xs text-slate-800 font-semibold mt-0.5">
                          {isUnregisteredGstin(lead.gstin) ? `${lead.gstin || 'URP'} (Unregistered)` : lead.gstin}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {lead.city}, {lead.state} ({lead.branchCount} {lead.branchCount === 1 ? 'branch' : 'branches'})
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Contact & Sales Team</span>
                        <div className="text-xs text-slate-800 font-medium mt-0.5 truncate">
                          Mgr: {lead.managerName || '—'} {lead.managerPhone ? `(${lead.managerPhone})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          GM: {lead.gmName || '—'} · MM: {lead.mmName || '—'} · TSE: {lead.tseName || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200/80 bg-white/95 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              {selectedMemberStats.leads.length > 0 && onNavigateToDirectory && (
                <button
                  type="button"
                  onClick={() => {
                    const memberName = selectedMemberStats.member.name;
                    setSelectedMemberStats(null);
                    onNavigateToDirectory(memberName);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-[#0D4F3C] hover:bg-emerald-100 transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Open in KYC Directory</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedMemberStats(null)}
                className="ml-auto min-h-[38px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
