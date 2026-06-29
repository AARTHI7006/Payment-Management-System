import React, { useState, useEffect } from 'react';
import { X, Camera, CreditCard, User, Mail, Phone, Calendar, BookOpen, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Student } from '../types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentData: any) => Promise<void>;
  student?: Student | null; // For editing mode
}

const BATCH_OPTIONS = [
  "Morning Batch (7:00 AM - 8:30 AM)",
  "Afternoon Batch (12:00 PM - 1:30 PM)",
  "Evening Batch (6:00 PM - 7:30 PM)",
  "Weekend Intensive (9:00 AM - 1:00 PM)",
  "Custom Scheduled"
];

const PRESET_AVATARS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-purple-500"
];

export default function AddStudentModal({ isOpen, onClose, onSave, student }: AddStudentModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [batch, setBatch] = useState(BATCH_OPTIONS[0]);
  const [totalValue, setTotalValue] = useState(10000);
  const [initialPaid, setInitialPaid] = useState(0);
  const [photo, setPhoto] = useState('bg-indigo-500');
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when student prop changes (for editing mode)
  useEffect(() => {
    if (student) {
      setName(student.name);
      setEmail(student.email);
      setPhone(student.phone);
      setBatch(student.batch);
      setTotalValue(student.totalValue);
      setInitialPaid(student.amountPaid);
      setNotes(student.notes || '');
      
      if (student.photo.startsWith('data:image')) {
        setPhotoPreview(student.photo);
        setPhoto('custom');
      } else {
        setPhotoPreview(null);
        setPhoto(student.photo || 'bg-indigo-500');
      }
    } else {
      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setBatch(BATCH_OPTIONS[0]);
      setTotalValue(10000);
      setInitialPaid(0);
      setPhoto('bg-indigo-500');
      setPhotoPreview(null);
      setNotes('');
    }
    setError(null);
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be smaller than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
        setPhoto('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Student name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (totalValue <= 0) {
      setError('Course value must be greater than zero.');
      return;
    }
    if (!student && initialPaid > totalValue) {
      setError('Initial payment cannot be greater than the total course value.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const studentData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        batch,
        totalValue: Number(totalValue),
        notes: notes.trim(),
        photo: photo === 'custom' ? photoPreview : photo,
        ...(student ? {} : { initialPaid: Number(initialPaid) }) // Only send initialPaid for new registrations
      };

      await onSave(studentData);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save student record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-[#0F0F11] rounded-2xl shadow-xl border border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-[#0A0A0B]">
          <div>
            <h3 className="text-lg font-bold text-white font-display">
              {student ? 'Edit Student Details' : 'Register New Student'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {student ? 'Modify details for tracking payments' : 'Create student profile and set fee details'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/30 text-rose-400 rounded-xl text-xs flex items-center gap-2 border border-rose-800/30">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Photo & Profile Styling */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Student Photo / Avatar
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                {photo === 'custom' && photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border-2 border-amber-500 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm ${photo}`}>
                    {name ? name.charAt(0).toUpperCase() : <User className="w-6 h-6 text-slate-300" />}
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 p-1 bg-[#0A0A0B] border border-slate-850 rounded-full cursor-pointer shadow-sm hover:bg-slate-800 text-slate-300 transition-all">
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Preset Color Swatches */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400">Choose a default color theme or upload a custom photo</span>
                <div className="flex gap-2">
                  {PRESET_AVATARS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setPhoto(color);
                        if (photo === 'custom') setPhotoPreview(null);
                      }}
                      className={`w-6 h-6 rounded-full transition-all border ${
                        photo === color
                          ? 'border-amber-500 scale-110 ring-2 ring-amber-500/20 shadow-xs'
                          : 'border-transparent hover:scale-105'
                      } ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 transition-all bg-[#0A0A0B] text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 transition-all bg-[#0A0A0B] text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 transition-all bg-[#0A0A0B] text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Batch Assignment
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 transition-all bg-[#0A0A0B] text-slate-200 appearance-none cursor-pointer"
                >
                  {BATCH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#0F0F11] text-slate-200">{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing Setup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Total Fees (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-sm font-semibold text-slate-500">₹</span>
                <input
                  type="number"
                  min="0"
                  value={totalValue}
                  onChange={(e) => setTotalValue(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-8 pr-4 py-2 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 transition-all bg-[#0A0A0B] text-slate-200 font-mono font-medium"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Default charge is ₹10,000 per student</span>
            </div>

            {!student && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Initial Payment Received (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-sm font-semibold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    max={totalValue}
                    value={initialPaid}
                    onChange={(e) => setInitialPaid(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-8 pr-4 py-2 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 transition-all bg-[#0A0A0B] text-slate-200 font-mono font-medium"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Specify any upfront payment received in cash/online</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Internal Notes / Special Demands
            </label>
            <textarea
              placeholder="E.g., Requested weekend checkins, wants personal nutrition guidance, has back issue."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-3 text-sm border border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 transition-all bg-[#0A0A0B] text-slate-200 resize-none placeholder-slate-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-transparent">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-xl text-sm font-medium text-slate-400 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : (student ? 'Save Changes' : 'Register Student')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
