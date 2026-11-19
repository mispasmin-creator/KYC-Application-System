import { AlertTriangle, CheckCircle2, LogOut, Menu, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { KycDirectoryView } from './components/KycDirectoryView';
import { KycDossierDrawer } from './components/KycDossierDrawer';
import { KycFormModal } from './components/KycFormModal';
import { LeaderboardView } from './components/LeaderboardView';
import { LoginAccessView } from './components/LoginAccessView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OverviewView } from './components/OverviewView';
import { Sidebar } from './components/Sidebar';
import { SignInView } from './components/SignInView';
import {
  createKycLead,
  createTeamMember,
  deleteKycLead,
  deleteTeamMember,
  fetchWorkspaceData,
  getCachedWorkspaceData,
  setCachedWorkspaceData,
  updateKycLead,
  updateTeamMember,
} from './services/workspaceApi';
import {
  AccountStatus,
  EntityType,
  KycLead,
  MasterSalesPerson,
  NavSection,
  PAGE_ACCESS_OPTIONS,
  TeamMember,
} from './types/kyc';
import { exportLeadsToCsv } from './utils/exportUtils';
import { filterLeadsByQuery } from './utils/searchUtils';
import { filterLeadsForUser, getAllowedPagesForUser, isProtectedAdminMember } from './utils/teamAccessUtils';
import { formatSheetTimestamp } from './utils/validators';

const NAV_TITLES: Record<NavSection, string> = {
  overview: 'Dashboard',
  directory: 'KYC Directory',
  leaderboard: 'Sales Team',
  loginAccess: 'Login Access',
};

const POLL_INTERVAL_MS = 4000;

interface PendingConfirmState {
  title: string;
  description: string;
  details?: string[];
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  action: () => Promise<void>;
}

function generateNextKycId(existingLeads: KycLead[]): string {
  const year = new Date().getFullYear();
  let maxSeq = 100;
  existingLeads.forEach((lead) => {
    const match = lead.id.match(/(\d+)$/);
    if (match) {
      const num = Number(match[1]);
      if (Number.isFinite(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });
  return `KYC-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
}

const SESSION_STORAGE_KEY = 'kyc_active_user_v1';

function readStoredSession(): TeamMember | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage.getItem('kyc_logged_out') === 'true') {
      return null;
    }
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TeamMember;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredSession(user: TeamMember | null): void {
  try {
    if (user) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      window.sessionStorage.removeItem('kyc_logged_out');
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.sessionStorage.setItem('kyc_logged_out', 'true');
      window.localStorage.removeItem('kyc_active_user');
      window.localStorage.removeItem('kyc_user');
      window.localStorage.removeItem('active_user');
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function App() {
  const cachedInitial = useMemo(() => getCachedWorkspaceData(), []);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(() => readStoredSession());
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(cachedInitial.teamMembers);
  const [masterTeam, setMasterTeam] = useState<MasterSalesPerson[]>(cachedInitial.masterTeam);
  const [leads, setLeads] = useState<KycLead[]>(cachedInitial.leads);
  const [workspaceError, setWorkspaceError] = useState('');

  const [activeNav, setActiveNav] = useState<NavSection>('overview');
  const [directoryEntityFilter, setDirectoryEntityFilter] = useState<'all' | EntityType>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<KycLead | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<PendingConfirmState | null>(null);
  const [isConfirmBusy, setIsConfirmBusy] = useState(false);

  const isMutatingRef = useRef(false);
  const selectedLeadIdRef = useRef<string | null>(null);
  const currentUserRef = useRef<TeamMember | null>(currentUser);
  const logoutInProgressRef = useRef(false);

  useEffect(() => {
    selectedLeadIdRef.current = selectedLeadId;
  }, [selectedLeadId]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const handleLogout = useCallback(
    (reason?: string) => {
      logoutInProgressRef.current = true;
      currentUserRef.current = null;
      saveStoredSession(null);
      setCurrentUser(null);
      setLeads([]);
      setTeamMembers([]);
      setMasterTeam([]);
      setSelectedLeadId(null);
      setIsFormOpen(false);
      setEditingLead(null);
      setConfirmState(null);
      setMobileMenuOpen(false);
      setGlobalSearchQuery('');
      setActiveNav('overview');
      setWorkspaceError('');
      notify(reason ?? 'Logged out successfully.');

      window.setTimeout(() => {
        logoutInProgressRef.current = false;
      }, 1200);
    },
    [notify]
  );

  const handleSignInSuccess = useCallback(
    (user: TeamMember) => {
      logoutInProgressRef.current = false;
      currentUserRef.current = user;
      saveStoredSession(user);
      setCurrentUser(user);
      const allowed = getAllowedPagesForUser(user);
      setActiveNav(allowed[0] ?? 'overview');
      setWorkspaceError('');
      notify(`Signed in as ${user.name}.`);
    },
    [notify]
  );

  const syncNow = useCallback(async () => {
    if (logoutInProgressRef.current || !currentUserRef.current) return;
    const signedUser = currentUserRef.current;

    try {
      const data = await fetchWorkspaceData();
      // Ensure user did not log out while request was in-flight
      if (
        logoutInProgressRef.current ||
        !currentUserRef.current ||
        currentUserRef.current.id !== signedUser.id
      ) {
        return;
      }

      setLeads(data.leads);
      setTeamMembers(data.teamMembers);
      setMasterTeam(data.masterTeam);
      setCachedWorkspaceData(data);
      setWorkspaceError('');

      if (signedUser.id !== 'admin-root' && data.teamMembers.length > 0) {
        const latestProfile = data.teamMembers.find(
          (m) =>
            m.id === signedUser.id ||
            m.name.trim().toLowerCase() === signedUser.name.trim().toLowerCase()
        );
        if (!latestProfile || latestProfile.status === 'inactive') {
          handleLogout('Your account session has ended or been deactivated.');
          return;
        }

        // Re-check after finding profile before saving session
        if (
          logoutInProgressRef.current ||
          !currentUserRef.current ||
          currentUserRef.current.id !== signedUser.id
        ) {
          return;
        }

        const isProfileChanged =
          latestProfile.name !== signedUser.name ||
          latestProfile.role !== signedUser.role ||
          latestProfile.salespersonCategory !== signedUser.salespersonCategory ||
          latestProfile.territory !== signedUser.territory;

        if (isProfileChanged) {
          const { password: _pwd, ...safeLatest } = latestProfile;
          saveStoredSession(safeLatest);
          setCurrentUser(safeLatest);
        }
      }

      if (
        selectedLeadIdRef.current &&
        !data.leads.some((l) => l.id === selectedLeadIdRef.current)
      ) {
        setSelectedLeadId(null);
        notify('Record removed.');
      }
    } catch (err) {
      if (logoutInProgressRef.current || !currentUserRef.current) return;
      const msg = err instanceof Error ? err.message : 'Unable to refresh workspace data.';
      setWorkspaceError(msg);
    }
  }, [handleLogout, notify]);

  useEffect(() => {
    if (!currentUser) return;

    void syncNow();

    const intervalId = window.setInterval(() => {
      if (!document.hidden && !isMutatingRef.current && currentUserRef.current) {
        void syncNow();
      }
    }, POLL_INTERVAL_MS);

    const handleResumeSync = () => {
      if (!document.hidden && !isMutatingRef.current && currentUserRef.current) {
        void syncNow();
      }
    };

    window.addEventListener('focus', handleResumeSync);
    document.addEventListener('visibilitychange', handleResumeSync);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleResumeSync);
      document.removeEventListener('visibilitychange', handleResumeSync);
    };
  }, [currentUser?.id, syncNow]);

  const executeConfirmedAction = async () => {
    if (!confirmState) return;
    setIsConfirmBusy(true);
    isMutatingRef.current = true;
    try {
      await confirmState.action();
      setConfirmState(null);
    } catch (err) {
      setConfirmState(null);
      const msg = err instanceof Error ? err.message : 'Action failed. Please try again.';
      notify(msg);
    } finally {
      isMutatingRef.current = false;
      setIsConfirmBusy(false);
    }
  };

  const allowedPages = useMemo(
    () => (currentUser ? getAllowedPagesForUser(currentUser) : []),
    [currentUser]
  );

  useEffect(() => {
    if (currentUser && allowedPages.length > 0 && !allowedPages.includes(activeNav)) {
      setActiveNav(allowedPages[0]);
    }
  }, [activeNav, allowedPages, currentUser]);

  const activeUser = currentUser;

  const userVisibleLeads = useMemo(
    () => filterLeadsForUser(leads, activeUser),
    [leads, activeUser]
  );

  const selectedLead = useMemo(
    () => userVisibleLeads.find((l) => l.id === selectedLeadId) ?? null,
    [userVisibleLeads, selectedLeadId]
  );

  const globallyFilteredLeads = useMemo(
    () => filterLeadsByQuery(userVisibleLeads, globalSearchQuery),
    [userVisibleLeads, globalSearchQuery]
  );

  const handleSaveKyc = (
    payload: Omit<KycLead, 'id' | 'createdAt' | 'updatedAt' | 'activities'>,
    editingId?: string
  ) => {
    if (!activeUser) return;
    const now = formatSheetTimestamp();

    if (editingId) {
      const existing = leads.find((item) => item.id === editingId);
      if (!existing) return;

      const updatedLead: KycLead = {
        ...existing,
        ...payload,
        createdAt: formatSheetTimestamp(existing.createdAt),
        updatedAt: now,
        activities: [
          ...existing.activities,
          {
            id: `act-${Date.now()}`,
            timestamp: now,
            actorName: activeUser.name,
            actorRole: activeUser.role,
            action: 'KYC Details Updated',
            detail: `GM: ${payload.gmName} · MM: ${payload.mmName} · TSE: ${payload.tseName} · ${payload.branchCount} branches · GSTIN ${payload.gstin}`,
          },
        ],
      };

      setConfirmState({
        title: 'Update Company KYC',
        description: `Save updates for "${updatedLead.companyName}"?`,
        details: [
          `Record ID: ${updatedLead.id}`,
          `GSTIN: ${updatedLead.gstin}`,
          `Sales Team: GM ${updatedLead.gmName} · MM ${updatedLead.mmName} · TSE ${updatedLead.tseName}`,
        ],
        confirmLabel: 'Confirm & Update',
        action: async () => {
          await updateKycLead(updatedLead);
          await syncNow();
          setIsFormOpen(false);
          setEditingLead(null);
          notify('Company KYC updated.');
        },
      });
      return;
    }

    const newId = generateNextKycId(leads);
    const newLead: KycLead = {
      ...payload,
      id: newId,
      createdAt: now,
      updatedAt: now,
      activities: [
        {
          id: `act-${Date.now()}`,
          timestamp: now,
          actorName: activeUser.name,
          actorRole: activeUser.role,
          action: 'KYC Saved',
          detail: `Saved ${payload.companyName} (GM: ${payload.gmName}, MM: ${payload.mmName}, TSE: ${payload.tseName}).`,
        },
      ],
    };

    setConfirmState({
      title: 'Save Company KYC',
      description: `Add "${newLead.companyName}" to your company KYC directory?`,
      details: [
        `Record ID: ${newLead.id}`,
        `GSTIN: ${newLead.gstin}`,
        `Sales Team: GM ${newLead.gmName} · MM ${newLead.mmName} · TSE ${newLead.tseName}`,
      ],
      confirmLabel: 'Confirm & Save',
      action: async () => {
        await createKycLead(newLead);
        await syncNow();
        setIsFormOpen(false);
        setEditingLead(null);
        setSelectedLeadId(newLead.id);
        notify(`Saved ${newLead.companyName}.`);
      },
    });
  };

  const handleDeleteLead = (leadId: string) => {
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;

    setConfirmState({
      title: 'Delete Company Record',
      description: `Permanently delete "${target.companyName}" from the KYC directory?`,
      details: [`Record ID: ${target.id}`, `GSTIN: ${target.gstin}`],
      confirmLabel: 'Delete Record',
      variant: 'danger',
      action: async () => {
        await deleteKycLead(leadId);
        setSelectedLeadId(null);
        await syncNow();
        notify(`Deleted ${target.companyName}.`);
      },
    });
  };

  const handleAddTeamMember = (member: Omit<TeamMember, 'id'>) => {
    const newMember: TeamMember = {
      ...member,
      status: member.status ?? 'active',
      createdAt: formatSheetTimestamp(),
      id: `tm-${Date.now()}`,
    };

    setConfirmState({
      title: 'Save Team Account',
      description: `Create account for "${newMember.name}" (${newMember.salespersonCategory})?`,
      details: [
        ...(newMember.email ? [`Email: ${newMember.email}`] : []),
        ...(newMember.phone ? [`Mobile: ${newMember.phone}`] : []),
        ...(newMember.territory ? [`Territory: ${newMember.territory}`] : []),
        ...(newMember.allowedPages && newMember.allowedPages.length > 0
          ? [
              `Page Access: ${newMember.allowedPages
                .map((id) => PAGE_ACCESS_OPTIONS.find((opt) => opt.id === id)?.label ?? id)
                .join(', ')}`,
            ]
          : []),
        `Status: ${newMember.status === 'inactive' ? 'Deactivated' : 'Active'}`,
      ],
      confirmLabel: 'Save Account',
      action: async () => {
        await createTeamMember(newMember);
        await syncNow();
        notify(`Saved ${newMember.name}.`);
      },
    });
  };

  const handleUpdateTeamMember = (updated: TeamMember) => {
    const existing = teamMembers.find((m) => m.id === updated.id);
    if (isProtectedAdminMember(updated) || (existing && isProtectedAdminMember(existing))) {
      notify('Admin account is protected and cannot be edited.');
      return;
    }

    setConfirmState({
      title: 'Update User Account',
      description: `Save updated profile and credentials for "${updated.name}"?`,
      details: [
        `Name: ${updated.name}`,
        ...(updated.email ? [`Email: ${updated.email}`] : []),
        ...(updated.territory ? [`Territory: ${updated.territory}`] : []),
        ...(updated.allowedPages && updated.allowedPages.length > 0
          ? [
              `Page Access: ${updated.allowedPages
                .map((id) => PAGE_ACCESS_OPTIONS.find((opt) => opt.id === id)?.label ?? id)
                .join(', ')}`,
            ]
          : []),
        `Status: ${updated.status === 'inactive' ? 'Deactivated' : 'Active'}`,
      ],
      confirmLabel: 'Save Changes',
      action: async () => {
        await updateTeamMember(updated);
        await syncNow();
        notify(`Updated ${updated.name}.`);
      },
    });
  };

  const handleToggleTeamMemberStatus = (member: TeamMember, nextStatus: AccountStatus) => {
    if (isProtectedAdminMember(member)) {
      notify('Admin account is protected and cannot be deactivated.');
      return;
    }

    const updated: TeamMember = { ...member, status: nextStatus };
    const isDeactivating = nextStatus === 'inactive';

    setConfirmState({
      title: isDeactivating ? 'Deactivate Account' : 'Activate Account',
      description: isDeactivating
        ? `Deactivate "${member.name}"? They will lose login access until reactivated.`
        : `Reactivate "${member.name}" so they can sign in to the workspace again?`,
      details: [
        `Name: ${member.name}`,
        ...(member.email ? [`Email: ${member.email}`] : []),
        `New Status: ${isDeactivating ? 'Deactivated' : 'Active'}`,
      ],
      confirmLabel: isDeactivating ? 'Deactivate Account' : 'Activate Account',
      variant: isDeactivating ? 'danger' : 'primary',
      action: async () => {
        await updateTeamMember(updated);
        await syncNow();
        notify(`${member.name} is now ${isDeactivating ? 'deactivated' : 'active'}.`);
      },
    });
  };

  const handleDeleteTeamMember = (member: TeamMember) => {
    if (isProtectedAdminMember(member)) {
      notify('Admin account is protected and cannot be removed.');
      return;
    }

    setConfirmState({
      title: 'Remove Team Member',
      description: `Remove "${member.name}" (${member.salespersonCategory}) from your team? They will no longer be able to log in.`,
      details: [
        `Name: ${member.name}`,
        ...(member.email ? [`Email: ${member.email}`] : []),
      ],
      confirmLabel: 'Remove Member',
      variant: 'danger',
      action: async () => {
        await deleteTeamMember(member.id);
        await syncNow();
        notify(`Removed ${member.name}.`);
      },
    });
  };



  const handleSelectNav = (nav: NavSection, entityFilter?: 'all' | EntityType) => {
    setActiveNav(nav);
    if (nav === 'directory') {
      setDirectoryEntityFilter(entityFilter ?? 'all');
    }
  };

  const openNewForm = () => {
    setEditingLead(null);
    setIsFormOpen(true);
  };

  const openEditForm = (lead: KycLead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  if (!activeUser) {
    return (
      <>
        <SignInView onAuthenticated={handleSignInSuccess} />
        {toastMessage && (
          <div
            role="status"
            className="no-print fixed bottom-5 left-4 right-4 sm:left-auto sm:right-5 z-[80] flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-[#0D4F3C] px-4 py-3 text-xs font-medium text-white shadow-lg"
          >
            <CheckCircle2 className="h-4 w-4 text-[#A3F046] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="min-h-[100dvh] flex text-slate-900">
        <Sidebar
          activeNav={activeNav}
          allowedPages={allowedPages}
          onSelectNav={(nav) => handleSelectNav(nav)}
          activeUser={activeUser}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onLogout={() => handleLogout()}
        />

          <div className={`flex-1 flex flex-col min-w-0 ${selectedLead ? 'print:hidden' : ''}`}>
            <header className="no-print sticky top-0 z-30 flex h-14 lg:h-16 items-center justify-between gap-2.5 sm:gap-6 border-b border-white/65 bg-white/65 backdrop-blur-xl px-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-white/70 hover:text-[#0D4F3C]"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <span className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200/80 p-1 shadow-2xs shrink-0">
                  <img
                    src="/assets/aistudio/logo__1__12f0c258.png"
                    alt="KYC System Logo"
                    className="h-full w-full object-contain"
                  />
                </span>
                <span className="hidden sm:inline text-sm font-semibold text-slate-900 whitespace-nowrap">
                  {NAV_TITLES[activeNav]}
                </span>
              </div>

              <GlobalSearchBar
                query={globalSearchQuery}
                onQueryChange={setGlobalSearchQuery}
                matches={globallyFilteredLeads}
                onSelectLead={(lead) => setSelectedLeadId(lead.id)}
              />

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={openNewForm}
                  className="hidden sm:inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#0D4F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] shadow-[0_6px_16px_-4px_rgba(13,79,60,0.45)] transition-all whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>New KYC Entry</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLogout();
                  }}
                  aria-label="Logout"
                  title="Logout"
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-rose-200/90 bg-white/90 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors whitespace-nowrap shrink-0 shadow-2xs"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </header>

            <main className="no-print flex-1 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 pb-24 lg:pb-8 max-w-[1440px] w-full mx-auto">
              {workspaceError && (
                <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-xs text-amber-900 shadow-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="min-w-0 leading-relaxed">
                    <span className="font-semibold">Sheet sync warning: </span>
                    <span>{workspaceError}</span>
                  </div>
                </div>
              )}

              {globalSearchQuery.trim() !== '' && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-white/80 backdrop-blur-md px-4 py-2.5 text-xs text-slate-900 shadow-xs">
                  <div className="tabular-nums">
                    Showing <span className="font-semibold">{globallyFilteredLeads.length}</span> of{' '}
                    <span className="font-semibold">{userVisibleLeads.length}</span> companies matching{' '}
                    <span className="font-mono font-semibold text-[#0D4F3C]">
                      "{globalSearchQuery.trim()}"
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGlobalSearchQuery('')}
                    className="min-h-[36px] inline-flex items-center gap-1 font-medium text-[#0D4F3C] hover:text-emerald-950 whitespace-nowrap shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Clear search</span>
                  </button>
                </div>
              )}

              {activeNav === 'overview' && allowedPages.includes('overview') && (
                <OverviewView
                  leads={globallyFilteredLeads}
                  activeUser={activeUser}
                  allowedPages={allowedPages}
                  onNavigate={handleSelectNav}
                  onOpenLead={(lead) => setSelectedLeadId(lead.id)}
                  onCreateNew={openNewForm}
                  onExportCsv={() => {
                    exportLeadsToCsv(globallyFilteredLeads);
                    notify(`Exported ${globallyFilteredLeads.length} KYC records to CSV.`);
                  }}
                />
              )}

              {activeNav === 'directory' && allowedPages.includes('directory') && (
                <KycDirectoryView
                  leads={globallyFilteredLeads}
                  totalLeadsCount={userVisibleLeads.length}
                  teamMembers={teamMembers}
                  initialEntityFilter={directoryEntityFilter}
                  globalSearchQuery={globalSearchQuery}
                  onClearGlobalSearch={() => setGlobalSearchQuery('')}
                  onOpenLead={(lead) => setSelectedLeadId(lead.id)}
                  onCreateNew={openNewForm}
                  onExportFiltered={(filtered) => {
                    exportLeadsToCsv(filtered);
                    notify(`Exported ${filtered.length} filtered KYC records to CSV.`);
                  }}
                />
              )}

              {activeNav === 'leaderboard' && allowedPages.includes('leaderboard') && (
                <LeaderboardView
                  leads={isProtectedAdminMember(activeUser) ? globallyFilteredLeads : userVisibleLeads}
                  teamMembers={teamMembers}
                  masterTeam={masterTeam}
                  activeUser={activeUser}
                  globalSearchQuery={globalSearchQuery}
                  onOpenLead={(lead) => setSelectedLeadId(lead.id)}
                  onNavigateToDirectory={(salespersonName) => {
                    setActiveNav('directory');
                    setGlobalSearchQuery(salespersonName);
                  }}
                />
              )}

              {activeNav === 'loginAccess' && allowedPages.includes('loginAccess') && (
                <LoginAccessView
                  teamMembers={teamMembers}
                  activeUser={activeUser}
                  onUpdateTeamMember={handleUpdateTeamMember}
                  onToggleStatus={handleToggleTeamMemberStatus}
                  onAddTeamMember={handleAddTeamMember}
                />
              )}
            </main>
          </div>

          <MobileBottomNav
            activeNav={activeNav}
            allowedPages={allowedPages}
            onSelectNav={(nav) => handleSelectNav(nav)}
            onCreateNew={openNewForm}
          />

          <KycDossierDrawer
            lead={selectedLead}
            activeUser={activeUser}
            onClose={() => setSelectedLeadId(null)}
            onEdit={openEditForm}
            onDeleteLead={handleDeleteLead}
          />

          <KycFormModal
            isOpen={isFormOpen}
            editingLead={editingLead}
            activeUser={activeUser}
            teamMembers={teamMembers}
            masterTeam={masterTeam}
            onClose={() => {
              setIsFormOpen(false);
              setEditingLead(null);
            }}
            onSave={handleSaveKyc}
          />
        </div>

      <ConfirmActionModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        details={confirmState?.details}
        confirmLabel={confirmState?.confirmLabel ?? 'Confirm'}
        variant={confirmState?.variant}
        isBusy={isConfirmBusy}
        onConfirm={() => {
          void executeConfirmedAction();
        }}
        onCancel={() => {
          if (!isConfirmBusy) setConfirmState(null);
        }}
      />

      {toastMessage && (
        <div
          role="status"
          className="no-print fixed bottom-24 lg:bottom-5 left-4 right-4 sm:left-auto sm:right-5 z-[80] flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-[#0D4F3C] px-4 py-3 text-xs font-medium text-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 text-[#A3F046] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}

export default App;
