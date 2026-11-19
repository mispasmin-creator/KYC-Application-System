import test from 'node:test';
import assert from 'node:assert/strict';
import { isUnregisteredGstin, validateGstin } from './validators';

test('isUnregisteredGstin correctly identifies unregistered values', () => {
  assert.equal(isUnregisteredGstin(''), true);
  assert.equal(isUnregisteredGstin(null), true);
  assert.equal(isUnregisteredGstin(undefined), true);
  assert.equal(isUnregisteredGstin('   '), true);
  assert.equal(isUnregisteredGstin('URP'), true);
  assert.equal(isUnregisteredGstin('urp'), true);
  assert.equal(isUnregisteredGstin('N/A'), true);
  assert.equal(isUnregisteredGstin('na'), true);
  assert.equal(isUnregisteredGstin('-'), true);
  assert.equal(isUnregisteredGstin('NONE'), true);
  assert.equal(isUnregisteredGstin('Unregistered'), true);

  // Valid GSTIN is not unregistered
  assert.equal(isUnregisteredGstin('22AAHCP9274B1ZI'), false);
  assert.equal(isUnregisteredGstin('27AABCU9603R1ZM'), false);
});

test('validateGstin validates valid and invalid 15-char Indian GSTINs', () => {
  const valid = validateGstin('22AAHCP9274B1ZI');
  assert.equal(valid.valid, true);
  assert.equal(valid.stateName, 'Chhattisgarh');

  const invalidLen = validateGstin('22AAHCP');
  assert.equal(invalidLen.valid, false);

  const empty = validateGstin('');
  assert.equal(empty.valid, false);
});
