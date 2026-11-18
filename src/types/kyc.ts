export type EntityType = 'customer' | 'vendor';

export type UserRole = 'salesperson' | 'manager';

export type SalespersonCategory = 'GM' | 'MM' | 'TSE';

export const SALESPERSON_CATEGORIES: {
  value: SalespersonCategory;
  label: string;
  fullTitle: string;
}[] = [
  { value: 'GM', label: 'GM', fullTitle: 'General Manager' },
  { value: 'MM', label: 'MM', fullTitle: 'Marketing Manager' },
  { value: 'TSE', label: 'TSE', fullTitle: 'Territory Sales Executive' },
];

export type NavSection = 'overview' | 'directory' | 'leaderboard' | 'loginAccess';

export type AccountStatus = 'active' | 'inactive';

export interface BranchLocation {
  id: string;
  branchName: string;
  city: string;
  contactPhone: string;
}

export interface KycActivity {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  detail?: string;
}

export interface KycLead {
  id: string;
  entityType: EntityType;
  companyName: string;
  industry: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  branchCount: number;
  branches: BranchLocation[];
  managerName: string;
  managerPhone: string;
  teamLeaderName: string;
  teamLeaderPhone: string;
  contactEmail: string;
  salespersonId: string;
  salespersonName: string;
  salespersonCategory: SalespersonCategory;
  gmId: string;
  gmName: string;
  mmId: string;
  mmName: string;
  tseId: string;
  tseName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  activities: KycActivity[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  salespersonCategory: SalespersonCategory;
  territory: string;
  password?: string;
  status?: AccountStatus;
  createdAt?: string;
}
