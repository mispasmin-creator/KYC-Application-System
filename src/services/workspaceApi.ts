import { KycLead, TeamMember } from '../types/kyc';

export type ApiErrorKind = 'cookie_blocked' | 'server_warming' | 'static_host' | 'server_error';

export class WorkspaceApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(message: string, kind: ApiErrorKind = 'server_error') {
    super(message);
    this.name = 'WorkspaceApiError';
    this.kind = kind;
  }
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
      await sleep(1200);
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
    if (attempt < 5) {
      await sleep(1500);
      return apiRequest<T>(url, init, attempt + 1);
    }
    throw new WorkspaceApiError(
      'Server is still starting up. Please wait a few seconds and click Sign In again.',
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
      'Backend API is unavailable on this URL. Please open the Development App URL or wait a few seconds and try again.',
      'server_error'
    );
  }

  return parsed;
}

export async function loginWithCredentials(
  identifier: string,
  password: string
): Promise<TeamMember> {
  const data = await apiRequest<{ user?: TeamMember }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });

  if (!data.user || !data.user.id) {
    throw new WorkspaceApiError('Unable to verify account details. Please try again.');
  }
  return data.user;
}

export async function fetchWorkspaceData(): Promise<{
  leads: KycLead[];
  teamMembers: TeamMember[];
}> {
  const data = await apiRequest<{
    leads?: KycLead[];
    teamMembers?: TeamMember[];
  }>('/api/workspace');

  return {
    leads: Array.isArray(data.leads) ? data.leads : [],
    teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : [],
  };
}

export async function createKycLead(lead: KycLead): Promise<void> {
  await apiRequest('/api/leads', {
    method: 'POST',
    body: JSON.stringify(lead),
  });
}

export async function updateKycLead(lead: KycLead): Promise<void> {
  await apiRequest(`/api/leads/${encodeURIComponent(lead.id)}`, {
    method: 'PUT',
    body: JSON.stringify(lead),
  });
}

export async function deleteKycLead(id: string): Promise<void> {
  await apiRequest(`/api/leads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function createTeamMember(member: TeamMember): Promise<void> {
  await apiRequest('/api/team', {
    method: 'POST',
    body: JSON.stringify(member),
  });
}

export async function updateTeamMember(member: TeamMember): Promise<void> {
  await apiRequest(`/api/team/${encodeURIComponent(member.id)}`, {
    method: 'PUT',
    body: JSON.stringify(member),
  });
}

export async function deleteTeamMember(id: string): Promise<void> {
  await apiRequest(`/api/team/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
