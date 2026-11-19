import {
  MasterSalesPerson,
  SalespersonCategory,
  TeamMember,
} from '../types/kyc';
import { isProtectedAdminMember } from './teamAccessUtils';

export interface SalesDropdownOption {
  id: string;
  name: string;
  meta: string;
  category: SalespersonCategory;
}

export function parseMasterCategory(raw: string): SalespersonCategory | null {
  const upper = raw.trim().toUpperCase();
  if (!upper) return null;
  if (upper === 'GM' || upper.startsWith('GM ') || upper.startsWith('GM-') || upper.includes('GENERAL MANAGER')) {
    return 'GM';
  }
  if (upper === 'MM' || upper.startsWith('MM ') || upper.startsWith('MM-') || upper.includes('MARKETING MANAGER')) {
    return 'MM';
  }
  if (
    upper === 'TSE' ||
    upper.startsWith('TSE ') ||
    upper.startsWith('TSE-') ||
    upper.includes('TERRITORY SALES')
  ) {
    return 'TSE';
  }
  return null;
}

export function buildSalesOptionsByCategory(
  masterTeam: MasterSalesPerson[],
  teamMembers: TeamMember[]
): Record<SalespersonCategory, SalesDropdownOption[]> {
  const grouped: Record<SalespersonCategory, SalesDropdownOption[]> = {
    ADMIN: [],
    GM: [],
    MM: [],
    TSE: [],
  };
  const seen: Record<SalespersonCategory, Set<string>> = {
    ADMIN: new Set<string>(),
    GM: new Set<string>(),
    MM: new Set<string>(),
    TSE: new Set<string>(),
  };

  for (const person of masterTeam) {
    const cleanName = person.name.trim();
    if (!cleanName) continue;
    const key = cleanName.toLowerCase();
    if (seen[person.category].has(key)) continue;
    seen[person.category].add(key);
    grouped[person.category].push({
      id: person.id,
      name: cleanName,
      meta: person.firm.trim(),
      category: person.category,
    });
  }

  for (const member of teamMembers) {
    if (isProtectedAdminMember(member)) continue;
    const cleanName = member.name.trim();
    if (!cleanName) continue;
    const cat = member.salespersonCategory;
    const key = cleanName.toLowerCase();
    if (seen[cat].has(key)) continue;
    seen[cat].add(key);
    grouped[cat].push({
      id: member.id,
      name: cleanName,
      meta: member.territory.trim(),
      category: cat,
    });
  }

  return grouped;
}
