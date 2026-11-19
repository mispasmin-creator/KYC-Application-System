import { Download, Printer, X } from 'lucide-react';
import { useState } from 'react';
import { KycLead } from '../types/kyc';
import { buildPrintableKycHtml } from '../utils/printKycUtils';
import { formatDateTime, validateGstin } from '../utils/validators';

interface KycPrintPreviewModalProps {
  lead: KycLead;
  onClose: () => void;
}

export function KycPrintPreviewModal({ lead, onClose }: KycPrintPreviewModalProps) {
  const [printNotice, setPrintNotice] = useState('');
  const gst = validateGstin(lead.gstin);

  const handleBrowserPrint = () => {
    const isSandboxedFrame = window.self !== window.top;
    try {
      window.print();
    } catch {
      // Fallback handled below
    }
    if (isSandboxedFrame) {
      setPrintNotice(
        'Preview frame me browser ka Print popup block ho sakta hai — "Download Print Sheet" use karein ya Ctrl+P dabayein.'
      );
    }
  };

  const handleDownloadPrintable = () => {
    const html = buildPrintableKycHtml(lead);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `${lead.id}-${lead.companyName.replace(/[^a-z0-9]+/gi, '-')}.html`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setPrintNotice('Printable KYC file download ho gayi — browser me open karke PDF/Print kar sakte hain.');
  };

  const addressLine = [lead.address, lead.city, lead.state]
    .filter((p) => Boolean(p && p.trim()))
    .join(', ');

  return (
    <div
      className="print-preview-root fixed inset-0 z-[60] flex flex-col bg-slate-900/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 print:static print:bg-white print:p-0 print:overflow-visible"
      role="dialog"
      aria-modal="true"
      aria-label={`Print Preview for ${lead.companyName}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Action Toolbar (hidden when printing) */}
      <div className="no-print mx-auto mb-4 flex w-full max-w-[820px] flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-lg">
        <div className="min-w-0">
          <div className="font-display text-sm font-bold text-slate-900 truncate">
            Print Preview — {lead.companyName}
          </div>
          {printNotice && (
            <p className="mt-0.5 text-[11px] font-medium text-amber-700">{printNotice}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadPrintable}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-[#0D4F3C]" />
            <span>Download Print Sheet</span>
          </button>

          <button
            type="button"
            onClick={handleBrowserPrint}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#0D4F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#093b2d] shadow-sm transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
            aria-label="Close print preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* A4 Sheet Preview */}
      <article className="mx-auto w-full max-w-[820px] rounded-2xl bg-white p-6 sm:p-10 text-slate-900 shadow-2xl border border-slate-200 print:border-0 print:shadow-none print:p-0 print:max-w-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#0D4F3C] pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-[#E8F6EE] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#0D4F3C]">
              <span>{lead.entityType === 'vendor' ? 'Vendor' : 'Customer'}</span>
              <span>·</span>
              <span>{lead.id}</span>
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
              {lead.companyName}
            </h1>
            <p className="mt-0.5 text-xs text-slate-600">
              {lead.industry} · Saved on {formatDateTime(lead.createdAt)}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2.5 text-right text-xs text-slate-500">
            <div>
              <div className="font-display font-bold text-slate-800">Passary Refractories</div>
              <div>Official Company KYC Sheet</div>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white p-1 shrink-0">
              <img
                src="/assets/aistudio/logo__1__12f0c258.png"
                alt="Passary Refractories Logo"
                className="h-full w-full object-contain"
              />
            </span>
          </div>
        </header>

        {/* Company & GST */}
        <section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#0D4F3C] mb-2.5">
            Company &amp; GST Registration Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 text-sm">
            <div>
              <div className="text-[11px] text-slate-500">GSTIN &amp; Registration State</div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900">{lead.gstin}</div>
              <div className="text-xs text-emerald-700">{gst.message}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Official Email</div>
              <div className="mt-0.5 font-medium text-slate-900">{lead.contactEmail || '—'}</div>
            </div>
            <div className="sm:col-span-2 border-t border-slate-100 pt-3">
              <div className="text-[11px] text-slate-500">Registered Office Address</div>
              <div className="mt-0.5 font-medium text-slate-900">
                {addressLine}
                {lead.pincode && lead.pincode !== '000000' ? ` — ${lead.pincode}` : ''}
              </div>
            </div>
          </div>
        </section>

        {/* Key Contacts & Sales Team */}
        <section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#0D4F3C] mb-2.5">
            Client Key Contacts &amp; Sales Team
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 p-3.5">
              <div className="text-[11px] text-slate-500">Manager</div>
              <div className="mt-0.5 font-semibold text-slate-900">{lead.managerName || '—'}</div>
              <div className="mt-0.5 font-mono text-xs text-slate-700">{lead.managerPhone || '—'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3.5">
              <div className="text-[11px] text-slate-500">Team Leader</div>
              <div className="mt-0.5 font-semibold text-slate-900">
                {lead.teamLeaderName || 'Not provided'}
              </div>
              <div className="mt-0.5 font-mono text-xs text-slate-700">
                {lead.teamLeaderPhone || '—'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1">
              <div className="flex justify-between gap-2">
                <span className="font-mono font-bold text-[#0D4F3C]">GM</span>
                <span className="font-medium text-slate-900 text-right">{lead.gmName || '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="font-mono font-bold text-[#0D4F3C]">MM</span>
                <span className="font-medium text-slate-900 text-right">{lead.mmName || '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="font-mono font-bold text-[#0D4F3C]">TSE</span>
                <span className="font-medium text-slate-900 text-right">{lead.tseName || '—'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Branch Locations */}
        <section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#0D4F3C] mb-2.5">
            Branch Locations ({lead.branchCount} Total)
          </h2>
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <th className="border border-slate-200 px-3 py-2 font-semibold w-10">#</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Branch / Unit</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">City</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Phone</th>
              </tr>
            </thead>
            <tbody>
              {lead.branches.map((branch, idx) => (
                <tr key={branch.id}>
                  <td className="border border-slate-200 px-3 py-2 font-mono text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">
                    {branch.branchName || `Branch ${idx + 1}`}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">
                    {branch.city || lead.city || '—'}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 font-mono text-slate-700">
                    {branch.contactPhone || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {lead.notes && (
          <section className="mt-6">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#0D4F3C] mb-2">
              Additional Notes
            </h2>
            <p className="rounded-xl border border-slate-200 p-3.5 text-xs leading-relaxed text-slate-700">
              {lead.notes}
            </p>
          </section>
        )}
      </article>
    </div>
  );
}
