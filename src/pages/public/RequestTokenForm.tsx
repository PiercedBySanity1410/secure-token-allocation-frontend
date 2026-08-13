import React, { useState } from 'react';
import { Allocation, RequestItem, FormField, CachedToken } from '../../types';
import { submitTokenRequest } from '../../api/client';
import { saveTokenToIndexedDB } from '../../db/indexedDB';
import { ArrowLeft, ArrowRight, ShieldCheck, Ticket, User, Phone, Mail, Hash, AlertCircle, Lock } from 'lucide-react';

interface RequestTokenFormProps {
  allocation: Allocation;
  cachedToken: CachedToken | null;
  onBack: () => void;
  onRequestSubmitted: (request: RequestItem) => void;
  onViewMyToken: () => void;
}

export const RequestTokenForm: React.FC<RequestTokenFormProps> = ({
  allocation,
  cachedToken,
  onBack,
  onRequestSubmitted,
  onViewMyToken,
}) => {
  const hasActiveTicket = cachedToken && (cachedToken.status === 'PENDING' || cachedToken.status === 'ACCEPTED');
  const fields: FormField[] = allocation.form_fields && allocation.form_fields.length > 0
    ? allocation.form_fields
    : [
        { id: 'f1', allocation_id: allocation.id, field_key: 'name', label: 'Your Full Name', field_type: 'text', required: true, display_order: 1 },
        { id: 'f2', allocation_id: allocation.id, field_key: 'phone', label: 'Phone Number', field_type: 'phone', required: false, display_order: 2 },
        { id: 'f3', allocation_id: allocation.id, field_key: 'notes', label: 'Notes / Party Size', field_type: 'text', required: false, display_order: 3 },
      ];

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateField = (field: FormField, val: any): string | null => {
    const strVal = String(val || '').trim();
    if (field.required && !strVal) {
      return `${field.label} is required.`;
    }
    if (!strVal) return null;

    const keyLower = field.field_key.toLowerCase();
    const labelLower = field.label.toLowerCase();

    // Name Validation
    if (keyLower.includes('name') || labelLower.includes('name')) {
      if (strVal.length < 2) return 'Name must be at least 2 characters.';
      if (!/^[a-zA-Z\s'.-]+$/.test(strVal)) return 'Name should only contain letters and spaces.';
    }

    // Phone Validation
    if (field.field_type === 'phone' || keyLower.includes('phone') || labelLower.includes('phone')) {
      const cleanPhone = strVal.replace(/\D/g, '');
      if (cleanPhone.length !== 10) return 'Phone number must be exactly 10 digits.';
    }

    // Email Validation
    if (field.field_type === 'email' || keyLower.includes('email') || labelLower.includes('email')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) return 'Please enter a valid email address.';
    }

    // Number Validation
    if (field.field_type === 'number') {
      if (isNaN(Number(strVal)) || Number(strVal) <= 0) return 'Please enter a valid positive number.';
    }

    return null;
  };

  const handleChange = (field: FormField, val: any) => {
    setFormData((prev) => ({ ...prev, [field.field_key]: val }));
    const err = validateField(field, val);
    setFieldErrors((prev) => ({ ...prev, [field.field_key]: err || '' }));
  };

  const saveAndSubmit = async (req: RequestItem) => {
    const tokenCache: CachedToken = {
      requestId: req.id,
      allocationId: req.allocation_id,
      allocationName: req.allocation_name,
      tokenNumber: req.assigned_token,
      date: req.date,
      status: req.status,
      submittedAt: req.submitted_at,
      syncTimestamp: Date.now(),
    };
    await saveTokenToIndexedDB(tokenCache).catch(() => null);
    onRequestSubmitted(req);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validate all fields
    let hasErr = false;
    const errorsObj: Record<string, string> = {};

    fields.forEach((f) => {
      const err = validateField(f, formData[f.field_key]);
      if (err) {
        hasErr = true;
        errorsObj[f.field_key] = err;
      }
    });

    if (hasErr) {
      setFieldErrors(errorsObj);
      setError('Please resolve all validation errors before submitting.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const request = await submitTokenRequest(allocation.id, formData);
      await saveAndSubmit(request);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit token request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'phone':
        return <Phone className="w-4 h-4 text-cyan-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-cyan-400" />;
      case 'number':
        return <Hash className="w-4 h-4 text-cyan-400" />;
      default:
        return <User className="w-4 h-4 text-cyan-400" />;
    }
  };

  if (allocation.status === 'COMPLETED') {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-indigo-400 bg-[#1a1a1a] hover:bg-[#222222] px-3.5 py-2 rounded-xl border border-[#2e2e2e] transition-all shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Allocations</span>
        </button>

        <div className="card max-w-xl mx-auto border border-[#2e2e2e] bg-[#1a1a1a] p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-[#222222] border border-[#333333] rounded-full flex items-center justify-center mx-auto text-indigo-400">
            <Ticket className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black text-white">{allocation.name}</h2>
          <span className="inline-block bg-[#222222] text-gray-200 border border-[#333333] text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
            Session Completed
          </span>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            This token session has been completed by administration. New token requests are no longer being accepted for this session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-indigo-400 bg-[#1a1a1a] hover:bg-[#222222] px-3.5 py-2 rounded-xl border border-[#2e2e2e] transition-all shadow-2xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Allocations</span>
      </button>

      {/* Main Request Form Card */}
      {hasActiveTicket ? (
        <div className="card border-2 border-amber-800/80 bg-amber-950/40 shadow-xl text-center py-10 px-6 space-y-4 text-slate-200">
          <div className="w-16 h-16 bg-amber-950 text-amber-400 rounded-full flex items-center justify-center mx-auto border-2 border-amber-800">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-1">Active Ticket Lock Enabled</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              You already have an active token ticket (<strong>#{cachedToken?.tokenNumber || 'Active'}</strong>) for <strong>{cachedToken?.allocationName}</strong>. Multiple submissions per session are restricted to prevent queue abuse.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onViewMyToken}
              className="btn-primary text-xs py-3 px-6 shadow-md"
            >
              <Ticket className="w-4 h-4" />
              <span>View My Active Ticket</span>
            </button>
            <button
              onClick={onBack}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700"
            >
              Back to Sessions
            </button>
          </div>
        </div>
      ) : (
        <div className="card border-2 border-slate-700 bg-slate-800/90 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white shadow-md">
              <Ticket className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white mb-1">{allocation.name}</h2>
            <p className="text-xs text-slate-400">
              Fill out the details below to request your digital queue token.
            </p>
          </div>

        {error && (
          <div className="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.id || field.field_key}>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                {field.label} {field.required && <span className="text-cyan-400">*</span>}
              </label>

              {field.field_type === 'select' && field.options ? (
                <select
                  className={`input cursor-pointer ${fieldErrors[field.field_key] ? 'border-red-500 bg-red-950/50' : ''}`}
                  required={field.required}
                  value={formData[field.field_key] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                >
                  <option value="">-- Select Option --</option>
                  {field.options.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.field_type === 'textarea' ? (
                <textarea
                  className={`input resize-none ${fieldErrors[field.field_key] ? 'border-red-500 bg-red-950/50' : ''}`}
                  rows={3}
                  required={field.required}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  value={formData[field.field_key] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                />
              ) : (
                <div className="input-icon-group">
                  <div className="icon-box">
                    {getFieldIcon(field.field_type)}
                  </div>
                  <input
                    type={field.field_type === 'phone' ? 'tel' : field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : 'text'}
                    required={field.required}
                    className={fieldErrors[field.field_key] ? 'border-red-500 bg-red-950/50' : ''}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={formData[field.field_key] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                  />
                </div>
              )}

              {fieldErrors[field.field_key] && (
                <p className="text-[11px] font-bold text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{fieldErrors[field.field_key]}</span>
                </p>
              )}
            </div>
          ))}

          {/* Privacy Box */}
          <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <span>Your information is protected and used strictly for queue verification.</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full text-base py-3.5 mt-2"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Token...</span>
              </div>
            ) : (
              <>
                <span>Get Queue Token Now</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
      )}
    </div>
  );
};
