export interface Payment {
  id: string;
  amount: number;
  date: string; // ISO String
  screenshot: string; // Base64 data url or image URL
  status: 'Approved' | 'Pending Verification' | 'Rejected';
  submittedBy: 'Trainer' | 'Student';
  notes?: string;
  rejectionReason?: string;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  email: string;
  batch: string;
  registeredDate: string; // ISO String
  totalValue: number; // defaults to 10000
  amountPaid: number; // Derived or explicitly recorded
  pendingDue: number; // totalValue - approved amountPaid
  photo: string; // Base64 data url or avatar name
  payments: Payment[];
  remindersCount: number; // 0 to 3
  lastReminderSentDate: string | null; // ISO String
  status: 'Paid' | 'Partially Paid' | 'Pending';
  notes?: string;
}

export interface EmailLog {
  id: string;
  studentId: string;
  studentName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentDate: string; // ISO String
  type: 'Registration' | '1st Reminder' | '2nd Reminder' | '3rd Reminder' | 'Receipt' | 'Reminder Manual';
  simulated: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  totalValue: number;
  totalCollected: number;
  totalPending: number;
  paidCount: number;
  partiallyPaidCount: number;
  pendingCount: number;
}
