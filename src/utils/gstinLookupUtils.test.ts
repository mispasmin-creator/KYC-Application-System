import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGstinApiResponse } from './gstinLookupUtils';

test('parses gstincheck-style nested pradr.addr response cleanly', () => {
  const result = parseGstinApiResponse({
    flag: true,
    data: {
      lgnm: 'APEX INDUSTRIAL SUPPLIES PRIVATE LIMITED',
      tradeNam: 'APEX PACKAGING',
      sts: 'Active',
      pradr: {
        addr: {
          bno: 'Plot 42',
          bnm: 'MIDC Industrial Estate',
          st: 'Sector 4',
          loc: 'Bhosari',
          dst: 'Pune',
          stcd: 'Maharashtra',
          pncd: '411026',
        },
      },
    },
  });

  assert.equal(result.found, true);
  assert.equal(result.legalName, 'APEX INDUSTRIAL SUPPLIES PRIVATE LIMITED');
  assert.equal(result.tradeName, 'APEX PACKAGING');
  assert.equal(result.address, 'Plot 42, MIDC Industrial Estate, Sector 4, Bhosari');
  assert.equal(result.city, 'Pune');
  assert.equal(result.state, 'Maharashtra');
  assert.equal(result.pincode, '411026');
  assert.equal(result.status, 'Active');
});

test('handles flat address string and not-found responses gracefully', () => {
  const flat = parseGstinApiResponse({
    legalName: 'BHARAT STEEL TRADERS',
    pradr: { adr: '12 Ring Road, Raipur, Chhattisgarh, 492001' },
  });
  assert.equal(flat.found, true);
  assert.equal(flat.address, '12 Ring Road, Raipur, Chhattisgarh, 492001');

  const notFound = parseGstinApiResponse({ flag: false, message: 'Invalid GSTIN' });
  assert.equal(notFound.found, false);
  assert.equal(notFound.message, 'Invalid GSTIN');
});
