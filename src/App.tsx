import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Mail, ShieldAlert, CheckSquare, Plus, RefreshCw, BookOpen, AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { Student, EmailLog } from './types';
import TrainerDashboard from './components/TrainerDashboard';
import StudentPortal from './components/StudentPortal';
import AddStudentModal from './components/AddStudentModal';
import StudentDetailsModal from './components/StudentDetailsModal';
import PaymentVerification from './components/PaymentVerification';
import EmailSimulation from './components/EmailSimulation';

// Custom hash router hook
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const path = hash.replace(/^#/, '');
  
  if (path.startsWith('/student/')) {
    const studentId = path.split('/student/')[1];
    return { route: 'student' as const, params: { studentId } };
  }

  return { route: 'trainer' as const, params: {} };
}

export default function App() {
  const { route, params } = useHashRoute();
  
  // Trainer states
  const [students, setStudents] = useState<Student[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [systemTime, setSystemTime] = useState({
    offsetDays: 0,
    simulatedTime: new Date().toISOString(),
    realTime: new Date().toISOString()
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'verification' | 'email-simulation'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all trainer-side data
  const fetchTrainerData = async () => {
    try {
      const [resStudents, resLogs, resTime] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/email-logs'),
        fetch('/api/system/time')
      ]);

      if (!resStudents.ok || !resLogs.ok || !resTime.ok) {
        throw new Error('Failed to synchronize dashboard state.');
      }

      const dataStudents = await resStudents.json();
      const dataLogs = await resLogs.json();
      const dataTime = await resTime.json();

      setStudents(dataStudents);
      setEmailLogs(dataLogs);
      setSystemTime(dataTime);

      // Keep selected student synced in real-time
      if (selectedStudent) {
        const updated = dataStudents.find((s: Student) => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      }
    } catch (err: any) {
      setError(err?.message || 'Error syncing data from fullstack database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (route === 'trainer') {
      fetchTrainerData();
    }
  }, [route]);

  // Save student (New or Edit)
  const handleSaveStudent = async (studentData: any) => {
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });

      if (!res.ok) throw new Error('Database write failure.');

      await fetchTrainerData();
      setIsAddModalOpen(false);
      setEditingStudent(null);
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to persist student record.');
    }
  };

  // Delete student record
  const handleDeleteStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Database write failure.');
      await fetchTrainerData();
      setSelectedStudent(null);
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to remove student record.');
    }
  };

  // Trigger manual reminder email simulation
  const handleTriggerManualReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${id}/remind-manual`, { method: 'POST' });
      if (!res.ok) throw new Error('Simulation dispatch failure.');
      await fetchTrainerData();
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to dispatch manual reminder.');
    }
  };

  // Record payment directly from Trainer
  const handleRecordTrainerPayment = async (id: string, amount: number, notes: string) => {
    try {
      const res = await fetch(`/api/students/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          notes,
          submittedBy: 'Trainer'
        })
      });

      if (!res.ok) throw new Error('Failed to record direct payment.');
      await fetchTrainerData();
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to submit direct payment record.');
    }
  };

  // Verify student-uploaded receipt screenshot (Approve / Reject)
  const handleVerifyPayment = async (paymentId: string, status: 'Approved' | 'Rejected', reason?: string) => {
    if (!selectedStudent) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          status,
          rejectionReason: reason
        })
      });

      if (!res.ok) throw new Error('Failed to verify payment reference.');
      await fetchTrainerData();
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to complete transaction audit.');
    }
  };

  // Separate endpoint for global list verification
  const handleVerifyPaymentFromList = async (studentId: string, paymentId: string, status: 'Approved' | 'Rejected', reason?: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          status,
          rejectionReason: reason
        })
      });

      if (!res.ok) throw new Error('Failed to verify payment reference.');
      await fetchTrainerData();
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to complete transaction audit.');
    }
  };

  // Advance Simulation Time Machine
  const handleAdvanceTime = async (days: number) => {
    try {
      const res = await fetch('/api/system/advance-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      });

      if (!res.ok) throw new Error('Time travel system failure.');
      await fetchTrainerData();
    } catch (err: any) {
      throw new Error(err?.message || 'Time Machine failure.');
    }
  };

  // Reset simulation time offset
  const handleResetTime = async () => {
    try {
      const res = await fetch('/api/system/reset-time', { method: 'POST' });
      if (!res.ok) throw new Error('Time system reset failure.');
      await fetchTrainerData();
    } catch (err: any) {
      throw new Error(err?.message || 'Time reset failure.');
    }
  };

  // Render Student Portal Page
  if (route === 'student') {
    return <StudentPortal studentId={params.studentId} />;
  }

  // Render Trainer Administration View
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 flex flex-col font-sans">
      
      {/* Top Professional Navigation Brand Bar */}
      <header className="sticky top-0 z-40 bg-[#0F0F11] border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-500 text-black p-2 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-display tracking-wide uppercase">Trainer Billing & Student Hub</h1>
            <p className="text-[10px] text-slate-500 font-mono">Administration Console</p>
          </div>
        </div>

        {/* Global Stats Overviews */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Fully Paid: {students.filter(s => s.status === 'Paid').length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Dues Pending: {students.filter(s => s.status !== 'Paid').length}</span>
          </div>
        </div>
      </header>

      {/* Main Core Layout */}
      <div className="max-w-7xl w-full mx-auto p-4 md:p-6 flex-1 flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex border border-slate-800 bg-[#0F0F11] p-1 rounded-2xl shadow-xs max-w-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Directory
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
              activeTab === 'verification'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Review Receipts
            {students.flatMap(s => s.payments).some(p => p.status === 'Pending Verification') && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black px-2 py-0.5 rounded-full text-[9px] font-bold border-2 border-[#0F0F11] shadow-xs animate-bounce">
                {students.flatMap(s => s.payments).filter(p => p.status === 'Pending Verification').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('email-simulation')}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'email-simulation'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            Mail Sandbox
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-24">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Synchronizing system database records...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-[#0F0F11] rounded-2xl p-6 border border-slate-800 shadow-xs flex items-center gap-4 max-w-md mx-auto">
            <AlertCircle className="w-10 h-10 text-rose-500 shrink-0" />
            <div>
              <h3 className="font-bold text-white">Connection Interrupted</h3>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            {/* View switcher */}
            {activeTab === 'dashboard' && (
              <TrainerDashboard
                students={students}
                onAddStudent={() => {
                  setEditingStudent(null);
                  setIsAddModalOpen(true);
                }}
                onEditStudent={(s) => {
                  setEditingStudent(s);
                  setIsAddModalOpen(true);
                }}
                onSelectStudent={(s) => setSelectedStudent(s)}
                onRefresh={fetchTrainerData}
              />
            )}

            {activeTab === 'verification' && (
              <PaymentVerification
                students={students}
                onVerify={handleVerifyPaymentFromList}
                onRefresh={fetchTrainerData}
              />
            )}

            {activeTab === 'email-simulation' && (
              <EmailSimulation
                emailLogs={emailLogs}
                systemTime={systemTime}
                onAdvanceTime={handleAdvanceTime}
                onResetTime={handleResetTime}
              />
            )}
          </div>
        )}
      </div>

      {/* Slide-overs & Modals */}
      <AnimatePresence>
        {isAddModalOpen && (
          <AddStudentModal
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingStudent(null);
            }}
            onSave={handleSaveStudent}
            student={editingStudent}
          />
        )}

        {selectedStudent && (
          <StudentDetailsModal
            isOpen={!!selectedStudent}
            onClose={() => setSelectedStudent(null)}
            student={selectedStudent}
            onRefresh={fetchTrainerData}
            onDelete={handleDeleteStudent}
            onTriggerManualReminder={handleTriggerManualReminder}
            onRecordTrainerPayment={handleRecordTrainerPayment}
            onVerifyPayment={handleVerifyPayment}
          />
        )}
      </AnimatePresence>

      {/* Floating Demo Alert explaining how to test Student links */}
      {activeTab === 'dashboard' && students.length > 0 && (
        <div className="bg-[#0F0F11] border-t border-slate-800 px-6 py-3 text-center text-xs text-slate-400 flex flex-wrap items-center justify-center gap-2 mt-auto">
          <span className="font-bold text-amber-500">💡 Interactive Demo Guide:</span>
          <span>Click any student's <strong className="font-semibold text-slate-200">"Details"</strong> button, then click <strong className="font-semibold text-slate-200">"Copy Link"</strong> or open the URL in a private browser window to experience the student payment receipt upload page firsthand!</span>
        </div>
      )}
    </div>
  );
}
