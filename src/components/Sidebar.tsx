import {
  BarChart3,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  UserCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavSection, TeamMember } from '../types/kyc';
import { formatCategoryBadge } from '../utils/teamAccessUtils';

interface SidebarProps {
  activeNav: NavSection;
  allowedPages: NavSection[];
  onSelectNav: (nav: NavSection) => void;
  activeUser: TeamMember;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export function Sidebar({
  activeNav,
  allowedPages,
  onSelectNav,
  activeUser,
  mobileOpen,
  onCloseMobile,
  onLogout,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: {
    id: NavSection;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = (
    [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'directory', label: 'KYC Directory', icon: ClipboardList },
      { id: 'leaderboard', label: 'Sales Team', icon: BarChart3 },
      { id: 'loginAccess', label: 'Login Access', icon: KeyRound },
    ] as const
  ).filter((item) => allowedPages.includes(item.id));

  const activeInitials = activeUser.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const renderSidebarContent = (isMobileDrawer: boolean) => {
    const collapsed = !isMobileDrawer && isCollapsed;

    return (
      <div className="flex h-full flex-col bg-white/55 backdrop-blur-xl border-r border-white/65">
        <div
          className={`flex h-16 items-center border-b border-white/55 ${
            collapsed ? 'justify-center gap-1.5 px-2' : 'justify-between px-5'
          }`}
        >
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              onSelectNav('overview');
              onCloseMobile();
            }}
            aria-label="KYC System Home"
            className="flex items-center gap-2.5 min-w-0 font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <span
              className={`flex items-center justify-center rounded-lg bg-white border border-slate-200/80 shadow-2xs shrink-0 ${
                collapsed ? 'h-7 w-7 p-0.5' : 'h-8 w-8 p-1'
              }`}
            >
              <img
                src="/assets/aistudio/logo__1__12f0c258.png"
                alt="KYC System Logo"
                className="h-full w-full object-contain"
              />
            </span>
            {!collapsed && <span>KYC System</span>}
          </a>

          {!isMobileDrawer && (
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="hidden lg:inline-flex items-center justify-center rounded-xl border border-white/75 bg-white/70 p-1.5 text-slate-600 hover:bg-white hover:text-[#0D4F3C] transition-colors shadow-2xs"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}

          {isMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-white/60 hover:text-slate-900"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav
          className={`flex-1 space-y-1.5 py-5 overflow-y-auto ${collapsed ? 'px-2.5' : 'px-4'}`}
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectNav(item.id);
                  onCloseMobile();
                }}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={`flex w-full min-h-[44px] items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                  collapsed ? 'justify-center px-0' : 'justify-between px-3.5'
                } ${
                  isActive
                    ? 'bg-[#0D4F3C] text-white shadow-[0_8px_18px_-6px_rgba(13,79,60,0.45)]'
                    : 'text-slate-600 hover:bg-white/60 hover:text-[#0D4F3C]'
                }`}
              >
                <span className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#A3F046]' : 'text-[#0D4F3C]'}`}
                    aria-hidden="true"
                  />
                  {!collapsed && <span>{item.label}</span>}
                </span>
              </button>
            );
          })}
        </nav>

        <div
          className={`border-t border-white/65 bg-white/35 ${
            collapsed ? 'p-3 flex flex-col items-center gap-3' : 'p-4 space-y-3'
          }`}
        >
          {collapsed ? (
            <>
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                title={`${activeUser.name} (${formatCategoryBadge(activeUser.salespersonCategory, activeUser.name)})`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/85 bg-white/85 font-display text-xs font-bold text-[#0D4F3C] hover:bg-white transition-colors"
              >
                {activeInitials}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCloseMobile();
                  onLogout();
                }}
                aria-label="Logout"
                title="Logout"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/80 text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-white/80 bg-white/75 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-slate-900">
                    {activeUser.name}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/80 bg-emerald-50/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0D4F3C] shrink-0">
                    {activeUser.role === 'manager' ? (
                      <Shield className="h-2.5 w-2.5" />
                    ) : (
                      <UserCheck className="h-2.5 w-2.5" />
                    )}
                    <span>{formatCategoryBadge(activeUser.salespersonCategory, activeUser.name)}</span>
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">
                  {activeUser.territory}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCloseMobile();
                  onLogout();
                }}
                className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl border border-rose-200/85 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100/90 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <aside
        className={`no-print hidden lg:block shrink-0 h-screen sticky top-0 transition-[width] duration-200 ease-out ${
          isCollapsed ? 'w-[76px]' : 'w-[248px]'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[264px] max-w-[85vw] h-full">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
