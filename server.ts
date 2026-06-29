import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable JSON body parser with generous limit for Base64 screenshots
app.use(express.json({ limit: "50mb" }));

const DB_FILE = path.join(process.cwd(), "data", "db.json");

// Helper to read database
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify({ students: [], emailLogs: [], systemTimeOffsetDays: 0 }, null, 2));
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!parsed.students) parsed.students = [];
    if (!parsed.emailLogs) parsed.emailLogs = [];
    if (parsed.systemTimeOffsetDays === undefined) parsed.systemTimeOffsetDays = 0;
    return parsed;
  } catch (error) {
    console.error("Error reading db.json", error);
    return { students: [], emailLogs: [], systemTimeOffsetDays: 0 };
  }
}

// Helper to write database
function writeDb(data: any) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing db.json", error);
  }
}

// Helper to get simulated system time
function getSimulatedTime(offsetDays = 0) {
  const realTime = new Date();
  if (offsetDays > 0) {
    realTime.setDate(realTime.getDate() + offsetDays);
  }
  return realTime;
}

// Helper to recalculate a student's payments and pending dues
function recalculateStudentBalances(student: any) {
  // Approved payments contribute to total paid
  const approvedPayments = student.payments.filter((p: any) => p.status === 'Approved');
  student.amountPaid = approvedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
  student.pendingDue = Math.max(0, student.totalValue - student.amountPaid);
  
  if (student.pendingDue === 0) {
    student.status = 'Paid';
  } else if (student.amountPaid > 0) {
    student.status = 'Partially Paid';
  } else {
    student.status = 'Pending';
  }
}

// Core helper for automated reminders
function checkAndTriggerReminders(dbData: any, simulatedNow: Date) {
  let updated = false;
  const students = dbData.students;
  const emailLogs = dbData.emailLogs || [];

  for (const student of students) {
    if (student.pendingDue <= 0 || student.remindersCount >= 3) {
      continue;
    }

    // Determine when the next reminder is due
    // 1st reminder is due 10 days after registeredDate
    // 2nd reminder is due 10 days after lastReminderSentDate
    // 3rd reminder is due 10 days after lastReminderSentDate
    let referenceDateStr = student.registeredDate;
    if (student.remindersCount > 0 && student.lastReminderSentDate) {
      referenceDateStr = student.lastReminderSentDate;
    }

    const referenceDate = new Date(referenceDateStr);
    const diffTime = simulatedNow.getTime() - referenceDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays >= 10) {
      student.remindersCount += 1;
      student.lastReminderSentDate = simulatedNow.toISOString();
      
      const reminderType = student.remindersCount === 1 ? '1st Reminder' : 
                           student.remindersCount === 2 ? '2nd Reminder' : '3rd Reminder';
      
      const subject = `⚠️ Pending Payment Reminder - ${reminderType}`;
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const body = `Dear ${student.name},\n\nThis is a friendly automated reminder that you have a pending payment due of ₹${student.pendingDue.toLocaleString()} for your course (${student.batch}).\n\nCourse Value: ₹${student.totalValue.toLocaleString()}\nAmount Paid: ₹${student.amountPaid.toLocaleString()}\nDue Amount: ₹${student.pendingDue.toLocaleString()}\n\nThis is notice #${student.remindersCount} of 3. Please click the link below to complete your payment and upload your screenshot:\n\n${appUrl}/#/student/${student.id}\n\nRegards,\nYour Trainer`;

      const newLog = {
        id: `log_reminder_${Date.now()}_${student.id}`,
        studentId: student.id,
        studentName: student.name,
        recipientEmail: student.email,
        subject,
        body,
        sentDate: simulatedNow.toISOString(),
        type: reminderType,
        simulated: true
      };

      emailLogs.push(newLog);
      updated = true;
    }
  }

  if (updated) {
    dbData.emailLogs = emailLogs;
    dbData.students = students;
  }
  return updated;
}

// API Routes

// 1. Get system simulated time
app.get("/api/system/time", (req, res) => {
  const dbData = readDb();
  const simulatedTime = getSimulatedTime(dbData.systemTimeOffsetDays);
  res.json({
    offsetDays: dbData.systemTimeOffsetDays,
    simulatedTime: simulatedTime.toISOString(),
    realTime: new Date().toISOString()
  });
});

// 2. Advance time simulator
app.post("/api/system/advance-time", (req, res) => {
  const { days } = req.body;
  if (typeof days !== "number" || days < 0) {
    return res.status(400).json({ error: "Days must be a positive number" });
  }

  const dbData = readDb();
  dbData.systemTimeOffsetDays += days;
  
  // Instantly run automated reminder check for advanced time
  const simulatedNow = getSimulatedTime(dbData.systemTimeOffsetDays);
  const triggered = checkAndTriggerReminders(dbData, simulatedNow);

  writeDb(dbData);
  res.json({
    success: true,
    offsetDays: dbData.systemTimeOffsetDays,
    simulatedTime: simulatedNow.toISOString(),
    automatedRemindersTriggered: triggered
  });
});

// Reset simulation time
app.post("/api/system/reset-time", (req, res) => {
  const dbData = readDb();
  dbData.systemTimeOffsetDays = 0;
  writeDb(dbData);
  res.json({ success: true, offsetDays: 0, simulatedTime: new Date().toISOString() });
});

// 3. Get all students (triggers auto reminders checks first)
app.get("/api/students", (req, res) => {
  const dbData = readDb();
  const simulatedNow = getSimulatedTime(dbData.systemTimeOffsetDays);
  const triggered = checkAndTriggerReminders(dbData, simulatedNow);
  if (triggered) {
    writeDb(dbData);
  }
  res.json(dbData.students);
});

// 4. Get a single student (and auto-calculate/refresh their due)
app.get("/api/students/:id", (req, res) => {
  const dbData = readDb();
  const student = dbData.students.find((s: any) => s.id === req.params.id);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }
  recalculateStudentBalances(student);
  res.json(student);
});

// 5. Create a new student (trainer registration)
app.post("/api/students", (req, res) => {
  const { name, phone, email, batch, totalValue, initialPaid, photo, notes } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and Email are required fields." });
  }

  const dbData = readDb();
  const simulatedNow = getSimulatedTime(dbData.systemTimeOffsetDays);

  const studentId = `std_${Date.now()}`;
  const initialValue = totalValue !== undefined ? Number(totalValue) : 10000;
  const initialPaidNum = initialPaid !== undefined ? Number(initialPaid) : 0;

  const payments = [];
  if (initialPaidNum > 0) {
    payments.push({
      id: `pay_${Date.now()}_init`,
      amount: initialPaidNum,
      date: simulatedNow.toISOString(),
      screenshot: "",
      status: "Approved",
      submittedBy: "Trainer",
      notes: "Initial payment recorded at registration"
    });
  }

  const newStudent = {
    id: studentId,
    name,
    phone: phone || "",
    email,
    batch: batch || "General Batch",
    registeredDate: simulatedNow.toISOString(),
    totalValue: initialValue,
    amountPaid: initialPaidNum,
    pendingDue: Math.max(0, initialValue - initialPaidNum),
    photo: photo || "avatar-1",
    payments,
    remindersCount: 0,
    lastReminderSentDate: null,
    status: initialPaidNum >= initialValue ? "Paid" : (initialPaidNum > 0 ? "Partially Paid" : "Pending"),
    notes: notes || ""
  };

  dbData.students.push(newStudent);

  // Generate automated Registration notification email
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const welcomeEmail = {
    id: `log_welcome_${Date.now()}_${studentId}`,
    studentId,
    studentName: name,
    recipientEmail: email,
    subject: `🎓 Welcome to Training Program - Registration Confirmed`,
    body: `Dear ${name},\n\nYou have been successfully registered by your trainer.\n\nBatch: ${newStudent.batch}\nCourse Value: ₹${initialValue.toLocaleString()}\nAmount Paid: ₹${initialPaidNum.toLocaleString()}\nPending Balance: ₹${newStudent.pendingDue.toLocaleString()}\n\nPlease access your personal student portal to check training schedules, pay dues, and upload receipt screenshots:\n\n${appUrl}/#/student/${studentId}\n\nRegards,\nYour Trainer`,
    sentDate: simulatedNow.toISOString(),
    type: "Registration",
    simulated: true
  };

  dbData.emailLogs.push(welcomeEmail);
  writeDb(dbData);

  res.status(201).json(newStudent);
});

// 6. Update student details
app.put("/api/students/:id", (req, res) => {
  const { name, phone, email, batch, totalValue, notes, photo } = req.body;
  const dbData = readDb();
  const index = dbData.students.findIndex((s: any) => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Student not found" });
  }

  const student = dbData.students[index];
  if (name !== undefined) student.name = name;
  if (phone !== undefined) student.phone = phone;
  if (email !== undefined) student.email = email;
  if (batch !== undefined) student.batch = batch;
  if (totalValue !== undefined) student.totalValue = Number(totalValue);
  if (notes !== undefined) student.notes = notes;
  if (photo !== undefined) student.photo = photo;

  recalculateStudentBalances(student);
  writeDb(dbData);

  res.json(student);
});

// 7. Delete student (Optional helper for trainer)
app.delete("/api/students/:id", (req, res) => {
  const dbData = readDb();
  const index = dbData.students.findIndex((s: any) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Student not found" });
  }
  dbData.students.splice(index, 1);
  writeDb(dbData);
  res.json({ success: true });
});

// 8. Submit payment screenshot (student or trainer)
app.post("/api/students/:id/payments", (req, res) => {
  const { amount, screenshot, notes, submittedBy } = req.body;
  
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "Amount must be greater than zero." });
  }

  const dbData = readDb();
  const index = dbData.students.findIndex((s: any) => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Student not found" });
  }

  const student = dbData.students[index];
  const simulatedNow = getSimulatedTime(dbData.systemTimeOffsetDays);

  const isTrainer = submittedBy === "Trainer";
  const paymentStatus = isTrainer ? "Approved" : "Pending Verification";

  const newPayment = {
    id: `pay_${Date.now()}`,
    amount: Number(amount),
    date: simulatedNow.toISOString(),
    screenshot: screenshot || "",
    status: paymentStatus,
    submittedBy: submittedBy || "Student",
    notes: notes || ""
  };

  student.payments.push(newPayment);
  recalculateStudentBalances(student);

  // Generate automated payment submission log
  if (!isTrainer) {
    const notifyEmail = {
      id: `log_notif_${Date.now()}_${student.id}`,
      studentId: student.id,
      studentName: student.name,
      recipientEmail: student.email, // Sent to student and CC to trainer
      subject: `📥 Payment Receipt Uploaded - Awaiting Verification`,
      body: `Dear ${student.name},\n\nWe have received your payment of ₹${Number(amount).toLocaleString()} uploaded to the portal.\n\nYour screenshot has been submitted to your trainer for validation. Once approved, your pending balance will be updated.\n\nCurrent status: Pending Verification.\n\nRegards,\nSupport Portal`,
      sentDate: simulatedNow.toISOString(),
      type: "Receipt",
      simulated: true
    };
    dbData.emailLogs.push(notifyEmail);
  } else {
    // Receipt for payment completed directly by Trainer
    const receiptEmail = {
      id: `log_receipt_${Date.now()}_${student.id}`,
      studentId: student.id,
      studentName: student.name,
      recipientEmail: student.email,
      subject: `🧾 Payment Received & Approved - Receipt`,
      body: `Dear ${student.name},\n\nA payment of ₹${Number(amount).toLocaleString()} has been recorded and approved by your trainer.\n\nApproved Date: ${simulatedNow.toLocaleDateString()}\nCourse Value: ₹${student.totalValue.toLocaleString()}\nTotal Paid: ₹${student.amountPaid.toLocaleString()}\nRemaining Balance: ₹${student.pendingDue.toLocaleString()}\n\nThank you!\nYour Trainer`,
      sentDate: simulatedNow.toISOString(),
      type: "Receipt",
      simulated: true
    };
    dbData.emailLogs.push(receiptEmail);
  }

  writeDb(dbData);
  res.status(201).json(student);
});

// 9. Verify a payment (Approve/Reject)
app.post("/api/payments/:paymentId/verify", (req, res) => {
  const { studentId, status, rejectionReason } = req.body;

  if (!studentId || !status || !["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "Missing required parameters or invalid status." });
  }

  const dbData = readDb();
  const student = dbData.students.find((s: any) => s.id === studentId);

  if (!student) {
    return res.status(404).json({ error: "Student not found." });
  }

  const payment = student.payments.find((p: any) => p.id === req.params.paymentId);
  if (!payment) {
    return res.status(404).json({ error: "Payment record not found." });
  }

  const simulatedNow = getSimulatedTime(dbData.systemTimeOffsetDays);
  payment.status = status;
  if (status === "Rejected") {
    payment.rejectionReason = rejectionReason || "No explanation provided.";
  }

  recalculateStudentBalances(student);

  // Send automated response email regarding verification
  const emailType = "Receipt";
  const subject = status === "Approved" ? `✅ Payment Approved - Receipt Updated` : `❌ Payment Rejected - Action Required`;
  const body = status === "Approved" 
    ? `Dear ${student.name},\n\nGood news! Your uploaded payment of ₹${payment.amount.toLocaleString()} has been approved and credited.\n\nTotal Paid: ₹${student.amountPaid.toLocaleString()}\nRemaining Balance: ₹${student.pendingDue.toLocaleString()}\n\nThank you for completing the payment!\n\nRegards,\nYour Trainer`
    : `Dear ${student.name},\n\nWe were unable to approve your uploaded payment receipt of ₹${payment.amount.toLocaleString()}.\n\nReason for Rejection: ${rejectionReason || "Unable to read/verify receipt details."}\n\nPlease click the portal link below to upload a clear payment screenshot again:\n\n${process.env.APP_URL || 'http://localhost:3000'}/#/student/${student.id}\n\nRegards,\nYour Trainer`;

  const resultEmail = {
    id: `log_verify_${Date.now()}_${student.id}`,
    studentId: student.id,
    studentName: student.name,
    recipientEmail: student.email,
    subject,
    body,
    sentDate: simulatedNow.toISOString(),
    type: emailType,
    simulated: true
  };

  dbData.emailLogs.push(resultEmail);
  writeDb(dbData);

  res.json({ success: true, student });
});

// 10. Manual send reminder button (trainer)
app.post("/api/students/:id/remind-manual", (req, res) => {
  const dbData = readDb();
  const student = dbData.students.find((s: any) => s.id === req.params.id);

  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  const simulatedNow = getSimulatedTime(dbData.systemTimeOffsetDays);
  student.remindersCount += 1;
  student.lastReminderSentDate = simulatedNow.toISOString();

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const subject = `⚠️ Urgent: Pending Training Payment Notice`;
  const body = `Dear ${student.name},\n\nThis is an urgent manual notification regarding your pending training due of ₹${student.pendingDue.toLocaleString()}.\n\nTotal Program Value: ₹${student.totalValue.toLocaleString()}\nTotal Paid to Date: ₹${student.amountPaid.toLocaleString()}\nOutstanding Balance: ₹${student.pendingDue.toLocaleString()}\n\nPlease visit the payment link below, complete your transfer, and upload the confirmation screenshot immediately:\n\n${appUrl}/#/student/${student.id}\n\nThank you for your prompt cooperation.\n\nRegards,\nYour Trainer`;

  const manualLog = {
    id: `log_manual_${Date.now()}_${student.id}`,
    studentId: student.id,
    studentName: student.name,
    recipientEmail: student.email,
    subject,
    body,
    sentDate: simulatedNow.toISOString(),
    type: "Reminder Manual" as const,
    simulated: true
  };

  dbData.emailLogs.push(manualLog);
  writeDb(dbData);

  res.json({ success: true, student });
});

// 11. Get all email logs
app.get("/api/email-logs", (req, res) => {
  const dbData = readDb();
  // Sort with newest first
  const sorted = [...dbData.emailLogs].sort((a: any, b: any) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());
  res.json(sorted);
});

// Vite Dev Server / Prod Server Static asset mounting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
