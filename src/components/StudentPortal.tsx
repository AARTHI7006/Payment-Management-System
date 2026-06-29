import React, { useState, useEffect } from 'react';
import { Camera, CreditCard, User, Mail, Phone, Calendar, BookOpen, AlertTriangle, CheckCircle2, Upload, FileText, ChevronRight, ArrowLeft, X } from 'lucide-react';
import { Student, Payment } from '../types';

interface StudentPortalProps {
  studentId: string;
}

export default function StudentPortal({ studentId }: StudentPortalProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch student details
  const fetchStudent = async () => {
    try {
      const res = await fetch(`/api/students/${studentId}`);
      if (!res.ok) throw new Error('Failed to load student portal details.');
      const data = await res.json();
      setStudent(data);
      // Pre-fill amount field with pending due
      if (data.pendingDue > 0) {
        setAmount(data.pendingDue);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch your portal information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, or JPEG) representing your screenshot receipt.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Screenshot file must be smaller than 10MB.');
      return;
    }

    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (student && Number(amount) > student.pendingDue) {
      setError(`Your entered amount exceeds your current pending due of ₹${student.pendingDue.toLocaleString()}`);
      return;
    }
    if (!screenshot) {
      setError('Please upload your payment confirmation screenshot receipt.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/students/${studentId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          screenshot,
          notes: notes.trim(),
          submittedBy: 'Student'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit payment screenshot.');
      }

      setSuccess(true);
      setScreenshot('');
      setScreenshotName('');
      setNotes('');
      await fetchStudent();
    } catch (err: any) {
      setError(err?.message || 'Error uploading receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Retrieving your payment portal details...</p>
        </div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-red-100 shadow-sm text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">Access Error</h3>
          <p className="text-sm text-slate-500">{error}</p>
          <p className="text-xs text-slate-400">Please double check the payment portal URL shared by your trainer.</p>
        </div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 pb-12 font-sans">
      {/* Visual Header */}
      <div className="bg-[#0F0F11] border-b border-slate-800 py-12 px-6">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            {student.photo.startsWith('data:image') ? (
              <img
                src={student.photo}
                alt={student.name}
                className="w-16 h-16 rounded-lg object-cover border-2 border-amber-500/30 shadow-md"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md ${student.photo || 'bg-slate-700'}`}>
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-white">{student.name}</h1>
              <p className="text-slate-400 text-sm mt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md font-medium">{student.batch}</span>
                <span>•</span>
                <span>Enrolled {new Date(student.registeredDate).toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          <div className="text-center md:text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Payment Portal Status</span>
            {student.pendingDue === 0 ? (
              <span className="inline-flex items-center gap-1 mt-1 bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 px-3 py-1 rounded-full text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Fully Paid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 mt-1 bg-amber-950/40 text-amber-400 border border-amber-800/30 px-3 py-1 rounded-full text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" /> Pending Due
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="max-w-3xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Financials & Upload Form */}
        <div className="md:col-span-8 space-y-6">
          {/* Bento Financial Grid */}
          <div className="grid grid-cols-3 gap-3.5 bg-[#0F0F11] p-4 rounded-2xl border border-slate-800 shadow-sm">
            <div className="bg-[#0A0A0B] p-3 rounded-xl text-center">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Fee Amount</span>
              <p className="text-base font-bold text-slate-200 mt-0.5 font-mono">₹{student.totalValue.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-850/40 p-3 rounded-xl text-center">
              <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Credited</span>
              <p className="text-base font-bold text-emerald-400 mt-0.5 font-mono">₹{student.amountPaid.toLocaleString()}</p>
            </div>
            <div className="bg-rose-950/20 border border-rose-850/40 p-3 rounded-xl text-center">
              <span className="text-[9px] uppercase font-bold text-rose-400 tracking-wider">Pending Due</span>
              <p className="text-base font-bold text-rose-400 mt-0.5 font-mono">₹{student.pendingDue.toLocaleString()}</p>
            </div>
          </div>

          {/* Success Callout */}
          {success && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                Receipt Screenshot Uploaded Successfully!
              </div>
              <p className="text-xs text-emerald-400/80 leading-relaxed">
                Your payment screenshot has been sent directly to your trainer for verification. Once reviewed, your credited balance will automatically reflect here.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="text-xs font-bold text-amber-400 hover:underline pt-1 block cursor-pointer"
              >
                Upload another payment screenshot
              </button>
            </div>
          )}

          {/* Upload Screenshot Form */}
          {student.pendingDue > 0 && !success && (
            <form onSubmit={handleSubmit} className="bg-[#0F0F11] p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-white text-base font-display">Upload Payment Screenshot</h3>
                <p className="text-xs text-slate-400 mt-0.5">Please transfer the dues via UPI/Bank App, take a screenshot, and upload it here.</p>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/30 border border-rose-800/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount Transferred (₹) <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-500">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      max={student.pendingDue}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value ? Math.max(0, Number(e.target.value)) : '')}
                      className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 font-mono font-semibold bg-[#0A0A0B] text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Transaction Notes / Ref (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g., GPay reference ID or UPI ID"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 bg-[#0A0A0B] text-slate-200"
                  />
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Screenshot <span className="text-rose-500">*</span></label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    dragActive ? 'border-amber-500 bg-amber-500/5' : 'border-slate-800 hover:border-slate-700 bg-[#0A0A0B]'
                  }`}
                >
                  {screenshot ? (
                    <div className="space-y-3 w-full">
                      <div className="relative h-32 max-w-xs mx-auto rounded-xl border border-slate-800 bg-[#0F0F11] p-1 overflow-hidden flex items-center justify-center">
                        <img
                          src={screenshot}
                          alt="Screenshot preview"
                          className="h-full w-auto object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshot('');
                            setScreenshotName('');
                          }}
                          className="absolute top-1 right-1 bg-slate-900/60 hover:bg-slate-950 text-white p-1 rounded-full transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 font-medium truncate max-w-xs mx-auto">{screenshotName}</p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-[#0F0F11] border border-slate-850 rounded-2xl text-amber-500 shadow-sm">
                        <Upload className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-300">Drag & drop your payment screenshot here, or <span className="text-amber-400 hover:underline">browse</span></p>
                        <p className="text-[10px] text-slate-500 mt-1">Accepts PNG, JPG, or JPEG up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={handleFileSelect}
                        className="hidden"
                        id="screenshot-uploader"
                      />
                      <label htmlFor="screenshot-uploader" className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                    </>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  {submitting ? 'Submitting Receipt...' : 'Submit Verification Request'}
                </button>
              </div>
            </form>
          )}

          {student.pendingDue === 0 && (
            <div className="bg-emerald-950/20 border border-emerald-800/40 p-8 rounded-2xl text-center space-y-4 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div>
                <h3 className="font-bold text-emerald-300 text-lg font-display">No Dues Outstanding</h3>
                <p className="text-xs text-emerald-400/80 max-w-sm mx-auto mt-1">
                  You have successfully cleared your training dues of ₹{student.totalValue.toLocaleString()}. Thank you! Let's hit the training goals.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Past Transactions & Contact Trainer */}
        <div className="md:col-span-4 space-y-5">
          {/* Transaction Log */}
          <div className="bg-[#0F0F11] p-4.5 rounded-2xl border border-slate-800 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Payment Log</h4>
            
            {student.payments.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No transactions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {student.payments.map((p) => (
                  <div key={p.id} className="text-xs p-3 border border-slate-800/60 bg-[#0A0A0B] rounded-xl flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 font-mono">₹{p.amount.toLocaleString()}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                        p.status === 'Approved' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/20' :
                        p.status === 'Pending Verification' ? 'bg-amber-950/30 text-amber-400 border-amber-800/20 animate-pulse' :
                        'bg-rose-950/30 text-rose-400 border-rose-800/20'
                      }`}>
                        {p.status === 'Pending Verification' ? 'Pending Approval' : p.status}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span>{new Date(p.date).toLocaleDateString()}</span>
                      <span>By {p.submittedBy}</span>
                    </div>

                    {p.status === 'Rejected' && p.rejectionReason && (
                      <div className="text-[10px] text-rose-400 bg-rose-950/20 p-1.5 rounded-md mt-1 border border-rose-800/20">
                        <strong>Reason:</strong> {p.rejectionReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Need Help / Contact Trainer */}
          <div className="bg-[#0F0F11] text-slate-200 p-4.5 rounded-2xl border border-slate-800 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Trainer Contacts</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you have any questions, payment errors, or want to reschedule, please contact your instructor directly:
            </p>
            
            <div className="pt-2.5 text-xs space-y-2 font-medium">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-amber-500" />
                <span>support@trainerportal.com</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <Phone className="w-4 h-4 text-amber-500" />
                <span>+91 99000 88000</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
