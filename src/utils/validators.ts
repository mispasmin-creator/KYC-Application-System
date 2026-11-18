const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^[6-9][0-9]{9}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

export interface GstValidationResult {
  valid: boolean;
  normalized: string;
  stateName: string | null;
  message: string;
}

export function validateGstin(raw: string): GstValidationResult {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) {
    return {
      valid: false,
      normalized: '',
      stateName: null,
      message: '15-character GSTIN is required',
    };
  }
  if (normalized.length !== 15) {
    return {
      valid: false,
      normalized,
      stateName: null,
      message: `Must be 15 characters (${normalized.length}/15)`,
    };
  }
  const stateCode = normalized.slice(0, 2);
  const stateName = GST_STATE_CODES[stateCode] ?? null;
  if (!stateName) {
    return {
      valid: false,
      normalized,
      stateName: null,
      message: `Unknown state code "${stateCode}"`,
    };
  }
  if (!GSTIN_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized,
      stateName,
      message: 'Format mismatch (expected 22AAAAA0000A1Z5)',
    };
  }
  return {
    valid: true,
    normalized,
    stateName,
    message: `Valid GSTIN · ${stateName}`,
  };
}

export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export function isValidIndianPhone(raw: string): boolean {
  const normalized = normalizeIndianPhone(raw);
  return PHONE_REGEX.test(normalized);
}

export function isValidPincode(raw: string): boolean {
  return PINCODE_REGEX.test(raw.trim());
}

export function formatInr(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactInr(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }
  return formatInr(amount);
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
