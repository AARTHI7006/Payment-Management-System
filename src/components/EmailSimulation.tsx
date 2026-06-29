import React, { useState } from 'react';
import { Mail, Clock, ShieldAlert, FastForward, CheckCircle2, RotateCcw, AlertTriangle, ChevronDown, User, AlertCircle } from 'lucide-react';
import { EmailLog } from '../types';

interface EmailSimulationProps {
  emailLogs: EmailLog[];
  systemTime: {
    offsetDays: number;
    simulatedTime: string;
    realTime: string;
  };
  onAdvanceTime: (days: number) => Promise<void>;
  onResetTime: () => Promise<void>;
}

export default function EmailSimulation({ emailLogs, systemTime, onAdvanceTime, onResetTime }: EmailSimulationProps) {
  const [advancing, setAdvancing] = useState<number | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  const handleAdvance = async (days: number) => {
    setAdvancing(days);
    try {
      await onAdvanceTime(days);
    } catch (e) {
      console.error(e);
    } finally {
      setAdvancing(null);
    }
  };

  const handleReset = async () => {
    try {
      await onResetTime();
    } catch (e) {
      console.error(e);
    }
  };

  const getEmailTypeBadge = (type: EmailLog['type']) => {
    switch (type) {
      case 'Registration':
        return <span className="px-2.5 py-1 bg-indigo-950/30 text-indigo-400 border border-indigo-900/40 rounded-lg font-semibold text-[10px]">Welcome Confirmed</span>;
      case '1st Reminder':
        return <span className="px-2.5 py-1 bg-amber-950/30 text-amber-400 border border-amber-900/40 rounded-lg font-semibold text-[10px]">1st Due Notice</span>;
      case '2nd Reminder':
        return <span className="px-2.5 py-1 bg-orange-950/30 text-orange-400 border border-orange-900/40 rounded-lg font-semibold text-[10px]">2nd Due Notice</span>;
      case '3rd Reminder':
        return <span className="px-2.5 py-1 bg-rose-950/30 text-rose-400 border border-rose-900/40 rounded-lg font-semibold text-[10px]">3rd Final Notice</span>;
      case 'Receipt':
        return <span className="px-2.5 py-1 bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 rounded-lg font-semibold text-[10px]">Receipt Approved</span>;
      case 'Reminder Manual':
        return <span className="px-2.5 py-1 bg-purple-950/30 text-purple-400 border border-purple-900/40 rounded-lg font-semibold text-[10px]">Manual Notice</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Time Machine Panel */}
      <div className="bg-[#0F0F11] text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-500">
              <FastForward className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold font-display tracking-wide text-white">System Clock & Time Machine</h2>
            </div>
            <p className="text-xs text-slate-400">
              Test automated payment cycles by jumping time forward. Students with pending balances get automatic notices at 10, 20, and 30-day thresholds.
            </p>
          </div>

          {/* Time State Indicators */}
          <div className="md:col-span-4 bg-[#0A0A0B] p-3.5 rounded-xl border border-slate-800/80 space-y-2 font-mono">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Time Travel:</span>
              <span className="text-amber-500 font-bold">+{systemTime.offsetDays} Days</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-800/60">
              <span className="text-slate-500">Simulated Date:</span>
              <span className="text-slate-300 font-semibold">{new Date(systemTime.simulatedTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="md:col-span-3 flex flex-col gap-2.5">
            <button
              onClick={() => handleAdvance(10)}
              disabled={advancing !== null}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-600/50 text-black font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {advancing === 10 ? 'Fast-Forwarding...' : 'Advance +10 Days'}
            </button>
            <button
              onClick={handleReset}
              className="w-full py-2 bg-transparent border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Live Time
            </button>
          </div>
        </div>
      </div>

      {/* Main Mail & Outbox Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Outbox List (Left) */}
        <div className="lg:col-span-5 bg-[#0F0F11] border border-slate-800 rounded-2xl shadow-sm flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-white font-display text-sm flex items-center gap-1.5">
              <Mail className="w-4.5 h-4.5 text-slate-400" />
              Outgoing Outbox Email Logs
            </h3>
            <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              {emailLogs.length} Sent
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
            {emailLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2 mt-12">
                <Mail className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-xs">No simulated emails have been dispatched yet.</p>
                <p className="text-[10px] text-slate-650">Add a student or jump time forward +10 Days to trigger alerts.</p>
              </div>
            ) : (
              emailLogs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedEmail(log)}
                  className={`w-full text-left p-3.5 hover:bg-slate-800/60 transition-all flex flex-col gap-1.5 relative ${
                    selectedEmail?.id === log.id ? 'bg-slate-800/40 hover:bg-slate-800/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {log.studentName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(log.sentDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-xs font-medium text-white truncate">{log.subject}</div>

                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">{log.recipientEmail}</span>
                    {getEmailTypeBadge(log.type)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Email Previewer Client Window (Right) */}
        <div className="lg:col-span-7 bg-[#0F0F11] border border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
          {selectedEmail ? (
            <div className="flex flex-col h-full">
              {/* Email Envelope Header */}
              <div className="p-5 border-b border-slate-800 bg-[#0A0A0B] space-y-3 shrink-0">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-white">{selectedEmail.subject}</h4>
                  {getEmailTypeBadge(selectedEmail.type)}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 w-12">From:</span>
                    <span className="font-semibold text-slate-300">Training Portal Admin &lt;billing@trainerportal.com&gt;</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 w-12">To:</span>
                    <span className="font-semibold text-slate-300">{selectedEmail.studentName} &lt;{selectedEmail.recipientEmail}&gt;</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 w-12">Sent:</span>
                    <span className="font-mono text-slate-400">{new Date(selectedEmail.sentDate).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Email Body Preview */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0B]">
                <div className="bg-[#0F0F11] rounded-xl border border-slate-800 p-6 shadow-sm max-w-lg mx-auto space-y-4 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {/* Visual Email Brand Banner */}
                  <div className="border-b border-slate-800 pb-3 text-center">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-amber-500 block font-display">TRAINER PORTAL HUB</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">Automated Dispatch System</span>
                  </div>

                  {selectedEmail.body}

                  {/* Simulated Footer signature */}
                  <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
                    This email is a simulated demonstration. In a live production configuration, this triggers direct integrations via SMTP/SendGrid.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2 bg-[#0A0A0B]">
              <Mail className="w-12 h-12 text-slate-700" />
              <h4 className="text-sm font-semibold text-slate-300 font-display">No Email Selected</h4>
              <p className="text-xs max-w-xs text-slate-500">Select any outgoing log from the left sidebar to inspect the exact rendered email message.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
