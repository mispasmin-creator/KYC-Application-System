import { Award, Building2, Plus, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  KycLead,
  SALESPERSON_CATEGORIES,
  SalespersonCategory,
  TeamMember,
} from '../types/kyc';
import { isValidIndianPhone, normalizeIndianPhone } from '../utils/validators';

interface LeaderboardViewProps {
  leads: KycLead[];
  teamMembers: TeamMember[];
  activeUser: TeamMember;
  globalSearchQuery: string;
  onAddTeamMember: (member: Omit<TeamMember, 'id'>) => void;
  onDeleteTeamMember: (member: TeamMember) => void;
}

interface RepStats {
  member: TeamMember;
  totalCompanies: number;
  customerCount: number;
  vendorCount: number;
  totalBranchesBrought: number;
}

export function LeaderboardView({
  leads,
  teamMembers,
  activeUser,
  globalSearchQuery,
  onAddTeamMember,
  onDeleteTeamMember,
}: LeaderboardViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [territory, setTerritory] = useState('');
  const [password, setPassword] = useState('');
  const [salespersonCategory, setSalespersonCategory] = useState<SalespersonCategory>('TSE');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SalespersonCategory>('all');
  const [formError, setFormError] = useState('');

  const repRows: RepStats[] = useMemo(() => {
    return teamMembers
      .filter((member) =>
        categoryFilter === 'all' ? true : member.salespersonCategory === categoryFilter
      )
      .map((member) => {
        const lowerName = member.name.trim().toLowerCase();
        const repLeads = leads.filter(
          (l) =>
            (l.salespersonId && l.salespersonId === member.id) ||
            (l.gmId && l.gmId === member.id) ||
            (l.mmId && l.mmId === member.id) ||
            (l.tseId && l.tseId === member.id) ||
            l.gmName.trim().toLowerCase() === lowerName ||
            l.mmName.trim().toLowerCase() === lowerName ||
            l.tseName.trim().toLowerCase() === lowerName
        );
        const totalCompanies = repLeads.length;
        const customerCount = repLeads.filter((l) => l.entityType === 'customer').length;
        const vendorCount = repLeads.filter((l) => l.entityType === 'vendor').length;
        const totalBranchesBrought = repLeads.reduce((sum, l) => sum + l.branchCount, 0);

        return {
          member,
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
  }, [leads, teamMembers, globalSearchQuery, categoryFilter]);

  const topContributor = repRows.find((r) => r.totalCompanies > 0) ?? repRows[0];
  const totalMappedBranches = leads.reduce((sum, l) => sum + l.branchCount, 0);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setFormError('Please enter a valid full name.');
      return;
    }
    if (!isValidIndianPhone(phone)) {
      setFormError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid work email.');
      return;
    }
    if (!territory.trim()) {
      setFormError('Please specify a territory or zone.');
      return;
    }
    if (password.trim().length < 6) {
      setFormError('Please set a login password of at least 6 characters.');
      return;
    }
    onAddTeamMember({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizeIndianPhone(phone),
      role: salespersonCategory === 'GM' ? 'manager' : 'salesperson',
      salespersonCategory,
      territory: territory.trim(),
      password: password.trim(),
    });
    setName('');
    setEmail('');
    setPhone('');
    setTerritory('');
    setPassword('');
    setSalespersonCategory('TSE');
    setFormError('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="hidden md:block font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Sales Team & KYC Records
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-2.5 w-full md:w-auto">
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

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[#0D4F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] shadow-[0_6px_16px_-4px_rgba(13,79,60,0.4)] transition-all whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? 'Cancel' : 'Add Member'}</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="glass-surface rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Add Sales Team Member
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Karan Malhotra"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mobile *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Work Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.in"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Territory *</label>
              <input
                type="text"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                placeholder="e.g. Gujarat & West"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={salespersonCategory}
                onChange={(e) => setSalespersonCategory(e.target.value as SalespersonCategory)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-xs text-slate-900 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
              >
                {SALESPERSON_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} — {cat.fullTitle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Login Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
              />
            </div>
          </div>
          {formError && <p className="text-xs text-rose-700">{formError}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#0D4F3C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] transition-all"
            >
              Save Team Member
            </button>
          </div>
        </form>
      )}

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
                {teamMembers.length}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-600 tabular-nums truncate">
                {teamMembers.filter((m) => m.salespersonCategory === 'GM').length} GM ·{' '}
                {teamMembers.filter((m) => m.salespersonCategory === 'MM').length} MM ·{' '}
                {teamMembers.filter((m) => m.salespersonCategory === 'TSE').length} TSE
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
          repRows.map((row, index) => (
            <div
              key={row.member.id}
              className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{index + 1}
                    </span>
                    <span className="font-display text-sm font-bold text-slate-900 truncate">
                      {row.member.name}
                    </span>
                    <span className="rounded-md bg-[#E8F6EE] px-2 py-0.5 font-mono text-[10px] font-bold text-[#0D4F3C]">
                      {row.member.salespersonCategory}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {row.member.territory} · {row.member.phone || row.member.email}
                  </div>
                </div>

                {row.member.id !== activeUser.id && (
                  <button
                    type="button"
                    onClick={() => onDeleteTeamMember(row.member)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50/70 text-rose-700 active:scale-95 transition-transform shrink-0"
                    aria-label={`Remove ${row.member.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Total</div>
                  <div className="font-mono font-bold text-slate-900 tabular-nums">
                    {row.totalCompanies}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Cust</div>
                  <div className="font-mono font-bold text-[#0D4F3C] tabular-nums">
                    {row.customerCount}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Vend</div>
                  <div className="font-mono font-bold text-amber-700 tabular-nums">
                    {row.vendorCount}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Sites</div>
                  <div className="font-mono font-bold text-slate-700 tabular-nums">
                    {row.totalBranchesBrought}
                  </div>
                </div>
              </div>
            </div>
          ))
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
                <th className="py-3.5 px-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {repRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-4 text-center text-xs text-slate-500">
                    {globalSearchQuery.trim()
                      ? `No team members match "${globalSearchQuery.trim()}".`
                      : 'No team members added yet.'}
                  </td>
                </tr>
              ) : (
                repRows.map((row, index) => (
                  <tr key={row.member.id} className="hover:bg-white/65 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-semibold text-slate-400 tabular-nums w-5">
                          #{index + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">{row.member.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                            {row.member.phone || row.member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-0.5 font-mono text-xs font-semibold text-[#0D4F3C]">
                        {row.member.salespersonCategory}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {row.member.territory}
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

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {row.member.id !== activeUser.id ? (
                        <button
                          type="button"
                          onClick={() => onDeleteTeamMember(row.member)}
                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          title={`Remove ${row.member.name}`}
                          aria-label={`Remove ${row.member.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-[#0D4F3C]">Active</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
