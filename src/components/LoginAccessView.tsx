import {
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Power,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AccountStatus,
  DEFAULT_ALLOWED_PAGES,
  NavSection,
  PAGE_ACCESS_OPTIONS,
  SALESPERSON_CATEGORIES,
  SalespersonCategory,
  TeamMember,
} from '../types/kyc';
import { formatCategoryBadge, isProtectedAdminMember } from '../utils/teamAccessUtils';
import { CustomSelect } from './CustomSelect';

interface LoginAccessViewProps {
  teamMembers: TeamMember[];
  activeUser: TeamMember;
  onUpdateTeamMember: (updated: TeamMember) => void;
  onToggleStatus: (member: TeamMember, nextStatus: AccountStatus) => void;
  onAddTeamMember: (member: Omit<TeamMember, 'id'>) => void;
}

const INPUT_CLASS =
  'w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20';

export function LoginAccessView({
  teamMembers,
  activeUser,
  onUpdateTeamMember,
  onToggleStatus,
  onAddTeamMember,
}: LoginAccessViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Edit modal state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<SalespersonCategory>('TSE');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editStatus, setEditStatus] = useState<AccountStatus>('active');
  const [editAllowedPages, setEditAllowedPages] = useState<NavSection[]>(DEFAULT_ALLOWED_PAGES);
  const [editError, setEditError] = useState('');

  // Add user modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<SalespersonCategory>('TSE');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newStatus, setNewStatus] = useState<AccountStatus>('active');
  const [newAllowedPages, setNewAllowedPages] = useState<NavSection[]>(DEFAULT_ALLOWED_PAGES);
  const [addError, setAddError] = useState('');

  const activeCount = useMemo(
    () => teamMembers.filter((m) => (m.status ?? 'active') === 'active').length,
    [teamMembers]
  );
  const inactiveCount = useMemo(
    () => teamMembers.filter((m) => m.status === 'inactive').length,
    [teamMembers]
  );

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teamMembers.filter((member) => {
      const memberStatus: AccountStatus = member.status ?? 'active';
      if (statusFilter !== 'all' && memberStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        member.name.toLowerCase().includes(q) ||
        member.territory.toLowerCase().includes(q) ||
        member.salespersonCategory.toLowerCase().includes(q)
      );
    });
  }, [teamMembers, searchQuery, statusFilter]);

  const openEditModal = (member: TeamMember) => {
    if (isProtectedAdminMember(member)) return;
    setEditingMember(member);
    setEditName(member.name);
    setEditCategory(member.salespersonCategory);
    setEditPassword(member.password ?? '');
    setShowEditPassword(false);
    setEditStatus(member.status ?? 'active');
    setEditAllowedPages(
      member.allowedPages && member.allowedPages.length > 0
        ? member.allowedPages
        : DEFAULT_ALLOWED_PAGES
    );
    setEditError('');
  };

  const toggleAllowedPage = (
    current: NavSection[],
    pageId: NavSection,
    setter: (next: NavSection[]) => void
  ) => {
    if (current.includes(pageId)) {
      setter(current.filter((p) => p !== pageId));
    } else {
      setter([...current, pageId]);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || isProtectedAdminMember(editingMember)) {
      setEditingMember(null);
      return;
    }
    if (editName.trim().length < 2) {
      setEditError('Full name must be at least 2 characters.');
      return;
    }
    if (editPassword.trim().length < 6) {
      setEditError('Password must be at least 6 characters.');
      return;
    }
    if (editAllowedPages.length === 0) {
      setEditError('Select at least one page for Page Access.');
      return;
    }
    if (editingMember.id === activeUser.id && editStatus === 'inactive') {
      setEditError('You cannot deactivate the account you are currently signed in with.');
      return;
    }

    const duplicate = teamMembers.some(
      (m) =>
        m.id !== editingMember.id &&
        m.name.trim().toLowerCase() === editName.trim().toLowerCase()
    );
    if (duplicate) {
      setEditError('Another account already uses this user name.');
      return;
    }

    const resolvedPages =
      editCategory === 'ADMIN' ? [...DEFAULT_ALLOWED_PAGES] : editAllowedPages;

    onUpdateTeamMember({
      ...editingMember,
      name: editName.trim(),
      salespersonCategory: editCategory,
      role: editCategory === 'GM' || editCategory === 'ADMIN' ? 'manager' : 'salesperson',
      password: editPassword.trim(),
      status: editStatus,
      allowedPages: resolvedPages,
    });
    setEditingMember(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim().length < 2) {
      setAddError('Full name must be at least 2 characters.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setAddError('Password must be at least 6 characters.');
      return;
    }
    if (newAllowedPages.length === 0) {
      setAddError('Select at least one page for Page Access.');
      return;
    }

    const duplicate = teamMembers.some(
      (m) => m.name.trim().toLowerCase() === newName.trim().toLowerCase()
    );
    if (duplicate) {
      setAddError('An account with this user name already exists.');
      return;
    }

    const resolvedPages =
      newCategory === 'ADMIN' ? [...DEFAULT_ALLOWED_PAGES] : newAllowedPages;

    onAddTeamMember({
      name: newName.trim(),
      email: '',
      phone: '',
      role: newCategory === 'GM' || newCategory === 'ADMIN' ? 'manager' : 'salesperson',
      salespersonCategory: newCategory,
      territory: '',
      password: newPassword.trim(),
      status: newStatus,
      allowedPages: resolvedPages,
    });

    setNewName('');
    setNewCategory('TSE');
    setNewPassword('');
    setNewStatus('active');
    setNewAllowedPages(DEFAULT_ALLOWED_PAGES);
    setAddError('');
    setIsAddOpen(false);
  };

  const toggleRevealPassword = (memberId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="hidden md:block font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Login Access
        </h1>

        <button
          type="button"
          onClick={() => {
            setAddError('');
            setNewAllowedPages(DEFAULT_ALLOWED_PAGES);
            setIsAddOpen(true);
          }}
          className="ml-auto min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[#0D4F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] shadow-[0_6px_16px_-4px_rgba(13,79,60,0.4)] transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Login User</span>
        </button>
      </div>

      {/* 3-Card Summary Strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="glass-surface rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3.5">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100/90 text-indigo-600">
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {teamMembers.length}
            </div>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3.5">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100/90 text-emerald-700">
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Active
            </div>
            <div className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {activeCount}
            </div>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3.5">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-rose-100/90 text-rose-600">
            <UserX className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Disabled
            </div>
            <div className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {inactiveCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-surface rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex w-full sm:w-auto items-center rounded-xl border border-white/80 bg-emerald-950/[0.04] p-1">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`flex-1 sm:flex-none min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                statusFilter === status
                  ? 'bg-white text-[#0D4F3C] shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'all' ? 'All Users' : status === 'active' ? 'Active' : 'Deactivated'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search user or category..."
            className="w-full min-h-[40px] rounded-xl border border-white/85 bg-white/85 py-1.5 pl-9 pr-3 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none"
          />
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="glass-surface rounded-2xl p-8 text-center text-xs text-slate-500">
            No matching login accounts found.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isProtectedAdmin = isProtectedAdminMember(member);
            const isActive = isProtectedAdmin || (member.status ?? 'active') === 'active';
            const isSelf = member.id === activeUser.id;
            const isPasswordVisible = Boolean(revealedPasswords[member.id]);
            const categoryLabel = formatCategoryBadge(member.salespersonCategory, member.name);

            return (
              <div
                key={member.id}
                className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-slate-900 truncate">
                        {member.name}
                      </span>
                      {isSelf && (
                        <span className="rounded-md bg-[#E8F6EE] px-1.5 py-0.5 text-[10px] font-bold text-[#0D4F3C]">
                          You
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                          isProtectedAdmin
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                            : 'border-emerald-200/80 bg-emerald-50/90 text-[#0D4F3C]'
                        }`}
                      >
                        {categoryLabel}
                      </span>
                      {member.territory && (
                        <span className="font-mono text-[11px] text-slate-500">
                          {member.territory}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isActive ? 'Active' : 'Deactivated'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {isProtectedAdmin && (
                    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      Full Access
                    </span>
                  )}
                  {(isProtectedAdmin
                    ? DEFAULT_ALLOWED_PAGES
                    : member.allowedPages && member.allowedPages.length > 0
                      ? member.allowedPages
                      : DEFAULT_ALLOWED_PAGES
                  ).map((pageId) => {
                    const label =
                      PAGE_ACCESS_OPTIONS.find((opt) => opt.id === pageId)?.label ?? pageId;
                    return (
                      <span
                        key={pageId}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-[11px] text-slate-500">Password</span>
                  <div className="inline-flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-800">
                      {isPasswordVisible ? member.password || '—' : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleRevealPassword(member.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"
                      aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {isProtectedAdmin ? (
                  <div className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-indigo-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Full Control · Protected</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(member)}
                      className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 active:scale-[0.98] transition-transform"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    {!isSelf ? (
                      <button
                        type="button"
                        onClick={() => onToggleStatus(member, isActive ? 'inactive' : 'active')}
                        className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold active:scale-[0.98] transition-transform ${
                          isActive
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    ) : (
                      <div className="min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50 text-xs font-medium text-slate-400">
                        Current Session
                      </div>
                    )}
                  </div>
                )}
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
                <th className="py-3.5 px-4 whitespace-nowrap">User Name</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Page Access</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Password</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-xs text-slate-500">
                    No matching login accounts found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isProtectedAdmin = isProtectedAdminMember(member);
                  const isActive = isProtectedAdmin || (member.status ?? 'active') === 'active';
                  const isSelf = member.id === activeUser.id;
                  const isPasswordVisible = Boolean(revealedPasswords[member.id]);
                  const categoryLabel = formatCategoryBadge(member.salespersonCategory, member.name);
                  const pages = isProtectedAdmin
                    ? DEFAULT_ALLOWED_PAGES
                    : member.allowedPages && member.allowedPages.length > 0
                      ? member.allowedPages
                      : DEFAULT_ALLOWED_PAGES;

                  return (
                    <tr key={member.id} className="hover:bg-white/65 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{member.name}</span>
                          {isSelf && (
                            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#0D4F3C]">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-lg border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                            isProtectedAdmin
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              : 'border-emerald-200/80 bg-emerald-50/90 text-[#0D4F3C]'
                          }`}
                        >
                          {categoryLabel}
                        </span>
                        {member.territory && (
                          <span className="ml-2 text-xs text-slate-600">{member.territory}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {isProtectedAdmin && (
                            <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 whitespace-nowrap">
                              Full Access
                            </span>
                          )}
                          {pages.map((pageId) => {
                            const label =
                              PAGE_ACCESS_OPTIONS.find((opt) => opt.id === pageId)?.label ?? pageId;
                            return (
                              <span
                                key={pageId}
                                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 whitespace-nowrap"
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-700">
                            {isPasswordVisible ? member.password || '—' : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealPassword(member.id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-medium ${
                            isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <UserX className="h-3 w-3" />
                          )}
                          <span>{isActive ? 'Active' : 'Deactivated'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {isProtectedAdmin ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Full Control · Protected</span>
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(member)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#0D4F3C] hover:text-[#0D4F3C] transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() =>
                                  onToggleStatus(member, isActive ? 'inactive' : 'active')
                                }
                                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                  isActive
                                    ? 'border-rose-200 bg-rose-50/80 text-rose-700 hover:bg-rose-100'
                                    : 'border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                <Power className="h-3.5 w-3.5" />
                                <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingMember && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingMember(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Edit Login Access"
        >
          <div className="w-full max-w-lg max-h-[94dvh] sm:max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/90 bg-[#EEF5F5] shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)] pb-safe animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-white/90">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 py-3.5 sm:py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#0D4F3C]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Update User Credentials & Access
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 sm:p-6 space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Category *
                    </label>
                    <CustomSelect
                      ariaLabel="Category"
                      value={editCategory}
                      onChange={(val) => {
                        const nextCat = val as SalespersonCategory;
                        setEditCategory(nextCat);
                        if (nextCat === 'ADMIN') {
                          setEditAllowedPages([...DEFAULT_ALLOWED_PAGES]);
                        }
                      }}
                      options={SALESPERSON_CATEGORIES.map((cat) => ({
                        value: cat.value,
                        label: `${cat.label} — ${cat.fullTitle}`,
                        badge: cat.label,
                      }))}
                      placeholder="Select Category"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Account Status
                    </label>
                    <CustomSelect
                      ariaLabel="Account Status"
                      value={editStatus}
                      disabled={editingMember.id === activeUser.id}
                      onChange={(val) => setEditStatus(val as AccountStatus)}
                      options={[
                        { value: 'active', label: 'Active', badge: 'Active' },
                        { value: 'inactive', label: 'Deactivated', badge: 'Inactive' },
                      ]}
                      placeholder="Select Status"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Update Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className={`${INPUT_CLASS} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword((prev) => !prev)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-slate-400 hover:text-slate-700"
                      aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                    >
                      {showEditPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Page Access *
                    </label>
                    {editCategory === 'ADMIN' ? (
                      <span className="text-[11px] font-semibold text-indigo-700">
                        Full Access (All Pages)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setEditAllowedPages(
                            editAllowedPages.length === PAGE_ACCESS_OPTIONS.length
                              ? ['overview']
                              : [...DEFAULT_ALLOWED_PAGES]
                          )
                        }
                        className="text-[11px] font-semibold text-[#0D4F3C] hover:underline"
                      >
                        {editAllowedPages.length === PAGE_ACCESS_OPTIONS.length
                          ? 'Dashboard Only'
                          : 'Select All'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PAGE_ACCESS_OPTIONS.map((page) => {
                      const isAdmin = editCategory === 'ADMIN';
                      const checked = isAdmin || editAllowedPages.includes(page.id);
                      return (
                        <label
                          key={page.id}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors min-h-[44px] ${
                            isAdmin ? 'cursor-default opacity-90' : 'cursor-pointer'
                          } ${
                            checked
                              ? 'border-[#0D4F3C]/40 bg-[#E8F6EE]/70 text-[#0D4F3C]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isAdmin}
                            onChange={() =>
                              toggleAllowedPage(editAllowedPages, page.id, setEditAllowedPages)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-[#0D4F3C] focus:ring-[#0D4F3C]"
                          />
                          <span className="truncate">{page.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {editCategory === 'ADMIN' && (
                    <p className="mt-1.5 text-[11px] text-indigo-700">
                      Admin accounts automatically have full access to all pages and controls.
                    </p>
                  )}
                </div>
              </div>

              {editError && <p className="text-xs font-medium text-rose-700">{editError}</p>}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-[#0D4F3C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Add Login User"
        >
          <div className="w-full max-w-lg max-h-[94dvh] sm:max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/90 bg-[#EEF5F5] shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)] pb-safe animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-white/90">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 py-3.5 sm:py-4">
              <h2 className="font-display text-base font-bold text-slate-900">
                Add New Login Account
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 sm:p-6 space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Karan Malhotra"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Category *
                    </label>
                    <CustomSelect
                      ariaLabel="New Category"
                      value={newCategory}
                      onChange={(val) => {
                        const nextCat = val as SalespersonCategory;
                        setNewCategory(nextCat);
                        if (nextCat === 'ADMIN') {
                          setNewAllowedPages([...DEFAULT_ALLOWED_PAGES]);
                        }
                      }}
                      options={SALESPERSON_CATEGORIES.map((cat) => ({
                        value: cat.value,
                        label: `${cat.label} — ${cat.fullTitle}`,
                        badge: cat.label,
                      }))}
                      placeholder="Select Category"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Initial Status
                    </label>
                    <CustomSelect
                      ariaLabel="Initial Status"
                      value={newStatus}
                      onChange={(val) => setNewStatus(val as AccountStatus)}
                      options={[
                        { value: 'active', label: 'Active', badge: 'Active' },
                        { value: 'inactive', label: 'Deactivated', badge: 'Inactive' },
                      ]}
                      placeholder="Select Status"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className={`${INPUT_CLASS} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-slate-400 hover:text-slate-700"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Page Access *
                    </label>
                    {newCategory === 'ADMIN' ? (
                      <span className="text-[11px] font-semibold text-indigo-700">
                        Full Access (All Pages)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setNewAllowedPages(
                            newAllowedPages.length === PAGE_ACCESS_OPTIONS.length
                              ? ['overview']
                              : [...DEFAULT_ALLOWED_PAGES]
                          )
                        }
                        className="text-[11px] font-semibold text-[#0D4F3C] hover:underline"
                      >
                        {newAllowedPages.length === PAGE_ACCESS_OPTIONS.length
                          ? 'Dashboard Only'
                          : 'Select All'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PAGE_ACCESS_OPTIONS.map((page) => {
                      const isAdmin = newCategory === 'ADMIN';
                      const checked = isAdmin || newAllowedPages.includes(page.id);
                      return (
                        <label
                          key={page.id}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors min-h-[44px] ${
                            isAdmin ? 'cursor-default opacity-90' : 'cursor-pointer'
                          } ${
                            checked
                              ? 'border-[#0D4F3C]/40 bg-[#E8F6EE]/70 text-[#0D4F3C]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isAdmin}
                            onChange={() =>
                              toggleAllowedPage(newAllowedPages, page.id, setNewAllowedPages)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-[#0D4F3C] focus:ring-[#0D4F3C]"
                          />
                          <span className="truncate">{page.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {newCategory === 'ADMIN' && (
                    <p className="mt-1.5 text-[11px] text-indigo-700">
                      Admin accounts automatically have full access to all pages and controls.
                    </p>
                  )}
                </div>
              </div>

              {addError && <p className="text-xs font-medium text-rose-700">{addError}</p>}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-[#0D4F3C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] shadow-sm"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
