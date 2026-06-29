import React, { useState } from 'react';
import { Search, UserPlus, Users, DollarSign, Clock, ShieldAlert, Plus, CheckCircle2, AlertTriangle, ArrowUpRight, HelpCircle, User, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import { Student, DashboardStats } from '../types';

interface TrainerDashboardProps {
  students: Student[];
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onSelectStudent: (student: Student) => void;
  onRefresh: () => void;
}

export default function TrainerDashboard({
  students,
  onAddStudent,
  onEditStudent,
  onSelectStudent,
  onRefresh
}: TrainerDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'All' | 'Paid' | 'Partially Paid' | 'Pending' | 'Defaulters'>('All');

  // Calculate statistics
  const totalStudents = students.length;
  const totalValue = students.reduce((sum, s) => sum + s.totalValue, 0);
  const totalCollected = students.reduce((sum, s) => sum + s.amountPaid, 0);
  const totalPending = students.reduce((sum, s) => sum + s.pendingDue, 0);

  const paidCount = students.filter(s => s.status === 'Paid').length;
  const partiallyPaidCount = students.filter(s => s.status === 'Partially Paid').length;
  const pendingCount = students.filter(s => s.status === 'Pending').length;
  const defaulterCount = students.filter(s => s.pendingDue > 0 && s.remindersCount >= 3).length;

  // Filter students based on active search and tab
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm) ||
      s.batch.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (filterTab) {
      case 'Paid':
        return s.status === 'Paid';
      case 'Partially Paid':
        return s.status === 'Partially Paid';
      case 'Pending':
        return s.status === 'Pending';
      case 'Defaulters':
        // Defaulters list: has outstanding dues and received at least 3 emails (or has 3 reminders sent!)
        return s.pendingDue > 0 && s.remindersCount >= 3;
      default:
        return true;
    }
  });

  const getStatusStyle = (status: Student['status']) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40';
      case 'Partially Paid':
        return 'bg-amber-950/30 text-amber-400 border-amber-800/40';
      case 'Pending':
        return 'bg-rose-950/30 text-rose-400 border-rose-800/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#0F0F11] p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Registered</span>
            <span className="text-2xl font-bold text-white">{totalStudents}</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#0F0F11] p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Collected</span>
            <span className="text-2xl font-bold text-white font-mono">₹{totalCollected.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#0F0F11] p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Outstanding Dues</span>
            <span className="text-2xl font-bold text-white font-mono">₹{totalPending.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#0F0F11] p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Defaulters (3+ Alerts)</span>
            <span className="text-2xl font-bold text-amber-400">{defaulterCount}</span>
          </div>
        </div>
      </div>

      {/* Directory Management Header */}
      <div className="bg-[#0F0F11] rounded-2xl border border-slate-800 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white font-display">Student Ledger</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage student details, track billing cycles, and review reminders</p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onAddStudent}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Register Student
            </button>
          </div>
        </div>

        {/* Search and Filters Layout */}
        <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between pt-2 border-t border-slate-800">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 bg-[#0A0A0B] text-slate-200"
            />
          </div>

          {/* Tab Selector Filters */}
          <div className="flex flex-wrap gap-1.5 bg-[#0A0A0B] p-1 rounded-xl border border-slate-800 self-start lg:self-auto">
            {(['All', 'Paid', 'Partially Paid', 'Pending', 'Defaulters'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  filterTab === tab
                    ? 'bg-amber-500 text-black shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
                {tab === 'Defaulters' && defaulterCount > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                    filterTab === 'Defaulters' ? 'bg-black text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {defaulterCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Students Table/List */}
        <div className="overflow-x-auto pt-2">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2 max-w-sm mx-auto">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800">No students found</h4>
              <p className="text-xs">
                No matching records found for "{searchTerm}" on tab "{filterTab}". Try adjusting your filters.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Batch Allocation</th>
                  <th className="py-3 px-4">Total Fee</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Remaining Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Alerts Sent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-sm">
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-800/20 transition-colors group cursor-pointer ${
                      s.pendingDue > 0 && s.remindersCount >= 3 ? 'bg-amber-500/5 border-l-2 border-amber-500' : ''
                    }`}
                    onClick={() => onSelectStudent(s)}
                  >
                    {/* Student Identity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {s.photo.startsWith('data:image') ? (
                          <img
                            src={s.photo}
                            alt={s.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-800"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${s.photo || 'bg-slate-700'}`}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-slate-100 block group-hover:text-amber-400 transition-colors">{s.name}</span>
                          <span className="text-xs text-slate-500 block font-mono">{s.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate">
                      {s.batch}
                    </td>

                    {/* Pricing */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                      ₹{s.totalValue.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                      ₹{s.amountPaid.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-rose-400">
                      ₹{s.pendingDue.toLocaleString()}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(s.status)}`}>
                        {s.status}
                      </span>
                    </td>

                    {/* Reminders Bubble */}
                    <td className="py-3.5 px-4">
                      {s.pendingDue > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${
                            s.remindersCount === 0 ? 'bg-slate-700' :
                            s.remindersCount === 1 ? 'bg-amber-500' :
                            s.remindersCount === 2 ? 'bg-orange-500 animate-pulse' :
                            'bg-rose-500 animate-pulse'
                          }`} />
                          <span className="text-xs font-semibold text-slate-400 font-mono">{s.remindersCount}/3 Notice</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>

                    {/* Details Arrow */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEditStudent(s)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onSelectStudent(s)}
                          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          Details
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
