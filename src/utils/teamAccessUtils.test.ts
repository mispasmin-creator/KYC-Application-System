import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterNonAdminMembers,
  formatCategoryBadge,
  getAllowedPagesForUser,
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
