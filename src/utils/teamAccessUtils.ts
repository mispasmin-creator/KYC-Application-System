import { KycLead, NavSection, SalespersonCategory, TeamMember } from '../types/kyc';

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

/**
 * Checks whether a given user has access to view/edit a specific KYC lead.
 * - Admin users have unrestricted access to all leads.
 * - Regular sales team members (GM, MM, TSE, salesperson) only have access to
 *   leads where their user ID or user name is explicitly assigned as:
 *   salesperson/added-by, TSE, MM, GM, or where they performed an activity.
 */
export function canUserAccessLead(
  user: Pick<TeamMember, 'id' | 'name' | 'salespersonCategory'> | null | undefined,
  lead: KycLead
): boolean {
  if (!user) return false;

  // Admin has full system access to all leads
  if (isProtectedAdminMember(user)) {
    return true;
  }

  const userId = user.id ? String(user.id).trim().toLowerCase() : '';
  const userName = user.name ? user.name.trim().toLowerCase() : '';

  if (!userId && !userName) {
    return false;
  }

  // 1. Direct ID match on any sales role
  if (userId) {
    if (lead.salespersonId && lead.salespersonId.trim().toLowerCase() === userId) return true;
    if (lead.tseId && lead.tseId.trim().toLowerCase() === userId) return true;
    if (lead.mmId && lead.mmId.trim().toLowerCase() === userId) return true;
    if (lead.gmId && lead.gmId.trim().toLowerCase() === userId) return true;
  }

  // 2. Name match on any sales role (Salesperson / Added By, TSE, MM, GM)
  if (userName) {
    if (lead.salespersonName && lead.salespersonName.trim().toLowerCase() === userName) return true;
    if (lead.tseName && lead.tseName.trim().toLowerCase() === userName) return true;
    if (lead.mmName && lead.mmName.trim().toLowerCase() === userName) return true;
    if (lead.gmName && lead.gmName.trim().toLowerCase() === userName) return true;

    // Check activities history (actorName)
    if (Array.isArray(lead.activities)) {
      const actedByUser = lead.activities.some(
        (a) => a.actorName && a.actorName.trim().toLowerCase() === userName
      );
      if (actedByUser) return true;
    }
  }

  return false;
}

export function filterLeadsForUser(
  leads: KycLead[],
  user: Pick<TeamMember, 'id' | 'name' | 'salespersonCategory'> | null | undefined
): KycLead[] {
  if (!user) return [];
  if (isProtectedAdminMember(user)) return leads;
  return leads.filter((lead) => canUserAccessLead(user, lead));
}

/**
 * Checks whether a given KYC lead was submitted/filled by a specific salesperson user.
 * Strictly checks the creator identity (`salespersonId`, `salespersonName`, or creation actor).
 * Intentionally IGNORES assigned GM, MM, TSE fields so KYC credit is only awarded
 * to the actual user who filled the form.
 */
export function isLeadSubmittedBySalesperson(
  lead: KycLead,
  member: Pick<TeamMember, 'id' | 'name'>
): boolean {
  if (!member) return false;
  const memberId = member.id ? String(member.id).trim().toLowerCase() : '';
  const memberName = member.name ? member.name.trim().toLowerCase() : '';

  if (!memberId && !memberName) return false;

  // 1. Direct match on salespersonId (id of logged-in user who created the lead)
  if (memberId && lead.salespersonId && lead.salespersonId.trim().toLowerCase() === memberId) {
    return true;
  }

  // 2. Direct match on salespersonName (username of logged-in user who created the lead)
  if (memberName && lead.salespersonName && lead.salespersonName.trim().toLowerCase() === memberName) {
    return true;
  }

  // 3. Fallback: check creator actorName in creation activity record if salespersonName was empty
  if (memberName && Array.isArray(lead.activities) && lead.activities.length > 0) {
    const creationAct = lead.activities[0];
    if (creationAct?.actorName && creationAct.actorName.trim().toLowerCase() === memberName) {
      return true;
    }
  }

  return false;
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
    ALL_NAV_SECTIONS.includes(page) && page !== 'loginAccess'
  );
  return valid.length > 0 ? valid : ['overview'];
}
