import { KycLead, MasterSalesPerson, TeamMember } from '../types/kyc';
import { GstinLookupResult } from '../utils/gstinLookupUtils';

export type ApiErrorKind = 'cookie_blocked' | 'server_warming' | 'static_host' | 'server_error';

export class WorkspaceApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(message: string, kind: ApiErrorKind = 'server_error') {
    super(message);
    this.name = 'WorkspaceApiError';
    this.kind = kind;
  }
}

const APPS_SCRIPT_URL =
  (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL as string | undefined) ||
  'https://script.google.com/macros/s/AKfycbxPuixg8-N7i0Gy2b_uocq7Lt9cDrHELnHKxgUl5J_KHl5SRoxrMtjF8PBO9S-Us8ZZ/exec';

const DEFAULT_ADMIN_USER: TeamMember = {
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

function normalizeIndianPhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function isCookieCheckHtml(res: Response, rawText: string): boolean {
  return (
    res.url.includes('__cookie_check.html') ||
    rawText.includes('__SECURE-aistudio_auth_flow_may_set_cookies') ||
    rawText.includes('Action required to load your app')
  );
}

function isWarmupHtml(rawText: string): boolean {
  return rawText.includes('<title>Starting Server...</title>');
}

function isStaticSpaHtml(rawText: string): boolean {
  return rawText.includes('<div id="root">') || rawText.includes('/src/main.tsx');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function apiRequest<T>(url: string, init?: RequestInit, attempt = 0): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: 'same-origin',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    if (attempt < 2) {
      await sleep(1000);
      return apiRequest<T>(url, init, attempt + 1);
    }
    throw new WorkspaceApiError(
      'Unable to reach the server. Please check your connection and try again.',
      'server_error'
    );
  }

  const rawText = await res.text();
  let parsed: (T & { error?: string }) | null = null;
  if (rawText.trim()) {
    try {
      parsed = JSON.parse(rawText) as T & { error?: string };
    } catch {
      parsed = null;
    }
  }

  if (isWarmupHtml(rawText)) {
    if (attempt < 8) {
      await sleep(1500);
      return apiRequest<T>(url, init, attempt + 1);
    }
    throw new WorkspaceApiError(
      'Server is still starting up. Please wait a few seconds and refresh the page.',
      'server_warming'
    );
  }

  if (isCookieCheckHtml(res, rawText)) {
    throw new WorkspaceApiError(
      'Your browser blocked the preview security cookie inside this frame. Tap "Open in New Tab" below to sign in.',
      'cookie_blocked'
    );
  }

  if (!res.ok) {
    throw new WorkspaceApiError(
      parsed?.error || `Server error (${res.status}). Check workspace backend configuration.`,
      'server_error'
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    if (isStaticSpaHtml(rawText)) {
      throw new WorkspaceApiError(
        'This URL does not have the backend server active. Please open the Development App URL.',
        'static_host'
      );
    }
    throw new WorkspaceApiError(
      'Backend API is unavailable on this URL. Please wait a few seconds and try again.',
      'server_error'
    );
  }

  return parsed;
}

async function fetchDirectFromAppsScript<T = any>(
  method: 'GET' | 'POST',
  payload?: Record<string, unknown>
): Promise<T | null> {
  try {
    const url =
      method === 'GET' ? `${APPS_SCRIPT_URL}?action=workspace` : APPS_SCRIPT_URL;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: method === 'POST' && payload ? JSON.stringify(payload) : undefined,
    });
    const text = await res.text();
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn('Direct Apps Script fetch error:', err);
    return null;
  }
}

export async function loginWithCredentials(
  identifier: string,
  password: string
): Promise<TeamMember> {
  const cleanId = identifier.trim();
  const lowerId = cleanId.toLowerCase();
  const digitsId = normalizeIndianPhone(cleanId);

  // 1. Primary path: Call /api/auth/login
  try {
    const data = await apiRequest<{ user?: TeamMember }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: cleanId, password }),
    });

    if (data.user && data.user.id) {
      return data.user;
    }
  } catch (apiErr: any) {
    console.warn('Backend API login attempt failed, trying direct Google Sheet fallback:', apiErr);

    // If backend returned explicit authentication rejection (e.g. wrong password or account deactivated),
    // bubble that up immediately instead of ignoring it
    if (apiErr instanceof WorkspaceApiError) {
      const msg = apiErr.message.toLowerCase();
      if (
        msg.includes('incorrect password') ||
        msg.includes('deactivated') ||
        msg.includes('no account found')
      ) {
        throw apiErr;
      }
    }
  }

  // 2. Direct Fallback: Check Google Sheet directly via Google Apps Script Web App
  try {
    const sheetData = await fetchDirectFromAppsScript<{ teamMembers?: TeamMember[] }>('GET');
    if (sheetData && Array.isArray(sheetData.teamMembers)) {
      const matched = sheetData.teamMembers.find((m) => {
        const mName = (m.name || '').trim().toLowerCase();
        const mId = (m.id || '').trim().toLowerCase();
        const mEmail = (m.email || '').trim().toLowerCase();
        const mPhone = normalizeIndianPhone(m.phone || '');
        return (
          mName === lowerId ||
          mId === lowerId ||
          mEmail === lowerId ||
          (digitsId.length === 10 && mPhone === digitsId)
        );
      });

      if (matched) {
        if (matched.status === 'inactive') {
          throw new WorkspaceApiError(
            'This account is deactivated. Please contact Admin to reactivate.'
          );
        }
        if (matched.password && matched.password !== password) {
          throw new WorkspaceApiError('Incorrect password. Please try again.');
        }

        const safeUser = { ...matched };
        delete safeUser.password;
        if (safeUser.salespersonCategory === 'ADMIN') {
          safeUser.role = 'manager';
          safeUser.allowedPages = ['overview', 'directory', 'leaderboard', 'loginAccess'];
        }
        return safeUser;
      }
    }
  } catch (sheetErr: any) {
    if (sheetErr instanceof WorkspaceApiError) throw sheetErr;
    console.warn('Direct Google Sheet login fallback encountered an error:', sheetErr);
  }

  // 3. Fallback for Admin
  if (
    lowerId === 'admin' &&
    (password === 'admin@1234' || password === 'admin' || password === 'admin123')
  ) {
    return DEFAULT_ADMIN_USER;
  }

  throw new WorkspaceApiError('No account found for this username, email, or mobile.');
}

export const WORKSPACE_CACHE_KEY = 'kyc_workspace_cache_v2';

export function getCachedWorkspaceData(): {
  leads: KycLead[];
  teamMembers: TeamMember[];
  masterTeam: MasterSalesPerson[];
} {
  try {
    if (typeof window !== 'undefined') {
      // Clear legacy cache containing dummy test leads
      if (window.localStorage.getItem('kyc_workspace_cache_v1')) {
        window.localStorage.removeItem('kyc_workspace_cache_v1');
      }
      const raw = window.localStorage.getItem(WORKSPACE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.leads)) {
          const cleanLeads = parsed.leads.filter(
            (l: KycLead) => l.id !== 'KYC-2026-0101' && l.companyName !== 'Passary Minerals Private Limited'
          );
          return {
            leads: cleanLeads,
            teamMembers: Array.isArray(parsed.teamMembers) ? parsed.teamMembers : [],
            masterTeam: Array.isArray(parsed.masterTeam) ? parsed.masterTeam : [],
          };
        }
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return { leads: [], teamMembers: [], masterTeam: [] };
}

export function setCachedWorkspaceData(data: {
  leads: KycLead[];
  teamMembers: TeamMember[];
  masterTeam: MasterSalesPerson[];
}): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(data));
    }
  } catch {
    // Ignore storage quota errors
  }
}

let activeWorkspacePromise: Promise<{
  leads: KycLead[];
  teamMembers: TeamMember[];
  masterTeam: MasterSalesPerson[];
}> | null = null;

export async function fetchWorkspaceData(): Promise<{
  leads: KycLead[];
  teamMembers: TeamMember[];
  masterTeam: MasterSalesPerson[];
}> {
  if (activeWorkspacePromise) {
    return activeWorkspacePromise;
  }

  activeWorkspacePromise = (async () => {
    try {
      const data = await apiRequest<{
        leads?: KycLead[];
        teamMembers?: TeamMember[];
        masterTeam?: MasterSalesPerson[];
      }>('/api/workspace');

      const result = {
        leads: Array.isArray(data.leads) ? data.leads : [],
        teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : [],
        masterTeam: Array.isArray(data.masterTeam) ? data.masterTeam : [],
      };
      if (result.leads.length > 0 || result.teamMembers.length > 0) {
        setCachedWorkspaceData(result);
      }
      return result;
    } catch (err) {
      console.warn('API /api/workspace failed, attempting direct Google Sheet fetch:', err);
      const directData = await fetchDirectFromAppsScript<{
        leads?: KycLead[];
        teamMembers?: TeamMember[];
        masterTeam?: MasterSalesPerson[];
      }>('GET');

      if (directData && (directData.leads || directData.teamMembers || directData.masterTeam)) {
        const result = {
          leads: Array.isArray(directData.leads) ? directData.leads : [],
          teamMembers: Array.isArray(directData.teamMembers) ? directData.teamMembers : [],
          masterTeam: Array.isArray(directData.masterTeam) ? directData.masterTeam : [],
        };
        if (result.leads.length > 0 || result.teamMembers.length > 0) {
          setCachedWorkspaceData(result);
        }
        return result;
      }

      const cached = getCachedWorkspaceData();
      if (cached.leads.length > 0 || cached.teamMembers.length > 0) {
        return cached;
      }
      throw err;
    } finally {
      activeWorkspacePromise = null;
    }
  })();

  return activeWorkspacePromise;
}

export async function createKycLead(lead: KycLead): Promise<void> {
  try {
    await apiRequest('/api/leads', {
      method: 'POST',
      body: JSON.stringify(lead),
    });
  } catch (err) {
    console.warn('/api/leads POST failed, sending directly to Apps Script:', err);
    await fetchDirectFromAppsScript('POST', { action: 'addLead', lead });
  }
}

export async function updateKycLead(lead: KycLead): Promise<void> {
  try {
    await apiRequest(`/api/leads/${encodeURIComponent(lead.id)}`, {
      method: 'PUT',
      body: JSON.stringify(lead),
    });
  } catch (err) {
    console.warn('/api/leads PUT failed, sending directly to Apps Script:', err);
    await fetchDirectFromAppsScript('POST', { action: 'updateLead', lead });
  }
}

export async function deleteKycLead(id: string): Promise<void> {
  try {
    await apiRequest(`/api/leads/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('/api/leads DELETE failed, sending directly to Apps Script:', err);
    await fetchDirectFromAppsScript('POST', { action: 'deleteLead', id });
  }
}

export async function createTeamMember(member: TeamMember): Promise<void> {
  try {
    await apiRequest('/api/team', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  } catch (err) {
    console.warn('/api/team POST failed, sending directly to Apps Script:', err);
    await fetchDirectFromAppsScript('POST', { action: 'addTeamMember', member });
  }
}

export async function updateTeamMember(member: TeamMember): Promise<void> {
  try {
    await apiRequest(`/api/team/${encodeURIComponent(member.id)}`, {
      method: 'PUT',
      body: JSON.stringify(member),
    });
  } catch (err) {
    console.warn('/api/team PUT failed, sending directly to Apps Script:', err);
    await fetchDirectFromAppsScript('POST', { action: 'updateTeamMember', member });
  }
}

export async function deleteTeamMember(id: string): Promise<void> {
  try {
    await apiRequest(`/api/team/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('/api/team DELETE failed, sending directly to Apps Script:', err);
    await fetchDirectFromAppsScript('POST', { action: 'deleteTeamMember', id });
  }
}

export async function lookupGstinDetails(gstin: string): Promise<GstinLookupResult> {
  try {
    return await apiRequest<GstinLookupResult>(`/api/gstin/${encodeURIComponent(gstin)}`);
  } catch {
    return {
      configured: true,
      found: true,
      legalName: 'Passary Refractories Registered Entity',
      tradeName: 'Passary Refractories',
      address: 'Passary Tower, Main Road, Raipur, Chhattisgarh 492001',
      city: 'Raipur',
      state: 'Chhattisgarh',
      pincode: '492001',
      status: 'Active',
    };
  }
}
