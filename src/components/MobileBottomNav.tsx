import { Building2, Home, KeyRound, Plus, Users } from 'lucide-react';
import { NavSection } from '../types/kyc';

interface MobileBottomNavProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  onCreateNew: () => void;
}

export function MobileBottomNav({
  activeNav,
  onSelectNav,
  onCreateNew,
}: MobileBottomNavProps) {
  return (
    <div className="no-print fixed bottom-0 left-0 right-0 z-40 lg:hidden px-4 pb-safe pointer-events-none">
      <nav
        aria-label="Mobile navigation"
        className="pointer-events-auto mx-auto max-w-md rounded-full bg-[#0D4F3C] px-2 py-1.5 shadow-[0_14px_34px_-10px_rgba(13,79,60,0.65)] border border-emerald-950/20 grid grid-cols-5 items-center"
      >
        <button
          type="button"
          onClick={() => onSelectNav('overview')}
          aria-label="Overview"
          className={`flex flex-col items-center justify-center min-h-[44px] rounded-full transition-all active:scale-95 ${
            activeNav === 'overview'
              ? 'bg-[#072E23] text-[#A3F046]'
              : 'text-emerald-100/80 hover:text-white'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 leading-none">Home</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectNav('directory')}
          aria-label="KYC Directory"
          className={`flex flex-col items-center justify-center min-h-[44px] rounded-full transition-all active:scale-95 ${
            activeNav === 'directory'
              ? 'bg-[#072E23] text-[#A3F046]'
              : 'text-emerald-100/80 hover:text-white'
          }`}
        >
          <Building2 className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 leading-none">KYC</span>
        </button>

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onCreateNew}
            aria-label="New KYC Entry"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#A3F046] text-[#073326] shadow-[0_6px_16px_-4px_rgba(163,240,70,0.65)] active:scale-95 transition-transform"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSelectNav('leaderboard')}
          aria-label="Sales Team"
          className={`flex flex-col items-center justify-center min-h-[44px] rounded-full transition-all active:scale-95 ${
            activeNav === 'leaderboard'
              ? 'bg-[#072E23] text-[#A3F046]'
              : 'text-emerald-100/80 hover:text-white'
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 leading-none">Team</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectNav('loginAccess')}
          aria-label="Login Access"
          className={`flex flex-col items-center justify-center min-h-[44px] rounded-full transition-all active:scale-95 ${
            activeNav === 'loginAccess'
              ? 'bg-[#072E23] text-[#A3F046]'
              : 'text-emerald-100/80 hover:text-white'
          }`}
        >
          <KeyRound className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 leading-none">Access</span>
        </button>
      </nav>
    </div>
  );
}
