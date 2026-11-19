import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSalesOptionsByCategory, parseMasterCategory } from './masterTeamUtils.ts';

test('parseMasterCategory maps Master sheet category labels', () => {
  assert.equal(parseMasterCategory('GM - General Manager'), 'GM');
  assert.equal(parseMasterCategory('MM - Marketing Manager'), 'MM');
  assert.equal(parseMasterCategory('TSE - Territory Sales Executive'), 'TSE');
  assert.equal(parseMasterCategory('gm'), 'GM');
  assert.equal(parseMasterCategory('unknown'), null);
});

test('buildSalesOptionsByCategory prefers Master sheet entries and deduplicates by name', () => {
  const result = buildSalesOptionsByCategory(
    [
      { id: 'master-2', name: 'Jayant Kumar Pandey', firm: 'Pmmpl', category: 'GM' },
      { id: 'master-4', name: 'Saket Agrawal', firm: 'Pmmpl', category: 'MM' },
      { id: 'master-8', name: 'Sandeep Agrawal', firm: 'Purab', category: 'TSE' },
    ],
    [
      {
        id: 'tm-1',
        name: 'Jayant Kumar Pandey',
        email: '',
        phone: '',
        role: 'manager',
        salespersonCategory: 'GM',
        territory: '',
      },
      {
        id: 'tm-2',
        name: 'Extra TSE',
        email: '',
        phone: '',
        role: 'salesperson',
        salespersonCategory: 'TSE',
        territory: 'East',
      },
    ]
  );

  assert.deepEqual(
    result.GM.map((o) => ({ name: o.name, meta: o.meta })),
    [{ name: 'Jayant Kumar Pandey', meta: 'Pmmpl' }]
  );
  assert.deepEqual(
    result.MM.map((o) => ({ name: o.name, meta: o.meta })),
    [{ name: 'Saket Agrawal', meta: 'Pmmpl' }]
  );
  assert.deepEqual(
    result.TSE.map((o) => ({ name: o.name, meta: o.meta })),
    [
      { name: 'Sandeep Agrawal', meta: 'Purab' },
      { name: 'Extra TSE', meta: 'East' },
    ]
  );
});
