const KYC_TAB = 'KYC Records';
const TEAM_TAB = 'Team Login';
const MASTER_TAB = 'Master';

var KYC_HEADERS = [
  'Record ID', 'Entity Type', 'Company Legal Name', 'Industry / Category', 'GSTIN',
  'Registered Address', 'City', 'State', 'Pincode', 'Total Branches', 'Branch Locations',
  'Manager Name', 'Manager Phone', 'Team Leader Name', 'Team Leader Phone', 'Official Email',
  'GM Name', 'MM Name', 'TSE Name', 'Added By', 'Sales Role', 'Notes', 'Created At', 'Updated At'
];

function leadToRowValues(lead) {
  return [
    lead.id || '',
    lead.entityType === 'vendor' ? 'Vendor' : 'Customer',
    lead.companyName || '',
    lead.industry || '',
    lead.gstin || '',
    lead.address || '',
    lead.city || '',
    lead.state || '',
    lead.pincode || '',
    Number(lead.branchCount || 1),
    JSON.stringify(lead.branches || []),
    lead.managerName || '',
    lead.managerPhone || '',
    lead.teamLeaderName || '',
    lead.teamLeaderPhone || '',
    lead.contactEmail || '',
    lead.gmName || '',
    lead.mmName || '',
    lead.tseName || '',
    lead.salespersonName || '',
    lead.salespersonCategory === 'ADMIN' ? 'Admin' : (lead.salespersonCategory || ''),
    lead.notes || '',
    lead.createdAt || '',
    lead.updatedAt || ''
  ];
}

const TEAM_HEADERS = [
  'Member ID',
  'Full Name',
  'Category',
  'Status',
  'Password',
  'Page Access',
];

const ALL_PAGES = ['overview', 'directory', 'leaderboard', 'loginAccess'];

function cellStr(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val).trim();
}

function findSheetIgnoreCase(ss, targetName) {
  const lower = targetName.toLowerCase();
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === lower) {
      return sheets[i];
    }
  }
  return null;
}

function getOrCreateSheet(ss, name, headers, clearExtraHeaderCols) {
  let sheet = ss.getSheetByName(name) || findSheetIgnoreCase(ss, name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  const currentLastCol = Math.max(sheet.getLastColumn(), headers.length);
  const firstRow = sheet.getRange(1, 1, 1, currentLastCol).getValues()[0];
  let needsHeader = sheet.getLastRow() === 0;

  if (!needsHeader) {
    for (let i = 0; i < headers.length; i++) {
      if (cellStr(firstRow[i]) !== headers[i]) {
        needsHeader = true;
        break;
      }
    }
    if (!needsHeader && clearExtraHeaderCols && currentLastCol > headers.length) {
      for (let j = headers.length; j < currentLastCol; j++) {
        if (cellStr(firstRow[j])) {
          needsHeader = true;
          break;
        }
      }
    }
  }

  if (needsHeader) {
    if (clearExtraHeaderCols && currentLastCol > headers.length) {
      sheet.getRange(1, headers.length + 1, 1, currentLastCol - headers.length).clearContent();
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const kycSheet = getOrCreateSheet(ss, KYC_TAB, KYC_HEADERS, false);
  const teamSheet = getOrCreateSheet(ss, TEAM_TAB, TEAM_HEADERS, true);
  const masterSheet = ss.getSheetByName(MASTER_TAB) || findSheetIgnoreCase(ss, MASTER_TAB);
  return { kycSheet, teamSheet, masterSheet };
}

function normalizePhone(raw) {
  const digits = cellStr(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.indexOf('91') === 0) return digits.slice(2);
  if (digits.length === 11 && digits.indexOf('0') === 0) return digits.slice(1);
  return digits;
}

function parseMasterCategory(raw) {
  const upper = cellStr(raw).toUpperCase();
  if (!upper) return null;
  if (upper === 'GM' || upper.indexOf('GM ') === 0 || upper.indexOf('GM-') === 0 || upper.indexOf('GENERAL MANAGER') !== -1) {
    return 'GM';
  }
  if (upper === 'MM' || upper.indexOf('MM ') === 0 || upper.indexOf('MM-') === 0 || upper.indexOf('MARKETING MANAGER') !== -1) {
    return 'MM';
  }
  if (upper === 'TSE' || upper.indexOf('TSE ') === 0 || upper.indexOf('TSE-') === 0 || upper.indexOf('TERRITORY SALES') !== -1) {
    return 'TSE';
  }
  return null;
}

function normalizeCategory(raw, fallbackRole) {
  var upper = String(raw || '').trim().toUpperCase();
  if (upper === 'ADMIN' || upper.indexOf('ADMIN') === 0 || upper.indexOf('FULL SYSTEM') !== -1) return 'ADMIN';
  if (upper === 'GM' || upper.indexOf('GM') === 0 || upper.indexOf('GENERAL MANAGER') !== -1) return 'GM';
  if (upper === 'MM' || upper.indexOf('MM') === 0 || upper.indexOf('MARKETING MANAGER') !== -1) return 'MM';
  if (upper === 'TSE' || upper.indexOf('TSE') === 0 || upper.indexOf('TERRITORY SALES') !== -1) return 'TSE';
  return fallbackRole === 'manager' ? 'GM' : 'TSE';
}

function normalizeStatus(raw) {
  const lower = cellStr(raw).toLowerCase();
  if (lower === 'inactive' || lower === 'deactivated' || lower === 'disabled') {
    return 'inactive';
  }
  return 'active';
}

function normalizeAllowedPages(raw) {
  if (Array.isArray(raw)) {
    const valid = raw.filter(function (p) {
      return ALL_PAGES.indexOf(p) !== -1;
    });
    return valid.length ? valid : ALL_PAGES.slice();
  }
  const str = cellStr(raw);
  if (!str) return ALL_PAGES.slice();
  if (str.charAt(0) === '[') {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return normalizeAllowedPages(parsed);
    } catch (e) {}
  }
  const parts = str
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (p) { return ALL_PAGES.indexOf(p) !== -1; });
  return parts.length ? parts : ALL_PAGES.slice();
}

function serializeBranches(branches) {
  if (!Array.isArray(branches) || !branches.length) return '';
  return branches
    .map(function (b) {
      const phone = b.contactPhone ? ' (' + b.contactPhone + ')' : '';
      return (b.branchName || 'Branch') + ' — ' + (b.city || '') + phone;
    })
    .join(' | ');
}

function parseBranches(raw, fallbackCity, rowNum) {
  const str = cellStr(raw);
  if (!str) {
    return [{
      id: 'br-' + rowNum + '-1',
      branchName: 'Head Office',
      city: fallbackCity || '—',
      contactPhone: '',
    }];
  }
  if (str.charAt(0) === '[') {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (e) {}
  }
  return str
    .split('|')
    .map(function (p) { return p.trim(); })
    .filter(Boolean)
    .map(function (entry, idx) {
      const phoneMatch = entry.match(/\(([^)]+)\)\s*$/);
      const contactPhone = phoneMatch ? normalizePhone(phoneMatch[1]) : '';
      const withoutPhone = phoneMatch ? entry.slice(0, phoneMatch.index).trim() : entry;
      const parts = withoutPhone.split(/\s+[—-]\s+/);
      return {
        id: 'br-' + rowNum + '-' + (idx + 1),
        branchName: parts[0] ? parts[0].trim() : 'Branch ' + (idx + 1),
        city: parts[1] ? parts[1].trim() : fallbackCity || '',
        contactPhone: contactPhone,
      };
    });
}

function parseActivities(raw) {
  const str = cellStr(raw);
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function leadToRow(lead) {
  return [
    lead.id || '',
    lead.entityType === 'vendor' ? 'Vendor' : 'Customer',
    lead.companyName || '',
    lead.industry || '',
    lead.gstin || '',
    lead.address || '',
    lead.city || '',
    lead.state || '',
    lead.pincode || '',
    Number(lead.branchCount) || 1,
    serializeBranches(lead.branches),
    lead.managerName || '',
    lead.managerPhone || '',
    lead.teamLeaderName || '',
    lead.teamLeaderPhone || '',
    lead.contactEmail || '',
    lead.gmName || '',
    lead.mmName || '',
    lead.tseName || '',
    lead.salespersonName || '',
    lead.salespersonCategory || 'TSE',
    lead.notes || '',
    lead.createdAt || new Date().toISOString(),
    lead.updatedAt || new Date().toISOString(),
    lead.gmId || '',
    lead.mmId || '',
    lead.tseId || '',
    lead.salespersonId || '',
    JSON.stringify(Array.isArray(lead.activities) ? lead.activities : []),
  ];
}

function memberToRow(member) {
  const pages = normalizeAllowedPages(member.allowedPages);
  return [
    member.id || '',
    member.name || '',
    member.salespersonCategory || 'TSE',
    member.status === 'inactive' ? 'Deactivated' : 'Active',
    member.password || '',
    pages.join(', '),
  ];
}

function readWorkspaceData() {
  const { kycSheet, teamSheet, masterSheet } = ensureTabs();

  const masterTeam = [];
  if (masterSheet) {
    const masterLastRow = masterSheet.getLastRow();
    const masterValues =
      masterLastRow > 1 ? masterSheet.getRange(2, 1, masterLastRow - 1, 3).getValues() : [];
    for (let i = 0; i < masterValues.length; i++) {
      const r = masterValues[i].map(cellStr);
      const name = r[0];
      const firm = r[1];
      const category = parseMasterCategory(r[2]);
      if (!name || !category) continue;
      masterTeam.push({
        id: 'master-' + (i + 2),
        name: name,
        firm: firm,
        category: category,
      });
    }
  }

  const teamLastRow = teamSheet.getLastRow();
  const teamValues =
    teamLastRow > 1 ? teamSheet.getRange(2, 1, teamLastRow - 1, TEAM_HEADERS.length).getValues() : [];
  const teamMembers = [];

  for (let i = 0; i < teamValues.length; i++) {
    const r = teamValues[i].map(cellStr);
    const name = r[1];
    if (!name) continue;
    const category = normalizeCategory(r[2], '');
    teamMembers.push({
      id: r[0] || 'tm-row-' + (i + 2),
      name: name,
      email: '',
      phone: '',
      salespersonCategory: category,
      role: category === 'GM' ? 'manager' : 'salesperson',
      territory: '',
      status: normalizeStatus(r[3] || 'Active'),
      password: r[4] || '',
      allowedPages: normalizeAllowedPages(r[5]),
    });
  }

  const kycLastRow = kycSheet.getLastRow();
  const kycValues =
    kycLastRow > 1 ? kycSheet.getRange(2, 1, kycLastRow - 1, KYC_HEADERS.length).getValues() : [];
  const leads = [];

  for (let i = 0; i < kycValues.length; i++) {
    const r = kycValues[i].map(cellStr);
    const companyName = r[2];
    const gstin = r[4];
    if (!companyName && !gstin) continue;
    const rowNum = i + 2;
    const city = r[6];
    const branches = parseBranches(r[10], city, rowNum);
    const parsedCount = Number(r[9]);
    const nowIso = new Date().toISOString();

    leads.push({
      id: r[0] || 'KYC-ROW-' + rowNum,
      entityType: r[1].toLowerCase() === 'vendor' ? 'vendor' : 'customer',
      companyName: companyName || 'Untitled Company',
      industry: r[3] || 'General Commercial',
      gstin: gstin,
      address: r[5] || '',
      city: city,
      state: r[7] || '',
      pincode: r[8] || '',
      branchCount: parsedCount > 0 ? parsedCount : branches.length,
      branches: branches,
      managerName: r[11] || '',
      managerPhone: normalizePhone(r[12]),
      teamLeaderName: r[13] || '',
      teamLeaderPhone: normalizePhone(r[14]),
      contactEmail: r[15] || '',
      gmName: r[16] || '',
      mmName: r[17] || '',
      tseName: r[18] || '',
      salespersonName: r[19] || r[18] || '',
      salespersonCategory: normalizeCategory(r[20], ''),
      notes: r[21] || '',
      createdAt: r[22] || nowIso,
      updatedAt: r[23] || r[22] || nowIso,
      gmId: r[24] || '',
      mmId: r[25] || '',
      tseId: r[26] || '',
      salespersonId: r[27] || '',
      activities: parseActivities(r[28]),
    });
  }

  return { leads: leads, teamMembers: teamMembers, masterTeam: masterTeam };
}

function findRowById(sheet, targetId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (cellStr(ids[i][0]) === cellStr(targetId)) {
      return i + 2;
    }
  }
  return null;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet() {
  try {
    return jsonOut(readWorkspaceData());
  } catch (err) {
    return jsonOut({ error: err && err.message ? err.message : String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action;
    const { kycSheet, teamSheet } = ensureTabs();

    if (action === 'addLead' && body.lead) {
      kycSheet.appendRow(leadToRow(body.lead));
      return jsonOut({ ok: true });
    }
    if (action === 'updateLead' && body.lead) {
      const row = findRowById(kycSheet, body.lead.id);
      if (!row) return jsonOut({ error: 'Lead record not found.' });
      kycSheet.getRange(row, 1, 1, KYC_HEADERS.length).setValues([leadToRow(body.lead)]);
      return jsonOut({ ok: true });
    }
    if (action === 'deleteLead' && body.id) {
      const row = findRowById(kycSheet, body.id);
      if (row) kycSheet.deleteRow(row);
      return jsonOut({ ok: true });
    }
    if (action === 'addTeamMember' && body.member) {
      teamSheet.appendRow(memberToRow(body.member));
      return jsonOut({ ok: true });
    }
    if (action === 'updateTeamMember' && body.member) {
      const row = findRowById(teamSheet, body.member.id);
      if (!row) return jsonOut({ error: 'Team member not found.' });
      teamSheet.getRange(row, 1, 1, TEAM_HEADERS.length).setValues([memberToRow(body.member)]);
      return jsonOut({ ok: true });
    }
    if (action === 'deleteTeamMember' && body.id) {
      const row = findRowById(teamSheet, body.id);
      if (row) teamSheet.deleteRow(row);
      return jsonOut({ ok: true });
    }

    return jsonOut({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut({ error: err && err.message ? err.message : String(err) });
  }
}
