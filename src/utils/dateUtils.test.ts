import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDateTime, formatShortDate, formatSheetTimestamp } from './validators';

test('formatSheetTimestamp formats ISO string to MM/DD/YYYY HH:MM:SS', () => {
  const sampleIso = '2026-11-19T03:36:19.486Z';
  const formatted = formatSheetTimestamp(sampleIso);

  // Must match MM/DD/YYYY HH:MM:SS
  assert.match(formatted, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);

  // The output must be parseable by JavaScript Date / Google Sheets formulas
  const parsed = new Date(formatted);
  assert.equal(Number.isNaN(parsed.getTime()), false);
});

test('formatSheetTimestamp handles undefined and Date instance', () => {
  const nowFormatted = formatSheetTimestamp();
  assert.match(nowFormatted, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);

  const fromDate = formatSheetTimestamp(new Date('2026-05-09T14:20:10'));
  assert.match(fromDate, /05\/09\/2026 14:20:10/);
});

test('formatDateTime and formatShortDate correctly parse MM/DD/YYYY HH:MM:SS', () => {
  const sheetTimestamp = '11/19/2026 09:06:19';
  const shortDate = formatShortDate(sheetTimestamp);
  const dateTime = formatDateTime(sheetTimestamp);

  assert.notEqual(shortDate, '—');
  assert.notEqual(dateTime, '—');
  assert.match(shortDate, /19.*Nov.*2026/i);
  assert.match(dateTime, /19.*Nov.*2026/i);
});
