import { AlertTriangle, CheckCircle2, Menu, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { KycDirectoryView } from './components/KycDirectoryView';
import { KycDossierDrawer } from './components/KycDossierDrawer';
import { KycFormModal } from './components/KycFormModal';
import { LeaderboardView } from './components/LeaderboardView';
import { LoginAccessView } from './components/LoginAccessView';
import { LoginView } from './components/LoginView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OverviewView } from './components/OverviewView';
import { Sidebar } from './components/Sidebar';
import {
  createKycLead,
  createTeamMember,
  deleteKycLead,
  deleteTeamMember,
  fetchWorkspaceData,
  updateKycLead,
  updateTeamMember,
} from './services/workspaceApi';
import { AccountStatus, EntityType, KycLead, NavSection, TeamMember } from './types/kyc';
import { exportLeadsToCsv } from './utils/exportUtils';
import { filterLeadsByQuery } from './utils/searchUtils';

const NAV_TITLES: Record<NavSection, string> = {
  overview: 'Overview',
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

export function App() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [leads, setLeads] = useState<KycLead[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<TeamMember | null>(null);
  const [authError, setAuthError] = useState('');
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
  const loggedInUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedLeadIdRef.current = selectedLeadId;
  }, [selectedLeadId]);

  useEffect(() => {
    loggedInUserIdRef.current = loggedInUser?.id ?? null;
  }, [loggedInUser]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const syncNow = useCallback(async () => {
    if (!loggedInUserIdRef.current) return;
    try {
      const data = await fetchWorkspaceData();
      setLeads(data.leads);
      setTeamMembers(data.teamMembers);
      setAuthError('');
      setWorkspaceError('');

      if (
        selectedLeadIdRef.current &&
        !data.leads.some((l) => l.id === selectedLeadIdRef.current)
      ) {
        setSelectedLeadId(null);
        notify('Record removed.');
      }

      if (loggedInUserIdRef.current !== 'admin-root') {
        const currentMember = data.teamMembers.find(
          (m) => m.id === loggedInUserIdRef.current
        );
        if (!currentMember) {
          setLoggedInUser(null);
          setSelectedLeadId(null);
          setIsFormOpen(false);
          setAuthError('Your account was removed.');
        } else if (currentMember.status === 'inactive') {
          setLoggedInUser(null);
          setSelectedLeadId(null);
          setIsFormOpen(false);
          setAuthError('Your account has been deactivated.');
        } else {
          setLoggedInUser(currentMember);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to refresh workspace data.';
      setWorkspaceError(msg);
    }
  }, [notify]);

  useEffect(() => {
    if (!loggedInUser) return;

    void syncNow();

    const intervalId = window.setInterval(() => {
      if (!document.hidden && !isMutatingRef.current) {
        void syncNow();
      }
    }, POLL_INTERVAL_MS);

    const handleResumeSync = () => {
      if (!document.hidden && !isMutatingRef.current) {
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
  }, [loggedInUser?.id, syncNow]);

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

  const activeUser = useMemo(() => {
    if (!loggedInUser) return null;
    return teamMembers.find((m) => m.id === loggedInUser.id) ?? loggedInUser;
  }, [teamMembers, loggedInUser]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  const globallyFilteredLeads = useMemo(
    () => filterLeadsByQuery(leads, globalSearchQuery),
    [leads, globalSearchQuery]
  );

  const handleSaveKyc = (
    payload: Omit<KycLead, 'id' | 'createdAt' | 'updatedAt' | 'activities'>,
    editingId?: string
  ) => {
    if (!activeUser) return;
    const now = new Date().toISOString();

    if (editingId) {
      const existing = leads.find((item) => item.id === editingId);
      if (!existing) return;

      const updatedLead: KycLead = {
        ...existing,
        ...payload,
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
      createdAt: new Date().toISOString(),
      id: `tm-${Date.now()}`,
    };

    setConfirmState({
      title: 'Save Team Account',
      description: `Create account for "${newMember.name}" (${newMember.salespersonCategory})?`,
      details: [
        `Email: ${newMember.email}`,
        `Mobile: ${newMember.phone}`,
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
    setConfirmState({
      title: 'Update User Account',
      description: `Save updated profile and credentials for "${updated.name}"?`,
      details: [
        `Name: ${updated.name}`,
        `Email: ${updated.email}`,
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
    const updated: TeamMember = { ...member, status: nextStatus };
    const isDeactivating = nextStatus === 'inactive';

    setConfirmState({
      title: isDeactivating ? 'Deactivate Account' : 'Activate Account',
      description: isDeactivating
        ? `Deactivate "${member.name}"? They will lose login access until reactivated.`
        : `Reactivate "${member.name}" so they can sign in to the workspace again?`,
      details: [
        `Email: ${member.email}`,
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
    setConfirmState({
      title: 'Remove Team Member',
      description: `Remove "${member.name}" (${member.salespersonCategory}) from your team? They will no longer be able to log in.`,
      details: [`Email: ${member.email}`],
      confirmLabel: 'Remove Member',
      variant: 'danger',
      action: async () => {
        await deleteTeamMember(member.id);
        await syncNow();
        notify(`Removed ${member.name}.`);
      },
    });
  };

  const handleLoginSuccess = (member: TeamMember) => {
    if (!member || !member.id) {
      setAuthError('Unable to sign in. Invalid account response.');
      return;
    }
    loggedInUserIdRef.current = member.id;
    setLoggedInUser(member);
    setAuthError('');
    setActiveNav('overview');
    setDirectoryEntityFilter('all');
    notify(`Signed in as ${member.name}.`);
  };

  const handleSignOut = () => {
    loggedInUserIdRef.current = null;
    setLoggedInUser(null);
    setWorkspaceError('');
    setLeads([]);
    setTeamMembers([]);
    setSelectedLeadId(null);
    setIsFormOpen(false);
    setEditingLead(null);
    setMobileMenuOpen(false);
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

  return (
    <>
      {!activeUser ? (
        <LoginView authError={authError} onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="min-h-[100dvh] flex text-slate-900">
          <Sidebar
            activeNav={activeNav}
            onSelectNav={(nav) => handleSelectNav(nav)}
            activeUser={activeUser}
            onSignOut={handleSignOut}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
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
                    <span className="font-semibold">{leads.length}</span> companies matching{' '}
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

              {activeNav === 'overview' && (
                <OverviewView
                  leads={globallyFilteredLeads}
                  activeUser={activeUser}
                  onNavigate={handleSelectNav}
                  onOpenLead={(lead) => setSelectedLeadId(lead.id)}
                  onCreateNew={openNewForm}
                  onExportCsv={() => {
                    exportLeadsToCsv(globallyFilteredLeads);
                    notify(`Exported ${globallyFilteredLeads.length} KYC records to CSV.`);
                  }}
                  onSignOut={handleSignOut}
                />
              )}

              {activeNav === 'directory' && (
                <KycDirectoryView
                  leads={globallyFilteredLeads}
                  totalLeadsCount={leads.length}
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

              {activeNav === 'leaderboard' && (
                <LeaderboardView
                  leads={globallyFilteredLeads}
                  teamMembers={teamMembers}
                  activeUser={activeUser}
                  globalSearchQuery={globalSearchQuery}
                  onAddTeamMember={handleAddTeamMember}
                  onDeleteTeamMember={handleDeleteTeamMember}
                />
              )}

              {activeNav === 'loginAccess' && (
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
            onClose={() => {
              setIsFormOpen(false);
              setEditingLead(null);
            }}
            onSave={handleSaveKyc}
          />
        </div>
      )}

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
