import test from 'node:test';
import assert from 'node:assert/strict';
import { KycLead } from '../types/kyc';
import {
  canUserAccessLead,
  filterLeadsForUser,
  filterNonAdminMembers,
  formatCategoryBadge,
  getAllowedPagesForUser,
  isLeadSubmittedBySalesperson,
  isProtectedAdminMember,
  normalizeTeamMemberCategory,
} from './teamAccessUtils';

test('normalizes Admin account back to ADMIN even if stale script returned TSE', () => {
  assert.equal(normalizeTeamMemberCategory('TSE', 'Admin'), 'ADMIN');
  assert.equal(normalizeTeamMemberCategory('', ' admin '), 'ADMIN');
  assert.equal(normalizeTeamMemberCategory('ADMIN', 'Super User'), 'ADMIN');
  assert.equal(normalizeTeamMemberCategory('Admin — Full System Access', 'Rajesh'), 'ADMIN');
});

test('keeps regular GM, MM, TSE roles intact', () => {
  assert.equal(normalizeTeamMemberCategory('GM', 'Ajay Gupta'), 'GM');
  assert.equal(normalizeTeamMemberCategory('MM', 'Saket Agrawal'), 'MM');
  assert.equal(normalizeTeamMemberCategory('TSE', 'Sandeep Agrawal'), 'TSE');
});

test('identifies protected Admin accounts and leaves normal sales reps editable', () => {
  assert.equal(
    isProtectedAdminMember({ name: 'Admin', salespersonCategory: 'TSE' }),
    true
  );
  assert.equal(
    isProtectedAdminMember({ name: 'Rajesh', salespersonCategory: 'ADMIN' }),
    true
  );
  assert.equal(
    isProtectedAdminMember({ name: 'Sandeep Agrawal', salespersonCategory: 'TSE' }),
    false
  );
  assert.equal(
    isProtectedAdminMember({ name: 'Jayant Pandey', salespersonCategory: 'GM' }),
    false
  );
});

test('filters out all ADMIN category accounts from sales team lists', () => {
  const members = [
    { id: '1', name: 'Admin', salespersonCategory: 'ADMIN' as const },
    { id: '2', name: 'Super Boss', salespersonCategory: 'ADMIN' as const },
    { id: '3', name: 'Jayant Pandey', salespersonCategory: 'GM' as const },
    { id: '4', name: 'Saket Agrawal', salespersonCategory: 'MM' as const },
    { id: '5', name: 'Sandeep Agrawal', salespersonCategory: 'TSE' as const },
  ];
  const filtered = filterNonAdminMembers(members);
  assert.deepEqual(
    filtered.map((m) => m.name),
    ['Jayant Pandey', 'Saket Agrawal', 'Sandeep Agrawal']
  );
});

test('formats Admin category badge cleanly', () => {
  assert.equal(formatCategoryBadge('ADMIN', 'Super User'), 'Admin');
  assert.equal(formatCategoryBadge('TSE', 'Admin'), 'Admin');
  assert.equal(formatCategoryBadge('GM', 'Jayant'), 'GM');
});

test('getAllowedPagesForUser grants full access to Admin and restricts team accounts', () => {
  assert.deepEqual(
    getAllowedPagesForUser({ name: 'Admin', salespersonCategory: 'ADMIN', allowedPages: ['overview'] }),
    ['overview', 'directory', 'leaderboard', 'loginAccess']
  );
  assert.deepEqual(
    getAllowedPagesForUser({
      name: 'Jayant',
      salespersonCategory: 'GM',
      allowedPages: ['overview', 'directory'],
    }),
    ['overview', 'directory']
  );
  assert.deepEqual(
    getAllowedPagesForUser({ name: 'Sandeep', salespersonCategory: 'TSE', allowedPages: [] }),
    ['overview']
  );
});

test('canUserAccessLead and filterLeadsForUser scope data strictly by user identity', () => {
  const sampleLead: KycLead = {
    id: 'KYC-001',
    entityType: 'customer',
    companyName: 'Passary Minerals',
    industry: 'Manufacture',
    gstin: '22AAHCP9274B1ZI',
    address: 'Raipur',
    city: 'Raipur',
    state: 'Chhattisgarh',
    pincode: '492001',
    branchCount: 1,
    branches: [],
    managerName: 'Ahitesh',
    managerPhone: '9876543210',
    teamLeaderName: 'Leader',
    teamLeaderPhone: '9876543211',
    contactEmail: 'contact@passary.in',
    salespersonId: 'tm-deepak',
    salespersonName: 'Deepak Chauhan',
    salespersonCategory: 'TSE',
    gmId: 'tm-jayant',
    gmName: 'Jayant Kumar Pandey',
    mmId: 'tm-sagar',
    mmName: 'Sagar Choudhary',
    tseId: 'tm-rajendra',
    tseName: 'Rajendra Kumar',
    notes: '',
    createdAt: '11/19/2026 09:06:19',
    updatedAt: '11/19/2026 09:06:19',
    activities: [
      {
        id: 'act-1',
        timestamp: '11/19/2026 09:06:19',
        actorName: 'Deepak Chauhan',
        actorRole: 'salesperson',
        action: 'KYC Saved',
        detail: 'Created company',
      },
    ],
  };

  const adminUser = { id: 'admin-1', name: 'Admin', salespersonCategory: 'ADMIN' as const };
  const deepak = { id: 'tm-deepak', name: 'Deepak Chauhan', salespersonCategory: 'TSE' as const };
  const rajendra = { id: 'tm-rajendra', name: 'Rajendra Kumar', salespersonCategory: 'TSE' as const };
  const jayant = { id: 'tm-jayant', name: 'Jayant Kumar Pandey', salespersonCategory: 'GM' as const };
  const sagar = { id: 'tm-sagar', name: 'Sagar Choudhary', salespersonCategory: 'MM' as const };
  const stranger = { id: 'tm-stranger', name: 'Ajay Gupta', salespersonCategory: 'TSE' as const };

  // Admin sees all
  assert.equal(canUserAccessLead(adminUser, sampleLead), true);

  // Assigned sales reps see the lead
  assert.equal(canUserAccessLead(deepak, sampleLead), true);
  assert.equal(canUserAccessLead(rajendra, sampleLead), true);
  assert.equal(canUserAccessLead(jayant, sampleLead), true);
  assert.equal(canUserAccessLead(sagar, sampleLead), true);

  // Unassigned user cannot see the lead
  assert.equal(canUserAccessLead(stranger, sampleLead), false);
  assert.equal(canUserAccessLead(null, sampleLead), false);

  // filterLeadsForUser returns only accessible leads
  assert.equal(filterLeadsForUser([sampleLead], adminUser).length, 1);
  assert.equal(filterLeadsForUser([sampleLead], deepak).length, 1);
  assert.equal(filterLeadsForUser([sampleLead], stranger).length, 0);
});

test('isLeadSubmittedBySalesperson awards KYC count strictly to creator and ignores GM, MM, TSE', () => {
  const leadSubmittedByDeepak: KycLead = {
    id: 'KYC-001',
    entityType: 'customer',
    companyName: 'Passary Minerals',
    industry: 'Manufacture',
    gstin: '22AAHCP9274B1ZI',
    address: 'Raipur',
    city: 'Raipur',
    state: 'Chhattisgarh',
    pincode: '492001',
    branchCount: 1,
    branches: [],
    managerName: 'Ahitesh',
    managerPhone: '9876543210',
    teamLeaderName: 'Leader',
    teamLeaderPhone: '9876543211',
    contactEmail: 'contact@passary.in',
    salespersonId: 'tm-deepak',
    salespersonName: 'Deepak Chauhan',
    salespersonCategory: 'TSE',
    gmId: 'master-jayant',
    gmName: 'Jayant Kumar Pandey',
    mmId: 'master-sagar',
    mmName: 'Sagar Choudhary',
    tseId: 'master-rajendra',
    tseName: 'Rajendra Kumar',
    notes: '',
    createdAt: '11/19/2026 09:06:19',
    updatedAt: '11/19/2026 09:06:19',
    activities: [
      {
        id: 'act-1',
        timestamp: '11/19/2026 09:06:19',
        actorName: 'Deepak Chauhan',
        actorRole: 'salesperson',
        action: 'KYC Saved',
      },
    ],
  };

  // 1. Creator gets credited
  assert.equal(
    isLeadSubmittedBySalesperson(leadSubmittedByDeepak, { id: 'tm-deepak', name: 'Deepak Chauhan' }),
    true
  );
  assert.equal(
    isLeadSubmittedBySalesperson(leadSubmittedByDeepak, { id: 'any-id', name: 'Deepak Chauhan' }),
    true
  );

  // 2. GM, MM, TSE selected in form do NOT get credited
  assert.equal(
    isLeadSubmittedBySalesperson(leadSubmittedByDeepak, { id: 'master-jayant', name: 'Jayant Kumar Pandey' }),
    false
  );
  assert.equal(
    isLeadSubmittedBySalesperson(leadSubmittedByDeepak, { id: 'master-sagar', name: 'Sagar Choudhary' }),
    false
  );
  assert.equal(
    isLeadSubmittedBySalesperson(leadSubmittedByDeepak, { id: 'master-rajendra', name: 'Rajendra Kumar' }),
    false
  );
});
