import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { lookupGstinDetails } from '../services/workspaceApi';
import {
  BranchLocation,
  EntityType,
  KycLead,
  MasterSalesPerson,
  TeamMember,
} from '../types/kyc';
import { buildSalesOptionsByCategory } from '../utils/masterTeamUtils';
import {
  GST_STATE_CODES,
  isUnregisteredGstin,
  isValidIndianPhone,
  isValidPincode,
  normalizeIndianPhone,
  validateGstin,
} from '../utils/validators';
import { CustomSelect } from './CustomSelect';

interface KycFormModalProps {
  isOpen: boolean;
  editingLead: KycLead | null;
  activeUser: TeamMember;
  teamMembers: TeamMember[];
  masterTeam: MasterSalesPerson[];
  onClose: () => void;
  onSave: (
    payload: Omit<KycLead, 'id' | 'createdAt' | 'updatedAt' | 'activities'>,
    editingId?: string
  ) => void;
}

const SECTION_CARD_CLASS =
  'space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_6px_20px_-14px_rgba(15,76,82,0.18)]';

const INPUT_CLASS =
  'w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20';

function createEmptyBranch(index: number): BranchLocation {
  return {
    id: `br-${Date.now()}-${index}`,
    branchName: '',
    city: '',
    contactPhone: '',
  };
}

export function KycFormModal({
  isOpen,
  editingLead,
  activeUser,
  teamMembers,
  masterTeam,
  onClose,
  onSave,
}: KycFormModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastInitSessionRef = useRef<string | null>(null);

  const [gmId, setGmId] = useState('');
  const [gmCustomName, setGmCustomName] = useState('');
  const [mmId, setMmId] = useState('');
  const [mmCustomName, setMmCustomName] = useState('');
  const [tseId, setTseId] = useState('');
  const [tseCustomName, setTseCustomName] = useState('');

  const [gmSubmitted, setGmSubmitted] = useState(false);
  const [mmSubmitted, setMmSubmitted] = useState(false);

  const [entityType, setEntityType] = useState<EntityType>('customer');
  const [hasGstin, setHasGstin] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [branchCount, setBranchCount] = useState(1);
  const [branches, setBranches] = useState<BranchLocation[]>([createEmptyBranch(1)]);
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [teamLeaderName, setTeamLeaderName] = useState('');
  const [teamLeaderPhone, setTeamLeaderPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gstLookupState, setGstLookupState] = useState<
    'idle' | 'loading' | 'filled' | 'not_configured' | 'error'
  >('idle');
  const [gstLookupMessage, setGstLookupMessage] = useState('');
  const lastLookedUpGstinRef = useRef<string>('');

  const membersByCategory = useMemo(
    () => buildSalesOptionsByCategory(masterTeam, teamMembers),
    [masterTeam, teamMembers]
  );

  useEffect(() => {
    if (!isOpen) {
      lastInitSessionRef.current = null;
      return;
    }

    const sessionKey = editingLead ? `edit:${editingLead.id}` : 'new';
    if (lastInitSessionRef.current === sessionKey) {
      return;
    }
    lastInitSessionRef.current = sessionKey;

    if (editingLead) {
      const gmMatch = membersByCategory.GM.find(
        (m) =>
          (editingLead.gmId && m.id === editingLead.gmId) ||
          m.name.toLowerCase() === editingLead.gmName.toLowerCase()
      );
      const mmMatch = membersByCategory.MM.find(
        (m) =>
          (editingLead.mmId && m.id === editingLead.mmId) ||
          m.name.toLowerCase() === editingLead.mmName.toLowerCase()
      );
      const tseMatch = membersByCategory.TSE.find(
        (m) =>
          (editingLead.tseId && m.id === editingLead.tseId) ||
          m.name.toLowerCase() === editingLead.tseName.toLowerCase()
      );

      setGmId(gmMatch ? gmMatch.id : editingLead.gmName ? '__custom__' : '');
      setGmCustomName(gmMatch ? '' : editingLead.gmName);
      setMmId(mmMatch ? mmMatch.id : editingLead.mmName ? '__custom__' : '');
      setMmCustomName(mmMatch ? '' : editingLead.mmName);
      setTseId(tseMatch ? tseMatch.id : editingLead.tseName ? '__custom__' : '');
      setTseCustomName(tseMatch ? '' : editingLead.tseName);

      setGmSubmitted(Boolean(editingLead.gmName));
      setMmSubmitted(Boolean(editingLead.mmName));

      const isUnreg = isUnregisteredGstin(editingLead.gstin);
      setHasGstin(!isUnreg);
      setEntityType(editingLead.entityType);
      setCompanyName(editingLead.companyName);
      setIndustry(editingLead.industry);
      setGstin(isUnreg ? '' : editingLead.gstin);
      setAddress(editingLead.address);
      setCity(editingLead.city);
      setStateName(editingLead.state);
      setPincode(editingLead.pincode);
      setBranchCount(editingLead.branchCount);
      setBranches(
        editingLead.branches.length > 0 ? editingLead.branches : [createEmptyBranch(1)]
      );
      setManagerName(editingLead.managerName);
      setManagerPhone(editingLead.managerPhone);
      setTeamLeaderName(editingLead.teamLeaderName);
      setTeamLeaderPhone(editingLead.teamLeaderPhone);
      setContactEmail(editingLead.contactEmail);
      setNotes(editingLead.notes);
    } else {
      setGmId(
        activeUser.salespersonCategory === 'GM' &&
          membersByCategory.GM.some((m) => m.id === activeUser.id)
          ? activeUser.id
          : membersByCategory.GM.length === 0
            ? '__custom__'
            : ''
      );
      setGmCustomName('');
      setMmId(
        activeUser.salespersonCategory === 'MM' &&
          membersByCategory.MM.some((m) => m.id === activeUser.id)
          ? activeUser.id
          : membersByCategory.MM.length === 0
            ? '__custom__'
            : ''
      );
      setMmCustomName('');
      setTseId(
        activeUser.salespersonCategory === 'TSE' &&
          membersByCategory.TSE.some((m) => m.id === activeUser.id)
          ? activeUser.id
          : membersByCategory.TSE.length === 0
            ? '__custom__'
            : ''
      );
      setTseCustomName('');

      setGmSubmitted(false);
      setMmSubmitted(false);
      setEntityType('customer');
      setHasGstin(true);
      setCompanyName('');
      setIndustry('');
      setGstin('');
      setAddress('');
      setCity('');
      setStateName('');
      setPincode('');
      setBranchCount(1);
      setBranches([createEmptyBranch(1)]);
      setManagerName('');
      setManagerPhone('');
      setTeamLeaderName('');
      setTeamLeaderPhone('');
      setContactEmail('');
      setNotes('');
    }
    setErrors({});
    setGstLookupState('idle');
    setGstLookupMessage('');
    lastLookedUpGstinRef.current =
      editingLead && !isUnregisteredGstin(editingLead.gstin)
        ? editingLead.gstin.toUpperCase()
        : '';
  }, [isOpen, editingLead, activeUser, membersByCategory]);

  // If Master sheet finishes loading after modal opens, upgrade untouched empty custom inputs to dropdowns
  useEffect(() => {
    if (!isOpen || editingLead) return;
    if (membersByCategory.GM.length > 0 && gmId === '__custom__' && !gmCustomName.trim()) {
      setGmId('');
    }
    if (membersByCategory.MM.length > 0 && mmId === '__custom__' && !mmCustomName.trim()) {
      setMmId('');
    }
    if (membersByCategory.TSE.length > 0 && tseId === '__custom__' && !tseCustomName.trim()) {
      setTseId('');
    }
  }, [
    isOpen,
    editingLead,
    membersByCategory,
    gmId,
    gmCustomName,
    mmId,
    mmCustomName,
    tseId,
    tseCustomName,
  ]);

  if (!isOpen) return null;

  const gstCheck = validateGstin(gstin);

  const selectedGmMember = membersByCategory.GM.find((m) => m.id === gmId) ?? null;
  const selectedMmMember = membersByCategory.MM.find((m) => m.id === mmId) ?? null;
  const selectedTseMember = membersByCategory.TSE.find((m) => m.id === tseId) ?? null;

  const resolvedGmName =
    gmId === '__custom__' ? gmCustomName.trim() : selectedGmMember?.name ?? '';
  const resolvedMmName =
    mmId === '__custom__' ? mmCustomName.trim() : selectedMmMember?.name ?? '';
  const resolvedTseName =
    tseId === '__custom__' ? tseCustomName.trim() : selectedTseMember?.name ?? '';

  const handleConfirmGm = () => {
    if (!resolvedGmName) {
      setErrors((prev) => ({
        ...prev,
        attribution: 'Please select or enter a General Manager name.',
      }));
      return;
    }
    setErrors((prev) => ({ ...prev, attribution: '' }));
    setGmSubmitted(true);
  };

  const handleConfirmMm = () => {
    if (!resolvedMmName) {
      setErrors((prev) => ({
        ...prev,
        attribution: 'Please select or enter a Marketing Manager name.',
      }));
      return;
    }
    setErrors((prev) => ({ ...prev, attribution: '' }));
    setMmSubmitted(true);
  };

  const handleLookupGstin = async (explicitGstin?: string) => {
    const target = (explicitGstin ?? gstin).toUpperCase().replace(/[^0-9A-Z]/g, '');
    const check = validateGstin(target);
    if (!check.valid) {
      setGstLookupState('error');
      setGstLookupMessage(check.message);
      return;
    }

    lastLookedUpGstinRef.current = target;
    setGstLookupState('loading');
    setGstLookupMessage('Checking GSTIN details...');
    try {
      const result = await lookupGstinDetails(target);
      if (result.state && !stateName.trim()) {
        setStateName(result.state);
      }
      if (!result.configured) {
        setGstLookupState('idle');
        setGstLookupMessage('');
        return;
      }
      if (!result.found) {
        setGstLookupState('error');
        setGstLookupMessage(result.message || 'GSTIN details not found.');
        return;
      }

      if (result.legalName || result.tradeName) {
        setCompanyName((prev) => prev.trim() || result.legalName || result.tradeName);
      }
      if (result.address) {
        setAddress(result.address);
      }
      if (result.city) {
        setCity(result.city);
      }
      if (result.state) {
        setStateName(result.state);
      }
      if (result.pincode) {
        setPincode(result.pincode);
      }
      setGstLookupState('filled');
      setGstLookupMessage(
        result.status
          ? `GSTIN ${result.status} — Registered address auto-filled.`
          : 'Registered address auto-filled from GSTIN.'
      );
    } catch (err) {
      setGstLookupState('error');
      setGstLookupMessage(
        err instanceof Error ? err.message : 'Unable to fetch GSTIN details right now.'
      );
    }
  };

  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
    setGstin(upper);
    const check = validateGstin(upper);
    if (check.stateName && !stateName) {
      setStateName(check.stateName);
    }
    if (upper.length < 15) {
      setGstLookupState('idle');
      setGstLookupMessage('');
      lastLookedUpGstinRef.current = '';
      return;
    }
    if (check.valid && lastLookedUpGstinRef.current !== upper) {
      void handleLookupGstin(upper);
    }
  };

  const handleAddBranch = () => {
    const next = [...branches, createEmptyBranch(branches.length + 1)];
    setBranches(next);
    setBranchCount(Math.max(branchCount, next.length));
  };

  const handleRemoveBranch = (id: string) => {
    if (branches.length <= 1) return;
    const next = branches.filter((b) => b.id !== id);
    setBranches(next);
    setBranchCount(next.length);
  };

  const handleBranchChange = (id: string, field: keyof BranchLocation, value: string) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (companyName.trim().length < 2) nextErrors.companyName = 'Company legal name is required.';
    if (hasGstin && !gstCheck.valid) nextErrors.gstin = gstCheck.message;
    if (address.trim().length < 5) nextErrors.address = 'Registered address is required.';
    if (city.trim().length < 2) nextErrors.city = 'City is required.';
    if (stateName.trim().length < 2) nextErrors.stateName = 'State is required.';
    if (pincode.trim() && !isValidPincode(pincode)) {
      nextErrors.pincode = 'Enter a valid 6-digit Indian pincode.';
    }
    if (managerName.trim().length < 2) nextErrors.managerName = 'Manager name is required.';
    if (!isValidIndianPhone(managerPhone)) {
      nextErrors.managerPhone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (teamLeaderPhone.trim() && !isValidIndianPhone(teamLeaderPhone)) {
      nextErrors.teamLeaderPhone = 'Enter a valid 10-digit mobile number or leave blank.';
    }

    const validBranches = branches.filter((b) => b.branchName.trim() || b.city.trim());
    if (validBranches.length === 0) {
      nextErrors.branches = 'Add at least one branch or head office location.';
    }

    if (!gmSubmitted || !resolvedGmName) {
      nextErrors.attribution = 'Please add a General Manager.';
    } else if (!mmSubmitted || !resolvedMmName) {
      nextErrors.attribution = 'Please add a Marketing Manager.';
    } else if (!resolvedTseName) {
      nextErrors.attribution = 'Please select or enter a Territory Sales Executive.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const onlyAttributionError =
        Object.keys(nextErrors).length === 1 && Boolean(nextErrors.attribution);
      formRef.current?.scrollTo({
        top: onlyAttributionError ? formRef.current.scrollHeight : 0,
        behavior: 'smooth',
      });
      return;
    }

    onSave(
      {
        entityType,
        companyName: companyName.trim(),
        industry: industry.trim() || 'General Commercial',
        gstin: hasGstin ? gstCheck.normalized : 'URP',
        address: address.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim() || '000000',
        branchCount: Math.max(branchCount, validBranches.length),
        branches: validBranches.map((b, idx) => ({
          id: b.id,
          branchName: b.branchName.trim() || `Branch ${idx + 1}`,
          city: b.city.trim() || city.trim(),
          contactPhone: normalizeIndianPhone(b.contactPhone),
        })),
        managerName: managerName.trim(),
        managerPhone: normalizeIndianPhone(managerPhone),
        teamLeaderName: teamLeaderName.trim(),
        teamLeaderPhone: normalizeIndianPhone(teamLeaderPhone),
        contactEmail: contactEmail.trim(),
        salespersonId: activeUser.id,
        salespersonName: activeUser.name,
        salespersonCategory: activeUser.salespersonCategory,
        gmId: selectedGmMember?.id ?? '',
        gmName: resolvedGmName,
        mmId: selectedMmMember?.id ?? '',
        mmName: resolvedMmName,
        tseId: selectedTseMember?.id ?? '',
        tseName: resolvedTseName,
        notes: notes.trim(),
      },
      editingLead?.id
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={editingLead ? 'Edit KYC Profile' : 'New KYC Entry'}
    >
      <div className="flex max-h-[94dvh] sm:max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-[#EEF5F5] border border-white/90 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-white/95">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 sm:py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            {editingLead ? 'Edit KYC Profile' : 'New KYC Entry'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            aria-label="Close form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 pb-36 sm:pb-44 space-y-5"
        >
          {/* Company & GST Details */}
          <section className={SECTION_CARD_CLASS}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Company & GST Details
              </h3>
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                {(['customer', 'vendor'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEntityType(type)}
                    className={`min-h-[36px] rounded-lg px-3.5 py-1 text-xs font-medium transition-all ${
                      entityType === type
                        ? 'bg-white text-[#0D4F3C] font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {type === 'customer' ? 'Customer' : 'Vendor'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Company Legal Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Industrial Supplies Pvt Ltd"
                  className={INPUT_CLASS}
                />
                {errors.companyName && (
                  <p className="mt-1 text-xs text-rose-700">{errors.companyName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Industry / Category
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Packaging, Logistics, Manufacturing"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* GST Available / Registered Toggle */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-2.5">
              <label className="block text-xs font-medium text-slate-700">
                GST Registered? *
              </label>

              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setHasGstin(true)}
                  className={`min-h-[34px] rounded-lg px-4 py-1 text-xs font-semibold transition-all ${
                    hasGstin
                      ? 'bg-[#0D4F3C] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasGstin(false);
                    setGstin('');
                    setGstLookupState('idle');
                    setGstLookupMessage('');
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.gstin;
                      return copy;
                    });
                  }}
                  className={`min-h-[34px] rounded-lg px-4 py-1 text-xs font-semibold transition-all ${
                    !hasGstin
                      ? 'bg-[#0D4F3C] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {hasGstin && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  GSTIN (15 Characters) *
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="27AABCU9603R1ZM"
                    maxLength={15}
                    className={`${INPUT_CLASS} font-mono uppercase flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => void handleLookupGstin()}
                    disabled={!gstCheck.valid || gstLookupState === 'loading'}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0D4F3C] hover:border-[#0D4F3C] hover:bg-[#E8F6EE]/60 disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0 transition-colors"
                  >
                    {gstLookupState === 'loading' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    <span>{gstLookupState === 'loading' ? 'Fetching...' : 'Fetch GST Address'}</span>
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  {gstCheck.valid ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{gstCheck.message}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      {errors.gstin ? (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          <span className="text-rose-700">{errors.gstin}</span>
                        </>
                      ) : (
                        <span>{gstin ? gstCheck.message : 'Format: 27AABCU9603R1ZM'}</span>
                      )}
                    </span>
                  )}
                  {gstLookupMessage && gstLookupState !== 'idle' && (
                    <span
                      className={`text-xs ${
                        gstLookupState === 'filled'
                          ? 'font-medium text-emerald-700'
                          : gstLookupState === 'error'
                            ? 'text-rose-700'
                            : 'text-slate-500'
                      }`}
                    >
                      · {gstLookupMessage}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Registered Address *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot / Building, Industrial Estate, Street"
                className={INPUT_CLASS}
              />
              {errors.address && <p className="mt-1 text-xs text-rose-700">{errors.address}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Pune"
                  className={INPUT_CLASS}
                />
                {errors.city && <p className="mt-1 text-xs text-rose-700">{errors.city}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">State *</label>
                <input
                  type="text"
                  list="kyc-indian-states-list"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="Maharashtra"
                  className={INPUT_CLASS}
                />
                <datalist id="kyc-indian-states-list">
                  {Object.values(GST_STATE_CODES).map((st) => (
                    <option key={st} value={st} />
                  ))}
                </datalist>
                {errors.stateName && (
                  <p className="mt-1 text-xs text-rose-700">{errors.stateName}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="411026"
                  maxLength={6}
                  className={`${INPUT_CLASS} font-mono`}
                />
                {errors.pincode && <p className="mt-1 text-xs text-rose-700">{errors.pincode}</p>}
              </div>
            </div>
          </section>

          {/* Client Key Contacts */}
          <section className={SECTION_CARD_CLASS}>
            <h3 className="font-display text-sm font-semibold text-slate-900 border-b border-slate-200 pb-3">
              Client Key Contacts
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Manager Name *
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Decision maker / Plant Manager"
                  className={INPUT_CLASS}
                />
                {errors.managerName && (
                  <p className="mt-1 text-xs text-rose-700">{errors.managerName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Manager Mobile Number *
                </label>
                <input
                  type="tel"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className={`${INPUT_CLASS} font-mono`}
                />
                {errors.managerPhone && (
                  <p className="mt-1 text-xs text-rose-700">{errors.managerPhone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Team Leader Name
                </label>
                <input
                  type="text"
                  value={teamLeaderName}
                  onChange={(e) => setTeamLeaderName(e.target.value)}
                  placeholder="Site coordinator / Team Lead"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Team Leader Mobile Number
                </label>
                <input
                  type="tel"
                  value={teamLeaderPhone}
                  onChange={(e) => setTeamLeaderPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className={`${INPUT_CLASS} font-mono`}
                />
                {errors.teamLeaderPhone && (
                  <p className="mt-1 text-xs text-rose-700">{errors.teamLeaderPhone}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Official Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="procurement@company.in"
                className={INPUT_CLASS}
              />
            </div>
          </section>

          {/* Branch Locations */}
          <section className={SECTION_CARD_CLASS}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Branch Locations
              </h3>
              <button
                type="button"
                onClick={handleAddBranch}
                className="min-h-[40px] inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-[#E8F6EE] px-3 py-1.5 text-xs font-semibold text-[#0D4F3C] hover:bg-emerald-100"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Branch</span>
              </button>
            </div>

            <div className="w-full sm:w-48">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Total Branches / Units *
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={branchCount}
                onChange={(e) => setBranchCount(Math.max(1, Number(e.target.value) || 1))}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="space-y-3">
              {branches.map((branch, idx) => (
                <div
                  key={branch.id}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0D4F3C] uppercase tracking-wide">
                      Branch No. {idx + 1}
                    </span>
                    {branches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBranch(branch.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        aria-label="Remove branch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={branch.branchName}
                      onChange={(e) => handleBranchChange(branch.id, 'branchName', e.target.value)}
                      placeholder={`Branch Name / Unit (e.g. Plant 1)`}
                      className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
                    />
                    <input
                      type="text"
                      value={branch.city}
                      onChange={(e) => handleBranchChange(branch.id, 'city', e.target.value)}
                      placeholder="City (e.g. Raipur)"
                      className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
                    />
                    <input
                      type="tel"
                      value={branch.contactPhone}
                      onChange={(e) =>
                        handleBranchChange(branch.id, 'contactPhone', e.target.value)
                      }
                      placeholder="Branch Phone"
                      className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
                    />
                  </div>
                </div>
              ))}
              {errors.branches && <p className="text-xs text-rose-700">{errors.branches}</p>}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Additional Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional company remarks, dispatch notes, or credit terms..."
                className={INPUT_CLASS}
              />
            </div>
          </section>

          {/* Sales Team */}
          <section className={SECTION_CARD_CLASS}>
            <h3 className="font-display text-sm font-semibold text-slate-900 border-b border-slate-200 pb-3">
              Sales Team
            </h3>

            <div className="space-y-4">
              {/* General Manager (GM) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  General Manager (GM) *
                </label>
                {gmSubmitted && resolvedGmName ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/75 px-3.5 py-2.5 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-900 truncate">
                        {resolvedGmName}
                      </span>
                      {selectedGmMember && selectedGmMember.meta && (
                        <span className="text-xs text-slate-500 truncate">
                          ({selectedGmMember.meta})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setGmSubmitted(false)}
                      className="text-xs font-semibold text-[#0B6D77] hover:text-teal-950 shrink-0"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="flex-1 min-w-0">
                        {membersByCategory.GM.length > 0 ? (
                          <CustomSelect
                            id="select-gm"
                            ariaLabel="Select General Manager"
                            value={gmId}
                            onChange={(val) => {
                              setGmId(val);
                              setErrors((prev) => ({ ...prev, attribution: '' }));
                            }}
                            options={[
                              ...membersByCategory.GM.map((member) => ({
                                value: member.id,
                                label: member.name,
                                meta: member.meta,
                              })),
                              { value: '__custom__', label: 'Enter GM name manually...' },
                            ]}
                            placeholder="Select General Manager"
                          />
                        ) : (
                          <input
                            type="text"
                            value={gmCustomName}
                            onChange={(e) => {
                              setGmId('__custom__');
                              setGmCustomName(e.target.value);
                              setErrors((prev) => ({ ...prev, attribution: '' }));
                            }}
                            placeholder="Enter General Manager name"
                            className={`${INPUT_CLASS} flex-1`}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleConfirmGm}
                        disabled={!resolvedGmName}
                        className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0D4F3C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0 transition-all shadow-2xs"
                      >
                        <span>Add GM</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {membersByCategory.GM.length > 0 && gmId === '__custom__' && (
                      <input
                        type="text"
                        value={gmCustomName}
                        onChange={(e) => {
                          setGmCustomName(e.target.value);
                          setErrors((prev) => ({ ...prev, attribution: '' }));
                        }}
                        placeholder="Type General Manager full name"
                        className={INPUT_CLASS}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Marketing Manager (MM) — shown after GM is added */}
              {gmSubmitted && resolvedGmName && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Marketing Manager (MM) *
                  </label>
                  {mmSubmitted && resolvedMmName ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/75 px-3.5 py-2.5 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-900 truncate">
                          {resolvedMmName}
                        </span>
                        {selectedMmMember && selectedMmMember.meta && (
                          <span className="text-xs text-slate-500 truncate">
                            ({selectedMmMember.meta})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setMmSubmitted(false)}
                        className="text-xs font-semibold text-[#0B6D77] hover:text-teal-950 shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <div className="flex-1 min-w-0">
                          {membersByCategory.MM.length > 0 ? (
                            <CustomSelect
                              id="select-mm"
                              ariaLabel="Select Marketing Manager"
                              value={mmId}
                              onChange={(val) => {
                                setMmId(val);
                                setErrors((prev) => ({ ...prev, attribution: '' }));
                              }}
                              options={[
                                ...membersByCategory.MM.map((member) => ({
                                  value: member.id,
                                  label: member.name,
                                  meta: member.meta,
                                })),
                                { value: '__custom__', label: 'Enter MM name manually...' },
                              ]}
                              placeholder="Select Marketing Manager"
                            />
                          ) : (
                            <input
                              type="text"
                              value={mmCustomName}
                              onChange={(e) => {
                                setMmId('__custom__');
                                setMmCustomName(e.target.value);
                                setErrors((prev) => ({ ...prev, attribution: '' }));
                              }}
                              placeholder="Enter Marketing Manager name"
                              className={`${INPUT_CLASS} flex-1`}
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmMm}
                          disabled={!resolvedMmName}
                          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0D4F3C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0 transition-all shadow-2xs"
                        >
                          <span>Add MM</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {membersByCategory.MM.length > 0 && mmId === '__custom__' && (
                        <input
                          type="text"
                          value={mmCustomName}
                          onChange={(e) => {
                            setMmCustomName(e.target.value);
                            setErrors((prev) => ({ ...prev, attribution: '' }));
                          }}
                          placeholder="Type Marketing Manager full name"
                          className={INPUT_CLASS}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Territory Sales Executive (TSE) — shown after MM is added */}
              {gmSubmitted && resolvedGmName && mmSubmitted && resolvedMmName && (
                <div className="space-y-2.5">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Territory Sales Executive (TSE) *
                  </label>
                  {membersByCategory.TSE.length > 0 ? (
                    <>
                      <CustomSelect
                        id="select-tse"
                        ariaLabel="Select Territory Sales Executive"
                        value={tseId}
                        onChange={(val) => {
                          setTseId(val);
                          setErrors((prev) => ({ ...prev, attribution: '' }));
                        }}
                        options={[
                          ...membersByCategory.TSE.map((member) => ({
                            value: member.id,
                            label: member.name,
                            meta: member.meta,
                          })),
                          { value: '__custom__', label: 'Enter TSE name manually...' },
                        ]}
                        placeholder="Select Territory Sales Executive"
                      />
                      {tseId === '__custom__' && (
                        <input
                          type="text"
                          value={tseCustomName}
                          onChange={(e) => {
                            setTseCustomName(e.target.value);
                            setErrors((prev) => ({ ...prev, attribution: '' }));
                          }}
                          placeholder="Type Territory Sales Executive full name"
                          className={INPUT_CLASS}
                        />
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={tseCustomName}
                      onChange={(e) => {
                        setTseId('__custom__');
                        setTseCustomName(e.target.value);
                        setErrors((prev) => ({ ...prev, attribution: '' }));
                      }}
                      placeholder="Enter Territory Sales Executive name"
                      className={INPUT_CLASS}
                    />
                  )}
                </div>
              )}
            </div>

            {errors.attribution && (
              <p className="text-xs font-medium text-rose-700">{errors.attribution}</p>
            )}
          </section>
        </form>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-5 sm:px-6 py-3.5 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            className="min-h-[44px] rounded-xl bg-[#0D4F3C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#093b2d] shadow-[0_8px_18px_-6px_rgba(13,79,60,0.45)] active:scale-[0.98] transition-all"
          >
            {editingLead ? 'Save Changes' : 'Submit KYC Form'}
          </button>
        </div>
      </div>
    </div>
  );
}
