import { KycLead } from '../types/kyc';
import { formatDateTime, validateGstin } from './validators';

function escapeHtml(value: string | number | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPrintableKycHtml(lead: KycLead): string {
  const gst = validateGstin(lead.gstin);
  const fullAddress = [lead.address, lead.city, lead.state]
    .filter((p) => Boolean(p && p.trim()))
    .join(', ');
  const addressWithPin = lead.pincode && lead.pincode !== '000000'
    ? `${fullAddress} — ${lead.pincode}`
    : fullAddress;

  const branchRows = lead.branches
    .map(
      (b, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(b.branchName || `Branch ${idx + 1}`)}</td>
          <td>${escapeHtml(b.city || lead.city || '—')}</td>
          <td>${escapeHtml(b.contactPhone || '—')}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>KYC Profile - ${escapeHtml(lead.companyName)} (${escapeHtml(lead.id)})</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 28px; background: #ffffff; }
    .sheet { max-width: 780px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 10px; padding: 28px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d4f3c; padding-bottom: 14px; margin-bottom: 18px; }
    .title { font-size: 22px; font-weight: 700; margin: 4px 0 2px; }
    .sub { font-size: 12px; color: #475569; }
    .badge { display: inline-block; padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #e8f6ee; color: #0d4f3c; border: 1px solid #a7f3d0; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #0d4f3c; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .label { font-size: 11px; color: #64748b; }
    .val { font-size: 13px; font-weight: 600; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; color: #334155; }
    @media print {
      body { padding: 0; }
      .sheet { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <span class="badge">${escapeHtml(lead.entityType === 'vendor' ? 'Vendor' : 'Customer')} · ${escapeHtml(lead.id)}</span>
        <div class="title">${escapeHtml(lead.companyName)}</div>
        <div class="sub">${escapeHtml(lead.industry)} · Saved on ${escapeHtml(formatDateTime(lead.createdAt))}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:700;color:#0f172a;">Passary Refractories</div>
        <div class="sub">Official Company KYC Sheet</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Company &amp; GST Details</div>
      <div class="grid">
        <div>
          <div class="label">GSTIN &amp; Registration State</div>
          <div class="val">${escapeHtml(lead.gstin)} (${escapeHtml(gst.stateName || lead.state || 'Valid')})</div>
        </div>
        <div>
          <div class="label">Official Email</div>
          <div class="val">${escapeHtml(lead.contactEmail || '—')}</div>
        </div>
        <div style="grid-column: span 2;">
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
          <div class="val">${escapeHtml(lead.managerName || '—')} (${escapeHtml(lead.managerPhone || '—')})</div>
        </div>
        <div>
          <div class="label">Team Leader</div>
          <div class="val">${escapeHtml(lead.teamLeaderName || '—')} (${escapeHtml(lead.teamLeaderPhone || '—')})</div>
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
      <table>
        <thead>
          <tr><th>#</th><th>Branch / Unit</th><th>City</th><th>Phone</th></tr>
        </thead>
        <tbody>${branchRows}</tbody>
      </table>
    </div>

    ${
      lead.notes
        ? `<div class="section"><div class="section-title">Additional Notes</div><div class="grid"><div style="grid-column:span 2" class="val">${escapeHtml(lead.notes)}</div></div></div>`
        : ''
    }
  </div>
  <script>window.onload = function () { try { window.print(); } catch (e) {} };</script>
</body>
</html>`;
}
