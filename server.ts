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
type SalespersonCategory = 'GM' | 'MM' | 'TSE';
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
  createdAt?: string;
}

interface ResolvedSheetContext {
  spreadsheetId: string;
  kycTabTitle: string;
  kycTabSheetId: number | null;
  teamTabTitle: string;
  teamTabSheetId: number | null;
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
  'GM ID',
  'MM ID',
  'TSE ID',
  'Added By ID',
  'Activity Log',
] as const;

const TEAM_LOGIN_HEADERS = [
  'Member ID',
  'Full Name',
  'Work Email',
  'Mobile Number',
  'Category',
  'System Role',
  'Territory / Zone',
  'Password',
  'Created At',
  'Status',
] as const;

const ENV_SPREADSHEET_ID = (
  process.env.GOOGLE_SPREADSHEET_ID ||
  process.env.VITE_GOOGLE_SPREADSHEET_ID ||
  ''
).trim();
const ENV_SHEET_NAME =
  (process.env.GOOGLE_SHEET_NAME || process.env.VITE_GOOGLE_SHEET_NAME || '').trim() || 'KYC';
const DEFAULT_KYC_TAB =
  (process.env.GOOGLE_KYC_TAB || process.env.VITE_GOOGLE_KYC_TAB || '').trim() || 'KYC Records';
const DEFAULT_TEAM_TAB =
  (process.env.GOOGLE_TEAM_TAB || process.env.VITE_GOOGLE_TEAM_TAB || '').trim() || 'Team Login';
const SERVICE_ACCOUNT_EMAIL = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
const SERVICE_ACCOUNT_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '')
  .replace(/\\n/g, '\n')
  .trim();
const APPS_SCRIPT_URL = (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();
const ADMIN_NAME = (process.env.ADMIN_NAME || 'Workspace Admin').trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@kycsystem.local').trim().toLowerCase();

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
  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
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
      iss: SERVICE_ACCOUNT_EMAIL,
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
  const signature = base64UrlEncode(signer.sign(SERVICE_ACCOUNT_PRIVATE_KEY));
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

  let spreadsheetId = extractSpreadsheetId(ENV_SPREADSHEET_ID);
  if (!spreadsheetId) {
    const query = encodeURIComponent(
      "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    );
    const filesData = await googleFetch<{ files?: { id: string; name: string }[] }>(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&orderBy=modifiedTime desc&pageSize=50`
    );
    const files = filesData.files ?? [];
    const targetLower = ENV_SHEET_NAME.toLowerCase();
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
            properties: { title: ENV_SHEET_NAME },
            sheets: [
              { properties: { title: DEFAULT_KYC_TAB } },
              { properties: { title: DEFAULT_TEAM_TAB } },
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
    return lower.includes('member id') && lower.includes('work email');
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

  const kycTabTitle = existingKycTab?.title ?? DEFAULT_KYC_TAB;
  let kycTabSheetId = existingKycTab ? existingKycTab.sheetId : null;
  const needsKycTabCreate = !existingKycTab;
  const needsKycHeaders = needsKycTabCreate || !hasKycHeaders(headerRowsByTab.get(kycTabTitle));

  const teamTabTitle = existingTeamTab?.title ?? DEFAULT_TEAM_TAB;
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
      range: `${quoteTabName(teamTabTitle)}!A1:J1`,
      values: [[...TEAM_LOGIN_HEADERS]],
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

  const ctx: ResolvedSheetContext = {
    spreadsheetId,
    kycTabTitle,
    kycTabSheetId,
    teamTabTitle,
    teamTabSheetId,
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
  if (upper === 'GM' || upper === 'MM' || upper === 'TSE') return upper;
  return fallbackRole === 'manager' ? 'GM' : 'TSE';
}

function normalizeRole(raw: string, category: SalespersonCategory): UserRole {
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

function leadToRowValues(lead: KycLead): (string | number)[] {
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
    lead.salespersonCategory,
    lead.notes,
    lead.createdAt,
    lead.updatedAt,
    lead.gmId,
    lead.mmId,
    lead.tseId,
    lead.salespersonId,
    serializeActivities(lead.activities),
  ];
}

function teamMemberToRowValues(member: TeamMember, fallbackCreatedAt: string): string[] {
  return [
    member.id,
    member.name,
    member.email,
    member.phone,
    member.salespersonCategory,
    member.role,
    member.territory,
    member.password ?? '',
    member.createdAt || fallbackCreatedAt,
    member.status === 'inactive' ? 'Deactivated' : 'Active',
  ];
}

async function callAppsScript<T>(method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<T> {
  const url =
    method === 'GET' ? `${APPS_SCRIPT_URL}?action=workspace` : APPS_SCRIPT_URL;
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

async function fetchWorkspaceData(): Promise<{ leads: KycLead[]; teamMembers: TeamMember[] }> {
  if (APPS_SCRIPT_URL && (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY)) {
    return callAppsScript<{ leads: KycLead[]; teamMembers: TeamMember[] }>('GET');
  }

  const ctx = await resolveAndEnsureSheetContext();
  const kycRange = `${quoteTabName(ctx.kycTabTitle)}!A2:AC`;
  const teamRange = `${quoteTabName(ctx.teamTabTitle)}!A2:J`;

  const data = await googleFetch<{ valueRanges?: { values?: string[][] }[] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      ctx.spreadsheetId
    )}/values:batchGet?ranges=${encodeURIComponent(kycRange)}&ranges=${encodeURIComponent(
      teamRange
    )}`
  );

  const kycRows = data.valueRanges?.[0]?.values ?? [];
  const teamRows = data.valueRanges?.[1]?.values ?? [];

  const teamMembers: TeamMember[] = teamRows
    .map((row, idx): TeamMember | null => {
      const cells = row.map((c) => String(c ?? '').trim());
      if (cells.every((c) => c === '')) return null;
      const name = cells[1] || '';
      const email = cells[2] || '';
      if (!name && !email) return null;
      const category = normalizeCategory(cells[4] ?? '', cells[5] ?? '');
      return {
        id: cells[0] || `tm-row-${idx + 2}`,
        name: name || email,
        email: email.toLowerCase(),
        phone: normalizeIndianPhone(cells[3] ?? ''),
        salespersonCategory: category,
        role: normalizeRole(cells[5] ?? '', category),
        territory: cells[6] || 'Assigned Zone',
        password: cells[7] ?? '',
        createdAt: cells[8] || '',
        status: normalizeAccountStatus(cells[9] ?? 'Active'),
      };
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
      const fallbackNow = new Date().toISOString();

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
        gmName: cells[16] || '',
        mmName: cells[17] || '',
        tseName: cells[18] || '',
        salespersonName: cells[19] || cells[18] || '',
        salespersonCategory: normalizeCategory(cells[20] ?? ''),
        notes: cells[21] || '',
        createdAt: cells[22] || fallbackNow,
        updatedAt: cells[23] || cells[22] || fallbackNow,
        gmId: cells[24] || '',
        mmId: cells[25] || '',
        tseId: cells[26] || '',
        salespersonId: cells[27] || '',
        activities: parseActivities(cells[28] ?? ''),
      };
    })
    .filter((l): l is KycLead => l !== null);

  return { leads, teamMembers };
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

async function createServer() {
  const app = express();
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
      const matchesAdminUsername =
        ADMIN_USERNAME !== '' && lowerId === ADMIN_USERNAME.toLowerCase();
      const matchesAdminEmail = ADMIN_EMAIL !== '' && lowerId === ADMIN_EMAIL;

      if (matchesAdminUsername || (matchesAdminEmail && ADMIN_PASSWORD !== '' && password === ADMIN_PASSWORD)) {
        if (!ADMIN_PASSWORD) {
          res.status(500).json({
            error: 'Admin password is not configured on the server.',
          });
          return;
        }
        if (password !== ADMIN_PASSWORD) {
          res.status(401).json({ error: 'Incorrect admin password. Please try again.' });
          return;
        }

        const adminUser: TeamMember = {
          id: 'admin-root',
          name: ADMIN_NAME,
          email: ADMIN_EMAIL || 'admin@kycsystem.local',
          phone: '',
          role: 'manager',
          salespersonCategory: 'GM',
          territory: 'Head Office',
          status: 'active',
        };
        res.json({ user: adminUser });
        return;
      }

      const { teamMembers } = await fetchWorkspaceData();
      const digitsId = normalizeIndianPhone(identifier);

      const matched = teamMembers.find(
        (m) =>
          m.email.toLowerCase() === lowerId ||
          m.name.trim().toLowerCase() === lowerId ||
          (digitsId.length === 10 && normalizeIndianPhone(m.phone) === digitsId)
      );

      if (!matched) {
        res.status(401).json({ error: 'No account found for this username, email, or mobile.' });
        return;
      }

      if (matched.status === 'inactive') {
        res.status(401).json({
          error: 'This account is deactivated. Please activate it from Login Access.',
        });
        return;
      }

      if (!matched.password || matched.password !== password) {
        res.status(401).json({ error: 'Incorrect password. Please try again.' });
        return;
      }

      res.json({ user: matched });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.';
      const isNotConfigured = message.toLowerCase().includes('not configured');
      res.status(isNotConfigured ? 401 : 500).json({
        error: isNotConfigured
          ? 'Google Sheets is not connected yet. Sign in with Admin ID (admin) first, or configure Google Sheets in .env.'
          : message,
      });
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

  app.post('/api/leads', async (req: Request, res: Response) => {
    try {
      const lead = req.body as KycLead;
      if (APPS_SCRIPT_URL && (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY)) {
        await callAppsScript('POST', { action: 'addLead', lead });
      } else {
        const ctx = await resolveAndEnsureSheetContext();
        const range = `${quoteTabName(ctx.kycTabTitle)}!A1:AC1`;
        await googleFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
            ctx.spreadsheetId
          )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          {
            method: 'POST',
            body: JSON.stringify({ values: [leadToRowValues(lead)] }),
          }
        );
      }
      res.status(201).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save KYC.' });
    }
  });

  app.put('/api/leads/:id', async (req: Request, res: Response) => {
    try {
      const lead = req.body as KycLead;
      if (APPS_SCRIPT_URL && (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY)) {
        await callAppsScript('POST', { action: 'updateLead', lead });
      } else {
        const ctx = await resolveAndEnsureSheetContext();
        const rowNumber = await findRowNumberById(ctx.spreadsheetId, ctx.kycTabTitle, req.params.id);
        if (!rowNumber) {
          res.status(404).json({ error: `Record ${req.params.id} was not found.` });
          return;
        }
        const range = `${quoteTabName(ctx.kycTabTitle)}!A${rowNumber}:AC${rowNumber}`;
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
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update KYC.' });
    }
  });

  app.delete('/api/leads/:id', async (req: Request, res: Response) => {
    try {
      if (APPS_SCRIPT_URL && (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY)) {
        await callAppsScript('POST', { action: 'deleteLead', id: req.params.id });
      } else {
        const ctx = await resolveAndEnsureSheetContext();
        if (ctx.kycTabSheetId === null) {
          res.status(400).json({ error: 'KYC sheet tab ID is unavailable.' });
          return;
        }
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
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete KYC.' });
    }
  });

  app.post('/api/team', async (req: Request, res: Response) => {
    try {
      const member = req.body as TeamMember;
      if (APPS_SCRIPT_URL && (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY)) {
        await callAppsScript('POST', { action: 'addTeamMember', member });
      } else {
        const ctx = await resolveAndEnsureSheetContext();
        const range = `${quoteTabName(ctx.teamTabTitle)}!A1:J1`;
        await googleFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
            ctx.spreadsheetId
          )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          {
            method: 'POST',
            body: JSON.stringify({
              values: [teamMemberToRowValues(member, new Date().toISOString())],
            }),
          }
        );
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
      if (APPS_SCRIPT_URL && (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY)) {
        await callAppsScript('POST', { action: 'updateTeamMember', member });
      } else {
        const ctx = await resolveAndEnsureSheetContext();
        const rowNumber = await findRowNumberById(ctx.spreadsheetId, ctx.teamTabTitle, req.params.id);
        if (!rowNumber) {
          res.status(404).json({ error: `Account "${member.name}" was not found.` });
          return;
        }
        const headerData = await googleFetch<{ values?: string[][] }>(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
            ctx.spreadsheetId
          )}/values/${encodeURIComponent(`${quoteTabName(ctx.teamTabTitle)}!J1`)}`
        );
        const existingJ1 = String(headerData.values?.[0]?.[0] ?? '').trim();
        const updates: { range: string; values: string[][] }[] = [
          {
            range: `${quoteTabName(ctx.teamTabTitle)}!A${rowNumber}:J${rowNumber}`,
            values: [teamMemberToRowValues(member, new Date().toISOString())],
          },
        ];
        if (!existingJ1) {
          updates.push({
            range: `${quoteTabName(ctx.teamTabTitle)}!J1`,
            values: [['Status']],
          });
        }
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
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to update team member.',
      });
    }
  });

  app.delete('/api/team/:id', async (req: Request, res: Response) => {
    try {
      if (APPS_SCRIPT_URL && (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY)) {
        await callAppsScript('POST', { action: 'deleteTeamMember', id: req.params.id });
      } else {
        const ctx = await resolveAndEnsureSheetContext();
        if (ctx.teamTabSheetId === null) {
          res.status(400).json({ error: 'Team tab ID is unavailable.' });
          return;
        }
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
    console.log(`KYC System server listening on http://0.0.0.0:${port}`);
  });
}

void createServer();
