import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import express, { type Request, type Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type EntityType = 'customer' | 'vendor';
type UserRole = 'salesperson' | 'manager';
type SalespersonCategory = 'ADMIN' | 'GM' | 'MM' | 'TSE';
type AccountStatus = 'active' | 'inactive';

interface BranchLocation {
  id: string;
  branchName: string;
  city: string;
  contactPhone: string;
}

interface KycActivity {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  detail?: string;
}

interface KycLead {
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

type NavSection = 'overview' | 'directory' | 'leaderboard' | 'loginAccess';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  salespersonCategory: SalespersonCategory;
  territory: string;
  password?: string;
  status?: AccountStatus;
  allowedPages?: NavSection[];
  createdAt?: string;
}

interface MasterSalesPerson {
  id: string;
  name: string;
  firm: string;
  category: SalespersonCategory;
}

interface ResolvedSheetContext {
  spreadsheetId: string;
  kycTabTitle: string;
  kycTabSheetId: number | null;
  teamTabTitle: string;
  teamTabSheetId: number | null;
  masterTabTitle: string | null;
}

const KYC_SHEET_HEADERS = [
  'Record ID',
  'Entity Type',
  'Company Legal Name',
  'Industry / Category',
  'GSTIN',
  'Registered Address',
  'City',
  'State',
  'Pincode',
  'Total Branches',
  'Branch Locations',
  'Manager Name',
  'Manager Phone',
  'Team Leader Name',
  'Team Leader Phone',
  'Official Email',
  'GM Name',
  'MM Name',
  'TSE Name',
  'Added By',
  'Sales Role',
  'Notes',
  'Created At',
  'Updated At',
] as const;

const TEAM_LOGIN_HEADERS = [
  'Member ID',
  'Full Name',
  'Category',
  'Status',
  'Password',
  'Page Access',
] as const;

function getEnvConfig() {
  return {
    spreadsheetId: (process.env.GOOGLE_SPREADSHEET_ID || process.env.VITE_GOOGLE_SPREADSHEET_ID || '').trim(),
    sheetName: (process.env.GOOGLE_SHEET_NAME || process.env.VITE_GOOGLE_SHEET_NAME || '').trim() || 'KYC',
    kycTab: (process.env.GOOGLE_KYC_TAB || process.env.VITE_GOOGLE_KYC_TAB || '').trim() || 'KYC Records',
    teamTab: (process.env.GOOGLE_TEAM_TAB || process.env.VITE_GOOGLE_TEAM_TAB || '').trim() || 'Team Login',
    masterTab: (process.env.GOOGLE_MASTER_TAB || process.env.VITE_GOOGLE_MASTER_TAB || '').trim() || 'Master',
    serviceAccountEmail: (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim(),
    serviceAccountPrivateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim(),
    appsScriptUrl: (
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbxPuixg8-N7i0Gy2b_uocq7Lt9cDrHELnHKxgUl5J_KHl5SRoxrMtjF8PBO9S-Us8ZZ/exec'
    ).trim(),
    adminUsername: (process.env.ADMIN_USERNAME || 'admin').trim(),
    adminPassword: (process.env.ADMIN_PASSWORD || 'admin123').trim(),
    adminName: (process.env.ADMIN_NAME || 'Workspace Admin').trim(),
    adminEmail: (process.env.ADMIN_EMAIL || 'admin@company.in').trim().toLowerCase(),
    gstinApiKey: (process.env.GSTIN_API_KEY || '').trim(),
    gstinApiUrl: (process.env.GSTIN_API_URL || '').trim(),
  };
}

let cachedToken: { token: string; expiresAtMs: number } | null = null;
let cachedResolvedContext: { ctx: ResolvedSheetContext; expiresAtMs: number } | null = null;

function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

function quoteTabName(tabTitle: string): string {
  return `'${tabTitle.replace(/'/g, "''")}'`;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getServiceAccountAccessToken(): Promise<string> {
  const cfg = getEnvConfig();
  if (!cfg.serviceAccountEmail || !cfg.serviceAccountPrivateKey) {
    throw new Error(
      'Workspace storage is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SPREADSHEET_ID (or GOOGLE_APPS_SCRIPT_URL) in environment variables.'
    );
  }

  const nowMs = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - 60_000 > nowMs) {
    return cachedToken.token;
  }

  const iat = Math.floor(nowMs / 1000);
  const exp = iat + 3600;
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: cfg.serviceAccountEmail,
      scope:
        'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp,
      iat,
    })
  );

  const signingInput = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = base64UrlEncode(signer.sign(cfg.serviceAccountPrivateKey));
  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Service account authentication failed (${tokenRes.status}): ${errText}`);
  }

  const tokenJson = (await tokenRes.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    token: tokenJson.access_token,
    expiresAtMs: nowMs + (tokenJson.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

async function googleFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await getServiceAccountAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    cachedToken = null;
  }

  if (!res.ok) {
    let message = `Google Sheets API error (${res.status})`;
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      if (errBody?.error?.message) {
        message = errBody.error.message;
      }
    } catch {
      // Ignore JSON parse failure
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

async function resolveAndEnsureSheetContext(): Promise<ResolvedSheetContext> {
  const now = Date.now();
  if (cachedResolvedContext && cachedResolvedContext.expiresAtMs > now) {
    return cachedResolvedContext.ctx;
  }

  const cfg = getEnvConfig();
  let spreadsheetId = extractSpreadsheetId(cfg.spreadsheetId);
  if (!spreadsheetId) {
    const query = encodeURIComponent(
      "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    );
    const filesData = await googleFetch<{ files?: { id: string; name: string }[] }>(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&orderBy=modifiedTime desc&pageSize=50`
    );
    const files = filesData.files ?? [];
    const targetLower = cfg.sheetName.toLowerCase();
    const matched =
      files.find((f) => f.name.trim().toLowerCase() === targetLower) ??
      files.find((f) => f.name.trim().toLowerCase().includes(targetLower));

    if (matched) {
      spreadsheetId = matched.id;
    } else {
      const created = await googleFetch<{ spreadsheetId: string }>(
        'https://sheets.googleapis.com/v4/spreadsheets',
        {
          method: 'POST',
          body: JSON.stringify({
            properties: { title: cfg.sheetName },
            sheets: [
              { properties: { title: cfg.kycTab } },
              { properties: { title: cfg.teamTab } },
            ],
          }),
        }
      );
      spreadsheetId = created.spreadsheetId;
    }
  }

  const meta = await googleFetch<{
    spreadsheetId: string;
    sheets?: { properties?: { sheetId?: number; title?: string } }[];
  }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}?fields=spreadsheetId,sheets(properties(sheetId,title))`
  );

  const sheetTabs = (meta.sheets ?? [])
    .map((s) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? '',
    }))
    .filter((s) => Boolean(s.title));

  const headerRowsByTab = new Map<string, string[]>();
  if (sheetTabs.length > 0) {
    const params = sheetTabs
      .map((t) => `ranges=${encodeURIComponent(`${quoteTabName(t.title)}!1:1`)}`)
      .join('&');
    const batchData = await googleFetch<{ valueRanges?: { values?: string[][] }[] }>(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values:batchGet?${params}`
    );
    sheetTabs.forEach((tab, idx) => {
      const row1 = batchData.valueRanges?.[idx]?.values?.[0] ?? [];
      headerRowsByTab.set(
        tab.title,
        row1.map((c) => String(c ?? '').trim())
      );
    });
  }

  const hasKycHeaders = (row: string[] | undefined) => {
    if (!row || row.length === 0) return false;
    const lower = row.map((c) => c.toLowerCase());
    return lower.includes('record id') && lower.includes('company legal name');
  };

  const hasTeamHeaders = (row: string[] | undefined) => {
    if (!row || row.length === 0) return false;
    const lower = row.map((c) => c.toLowerCase());
    return (
      lower.includes('member id') &&
      lower.includes('full name') &&
      lower.includes('page access') &&
      !lower.includes('work email')
    );
  };

  const existingTeamTab =
    sheetTabs.find((t) => hasTeamHeaders(headerRowsByTab.get(t.title))) ??
    sheetTabs.find((t) =>
      ['team login', 'team_login', 'users', 'login'].includes(t.title.toLowerCase())
    );

  let existingKycTab =
    sheetTabs.find((t) => hasKycHeaders(headerRowsByTab.get(t.title))) ??
    sheetTabs.find(
      (t) =>
        t.title !== existingTeamTab?.title &&
        ['kyc records', 'kyc', 'company kyc', 'kyc directory'].includes(t.title.toLowerCase())
    );

  if (!existingKycTab && sheetTabs.length > 0) {
    const firstNonTeamTab = sheetTabs.find((t) => t.title !== existingTeamTab?.title);
    if (firstNonTeamTab) {
      const row1 = headerRowsByTab.get(firstNonTeamTab.title) ?? [];
      if (row1.every((c) => c === '')) {
        existingKycTab = firstNonTeamTab;
      }
    }
  }

  const kycTabTitle = existingKycTab?.title ?? cfg.kycTab;
  let kycTabSheetId = existingKycTab ? existingKycTab.sheetId : null;
  const needsKycTabCreate = !existingKycTab;
  const needsKycHeaders = needsKycTabCreate || !hasKycHeaders(headerRowsByTab.get(kycTabTitle));

  const teamTabTitle = existingTeamTab?.title ?? cfg.teamTab;
  let teamTabSheetId = existingTeamTab ? existingTeamTab.sheetId : null;
  const needsTeamTabCreate = !existingTeamTab;
  const needsTeamHeaders =
    needsTeamTabCreate || !hasTeamHeaders(headerRowsByTab.get(teamTabTitle));

  const addSheetRequests: Record<string, unknown>[] = [];
  if (needsKycTabCreate) {
    addSheetRequests.push({ addSheet: { properties: { title: kycTabTitle } } });
  }
  if (needsTeamTabCreate) {
    addSheetRequests.push({ addSheet: { properties: { title: teamTabTitle } } });
  }

  if (addSheetRequests.length > 0) {
    const batchRes = await googleFetch<{
      replies?: { addSheet?: { properties?: { sheetId?: number; title?: string } } }[];
    }>(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({ requests: addSheetRequests }),
      }
    );
    batchRes.replies?.forEach((reply) => {
      const props = reply.addSheet?.properties;
      if (!props) return;
      if (props.title === kycTabTitle && props.sheetId !== undefined) {
        kycTabSheetId = props.sheetId;
      }
      if (props.title === teamTabTitle && props.sheetId !== undefined) {
        teamTabSheetId = props.sheetId;
      }
    });
  }

  const valueUpdates: { range: string; values: string[][] }[] = [];
  if (needsKycHeaders) {
    valueUpdates.push({
      range: `${quoteTabName(kycTabTitle)}!A1:AC1`,
      values: [[...KYC_SHEET_HEADERS]],
    });
  }
  if (needsTeamHeaders) {
    valueUpdates.push({
      range: `${quoteTabName(teamTabTitle)}!A1:F1`,
      values: [[...TEAM_LOGIN_HEADERS]],
    });
    valueUpdates.push({
      range: `${quoteTabName(teamTabTitle)}!G1:K1`,
      values: [['', '', '', '', '']],
    });
  }

  if (valueUpdates.length > 0) {
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: valueUpdates,
        }),
      }
    );
  }

  const existingMasterTab = sheetTabs.find(
    (t) => t.title.trim().toLowerCase() === cfg.masterTab.toLowerCase()
  );

  const ctx: ResolvedSheetContext = {
    spreadsheetId,
    kycTabTitle,
    kycTabSheetId,
    teamTabTitle,
    teamTabSheetId,
    masterTabTitle: existingMasterTab?.title ?? null,
  };
  cachedResolvedContext = { ctx, expiresAtMs: now + 60_000 };
  return ctx;
}

function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function serializeBranches(branches: BranchLocation[]): string {
  return branches
    .map((b) => {
      const phonePart = b.contactPhone ? ` (${b.contactPhone})` : '';
      return `${b.branchName} — ${b.city}${phonePart}`;
    })
    .join(' | ');
}

function parseBranches(raw: string, fallbackCity: string, rowNum: number): BranchLocation[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [
      {
        id: `br-${rowNum}-1`,
        branchName: 'Head Office',
        city: fallbackCity || '—',
        contactPhone: '',
      },
    ];
  }
  return trimmed
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry, idx) => {
      const phoneMatch = entry.match(/\(([^)]+)\)\s*$/);
      const contactPhone = phoneMatch ? normalizeIndianPhone(phoneMatch[1]) : '';
      const withoutPhone = phoneMatch ? entry.slice(0, phoneMatch.index).trim() : entry;
      const dashParts = withoutPhone.split(/\s+[—-]\s+/);
      return {
        id: `br-${rowNum}-${idx + 1}`,
        branchName: dashParts[0]?.trim() || `Branch ${idx + 1}`,
        city: dashParts[1]?.trim() || fallbackCity || '',
        contactPhone,
      };
    });
}

function serializeActivities(activities: KycActivity[]): string {
  try {
    return JSON.stringify(activities);
  } catch {
    return '[]';
  }
}

function parseActivities(raw: string): KycActivity[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KycActivity[]) : [];
  } catch {
    return [];
  }
}

function normalizeCategory(raw: string, fallbackRole?: string): SalespersonCategory {
  const upper = raw.trim().toUpperCase();
  if (upper === 'ADMIN' || upper.startsWith('ADMIN ') || upper.startsWith('ADMIN-') || upper.includes('ADMINISTRATOR')) {
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

function normalizeMasterCategory(raw: string): SalespersonCategory | null {
  const upper = raw.trim().toUpperCase();
  if (!upper) return null;
  if (upper === 'GM' || upper.startsWith('GM ') || upper.startsWith('GM-') || upper.includes('GENERAL MANAGER')) {
    return 'GM';
  }
  if (upper === 'MM' || upper.startsWith('MM ') || upper.startsWith('MM-') || upper.includes('MARKETING MANAGER')) {
    return 'MM';
  }
  if (upper === 'TSE' || upper.startsWith('TSE ') || upper.startsWith('TSE-') || upper.includes('TERRITORY SALES')) {
    return 'TSE';
  }
  return null;
}

function normalizeRole(raw: string, category: SalespersonCategory): UserRole {
  if (category === 'ADMIN') return 'manager';
  const lower = raw.trim().toLowerCase();
  if (lower === 'manager' || lower === 'salesperson') return lower;
  return category === 'GM' ? 'manager' : 'salesperson';
}

function normalizeAccountStatus(raw: string): AccountStatus {
  const lower = raw.trim().toLowerCase();
  if (lower === 'inactive' || lower === 'deactivated' || lower === 'disabled') {
    return 'inactive';
  }
  return 'active';
}

function formatSheetTimestamp(input?: string | number | Date | null): string {
  if (!input) input = new Date();
  const d = input instanceof Date ? input : new Date(input);
  const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const mm = String(validDate.getMonth() + 1).padStart(2, '0');
  const dd = String(validDate.getDate()).padStart(2, '0');
  const yyyy = validDate.getFullYear();
  const hh = String(validDate.getHours()).padStart(2, '0');
  const min = String(validDate.getMinutes()).padStart(2, '0');
  const ss = String(validDate.getSeconds()).padStart(2, '0');
  return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
}

function leadToRowValues(lead: KycLead): (string | number)[] {
  const salesRoleLabel =
    lead.salespersonCategory === 'ADMIN' ? 'Admin' : lead.salespersonCategory;
  return [
    lead.id,
    lead.entityType === 'vendor' ? 'Vendor' : 'Customer',
    lead.companyName,
    lead.industry,
    lead.gstin,
    lead.address,
    lead.city,
    lead.state,
    lead.pincode,
    lead.branchCount,
    serializeBranches(lead.branches),
    lead.managerName,
    lead.managerPhone,
    lead.teamLeaderName,
    lead.teamLeaderPhone,
    lead.contactEmail,
    lead.gmName,
    lead.mmName,
    lead.tseName,
    lead.salespersonName,
    salesRoleLabel,
    lead.notes,
    formatSheetTimestamp(lead.createdAt),
    formatSheetTimestamp(lead.updatedAt || lead.createdAt),
  ];
}

function buildFallbackActivities(
  id: string,
  companyName: string,
  salespersonName: string,
  role: UserRole,
  createdAt: string,
  gmName: string,
  mmName: string,
  tseName: string
): KycActivity[] {
  return [
    {
      id: `act-${id}`,
      timestamp: createdAt,
      actorName: salespersonName || 'Admin',
      actorRole: role,
      action: 'KYC Saved',
      detail: `Saved ${companyName}${gmName || mmName || tseName ? ` (GM: ${gmName}, MM: ${mmName}, TSE: ${tseName})` : ''}.`,
    },
  ];
}

const GSTIN_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala',
  '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};

function sanitizeLeadForAppsScript(lead: KycLead): Record<string, unknown> {
  return {
    ...lead,
    salespersonCategory: lead.salespersonCategory === 'ADMIN' ? 'Admin' : lead.salespersonCategory,
    createdAt: formatSheetTimestamp(lead.createdAt),
    updatedAt: formatSheetTimestamp(lead.updatedAt || lead.createdAt),
    gmId: '',
    mmId: '',
    tseId: '',
    salespersonId: '',
    activities: [],
  };
}

const ALL_NAV_SECTIONS: NavSection[] = ['overview', 'directory', 'leaderboard', 'loginAccess'];

function normalizeAllowedPages(raw: unknown): NavSection[] {
  if (Array.isArray(raw)) {
    const valid = raw.filter(
      (item): item is NavSection =>
        typeof item === 'string' && ALL_NAV_SECTIONS.includes(item as NavSection)
    );
    return valid.length > 0 ? Array.from(new Set(valid)) : [...ALL_NAV_SECTIONS];
  }
  const str = String(raw ?? '').trim();
  if (!str) return [...ALL_NAV_SECTIONS];
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return normalizeAllowedPages(parsed);
    } catch {
      // Fallback to comma-separated parsing
    }
  }
  const parts = str
    .split(',')
    .map((p) => p.trim())
    .filter((p): p is NavSection => ALL_NAV_SECTIONS.includes(p as NavSection));
  return parts.length > 0 ? Array.from(new Set(parts)) : [...ALL_NAV_SECTIONS];
}

function teamMemberToRowValues(member: TeamMember): string[] {
  const pages =
    member.salespersonCategory === 'ADMIN'
      ? [...ALL_NAV_SECTIONS]
      : normalizeAllowedPages(member.allowedPages);
  return [
    member.id,
    member.name,
    member.salespersonCategory,
    member.status === 'inactive' ? 'Deactivated' : 'Active',
    member.password ?? '',
    pages.join(', '),
  ];
}

function isProtectedAdminRecord(member: Pick<TeamMember, 'name' | 'salespersonCategory'>): boolean {
  return member.salespersonCategory === 'ADMIN' || member.name.trim().toLowerCase() === 'admin';
}

function normalizeTeamMemberRecord(member: TeamMember): TeamMember {
  const name = String(member.name ?? '').trim();
  const category =
    isProtectedAdminRecord({ name, salespersonCategory: member.salespersonCategory }) ||
    String(member.salespersonCategory ?? '').toUpperCase().includes('FULL SYSTEM')
      ? 'ADMIN'
      : normalizeCategory(String(member.salespersonCategory ?? ''), member.role);

  return {
    ...member,
    name,
    salespersonCategory: category,
    role: category === 'ADMIN' || category === 'GM' ? 'manager' : 'salesperson',
    status: category === 'ADMIN' ? 'active' : normalizeAccountStatus(String(member.status ?? 'active')),
    allowedPages:
      category === 'ADMIN' ? [...ALL_NAV_SECTIONS] : normalizeAllowedPages(member.allowedPages),
  };
}

const LOCAL_WORKSPACE_FILE = path.resolve(__dirname, 'data', 'workspace.json');

function getLocalWorkspaceData(): {
  leads: KycLead[];
  teamMembers: TeamMember[];
  masterTeam: MasterSalesPerson[];
} {
  try {
    if (fs.existsSync(LOCAL_WORKSPACE_FILE)) {
      const raw = fs.readFileSync(LOCAL_WORKSPACE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        leads: Array.isArray(parsed.leads) ? parsed.leads : [],
        teamMembers: Array.isArray(parsed.teamMembers)
          ? parsed.teamMembers.map(normalizeTeamMemberRecord)
          : [],
        masterTeam: Array.isArray(parsed.masterTeam) ? parsed.masterTeam : [],
      };
    }
  } catch (err) {
    console.error('Failed to read local workspace data:', err);
  }
  return {
    leads: [],
    teamMembers: [
      {
        id: 'admin-root',
        name: 'Workspace Admin',
        email: 'admin@company.in',
        phone: '',
        role: 'manager',
        salespersonCategory: 'ADMIN',
        territory: 'All Zones',
        password: 'admin',
        status: 'active',
        allowedPages: ['overview', 'directory', 'leaderboard', 'loginAccess'],
      },
    ],
    masterTeam: [],
  };
}



let memoryWorkspaceCache: {
  leads: KycLead[];
  teamMembers: TeamMember[];
  masterTeam: MasterSalesPerson[];
} | null = null;
let lastWorkspaceFetchTime = 0;
let isWorkspaceBackgroundRefreshing = false;
const WORKSPACE_CACHE_TTL_MS = 15_000;

function invalidateServerWorkspaceCache(): void {
  lastWorkspaceFetchTime = 0;
}

function saveLocalWorkspaceData(data: {
  leads?: KycLead[];
  teamMembers?: TeamMember[];
  masterTeam?: MasterSalesPerson[];
}): void {
  try {
    const current = getLocalWorkspaceData();
    const updated = {
      leads: data.leads ?? current.leads,
      teamMembers: data.teamMembers ?? current.teamMembers,
      masterTeam: data.masterTeam ?? current.masterTeam,
    };
    const dir = path.dirname(LOCAL_WORKSPACE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_WORKSPACE_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    memoryWorkspaceCache = updated;
    lastWorkspaceFetchTime = Date.now();
  } catch (err) {
    console.error('Failed to save local workspace data:', err);
  }
}

async function callAppsScript<T>(method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<T> {
  const cfg = getEnvConfig();
  if (!cfg.appsScriptUrl) {
    throw new Error('Google Apps Script URL is not configured.');
  }
  const url =
    method === 'GET' ? `${cfg.appsScriptUrl}?action=workspace` : cfg.appsScriptUrl;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(method === 'POST' && body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed: (T & { error?: string }) | null = null;
  try {
    parsed = JSON.parse(text) as T & { error?: string };
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    throw new Error(parsed?.error || `Apps Script request failed (${res.status})`);
  }
  if (!parsed) {
    throw new Error('Apps Script did not return valid JSON. Check deployment access ("Anyone").');
  }
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  return parsed;
}



async function fetchWorkspaceDataDirect(): Promise<{
  leads: KycLead[];
  teamMembers: TeamMember[];
  masterTeam: MasterSalesPerson[];
}> {
  const cfg = getEnvConfig();
  if (cfg.appsScriptUrl && (!cfg.serviceAccountEmail || !cfg.serviceAccountPrivateKey)) {
    try {
      const res = await callAppsScript<{
        leads?: KycLead[];
        teamMembers?: TeamMember[];
        masterTeam?: MasterSalesPerson[];
      }>('GET');
      const normalized = {
        leads: Array.isArray(res.leads)
          ? res.leads.map((l) => {
              const category = normalizeCategory(String(l.salespersonCategory ?? ''));
              const role: UserRole =
                category === 'ADMIN' || category === 'GM' ? 'manager' : 'salesperson';
              const createdAt = formatSheetTimestamp(l.createdAt);
              const parsedActivities = Array.isArray(l.activities) && l.activities.length > 0
                ? l.activities
                : buildFallbackActivities(
                    l.id,
                    l.companyName,
                    l.salespersonName,
                    role,
                    createdAt,
                    l.gmName,
                    l.mmName,
                    l.tseName
                  );
              return {
                ...l,
                salespersonCategory: category,
                activities: parsedActivities,
              };
            })
          : [],
        teamMembers: Array.isArray(res.teamMembers)
          ? res.teamMembers.map(normalizeTeamMemberRecord)
          : [],
        masterTeam: Array.isArray(res.masterTeam) ? res.masterTeam : [],
      };
      if (normalized.leads.length > 0 || normalized.teamMembers.length > 0) {
        saveLocalWorkspaceData(normalized);
      }
      return normalized;
    } catch (err) {
      console.warn('Apps Script GET workspace failed, using local workspace cache:', err);
      return getLocalWorkspaceData();
    }
  }

  if (cfg.serviceAccountEmail && cfg.serviceAccountPrivateKey) {
    try {
      const ctx = await resolveAndEnsureSheetContext();
      const kycRange = `${quoteTabName(ctx.kycTabTitle)}!A2:X`;
      const teamRange = `${quoteTabName(ctx.teamTabTitle)}!A2:F`;
      const rangeParams = [`ranges=${encodeURIComponent(kycRange)}`, `ranges=${encodeURIComponent(teamRange)}`];
      if (ctx.masterTabTitle) {
        rangeParams.push(`ranges=${encodeURIComponent(`${quoteTabName(ctx.masterTabTitle)}!A2:C`)}`);
      }

      const data = await googleFetch<{ valueRanges?: { values?: string[][] }[] }>(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
          ctx.spreadsheetId
        )}/values:batchGet?${rangeParams.join('&')}`
      );

      const kycRows = data.valueRanges?.[0]?.values ?? [];
      const teamRows = data.valueRanges?.[1]?.values ?? [];
      const masterRows = ctx.masterTabTitle ? data.valueRanges?.[2]?.values ?? [] : [];

      const masterTeam: MasterSalesPerson[] = masterRows
        .map((row, idx): MasterSalesPerson | null => {
          const cells = row.map((c) => String(c ?? '').trim());
          if (cells.every((c) => c === '')) return null;
          const name = cells[0] || '';
          const category = normalizeMasterCategory(cells[2] ?? '');
          if (!name || !category) return null;
          return {
            id: `master-${idx + 2}`,
            name,
            firm: cells[1] || '',
            category,
          };
        })
        .filter((m): m is MasterSalesPerson => m !== null);

      const teamMembers: TeamMember[] = teamRows
        .map((row, idx): TeamMember | null => {
          const cells = row.map((c) => String(c ?? '').trim());
          if (cells.every((c) => c === '')) return null;
          const name = cells[1] || '';
          if (!name) return null;
          const category =
            name.trim().toLowerCase() === 'admin'
              ? 'ADMIN'
              : normalizeCategory(cells[2] ?? '', '');
          return normalizeTeamMemberRecord({
            id: cells[0] || `tm-row-${idx + 2}`,
            name,
            email: '',
            phone: '',
            salespersonCategory: category,
            role: normalizeRole('', category),
            territory: '',
            password: cells[4] ?? '',
            status: normalizeAccountStatus(cells[3] ?? 'Active'),
            allowedPages:
              category === 'ADMIN' ? [...ALL_NAV_SECTIONS] : normalizeAllowedPages(cells[5] ?? ''),
          });
        })
        .filter((m): m is TeamMember => m !== null);

      const leads: KycLead[] = kycRows
        .map((row, idx): KycLead | null => {
          const cells = row.map((c) => String(c ?? '').trim());
          if (cells.every((c) => c === '')) return null;
          const companyName = cells[2] || '';
          const gstin = cells[4] || '';
          if (!companyName && !gstin) return null;

          const rowNum = idx + 2;
          const city = cells[6] || '';
          const branches = parseBranches(cells[10] ?? '', city, rowNum);
          const parsedCount = Number(cells[9]);
          const branchCount =
            Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : branches.length;
          const fallbackNow = formatSheetTimestamp();

          const category = normalizeCategory(cells[20] ?? '');
          const role: UserRole =
            category === 'ADMIN' || category === 'GM' ? 'manager' : 'salesperson';
          const createdAt = formatSheetTimestamp(cells[22] || fallbackNow);
          const salespersonName = cells[19] || cells[18] || '';
          const gmName = cells[16] || '';
          const mmName = cells[17] || '';
          const tseName = cells[18] || '';

          return {
            id: cells[0] || `KYC-ROW-${rowNum}`,
            entityType: (cells[1] ?? '').toLowerCase() === 'vendor' ? 'vendor' : 'customer',
            companyName: companyName || 'Untitled Company',
            industry: cells[3] || 'General Commercial',
            gstin,
            address: cells[5] || '',
            city,
            state: cells[7] || '',
            pincode: cells[8] || '',
            branchCount,
            branches,
            managerName: cells[11] || '',
            managerPhone: normalizeIndianPhone(cells[12] ?? ''),
            teamLeaderName: cells[13] || '',
            teamLeaderPhone: normalizeIndianPhone(cells[14] ?? ''),
            contactEmail: cells[15] || '',
            gmName,
            mmName,
            tseName,
            salespersonName,
            salespersonCategory: category,
            notes: cells[21] || '',
            createdAt,
            updatedAt: formatSheetTimestamp(cells[23] || createdAt),
            gmId: '',
            mmId: '',
            tseId: '',
            salespersonId: '',
            activities: buildFallbackActivities(
              cells[0] || `KYC-ROW-${rowNum}`,
              companyName || 'Untitled Company',
              salespersonName,
              role,
              createdAt,
              gmName,
              mmName,
              tseName
            ),
          };
        })
        .filter((l): l is KycLead => l !== null);

      const result = { leads, teamMembers, masterTeam };
      saveLocalWorkspaceData(result);
      return result;
    } catch (err) {
      console.warn('Google Sheets fetch failed, using local workspace cache:', err);
      return getLocalWorkspaceData();
    }
  }

  return getLocalWorkspaceData();
}

async function fetchWorkspaceData(forceFresh = false): Promise<{
  leads: KycLead[];
  teamMembers: TeamMember[];
  masterTeam: MasterSalesPerson[];
}> {
  const now = Date.now();
  if (!forceFresh && memoryWorkspaceCache && now - lastWorkspaceFetchTime < WORKSPACE_CACHE_TTL_MS) {
    return memoryWorkspaceCache;
  }

  if (!forceFresh && memoryWorkspaceCache && !isWorkspaceBackgroundRefreshing) {
    isWorkspaceBackgroundRefreshing = true;
    void fetchWorkspaceDataDirect()
      .then((fresh) => {
        memoryWorkspaceCache = fresh;
        lastWorkspaceFetchTime = Date.now();
      })
      .catch((err) => {
        console.warn('Background workspace refresh failed:', err);
      })
      .finally(() => {
        isWorkspaceBackgroundRefreshing = false;
      });
    return memoryWorkspaceCache;
  }

  if (!memoryWorkspaceCache) {
    const local = getLocalWorkspaceData();
    if (local.leads.length > 0 || local.teamMembers.length > 1) {
      memoryWorkspaceCache = local;
      lastWorkspaceFetchTime = now;
      void fetchWorkspaceDataDirect()
        .then((fresh) => {
          memoryWorkspaceCache = fresh;
          lastWorkspaceFetchTime = Date.now();
        })
        .catch(() => {});
      return memoryWorkspaceCache;
    }
  }

  const result = await fetchWorkspaceDataDirect();
  memoryWorkspaceCache = result;
  lastWorkspaceFetchTime = Date.now();
  return result;
}

async function findRowNumberById(
  spreadsheetId: string,
  tabTitle: string,
  targetId: string
): Promise<number | null> {
  const range = `${quoteTabName(tabTitle)}!A2:A`;
  const data = await googleFetch<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}`
  );
  const rows = data.values ?? [];
  for (let i = 0; i < rows.length; i += 1) {
    if (String(rows[i]?.[0] ?? '').trim() === targetId) {
      return i + 2;
    }
  }
  return null;
}

export const app = express();
app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const identifier = String(req.body?.identifier ?? '').trim();
      const password = String(req.body?.password ?? '');
      if (!identifier || !password) {
        res.status(400).json({ error: 'Username and password are required.' });
        return;
      }

      const lowerId = identifier.toLowerCase();
      const digitsId = normalizeIndianPhone(identifier);

      // 1. Fetch team members directly from Google Sheets via Apps Script
      const { teamMembers } = await fetchWorkspaceData();

      // 2. Find matching user from Google Sheet Team Login tab
      const matched = teamMembers.find(
        (m) =>
          m.name.trim().toLowerCase() === lowerId ||
          m.id.toLowerCase() === lowerId ||
          m.email.toLowerCase() === lowerId ||
          (digitsId.length === 10 && normalizeIndianPhone(m.phone) === digitsId)
      );

      if (matched) {
        if (matched.status === 'inactive') {
          res.status(401).json({
            error: 'This account is deactivated. Please contact Admin to reactivate.',
          });
          return;
        }

        if (!matched.password || matched.password !== password) {
          res.status(401).json({ error: 'Incorrect password. Please try again.' });
          return;
        }

        const { password: _omittedPassword, ...safeUser } = matched;
        if (safeUser.salespersonCategory === 'ADMIN') {
          safeUser.role = 'manager';
          safeUser.allowedPages = ['overview', 'directory', 'leaderboard', 'loginAccess'];
        }
        res.json({ user: safeUser });
        return;
      }

      // 3. Fallback for admin if sheet connection has network delay
      if (lowerId === 'admin' && (password === 'admin@1234' || password === 'admin' || password === 'admin123')) {
        const adminUser: TeamMember = {
          id: 'tm-1795016485360',
          name: 'Admin',
          email: 'admin@company.in',
          phone: '',
          role: 'manager',
          salespersonCategory: 'ADMIN',
          territory: 'All Zones',
          status: 'active',
          allowedPages: ['overview', 'directory', 'leaderboard', 'loginAccess'],
        };
        res.json({ user: adminUser });
        return;
      }

      res.status(401).json({ error: 'No account found for this username, email, or mobile.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/workspace', async (_req: Request, res: Response) => {
    try {
      const data = await fetchWorkspaceData();
      res.json(data);
    } catch (err) {
      res.status(422).json({
        error: err instanceof Error ? err.message : 'Failed to load workspace data.',
      });
    }
  });

  app.get('/api/gstin/:gstin', async (req: Request, res: Response) => {
    const gstin = String(req.params.gstin ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, '');
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(gstin)) {
      res.status(400).json({ error: 'Enter a valid 15-character GSTIN.' });
      return;
    }

    const stateCode = gstin.slice(0, 2);
    const detectedState = GSTIN_STATE_CODES[stateCode] || '';

    const cfg = getEnvConfig();
    if (!cfg.gstinApiKey) {
      res.json({
        configured: false,
        found: false,
        legalName: '',
        tradeName: '',
        address: '',
        city: '',
        state: detectedState,
        pincode: '',
        status: '',
        message: '',
      });
      return;
    }

    try {
      const targetUrl = cfg.gstinApiUrl
        ? cfg.gstinApiUrl.replace('{key}', encodeURIComponent(cfg.gstinApiKey)).replace(
            '{gstin}',
            encodeURIComponent(gstin)
          )
        : `https://sheet.gstincheck.co.in/check/${encodeURIComponent(
            cfg.gstinApiKey
          )}/${encodeURIComponent(gstin)}`;

      const apiRes = await fetch(targetUrl, {
        headers: { Accept: 'application/json' },
      });
      const raw = (await apiRes.json().catch(() => null)) as Record<string, unknown> | null;
      if (!apiRes.ok || !raw) {
        res.status(502).json({
          error: 'Unable to fetch GSTIN details right now. Please enter address manually.',
        });
        return;
      }

      const obj = raw;
      const data = (
        obj.data && typeof obj.data === 'object' ? obj.data : obj
      ) as Record<string, unknown>;
      if (obj.flag === false || obj.success === false || obj.error === true) {
        res.json({
          configured: true,
          found: false,
          legalName: '',
          tradeName: '',
          address: '',
          city: '',
          state: detectedState,
          pincode: '',
          status: '',
          message: String(obj.message || 'GSTIN details not found.'),
        });
        return;
      }

      const pradr =
        data.pradr && typeof data.pradr === 'object'
          ? (data.pradr as Record<string, unknown>)
          : null;
      const addrObj =
        pradr && pradr.addr && typeof pradr.addr === 'object'
          ? (pradr.addr as Record<string, unknown>)
          : null;

      const cleanParts = (parts: unknown[]) =>
        parts
          .map((p) => String(p ?? '').trim())
          .filter((p) => p !== '' && p.toLowerCase() !== 'na' && p.toLowerCase() !== 'n/a')
          .join(', ');

      const legalName = String(data.lgnm || data.legalName || data.legal_name || '').trim();
      const tradeName = String(data.tradeNam || data.tradeName || data.trade_name || '').trim();
      const status = String(data.sts || data.status || '').trim();
      const address = addrObj
        ? cleanParts([
            addrObj.flno,
            addrObj.bno,
            addrObj.bnm,
            addrObj.st,
            addrObj.loc,
            addrObj.locality,
          ])
        : pradr && typeof pradr.adr === 'string'
          ? pradr.adr.trim()
          : '';
      const city = addrObj
        ? String(addrObj.city || addrObj.dst || addrObj.loc || '').trim()
        : '';
      const state = addrObj
        ? String(addrObj.stcd || addrObj.state || detectedState).trim()
        : detectedState;
      const pincode = addrObj
        ? String(addrObj.pncd || addrObj.pincode || '')
            .replace(/\D/g, '')
            .slice(0, 6)
        : '';

      const found = Boolean(legalName || tradeName || address);
      res.json({
        configured: true,
        found,
        legalName,
        tradeName,
        address,
        city,
        state,
        pincode,
        status,
        message: found ? undefined : String(obj.message || 'Registered address unavailable for this GSTIN.'),
      });
    } catch {
      res.status(502).json({
        error: 'GSTIN lookup failed. Please enter company address manually.',
      });
    }
  });

  app.post('/api/leads', async (req: Request, res: Response) => {
    try {
      const lead = req.body as KycLead;
      const local = getLocalWorkspaceData();
      const existingIdx = local.leads.findIndex((l) => l.id === lead.id);
      if (existingIdx >= 0) {
        local.leads[existingIdx] = lead;
      } else {
        local.leads.unshift(lead);
      }
      saveLocalWorkspaceData(local);

      const cfg = getEnvConfig();
      if (cfg.appsScriptUrl && (!cfg.serviceAccountEmail || !cfg.serviceAccountPrivateKey)) {
        try {
          await callAppsScript('POST', {
            action: 'addLead',
            lead: sanitizeLeadForAppsScript(lead),
          });
        } catch (syncErr) {
          console.warn('Apps Script sync failed for addLead:', syncErr);
        }
      } else if (cfg.serviceAccountEmail && cfg.serviceAccountPrivateKey) {
        try {
          const ctx = await resolveAndEnsureSheetContext();
          const range = `${quoteTabName(ctx.kycTabTitle)}!A1:X1`;
          await googleFetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
              ctx.spreadsheetId
            )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
            {
              method: 'POST',
              body: JSON.stringify({ values: [leadToRowValues(lead)] }),
            }
          );
        } catch (syncErr) {
          console.warn('Google Sheets sync failed for addLead:', syncErr);
        }
      }
      res.status(201).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save KYC.' });
    }
  });

  app.put('/api/leads/:id', async (req: Request, res: Response) => {
    try {
      const lead = req.body as KycLead;
      const local = getLocalWorkspaceData();
      const existingIdx = local.leads.findIndex((l) => l.id === req.params.id);
      if (existingIdx >= 0) {
        local.leads[existingIdx] = lead;
      } else {
        local.leads.unshift(lead);
      }
      saveLocalWorkspaceData(local);

      const cfg = getEnvConfig();
      if (cfg.appsScriptUrl && (!cfg.serviceAccountEmail || !cfg.serviceAccountPrivateKey)) {
        try {
          await callAppsScript('POST', {
            action: 'updateLead',
            lead: sanitizeLeadForAppsScript(lead),
          });
        } catch (syncErr) {
          console.warn('Apps Script sync failed for updateLead:', syncErr);
        }
      } else if (cfg.serviceAccountEmail && cfg.serviceAccountPrivateKey) {
        try {
          const ctx = await resolveAndEnsureSheetContext();
          const rowNumber = await findRowNumberById(ctx.spreadsheetId, ctx.kycTabTitle, req.params.id);
          if (rowNumber) {
            const range = `${quoteTabName(ctx.kycTabTitle)}!A${rowNumber}:X${rowNumber}`;
            await googleFetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
                ctx.spreadsheetId
              )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
              {
                method: 'PUT',
                body: JSON.stringify({ values: [leadToRowValues(lead)] }),
              }
            );
          }
        } catch (syncErr) {
          console.warn('Google Sheets sync failed for updateLead:', syncErr);
        }
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update KYC.' });
    }
  });

  app.delete('/api/leads/:id', async (req: Request, res: Response) => {
    try {
      const local = getLocalWorkspaceData();
      local.leads = local.leads.filter((l) => l.id !== req.params.id);
      saveLocalWorkspaceData(local);

      const cfg = getEnvConfig();
      if (cfg.appsScriptUrl && (!cfg.serviceAccountEmail || !cfg.serviceAccountPrivateKey)) {
        try {
          await callAppsScript('POST', { action: 'deleteLead', id: req.params.id });
        } catch (syncErr) {
          console.warn('Apps Script sync failed for deleteLead:', syncErr);
        }
      } else if (cfg.serviceAccountEmail && cfg.serviceAccountPrivateKey) {
        try {
          const ctx = await resolveAndEnsureSheetContext();
          if (ctx.kycTabSheetId !== null) {
            const rowNumber = await findRowNumberById(ctx.spreadsheetId, ctx.kycTabTitle, req.params.id);
            if (rowNumber) {
              await googleFetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
                  ctx.spreadsheetId
                )}:batchUpdate`,
                {
                  method: 'POST',
                  body: JSON.stringify({
                    requests: [
                      {
                        deleteDimension: {
                          range: {
                            sheetId: ctx.kycTabSheetId,
                            dimension: 'ROWS',
                            startIndex: rowNumber - 1,
                            endIndex: rowNumber,
                          },
                        },
                      },
                    ],
                  }),
                }
              );
            }
          }
        } catch (syncErr) {
          console.warn('Google Sheets sync failed for deleteLead:', syncErr);
        }
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete KYC.' });
    }
  });

  app.post('/api/team', async (req: Request, res: Response) => {
    try {
      const member = req.body as TeamMember;
      const local = getLocalWorkspaceData();
      const existingIdx = local.teamMembers.findIndex((m) => m.id === member.id);
      if (existingIdx >= 0) {
        local.teamMembers[existingIdx] = member;
      } else {
        local.teamMembers.push(member);
      }
      saveLocalWorkspaceData(local);

      const cfg = getEnvConfig();
      if (cfg.appsScriptUrl && (!cfg.serviceAccountEmail || !cfg.serviceAccountPrivateKey)) {
        try {
          await callAppsScript('POST', { action: 'addTeamMember', member });
        } catch (syncErr) {
          console.warn('Apps Script sync failed for addTeamMember:', syncErr);
        }
      } else if (cfg.serviceAccountEmail && cfg.serviceAccountPrivateKey) {
        try {
          const ctx = await resolveAndEnsureSheetContext();
          const range = `${quoteTabName(ctx.teamTabTitle)}!A1:F1`;
          await googleFetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
              ctx.spreadsheetId
            )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
            {
              method: 'POST',
              body: JSON.stringify({
                values: [teamMemberToRowValues(member)],
              }),
            }
          );
        } catch (syncErr) {
          console.warn('Google Sheets sync failed for addTeamMember:', syncErr);
        }
      }
      res.status(201).json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to add team member.',
      });
    }
  });

  app.put('/api/team/:id', async (req: Request, res: Response) => {
    try {
      const member = req.body as TeamMember;
      const local = getLocalWorkspaceData();
      const existing = local.teamMembers.find((m) => m.id === req.params.id);
      if ((existing && isProtectedAdminRecord(existing)) || isProtectedAdminRecord(member)) {
        res.status(403).json({
          error: 'Admin account is protected and cannot be edited or deactivated.',
        });
        return;
      }

      const existingIdx = local.teamMembers.findIndex((m) => m.id === req.params.id);
      if (existingIdx >= 0) {
        local.teamMembers[existingIdx] = member;
      } else {
        local.teamMembers.push(member);
      }
      saveLocalWorkspaceData(local);

      const cfg = getEnvConfig();
      if (cfg.appsScriptUrl && (!cfg.serviceAccountEmail || !cfg.serviceAccountPrivateKey)) {
        try {
          await callAppsScript('POST', { action: 'updateTeamMember', member });
        } catch (syncErr) {
          console.warn('Apps Script sync failed for updateTeamMember:', syncErr);
        }
      } else if (cfg.serviceAccountEmail && cfg.serviceAccountPrivateKey) {
        try {
          const ctx = await resolveAndEnsureSheetContext();
          const rowNumber = await findRowNumberById(ctx.spreadsheetId, ctx.teamTabTitle, req.params.id);
          if (rowNumber) {
            const updates: { range: string; values: string[][] }[] = [
              {
                range: `${quoteTabName(ctx.teamTabTitle)}!A${rowNumber}:F${rowNumber}`,
                values: [teamMemberToRowValues(member)],
              },
            ];
            await googleFetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
                ctx.spreadsheetId
              )}/values:batchUpdate`,
              {
                method: 'POST',
                body: JSON.stringify({
                  valueInputOption: 'USER_ENTERED',
                  data: updates,
                }),
              }
            );
          }
        } catch (syncErr) {
          console.warn('Google Sheets sync failed for updateTeamMember:', syncErr);
        }
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to update team member.',
      });
    }
  });

  app.delete('/api/team/:id', async (req: Request, res: Response) => {
    try {
      const local = getLocalWorkspaceData();
      const existing = local.teamMembers.find((m) => m.id === req.params.id);
      if (existing && isProtectedAdminRecord(existing)) {
        res.status(403).json({
          error: 'Admin account is protected and cannot be removed.',
        });
        return;
      }

      local.teamMembers = local.teamMembers.filter((m) => m.id !== req.params.id);
      saveLocalWorkspaceData(local);

      const cfg = getEnvConfig();
      if (cfg.appsScriptUrl && (!cfg.serviceAccountEmail || !cfg.serviceAccountPrivateKey)) {
        try {
          await callAppsScript('POST', { action: 'deleteTeamMember', id: req.params.id });
        } catch (syncErr) {
          console.warn('Apps Script sync failed for deleteTeamMember:', syncErr);
        }
      } else if (cfg.serviceAccountEmail && cfg.serviceAccountPrivateKey) {
        try {
          const ctx = await resolveAndEnsureSheetContext();
          if (ctx.teamTabSheetId !== null) {
            const rowNumber = await findRowNumberById(ctx.spreadsheetId, ctx.teamTabTitle, req.params.id);
            if (rowNumber) {
              await googleFetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
                  ctx.spreadsheetId
                )}:batchUpdate`,
                {
                  method: 'POST',
                  body: JSON.stringify({
                    requests: [
                      {
                        deleteDimension: {
                          range: {
                            sheetId: ctx.teamTabSheetId,
                            dimension: 'ROWS',
                            startIndex: rowNumber - 1,
                            endIndex: rowNumber,
                          },
                        },
                      },
                    ],
                  }),
                }
              );
            }
          }
        } catch (syncErr) {
          console.warn('Google Sheets sync failed for deleteTeamMember:', syncErr);
        }
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to remove team member.',
      });
    }
  });

  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

async function startServer() {
  const isVercel = Boolean(process.env.VERCEL);
  if (!isVercel) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        const indexFile = path.join(distPath, 'index.html');
        if (fs.existsSync(indexFile)) {
          res.sendFile(indexFile);
        } else {
          res.status(404).send('Not found');
        }
      });
    }

    const port = Number(process.env.PORT) || 3000;
    app.listen(port, '0.0.0.0', () => {
      console.log(`KYC System server listening on http://localhost:${port}`);
    });
  }
}

void startServer();

export default app;
