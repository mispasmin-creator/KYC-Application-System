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
  SALESPERSON_CATEGORIES,
  SalespersonCategory,
  TeamMember,
} from '../types/kyc';
import { isValidIndianPhone, normalizeIndianPhone } from '../utils/validators';

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
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTerritory, setEditTerritory] = useState('');
  const [editCategory, setEditCategory] = useState<SalespersonCategory>('TSE');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editStatus, setEditStatus] = useState<AccountStatus>('active');
  const [editError, setEditError] = useState('');

  // Add user modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTerritory, setNewTerritory] = useState('');
  const [newCategory, setNewCategory] = useState<SalespersonCategory>('TSE');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newStatus, setNewStatus] = useState<AccountStatus>('active');
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
        member.email.toLowerCase().includes(q) ||
        member.phone.toLowerCase().includes(q) ||
        member.territory.toLowerCase().includes(q) ||
        member.salespersonCategory.toLowerCase().includes(q)
      );
    });
  }, [teamMembers, searchQuery, statusFilter]);

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPhone(member.phone);
    setEditTerritory(member.territory);
    setEditCategory(member.salespersonCategory);
    setEditPassword(member.password ?? '');
    setShowEditPassword(false);
    setEditStatus(member.status ?? 'active');
    setEditError('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (editName.trim().length < 2) {
      setEditError('Full name must be at least 2 characters.');
      return;
    }
    if (!editEmail.trim() || !editEmail.includes('@')) {
      setEditError('Please enter a valid work email.');
      return;
    }
    if (!isValidIndianPhone(editPhone)) {
      setEditError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (editTerritory.trim().length < 2) {
      setEditError('Territory / zone is required.');
      return;
    }
    if (editPassword.trim().length < 6) {
      setEditError('Password must be at least 6 characters.');
      return;
    }
    if (editingMember.id === activeUser.id && editStatus === 'inactive') {
      setEditError('You cannot deactivate the account you are currently signed in with.');
      return;
    }

    const normalizedPhone = normalizeIndianPhone(editPhone);
    const duplicate = teamMembers.some(
      (m) =>
        m.id !== editingMember.id &&
        (m.email.toLowerCase() === editEmail.trim().toLowerCase() ||
          normalizeIndianPhone(m.phone) === normalizedPhone)
    );
    if (duplicate) {
      setEditError('Another account already uses this email or mobile number.');
      return;
    }

    onUpdateTeamMember({
      ...editingMember,
      name: editName.trim(),
      email: editEmail.trim().toLowerCase(),
      phone: normalizedPhone,
      territory: editTerritory.trim(),
      salespersonCategory: editCategory,
      role: editCategory === 'GM' ? 'manager' : 'salesperson',
      password: editPassword.trim(),
      status: editStatus,
    });
    setEditingMember(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim().length < 2) {
      setAddError('Full name must be at least 2 characters.');
      return;
    }
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setAddError('Please enter a valid work email.');
      return;
    }
    if (!isValidIndianPhone(newPhone)) {
      setAddError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (newTerritory.trim().length < 2) {
      setAddError('Territory / zone is required.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setAddError('Password must be at least 6 characters.');
      return;
    }

    const normalizedPhone = normalizeIndianPhone(newPhone);
    const duplicate = teamMembers.some(
      (m) =>
        m.email.toLowerCase() === newEmail.trim().toLowerCase() ||
        normalizeIndianPhone(m.phone) === normalizedPhone
    );
    if (duplicate) {
      setAddError('An account with this email or mobile number already exists.');
      return;
    }

    onAddTeamMember({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      phone: normalizedPhone,
      role: newCategory === 'GM' ? 'manager' : 'salesperson',
      salespersonCategory: newCategory,
      territory: newTerritory.trim(),
      password: newPassword.trim(),
      status: newStatus,
    });

    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewTerritory('');
    setNewCategory('TSE');
    setNewPassword('');
    setNewStatus('active');
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
            placeholder="Search user, email, mobile..."
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
            const isActive = (member.status ?? 'active') === 'active';
            const isSelf = member.id === activeUser.id;
            const isPasswordVisible = Boolean(revealedPasswords[member.id]);

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
                    <div className="mt-0.5 text-xs text-slate-500 truncate">{member.email}</div>
                    <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {member.phone || '—'} · {member.salespersonCategory} · {member.territory}
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
                <th className="py-3.5 px-4 whitespace-nowrap">Email & Mobile</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Category & Zone</th>
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
                  const isActive = (member.status ?? 'active') === 'active';
                  const isSelf = member.id === activeUser.id;
                  const isPasswordVisible = Boolean(revealedPasswords[member.id]);

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
                        <div className="text-xs font-medium text-slate-800">{member.email}</div>
                        <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                          {member.phone || '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#0D4F3C]">
                          {member.salespersonCategory}
                        </span>
                        <span className="ml-2 text-xs text-slate-600">{member.territory}</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingMember(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Edit Login Access"
        >
          <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-3xl border border-white/90 bg-[#EEF5F5] shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 sm:px-6 py-4">
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className={`${INPUT_CLASS} font-mono`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Territory / Zone *
                    </label>
                    <input
                      type="text"
                      value={editTerritory}
                      onChange={(e) => setEditTerritory(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Category *
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as SalespersonCategory)}
                      className={INPUT_CLASS}
                    >
                      {SALESPERSON_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} — {cat.fullTitle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Account Status
                    </label>
                    <select
                      value={editStatus}
                      disabled={editingMember.id === activeUser.id}
                      onChange={(e) => setEditStatus(e.target.value as AccountStatus)}
                      className={`${INPUT_CLASS} disabled:bg-slate-100 disabled:text-slate-500`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Deactivated</option>
                    </select>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Add Login User"
        >
          <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-3xl border border-white/90 bg-[#EEF5F5] shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 sm:px-6 py-4">
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className={`${INPUT_CLASS} font-mono`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="name@company.in"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Territory / Zone *
                    </label>
                    <input
                      type="text"
                      value={newTerritory}
                      onChange={(e) => setNewTerritory(e.target.value)}
                      placeholder="e.g. North & Delhi"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Category *
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as SalespersonCategory)}
                      className={INPUT_CLASS}
                    >
                      {SALESPERSON_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} — {cat.fullTitle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Initial Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as AccountStatus)}
                      className={INPUT_CLASS}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Deactivated</option>
                    </select>
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
