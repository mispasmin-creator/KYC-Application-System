import { KycLead } from '../types/kyc';
import { formatSheetTimestamp } from './validators';

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportLeadsToCsv(leads: KycLead[], filenamePrefix = 'kyc-system-companies'): void {
  const headers = [
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
    'Notes',
    'Created Date',
    'Last Updated',
  ];

  const rows = leads.map((lead) => {
    const branchSummary = lead.branches
      .map((b) => `${b.branchName} (${b.city}${b.contactPhone ? ` · ${b.contactPhone}` : ''})`)
      .join(' | ');

    return [
      lead.id,
      lead.entityType === 'customer' ? 'Customer' : 'Vendor',
      lead.companyName,
      lead.industry,
      lead.gstin,
      lead.address,
      lead.city,
      lead.state,
      lead.pincode,
      lead.branchCount,
      branchSummary,
      lead.managerName,
      lead.managerPhone,
      lead.teamLeaderName,
      lead.teamLeaderPhone,
      lead.contactEmail,
      lead.gmName,
      lead.mmName,
      lead.tseName,
      lead.notes,
      formatSheetTimestamp(lead.createdAt),
      formatSheetTimestamp(lead.updatedAt || lead.createdAt),
    ].map(escapeCsvCell);
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}-${stamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
