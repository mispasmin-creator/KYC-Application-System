import test from 'node:test';
import assert from 'node:assert/strict';
import { KycLead } from '../types/kyc';
import { buildPrintableKycHtml } from './printKycUtils';

const SAMPLE_LEAD: KycLead = {
  id: 'KYC-2026-0101',
  entityType: 'customer',
  companyName: 'Apex <Packaging> & Co',
  industry: 'Manufacturing',
  gstin: '22AAHCP9274B1ZI',
  address: 'Shriram Business Park, Raipur',
  city: 'Raipur',
  state: 'Chhattisgarh',
  pincode: '492001',
  branchCount: 1,
  branches: [
    { id: 'b-1', branchName: 'Main Plant', city: 'Raipur', contactPhone: '9876543210' },
  ],
  managerName: 'Ahitesh',
  managerPhone: '9876544322',
  teamLeaderName: 'Bhola',
  teamLeaderPhone: '9876543212',
  contactEmail: 'doom@gmail.com',
  salespersonId: 'admin-root',
  salespersonName: 'Admin',
  salespersonCategory: 'ADMIN',
  gmId: '',
  gmName: 'Jayant Kumar Pandey',
  mmId: '',
  mmName: 'Saket Agrawal',
  tseId: '',
  tseName: 'Rajendra Kumar',
  notes: 'Priority client',
  createdAt: '2026-11-18T16:11:00.000Z',
  updatedAt: '2026-11-18T16:11:00.000Z',
  activities: [],
};

test('buildPrintableKycHtml renders escaped company fields, sales team, and branches', () => {
  const html = buildPrintableKycHtml(SAMPLE_LEAD);
  assert.match(html, /KYC-2026-0101/);
  assert.match(html, /Apex &lt;Packaging&gt; &amp; Co/);
  assert.match(html, /22AAHCP9274B1ZI/);
  assert.match(html, /Jayant Kumar Pandey/);
  assert.match(html, /Main Plant/);
  assert.match(html, /Priority client/);
  assert.match(html, /Passary Refractories/);
});
