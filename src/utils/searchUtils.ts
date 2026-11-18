import { KycLead } from '../types/kyc';

export function matchesLeadQuery(lead: KycLead, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  return (
    lead.companyName.toLowerCase().includes(q) ||
    lead.gstin.toLowerCase().includes(q) ||
    lead.id.toLowerCase().includes(q) ||
    lead.salespersonName.toLowerCase().includes(q) ||
    lead.salespersonCategory.toLowerCase().includes(q) ||
    lead.gmName.toLowerCase().includes(q) ||
    lead.mmName.toLowerCase().includes(q) ||
    lead.tseName.toLowerCase().includes(q) ||
    lead.city.toLowerCase().includes(q)
  );
}

export function filterLeadsByQuery(leads: KycLead[], rawQuery: string): KycLead[] {
  const q = rawQuery.trim();
  if (!q) return leads;
  return leads.filter((lead) => matchesLeadQuery(lead, q));
}
