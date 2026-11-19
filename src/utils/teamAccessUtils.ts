import { NavSection, SalespersonCategory, TeamMember } from '../types/kyc';

export const ALL_NAV_SECTIONS: NavSection[] = ['overview', 'directory', 'leaderboard', 'loginAccess'];

export function isProtectedAdminMember(
  member: Pick<TeamMember, 'name' | 'salespersonCategory'>
): boolean {
  return (
    member.salespersonCategory === 'ADMIN' ||
    member.name.trim().toLowerCase() === 'admin'
  );
}

export function filterNonAdminMembers<
  T extends Pick<TeamMember, 'name' | 'salespersonCategory'>
>(members: T[]): T[] {
  return members.filter((member) => !isProtectedAdminMember(member));
}

export function normalizeTeamMemberCategory(
  rawCategory: string,
  name: string,
  fallbackRole?: string
): SalespersonCategory {
  const upper = rawCategory.trim().toUpperCase();
  if (
    upper === 'ADMIN' ||
    upper.startsWith('ADMIN ') ||
    upper.startsWith('ADMIN-') ||
    upper.includes('ADMINISTRATOR') ||
    upper.includes('FULL SYSTEM ACCESS') ||
    name.trim().toLowerCase() === 'admin'
  ) {
    return 'ADMIN';
  }
  if (upper === 'GM' || upper.startsWith('GM ') || upper.startsWith('GM-') || upper.includes('GENERAL MANAGER')) {
    return 'GM';
  }
  if (upper === 'MM' || upper.startsWith('MM ') || upper.startsWith('MM-') || upper.includes('MARKETING MANAGER')) {
    return 'MM';
  }
  if (upper === 'TSE' || upper.startsWith('TSE ') || upper.startsWith('TSE-') || upper.includes('TERRITORY SALES')) {
    return 'TSE';
  }
  return fallbackRole === 'manager' ? 'GM' : 'TSE';
}

export function formatCategoryBadge(category: SalespersonCategory, name?: string): string {
  if (category === 'ADMIN' || (name && name.trim().toLowerCase() === 'admin')) {
    return 'Admin';
  }
  return category;
}

export function getAllowedPagesForUser(
  user: Pick<TeamMember, 'name' | 'salespersonCategory' | 'allowedPages'>
): NavSection[] {
  if (isProtectedAdminMember(user)) {
    return [...ALL_NAV_SECTIONS];
  }
  const valid = (user.allowedPages ?? []).filter((page): page is NavSection =>
    ALL_NAV_SECTIONS.includes(page)
  );
  return valid.length > 0 ? valid : ['overview'];
}
