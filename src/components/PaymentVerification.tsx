import React, { useState } from 'react';
import { Check, X, FileText, Calendar, User, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { Student, Payment } from '../types';

interface PaymentVerificationProps {
  students: Student[];
  onVerify: (studentId: string, paymentId: string, status: 'Approved' | 'Rejected', reason?: string) => Promise<void>;
  onRefresh: () => void;
}

export default function PaymentVerification({ students, onVerify, onRefresh }: PaymentVerificationProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionTargetId, setRejectionTargetId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Extract all pending verification payments from the student list
  const pendingPayments = students.flatMap((student) =>
    student.payments
      .filter((p) => p.status === 'Pending Verification')
      .map((p) => ({
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        studentBatch: student.batch,
        studentPending: student.pendingDue,
        payment: p,
      }))
  );

  const handleAction = async (studentId: string, paymentId: string, status: 'Approved' | 'Rejected') => {
    if (status === 'Rejected' && !rejectionReason.trim()) {
      alert('Please state a reason for rejecting the payment reference.');
      return;
    }
    setIsVerifying(true);
    try {
      await onVerify(studentId, paymentId, status, status === 'Rejected' ? rejectionReason : undefined);
      setRejectionTargetId(null);
      setRejectionReason('');
    } catch (error) {
      console.error(error);
      alert('Failed to update verification status.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Receipt Review Center</h2>
          <p className="text-xs text-slate-400 mt-0.5">Validate student uploaded payment screenshots and credit their balances</p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl border border-slate-800 text-slate-300 bg-transparent hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {pendingPayments.length === 0 ? (
        <div className="bg-[#0F0F11] rounded-2xl p-12 text-center border border-slate-800 max-w-xl mx-auto space-y-3.5 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-950/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-display">All caught up!</h4>
            <p className="text-xs text-slate-400 mt-0.5">There are no student payment screenshots awaiting verification.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {pendingPayments.map(({ studentId, studentName, studentBatch, studentPending, payment }) => (
            <div
              key={payment.id}
              className="bg-[#0F0F11] rounded-2xl border border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                {/* Student header details */}
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-1 text-base">
                      <User className="w-4 h-4 text-amber-500 shrink-0" />
                      {studentName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{studentBatch}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block font-medium">Student Pending</span>
                    <span className="text-sm font-bold text-slate-200 font-mono">₹{studentPending.toLocaleString()}</span>
                  </div>
                </div>

                {/* Uploaded Payment Info */}
                <div className="p-3.5 bg-[#0A0A0B] rounded-xl border border-slate-800/60 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Uploaded Amount</span>
                    <span className="text-base font-bold text-amber-400 font-mono">₹{payment.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Upload Date</span>
                    <span className="text-xs text-slate-300 block mt-0.5 font-medium">{new Date(payment.date).toLocaleDateString()}</span>
                  </div>
                </div>

                {payment.notes && (
                  <p className="text-xs text-slate-300 italic bg-amber-950/20 p-2.5 border border-amber-800/20 rounded-xl">
                    <span className="font-semibold text-amber-400 block not-italic text-[10px] uppercase tracking-wider mb-0.5">Student Notes</span>
                    "{payment.notes}"
                  </p>
                )}

                {/* Screenshot Preview */}
                {payment.screenshot && (
                  <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-[#0A0A0B] h-32 flex items-center justify-center">
                    <img
                      src={payment.screenshot}
                      alt="Uploaded Screenshot preview"
                      className="h-full w-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedScreenshot(payment.screenshot)}
                        className="bg-white hover:bg-slate-200 text-black text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview Receipt
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-5 py-4 bg-[#0A0A0B] border-t border-slate-800 flex flex-col gap-3">
                {rejectionTargetId === payment.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rejection Reason</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Transaction ID missing, wrong image uploaded."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full p-2 text-xs border border-slate-800 rounded-lg focus:outline-hidden focus:border-amber-500 bg-[#0A0A0B] text-slate-200"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setRejectionTargetId(null)}
                        className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAction(studentId, payment.id, 'Rejected')}
                        disabled={isVerifying}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Reject Screenshot
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5 justify-end">
                    <button
                      onClick={() => setRejectionTargetId(payment.id)}
                      className="px-3.5 py-2 border border-rose-800/40 text-rose-400 hover:bg-rose-950/20 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      Reject Payment
                    </button>
                    <button
                      onClick={() => handleAction(studentId, payment.id, 'Approved')}
                      disabled={isVerifying}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Approve & Credit Balance
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Screenshot Lightbox */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs">
          <div className="relative max-w-xl w-full">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-slate-200 bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="bg-[#0F0F11] p-2 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex justify-center items-center">
              <img
                src={selectedScreenshot}
                alt="Receipt Receipt"
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-center text-slate-500 text-xs mt-3">Uploaded Receipt Screenshot</p>
          </div>
        </div>
      )}
    </div>
  );
}
