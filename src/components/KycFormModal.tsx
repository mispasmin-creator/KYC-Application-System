import { AlertCircle, ArrowRight, CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BranchLocation,
  EntityType,
  KycLead,
  TeamMember,
} from '../types/kyc';
import {
  isValidIndianPhone,
  isValidPincode,
  normalizeIndianPhone,
  validateGstin,
} from '../utils/validators';

interface KycFormModalProps {
  isOpen: boolean;
  editingLead: KycLead | null;
  activeUser: TeamMember;
  teamMembers: TeamMember[];
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
  onClose,
  onSave,
}: KycFormModalProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [gmId, setGmId] = useState('');
  const [gmCustomName, setGmCustomName] = useState('');
  const [mmId, setMmId] = useState('');
  const [mmCustomName, setMmCustomName] = useState('');
  const [tseId, setTseId] = useState('');
  const [tseCustomName, setTseCustomName] = useState('');

  const [gmSubmitted, setGmSubmitted] = useState(false);
  const [mmSubmitted, setMmSubmitted] = useState(false);

  const [entityType, setEntityType] = useState<EntityType>('customer');
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

  const membersByCategory = useMemo(() => {
    return {
      GM: teamMembers.filter((m) => m.salespersonCategory === 'GM'),
      MM: teamMembers.filter((m) => m.salespersonCategory === 'MM'),
      TSE: teamMembers.filter((m) => m.salespersonCategory === 'TSE'),
    };
  }, [teamMembers]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingLead) {
      const gmMatch = teamMembers.find(
        (m) =>
          (editingLead.gmId && m.id === editingLead.gmId) ||
          m.name.toLowerCase() === editingLead.gmName.toLowerCase()
      );
      const mmMatch = teamMembers.find(
        (m) =>
          (editingLead.mmId && m.id === editingLead.mmId) ||
          m.name.toLowerCase() === editingLead.mmName.toLowerCase()
      );
      const tseMatch = teamMembers.find(
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

      setEntityType(editingLead.entityType);
      setCompanyName(editingLead.companyName);
      setIndustry(editingLead.industry);
      setGstin(editingLead.gstin);
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
        activeUser.salespersonCategory === 'GM'
          ? activeUser.id
          : membersByCategory.GM.length === 0
            ? '__custom__'
            : ''
      );
      setGmCustomName('');
      setMmId(
        activeUser.salespersonCategory === 'MM'
          ? activeUser.id
          : membersByCategory.MM.length === 0
            ? '__custom__'
            : ''
      );
      setMmCustomName('');
      setTseId(
        activeUser.salespersonCategory === 'TSE'
          ? activeUser.id
          : membersByCategory.TSE.length === 0
            ? '__custom__'
            : ''
      );
      setTseCustomName('');

      setGmSubmitted(false);
      setMmSubmitted(false);
      setEntityType('customer');
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
  }, [isOpen, editingLead, activeUser, teamMembers, membersByCategory]);

  if (!isOpen) return null;

  const gstCheck = validateGstin(gstin);

  const selectedGmMember = teamMembers.find((m) => m.id === gmId) ?? null;
  const selectedMmMember = teamMembers.find((m) => m.id === mmId) ?? null;
  const selectedTseMember = teamMembers.find((m) => m.id === tseId) ?? null;

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

  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
    setGstin(upper);
    const check = validateGstin(upper);
    if (check.stateName && !stateName) {
      setStateName(check.stateName);
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
    if (!gstCheck.valid) nextErrors.gstin = gstCheck.message;
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
        gstin: gstCheck.normalized,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={editingLead ? 'Edit KYC Profile' : 'New KYC Entry'}
    >
      <div className="flex max-h-[92dvh] sm:max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[#EEF5F5] border border-white/90 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-5 sm:px-6 py-3.5 sm:py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            {editingLead ? 'Edit KYC Profile' : 'New KYC Entry'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            aria-label="Close form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5"
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

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                GSTIN (15 Characters) *
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="27AABCU9603R1ZM"
                maxLength={15}
                className={`${INPUT_CLASS} font-mono uppercase`}
              />
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                {gstCheck.valid ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{gstCheck.message}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    {errors.gstin ? (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span className="text-rose-700">{errors.gstin}</span>
                      </>
                    ) : (
                      <span>{gstin ? gstCheck.message : 'Format: 27AABCU9603R1ZM'}</span>
                    )}
                  </span>
                )}
              </div>
            </div>

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
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="Maharashtra"
                  className={INPUT_CLASS}
                />
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

            <div className="space-y-2.5">
              {branches.map((branch, idx) => (
                <div
                  key={branch.id}
                  className="grid grid-cols-1 gap-2.5 sm:grid-cols-12 items-center rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                >
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={branch.branchName}
                      onChange={(e) => handleBranchChange(branch.id, 'branchName', e.target.value)}
                      placeholder={`Branch ${idx + 1} Name / Unit`}
                      className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={branch.city}
                      onChange={(e) => handleBranchChange(branch.id, 'city', e.target.value)}
                      placeholder="City"
                      className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
                    />
                  </div>
                  <div className="sm:col-span-3">
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
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveBranch(branch.id)}
                      disabled={branches.length <= 1}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"
                      aria-label="Remove branch"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
                      {selectedGmMember && (
                        <span className="text-xs text-slate-500 truncate">
                          ({selectedGmMember.territory})
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
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      {membersByCategory.GM.length > 0 ? (
                        <select
                          aria-label="Select General Manager"
                          value={gmId}
                          onChange={(e) => {
                            setGmId(e.target.value);
                            setErrors((prev) => ({ ...prev, attribution: '' }));
                          }}
                          className={`${INPUT_CLASS} flex-1`}
                        >
                          <option value="">Select General Manager</option>
                          {membersByCategory.GM.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name} ({member.territory})
                            </option>
                          ))}
                          <option value="__custom__">Enter GM name manually...</option>
                        </select>
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
                      <button
                        type="button"
                        onClick={handleConfirmGm}
                        disabled={!resolvedGmName}
                        className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0D4F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
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
                        {selectedMmMember && (
                          <span className="text-xs text-slate-500 truncate">
                            ({selectedMmMember.territory})
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
                    <div className="space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {membersByCategory.MM.length > 0 ? (
                          <select
                            aria-label="Select Marketing Manager"
                            value={mmId}
                            onChange={(e) => {
                              setMmId(e.target.value);
                              setErrors((prev) => ({ ...prev, attribution: '' }));
                            }}
                            className={`${INPUT_CLASS} flex-1`}
                          >
                            <option value="">Select Marketing Manager</option>
                            {membersByCategory.MM.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name} ({member.territory})
                              </option>
                            ))}
                            <option value="__custom__">Enter MM name manually...</option>
                          </select>
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
                        <button
                          type="button"
                          onClick={handleConfirmMm}
                          disabled={!resolvedMmName}
                          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0D4F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
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
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Territory Sales Executive (TSE) *
                  </label>
                  {membersByCategory.TSE.length > 0 ? (
                    <>
                      <select
                        aria-label="Select Territory Sales Executive"
                        value={tseId}
                        onChange={(e) => {
                          setTseId(e.target.value);
                          setErrors((prev) => ({ ...prev, attribution: '' }));
                        }}
                        className={INPUT_CLASS}
                      >
                        <option value="">Select Territory Sales Executive</option>
                        {membersByCategory.TSE.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} ({member.territory})
                          </option>
                        ))}
                        <option value="__custom__">Enter TSE name manually...</option>
                      </select>
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
