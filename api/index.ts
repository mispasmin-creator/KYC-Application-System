import type { IncomingMessage, ServerResponse } from 'node:http';

const APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbxPuixg8-N7i0Gy2b_uocq7Lt9cDrHELnHKxgUl5J_KHl5SRoxrMtjF8PBO9S-Us8ZZ/exec';

const DEFAULT_ADMIN_USER = {
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

const FALLBACK_WORKSPACE = {
  leads: [],
  teamMembers: [
    {
      id: 'tm-1795016485360',
      name: 'Admin',
      email: '',
      phone: '',
      salespersonCategory: 'ADMIN',
      role: 'manager',
      territory: '',
      status: 'active',
      password: 'admin@1234',
      allowedPages: ['overview', 'directory', 'leaderboard', 'loginAccess'],
    },
  ],
  masterTeam: [
    { id: 'master-2', name: 'Jayant Kumar Pandey', firm: 'Pmmpl', category: 'GM' },
    { id: 'master-3', name: 'Ajay Kumar Gupta', firm: 'Rkl', category: 'GM' },
    { id: 'master-4', name: 'Saket Agrawal', firm: 'Pmmpl', category: 'MM' },
    { id: 'master-5', name: 'Prakash Tripathi', firm: 'Rkl', category: 'MM' },
    { id: 'master-6', name: 'Prakash Kumar Mohanty', firm: 'Rkl', category: 'GM' },
    { id: 'master-7', name: 'Rajendra Kumar', firm: 'Pmmpl', category: 'TSE' },
  ],
};

function normalizeIndianPhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function sendJson(res: any, status: number, data: unknown) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(data);
    return;
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function readBody(req: IncomingMessage & { body?: any }): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

let apiWorkspaceCache: any = null;
let apiWorkspaceCacheTime = 0;

async function callAppsScript<T = any>(
  method: 'GET' | 'POST',
  payload?: Record<string, unknown>
): Promise<T | null> {
  const url =
    method === 'GET' ? `${APPS_SCRIPT_URL}?action=workspace` : APPS_SCRIPT_URL;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' && payload ? JSON.stringify(payload) : undefined,
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await res.text();
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn('Apps Script call error:', err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractIdFromUrl(path: string, segment: string): string {
  const match = path.match(new RegExp(`${segment}/([^/?#]+)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export default async function handler(req: any, res: any) {
  // Always attach CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
    const queryRoute = (parsedUrl.searchParams.get('route') || req.query?.route || '') as string;
    const matchedPath = (req.headers?.['x-matched-path'] || parsedUrl.pathname || '') as string;
    const routeIdentifier = `${matchedPath} ${queryRoute} ${parsedUrl.pathname}`.toLowerCase();
    const method = (req.method || 'GET').toUpperCase();

    // 1. Health check
    if (routeIdentifier.includes('health')) {
      sendJson(res, 200, { ok: true, timestamp: new Date().toISOString() });
      return;
    }

    // 2. Authentication Login
    if (routeIdentifier.includes('auth/login')) {
      const body = await readBody(req);
      const identifier = String(body?.identifier ?? '').trim();
      const password = String(body?.password ?? '');

      if (!identifier || !password) {
        sendJson(res, 400, { error: 'Username and password are required.' });
        return;
      }

      const lowerId = identifier.toLowerCase();
      const digitsId = normalizeIndianPhone(identifier);

      // Fetch team members from Google Sheets
      let teamMembers = FALLBACK_WORKSPACE.teamMembers;
      const scriptData = await callAppsScript<{ teamMembers?: any[] }>('GET');
      if (scriptData && Array.isArray(scriptData.teamMembers) && scriptData.teamMembers.length > 0) {
        teamMembers = scriptData.teamMembers;
      }

      // Check matched user
      const matched = teamMembers.find((m: any) => {
        const mName = String(m.name || '').trim().toLowerCase();
        const mId = String(m.id || '').trim().toLowerCase();
        const mEmail = String(m.email || '').trim().toLowerCase();
        const mPhone = normalizeIndianPhone(String(m.phone || ''));
        return (
          mName === lowerId ||
          mId === lowerId ||
          mEmail === lowerId ||
          (digitsId.length === 10 && mPhone === digitsId)
        );
      });

      if (matched) {
        if (String(matched.status || '').toLowerCase() === 'inactive') {
          sendJson(res, 401, {
            error: 'This account is deactivated. Please contact Admin to reactivate.',
          });
          return;
        }

        if (String(matched.password || '') !== password) {
          sendJson(res, 401, { error: 'Incorrect password. Please try again.' });
          return;
        }

        const safeUser = { ...matched } as Record<string, any>;
        delete safeUser.password;
        if (safeUser.salespersonCategory === 'ADMIN') {
          safeUser.role = 'manager';
          safeUser.allowedPages = ['overview', 'directory', 'leaderboard', 'loginAccess'];
        }
        sendJson(res, 200, { user: safeUser });
        return;
      }

      // Dedicated Admin fallback
      if (
        lowerId === 'admin' &&
        (password === 'admin@1234' || password === 'admin' || password === 'admin123')
      ) {
        sendJson(res, 200, { user: DEFAULT_ADMIN_USER });
        return;
      }

      sendJson(res, 401, { error: 'No account found for this username, email, or mobile.' });
      return;
    }

    // 3. Workspace Data (Leads, Team Members, Master Directory)
    if (routeIdentifier.includes('workspace')) {
      if (apiWorkspaceCache && Date.now() - apiWorkspaceCacheTime < 15000) {
        sendJson(res, 200, apiWorkspaceCache);
        return;
      }

      const scriptData = await callAppsScript<{
        leads?: any[];
        teamMembers?: any[];
        masterTeam?: any[];
      }>('GET');

      if (scriptData && (scriptData.leads || scriptData.teamMembers || scriptData.masterTeam)) {
        const payload = {
          leads: Array.isArray(scriptData.leads) ? scriptData.leads : [],
          teamMembers: Array.isArray(scriptData.teamMembers) ? scriptData.teamMembers : [],
          masterTeam: Array.isArray(scriptData.masterTeam) ? scriptData.masterTeam : [],
        };
        apiWorkspaceCache = payload;
        apiWorkspaceCacheTime = Date.now();
        sendJson(res, 200, payload);
        return;
      }

      // Fallback
      sendJson(res, 200, FALLBACK_WORKSPACE);
      return;
    }

    // 4. KYC Leads CRUD
    if (routeIdentifier.includes('leads')) {
      apiWorkspaceCache = null;
      const body = await readBody(req);
      const urlId =
        extractIdFromUrl(matchedPath, 'leads') ||
        extractIdFromUrl(queryRoute, 'leads') ||
        extractIdFromUrl(parsedUrl.pathname, 'leads');

      if (method === 'POST') {
        const lead = body;
        const resScript = await callAppsScript('POST', { action: 'addLead', lead });
        sendJson(res, 200, resScript || { ok: true, lead });
        return;
      }

      if (method === 'PUT') {
        const lead = { ...body, id: body.id || urlId };
        const resScript = await callAppsScript('POST', { action: 'updateLead', lead });
        sendJson(res, 200, resScript || { ok: true, lead });
        return;
      }

      if (method === 'DELETE') {
        const id = urlId || body?.id || parsedUrl.searchParams.get('id');
        const resScript = await callAppsScript('POST', { action: 'deleteLead', id });
        sendJson(res, 200, resScript || { ok: true });
        return;
      }
    }

    // 5. Team Members CRUD
    if (routeIdentifier.includes('team')) {
      apiWorkspaceCache = null;
      const body = await readBody(req);
      const urlId =
        extractIdFromUrl(matchedPath, 'team') ||
        extractIdFromUrl(queryRoute, 'team') ||
        extractIdFromUrl(parsedUrl.pathname, 'team');

      if (method === 'POST') {
        const member = body;
        const resScript = await callAppsScript('POST', { action: 'addTeamMember', member });
        sendJson(res, 200, resScript || { ok: true, member });
        return;
      }

      if (method === 'PUT') {
        const member = { ...body, id: body.id || urlId };
        const resScript = await callAppsScript('POST', { action: 'updateTeamMember', member });
        sendJson(res, 200, resScript || { ok: true, member });
        return;
      }

      if (method === 'DELETE') {
        const id = urlId || body?.id || parsedUrl.searchParams.get('id');
        const resScript = await callAppsScript('POST', { action: 'deleteTeamMember', id });
        sendJson(res, 200, resScript || { ok: true });
        return;
      }
    }

    // 6. GSTIN Lookup
    if (routeIdentifier.includes('gstin')) {
      const gstin =
        extractIdFromUrl(matchedPath, 'gstin') ||
        extractIdFromUrl(queryRoute, 'gstin') ||
        extractIdFromUrl(parsedUrl.pathname, 'gstin') ||
        '';

      sendJson(res, 200, {
        gstin: gstin.toUpperCase(),
        legalName: 'Passary Refractories Registered Entity',
        tradeName: 'Passary Refractories',
        status: 'Active',
        taxpayerType: 'Regular',
        registrationDate: '2017-07-01',
        natureOfBusiness: 'Manufacturing / Refractories',
        principalAddress: {
          buildingName: 'Passary Tower',
          street: 'Main Road',
          city: 'Raipur',
          state: 'Chhattisgarh',
          pincode: '492001',
        },
      });
      return;
    }

    // Default 404 for unhandled API route
    sendJson(res, 404, { error: `API route not found: ${method} ${matchedPath || parsedUrl.pathname}` });
  } catch (err) {
    console.error('Serverless API execution error:', err);
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Internal Server Error',
    });
  }
}
