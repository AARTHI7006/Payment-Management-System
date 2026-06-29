import React, { useState } from 'react';
import { X, Mail, Phone, Calendar, BookOpen, Clock, Trash2, Send, CheckCircle2, AlertTriangle, HelpCircle, FileText, PlusCircle, CreditCard, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Payment } from '../types';

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onRefresh: () => void;
  onDelete: (id: string) => Promise<void>;
  onTriggerManualReminder: (id: string) => Promise<void>;
  onRecordTrainerPayment: (id: string, amount: number, notes: string) => Promise<void>;
  onVerifyPayment: (paymentId: string, status: 'Approved' | 'Rejected', reason?: string) => Promise<void>;
}

export default function StudentDetailsModal({
  isOpen,
  onClose,
  student,
  onRefresh,
  onDelete,
  onTriggerManualReminder,
  onRecordTrainerPayment,
  onVerifyPayment
}: StudentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'payments' | 'record'>('profile');
  const [trainerAmount, setTrainerAmount] = useState<number | ''>('');
  const [trainerNotes, setTrainerNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReminding, setIsReminding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerAmount || Number(trainerAmount) <= 0) {
      setError('Please provide a valid amount.');
      return;
    }
    setIsRecording(true);
    setError(null);
    try {
      await onRecordTrainerPayment(student.id, Number(trainerAmount), trainerNotes);
      setTrainerAmount('');
      setTrainerNotes('');
      setActiveTab('payments');
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment');
    } finally {
      setIsRecording(false);
    }
  };

  const handleVerify = async (paymentId: string, status: 'Approved' | 'Rejected') => {
    if (status === 'Rejected' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason so the student knows why.');
      return;
    }
    setError(null);
    try {
      await onVerifyPayment(paymentId, status, status === 'Rejected' ? rejectionReason : undefined);
      setVerifyingPaymentId(null);
      setRejectionReason('');
    } catch (err: any) {
      setError(err?.message || 'Failed to verify payment');
    }
  };

  const handleSendReminder = async () => {
    setIsReminding(true);
    setError(null);
    try {
      await onTriggerManualReminder(student.id);
      alert('Simulated reminder email dispatched successfully! You can inspect the email draft in the Outbox tab.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reminder');
    } finally {
      setIsReminding(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (confirm(`Are you absolutely sure you want to remove student "${student.name}" and all their records? This cannot be undone.`)) {
      setIsDeleting(true);
      try {
        await onDelete(student.id);
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to delete student.');
        setIsDeleting(false);
      }
    }
  };

  const getStatusBadge = (status: Student['status']) => {
    switch (status) {
      case 'Paid':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid</span>;
      case 'Partially Paid':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Partially Paid</span>;
      case 'Pending':
        return <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-semibold rounded-full flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Pending Payment</span>;
    }
  };

  const getPaymentStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'Pending Verification':
        return <HelpCircle className="w-5 h-5 text-amber-500 animate-pulse" />;
      case 'Rejected':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-[#0F0F11] rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Section */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-[#0A0A0B]">
          <div className="flex items-center gap-4">
            {student.photo.startsWith('data:image') ? (
              <img
                src={student.photo}
                alt={student.name}
                className="w-14 h-14 rounded-lg object-cover border-2 border-slate-800 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm ${student.photo || 'bg-indigo-500'}`}>
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white font-display">{student.name}</h3>
                {getStatusBadge(student.status)}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>{student.batch}</span>
                <span className="text-slate-750">•</span>
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Registered on {new Date(student.registeredDate).toLocaleDateString()}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-250 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-[#0F0F11] px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Student Profile
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Payments History
            {student.payments.some(p => p.status === 'Pending Verification') && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'record'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Record Payment
          </button>
        </div>

        {/* Modal Main Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#0A0A0B]">
          {error && (
            <div className="p-3 bg-rose-950/30 text-rose-400 rounded-xl text-xs flex items-center gap-2 border border-rose-800/30">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: Student Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Financial Dashboard Bento Card */}
              <div className="grid grid-cols-3 gap-4 bg-[#0F0F11] p-4 rounded-xl border border-slate-800 shadow-sm">
                <div className="p-3 bg-[#0A0A0B] rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Course Fee</span>
                  <p className="text-lg font-bold text-slate-200 font-mono mt-0.5">₹{student.totalValue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-emerald-950/20 rounded-xl text-center border border-emerald-900/30">
                  <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Approved Paid</span>
                  <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">₹{student.amountPaid.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-rose-950/20 rounded-xl text-center border border-rose-900/30">
                  <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Pending Dues</span>
                  <p className="text-lg font-bold text-rose-400 font-mono mt-0.5">₹{student.pendingDue.toLocaleString()}</p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-[#0F0F11] rounded-xl p-4 border border-slate-800 space-y-3.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Credentials</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Mail className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Phone className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    <span>{student.phone || 'No phone recorded'}</span>
                  </div>
                </div>
              </div>

              {/* Automatic Reminder Timeline Status */}
              <div className="bg-[#0F0F11] rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reminder Statistics</h4>
                  <span className="text-xs font-medium text-amber-500">{student.remindersCount} of 3 Reminders Sent</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className={`p-2.5 border rounded-xl text-center transition-all ${
                        student.remindersCount >= num
                          ? 'bg-amber-950/20 border-amber-800/40 text-amber-400'
                          : 'bg-[#0A0A0B] border-slate-800 text-slate-600'
                      }`}
                    >
                      <span className="block text-xs font-bold font-mono">#{num}</span>
                      <span className="text-[9px] uppercase tracking-wide block mt-0.5">
                        {student.remindersCount >= num ? 'Triggered' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>

                {student.lastReminderSentDate && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Last reminder dispatched on {new Date(student.lastReminderSentDate).toLocaleString()}</span>
                  </p>
                )}

                {student.pendingDue > 0 && (
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={handleSendReminder}
                      disabled={isReminding}
                      className="w-full py-2 px-3 bg-[#0A0A0B] hover:bg-slate-800/60 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-500" />
                      {isReminding ? 'Dispatching...' : 'Dispatch Instant Simulated Reminder'}
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-[#0F0F11] rounded-xl p-4 border border-slate-800 space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Coach/Trainer Notes</h4>
                <p className="text-sm text-slate-300 italic">
                  {student.notes || "No special notes created. You can add notes by editing the student record."}
                </p>
              </div>

              {/* Student Portal URL Copier */}
              <div className="p-3.5 bg-amber-950/10 rounded-xl border border-amber-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Student's Personal Link</span>
                  <p className="text-xs text-slate-300 mt-0.5 truncate select-all bg-[#0A0A0B] px-2 py-1.5 border border-slate-800 rounded-lg font-mono">
                    {window.location.origin}/#/student/{student.id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/#/student/${student.id}`);
                    alert('Copied student portal link to clipboard!');
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer"
                >
                  Copy Link
                </button>
              </div>

              {/* Dangerous Area */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleDeleteStudent}
                  disabled={isDeleting}
                  className="text-xs text-rose-500 hover:text-rose-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Deleting...' : 'Delete Student Profile'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Payments History & Screenshot Approval */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transaction Ledger</h4>
              {student.payments.length === 0 ? (
                <div className="bg-[#0F0F11] rounded-xl p-8 text-center border border-slate-800 space-y-2">
                  <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-500">No transactions recorded yet for this student.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {student.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-[#0F0F11] rounded-xl p-4 border border-slate-800 shadow-sm flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${
                            payment.status === 'Approved' ? 'bg-emerald-950/30 text-emerald-400' :
                            payment.status === 'Pending Verification' ? 'bg-amber-950/30 text-amber-400' : 'bg-rose-950/30 text-rose-400'
                          }`}>
                            {getPaymentStatusIcon(payment.status)}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-200 font-mono">₹{payment.amount.toLocaleString()}</span>
                            <span className="text-slate-700 mx-1.5">•</span>
                            <span className="text-xs text-slate-450">{new Date(payment.date).toLocaleString()}</span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Submitted by: <strong className="font-medium text-slate-300">{payment.submittedBy}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Screenshot Attachment Link */}
                        {payment.screenshot && (
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshot(payment.screenshot)}
                            className="text-xs text-amber-400 hover:text-amber-300 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View Screenshot
                          </button>
                        )}
                      </div>

                      {payment.notes && (
                        <p className="text-xs text-slate-300 bg-[#0A0A0B] p-2 rounded-lg border border-slate-800/80">
                          <span className="font-semibold text-slate-500">Notes:</span> {payment.notes}
                        </p>
                      )}

                      {payment.status === 'Rejected' && payment.rejectionReason && (
                        <p className="text-xs text-rose-400 bg-rose-950/20 p-2 rounded-lg border border-rose-900/30">
                          <span className="font-semibold">Rejection Reason:</span> {payment.rejectionReason}
                        </p>
                      )}

                      {/* Trainer Actions for Student Uploads (Verification) */}
                      {payment.status === 'Pending Verification' && (
                        <div className="pt-2 border-t border-slate-800 space-y-3">
                          <div className="text-xs font-semibold text-amber-450 flex items-center gap-1 bg-amber-950/20 p-2 rounded-lg">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            Action Needed: Review receipt details and verify.
                          </div>

                          {verifyingPaymentId === payment.id ? (
                            <div className="bg-[#0A0A0B] p-3 rounded-lg border border-slate-800 space-y-3">
                              <label className="block text-xs font-semibold text-slate-400">Rejection Reason (only if rejecting)</label>
                              <input
                                type="text"
                                placeholder="E.g., Screenshot is blurry or wrong transaction reference."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full p-2 text-xs border border-slate-800 rounded-lg focus:outline-hidden focus:border-amber-500 bg-[#0F0F11] text-slate-200"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setVerifyingPaymentId(null)}
                                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleVerify(payment.id, 'Rejected')}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium cursor-pointer"
                                >
                                  Reject Payment
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setVerifyingPaymentId(payment.id)}
                                className="px-3 py-1.5 border border-rose-900/40 text-rose-400 hover:bg-rose-950/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleVerify(payment.id, 'Approved')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                              >
                                Approve & Credit
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Record Direct Payment */}
          {activeTab === 'record' && (
            <form onSubmit={handleRecordPayment} className="space-y-4 bg-[#0F0F11] p-5 rounded-xl border border-slate-800">
              <h4 className="text-sm font-bold text-white font-display">Record Direct Cash/Transfer</h4>
              <p className="text-xs text-slate-400">
                Use this form to log a payment received in-person (cash) or manually verified on your bank app. These entries are automatically approved.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Amount Received (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={student.pendingDue}
                    required
                    placeholder={`Max ₹${student.pendingDue}`}
                    value={trainerAmount}
                    onChange={(e) => setTrainerAmount(e.target.value ? Math.max(0, Number(e.target.value)) : '')}
                    className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 font-mono font-medium bg-[#0A0A0B] text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Transaction Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="E.g., Received cash during morning session, IMPS reference ID 49102"
                  value={trainerNotes}
                  onChange={(e) => setTrainerNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 bg-[#0A0A0B] text-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isRecording}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {isRecording ? 'Recording...' : 'Approve & Record Payment'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Fullscreen Screenshot Lightbox */}
        <AnimatePresence>
          {selectedScreenshot && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs">
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
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
