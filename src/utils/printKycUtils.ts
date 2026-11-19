import { KycLead } from '../types/kyc';
import { formatDateTime, isUnregisteredGstin, validateGstin } from './validators';

function escapeHtml(value: string | number | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPrintableKycHtml(lead: KycLead): string {
  const unregistered = isUnregisteredGstin(lead.gstin);
  const gst = validateGstin(lead.gstin);
  const fullAddress = [lead.address, lead.city, lead.state]
    .filter((p) => Boolean(p && p.trim()))
    .join(', ');
  const addressWithPin =
    lead.pincode && lead.pincode !== '000000'
      ? `${fullAddress} — ${lead.pincode}`
      : fullAddress;

  const branchRows = lead.branches
    .map(
      (b, idx) => `
        <tr>
          <td class="num">${idx + 1}</td>
          <td><strong>${escapeHtml(b.branchName || `Branch ${idx + 1}`)}</strong></td>
          <td>${escapeHtml(b.city || lead.city || '—')}</td>
          <td class="mono">${escapeHtml(b.contactPhone || '—')}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>KYC Profile - ${escapeHtml(lead.companyName)} (${escapeHtml(lead.id)})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      padding: 16px;
      line-height: 1.45;
    }

    /* Floating / Top Print Bar (hidden in print) */
    .action-bar {
      max-width: 800px;
      margin: 0 auto 16px auto;
      background: #0d4f3c;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 10px 25px -5px rgba(13, 79, 60, 0.35);
    }
    .action-title {
      font-size: 13px;
      font-weight: 600;
    }
    .action-sub {
      font-size: 11px;
      color: #a7f3d0;
    }
    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #a3f046;
      color: #073326;
      border: none;
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }
    .print-btn:hover {
      opacity: 0.92;
    }
    .print-btn:active {
      transform: scale(0.97);
    }

    /* Main Sheet Card */
    .sheet {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.08);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0d4f3c;
      padding-bottom: 16px;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: #e8f6ee;
      color: #0d4f3c;
      border: 1px solid #a7f3d0;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 6px 0 3px 0;
      line-height: 1.25;
      word-break: break-word;
    }
    .sub {
      font-size: 12px;
      color: #64748b;
    }
    .org-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }
    .org-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 5px;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }
    .org-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .org-info {
      text-align: left;
    }
    .org-name {
      font-size: 14px;
      font-weight: 800;
      color: #0d4f3c;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }
    .org-sub {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
      margin-top: 2px;
    }

    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #0d4f3c;
      margin-bottom: 8px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 18px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .label {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }
    .val {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
      word-break: break-word;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
    }

    .table-container {
      width: 100%;
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      -webkit-overflow-scrolling: touch;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      min-width: 440px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td.num {
      width: 36px;
      text-align: center;
      color: #94a3b8;
      font-family: monospace;
    }

    /* Mobile specific styles */
    @media screen and (max-width: 640px) {
      body {
        padding: 8px;
      }
      .action-bar {
        border-radius: 12px;
        padding: 10px 14px;
        margin-bottom: 10px;
      }
      .sheet {
        padding: 16px 14px;
        border-radius: 14px;
      }
      .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        padding-bottom: 12px;
        margin-bottom: 16px;
      }
      .org-badge {
        text-align: left;
      }
      .title {
        font-size: 19px;
      }
      .grid {
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 12px;
      }
      .grid .span-2 {
        grid-column: span 1 !important;
      }
      table {
        min-width: 380px;
      }
      th, td {
        padding: 7px 9px;
        font-size: 11px;
      }
    }

    /* Strict A4 Print Sheet styles */
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm 10mm;
      }
      html, body {
        background: #ffffff !important;
        color: #000000 !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .no-print, .action-bar {
        display: none !important;
      }
      .sheet {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .section {
        page-break-inside: avoid;
      }
      .grid {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
      }
      th {
        background: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div>
      <div class="action-title">KYC Official Profile Sheet</div>
      <div class="action-sub">${escapeHtml(lead.companyName)} (${escapeHtml(lead.id)})</div>
    </div>
    <button type="button" class="print-btn" onclick="window.print()">
      🖨️ Print / Save PDF
    </button>
  </div>

  <div class="sheet">
    <div class="header">
      <div>
        <span class="badge">${escapeHtml(lead.entityType === 'vendor' ? 'Vendor' : 'Customer')} · ${escapeHtml(lead.id)}</span>
        <div class="title">${escapeHtml(lead.companyName)}</div>
        <div class="sub">${escapeHtml(lead.industry)} · Saved on ${escapeHtml(formatDateTime(lead.createdAt))}</div>
      </div>
      <div class="org-badge">
        <span class="org-logo">
          <img src="/assets/aistudio/logo__1__12f0c258.png" alt="Passary Refractories Logo" />
        </span>
        <div class="org-info">
          <div class="org-name">Passary Refractories</div>
          <div class="org-sub">Official Company KYC Sheet</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Company &amp; GST Details</div>
      <div class="grid">
        <div>
          <div class="label">${unregistered ? 'Registration Status' : 'GSTIN &amp; Registration State'}</div>
          <div class="val mono">${unregistered ? `${escapeHtml(lead.gstin || 'URP')} (Unregistered)` : `${escapeHtml(lead.gstin)} (${escapeHtml(gst.stateName || lead.state || 'Valid')})`}</div>
        </div>
        <div>
          <div class="label">Official Email</div>
          <div class="val">${escapeHtml(lead.contactEmail || '—')}</div>
        </div>
        <div class="span-2" style="grid-column: span 2;">
          <div class="label">Registered Office Address</div>
          <div class="val">${escapeHtml(addressWithPin || '—')}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Contacts &amp; Sales Team</div>
      <div class="grid">
        <div>
          <div class="label">Manager</div>
          <div class="val">${escapeHtml(lead.managerName || '—')} <span class="mono">(${escapeHtml(lead.managerPhone || '—')})</span></div>
        </div>
        <div>
          <div class="label">Team Leader</div>
          <div class="val">${escapeHtml(lead.teamLeaderName || '—')} <span class="mono">(${escapeHtml(lead.teamLeaderPhone || '—')})</span></div>
        </div>
        <div>
          <div class="label">General Manager (GM)</div>
          <div class="val">${escapeHtml(lead.gmName || '—')}</div>
        </div>
        <div>
          <div class="label">Marketing Manager (MM) / TSE</div>
          <div class="val">${escapeHtml(lead.mmName || '—')} / ${escapeHtml(lead.tseName || '—')}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Branch Locations (${escapeHtml(lead.branchCount)} Total)</div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th class="num">No.</th><th>Branch / Unit</th><th>City</th><th>Phone</th></tr>
          </thead>
          <tbody>${branchRows}</tbody>
        </table>
      </div>
    </div>

    ${
      lead.notes
        ? `<div class="section"><div class="section-title">Additional Notes</div><div class="grid"><div class="span-2" style="grid-column:span 2"><div class="val">${escapeHtml(lead.notes)}</div></div></div></div>`
        : ''
    }
  </div>
</body>
</html>`;
}
