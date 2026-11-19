export interface GstinLookupResult {
  configured: boolean;
  found: boolean;
  legalName: string;
  tradeName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
  message?: string;
}

function joinClean(parts: Array<unknown>): string {
  return parts
    .map((p) => String(p ?? '').trim())
    .filter((p) => p !== '' && p.toLowerCase() !== 'na' && p.toLowerCase() !== 'n/a')
    .join(', ');
}

/**
 * Normalizes responses from common Indian GSTIN lookup APIs (e.g. gstincheck.co.in,
 * gstinapi.in, AppyFlow) into clean Company Name + Registered Address fields.
 */
export function parseGstinApiResponse(raw: unknown): Omit<GstinLookupResult, 'configured'> {
  if (!raw || typeof raw !== 'object') {
    return {
      found: false,
      legalName: '',
      tradeName: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      status: '',
      message: 'Empty GSTIN lookup response.',
    };
  }

  const obj = raw as Record<string, unknown>;
  const data = (obj.data && typeof obj.data === 'object' ? obj.data : obj) as Record<
    string,
    unknown
  >;

  if (obj.flag === false || obj.success === false || obj.error === true) {
    return {
      found: false,
      legalName: '',
      tradeName: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      status: '',
      message: String(obj.message || obj.error_message || 'GSTIN details not found.'),
    };
  }

  const legalName = String(data.lgnm || data.legalName || data.legal_name || '').trim();
  const tradeName = String(data.tradeNam || data.tradeName || data.trade_name || '').trim();
  const status = String(data.sts || data.status || '').trim();

  const pradr =
    data.pradr && typeof data.pradr === 'object' ? (data.pradr as Record<string, unknown>) : null;
  const addrObj =
    pradr && pradr.addr && typeof pradr.addr === 'object'
      ? (pradr.addr as Record<string, unknown>)
      : null;

  let address = '';
  let city = '';
  let state = '';
  let pincode = '';

  if (addrObj) {
    address = joinClean([
      addrObj.flno,
      addrObj.bno,
      addrObj.bnm,
      addrObj.st,
      addrObj.loc,
      addrObj.locality,
    ]);
    city = String(addrObj.city || addrObj.dst || addrObj.loc || '').trim();
    state = String(addrObj.stcd || addrObj.state || '').trim();
    pincode = String(addrObj.pncd || addrObj.pincode || '')
      .replace(/\D/g, '')
      .slice(0, 6);
  } else if (pradr && typeof pradr.adr === 'string') {
    address = pradr.adr.trim();
  } else if (typeof data.address === 'string') {
    address = data.address.trim();
  }

  const found = Boolean(legalName || tradeName || address);
  return {
    found,
    legalName,
    tradeName,
    address,
    city,
    state,
    pincode,
    status,
    message: found ? undefined : String(obj.message || 'No registered address returned for this GSTIN.'),
  };
}
