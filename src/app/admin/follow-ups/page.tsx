"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, setDoc, doc, getDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Phone, 
  CheckCircle2, 
  Edit3, 
  Trash2,
  IndianRupee, 
  Loader2, 
  X,
  Receipt,
  ArrowLeft,
  Save,
  AlertTriangle,
  ArrowRight,
  FileText,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mail,
  GraduationCap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FollowUpTab = "pending" | "inprogress" | "completed" | "archived" | "deleted";

interface Student {
  id: string;
  studentId?: string;
  name: string;
  email?: string;
  phone: string;
  faculty?: string;
  course?: string;
  stream?: string;
  duration?: string;
  university?: string;
  startYear?: string;
  endYear?: string;
  totalFee: number;
  discountAmount?: number;
  enrollmentDate?: string;
  profileEditEnabled?: boolean;
  createdAt?: string;
  personalDetails?: {
    photo?: string;
    dob?: string;
    gender?: string;
    bloodGroup?: string;
    aadhaarNumber?: string;
    fatherName?: string;
    motherName?: string;
    guardianName?: string;
    guardianPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

interface Payment {
  id: string;
  studentPhone: string;
  studentName?: string;
  receiptNumber?: string;
  amountPaid: number | string;
  paymentDate: string | { toDate: () => Date };
  paymentMode?: string;
  isDiscount?: boolean;
  createdAt?: unknown;
}

interface FollowUpRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentEmail?: string;
  dueAmount: number;
  daysOverdue: number;
  lastPaymentDate: string;
  status: FollowUpTab;
  remarks: string[];
  course?: string;
  stream?: string;
  university?: string;
  faculty?: string;
  duration?: string;
  totalFee?: number;
  discountAmount?: number;
  studentData?: Student; // Full student data for modal
  createdAt: string;
  updatedAt: string;
  remindAfter?: string; // ISO date string for when to remind next
}

// Parse date string safely without timezone issues
function parseLocalDate(dateValue: string | { toDate: () => Date } | unknown): Date {
  if (!dateValue) return new Date();
  
  // Handle Firebase Timestamp object
  if (typeof dateValue === "object" && dateValue !== null && "toDate" in dateValue && typeof (dateValue as { toDate: () => Date }).toDate === "function") {
    return (dateValue as { toDate: () => Date }).toDate();
  }
  
  // Handle string dates
  if (typeof dateValue === "string") {
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return new Date(dateValue);
    // Create date treating the string as local time
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  
  return new Date();
}

// Calculate days between dates
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

export default function FollowUpsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [followUpRecords, setFollowUpRecords] = useState<FollowUpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FollowUpTab>("pending");
  const [viewMode, setViewMode] = useState<"dues" | "enquiries">("dues");
  
  // Modal states
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<FollowUpRecord | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  
  // Schedule follow-up modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<number>(5);
  const [schedulingItem, setSchedulingItem] = useState<FollowUpRecord | null>(null);
  const [scheduleNote, setScheduleNote] = useState("");
  
  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  
  // Student detail modal state
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  
  // Expanded notes state
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch students
        const studentsSnap = await getDocs(collection(db, "students"));
        const studentsData = studentsSnap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        })) as Student[];
        setStudents(studentsData);

        // Fetch payments
        const paymentsQuery = query(collection(db, "payments"), orderBy("createdAt", "desc"));
        const paymentsSnap = await getDocs(paymentsQuery);
        const paymentsData = paymentsSnap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        })) as Payment[];
        setPayments(paymentsData);

        // Fetch existing follow-up records
        const followUpsSnap = await getDocs(collection(db, "followUps"));
        const followUpsData = followUpsSnap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        })) as FollowUpRecord[];
        setFollowUpRecords(followUpsData);
        
        // Debug logging
        console.log("Follow-ups page - Students:", studentsData.length, "Payments:", paymentsData.length);
        console.log("Follow-ups page - FollowUpRecords:", followUpsData.length);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Calculate follow-up items based on logic
  const calculatedFollowUps = useMemo(() => {
    const today = new Date();
    const items: FollowUpRecord[] = [];

    students.forEach((student) => {
      // Get all payments for this student (excluding discounts)
      const studentPayments = payments.filter(
        (p) => p.studentPhone === student.phone && 
               !p.isDiscount && 
               p.paymentMode !== "Discount"
      );
      
      // Debug for Feb
      if (student.name?.toLowerCase().includes("febin")) {
        console.log("Febin - Phone:", student.phone, "TotalFee:", student.totalFee);
        console.log("Febin - Matching payments:", payments.filter(p => p.studentPhone === student.phone));
        console.log("Febin - Non-discount payments:", studentPayments);
      }

      // Calculate total CASH collected (ignore discounts)
      const totalCashCollected = studentPayments.reduce(
        (sum, p) => sum + (parseFloat(String(p.amountPaid || "0")) || 0), 
        0
      );

      // Due amount = Total Fee - Cash Collected (ignore discounts)
      const totalFee = parseFloat(String(student.totalFee || "0")) || 0;
      const dueAmount = totalFee - totalCashCollected;

      // Find last payment date
      const lastPayment = studentPayments
        .filter(p => p.paymentDate)
        .sort((a, b) => 
          parseLocalDate(b.paymentDate).getTime() - parseLocalDate(a.paymentDate).getTime()
        )[0];

      const lastPaymentDate = lastPayment?.paymentDate || student.createdAt || new Date().toISOString();
      const daysOverdue = daysBetween(today, parseLocalDate(lastPaymentDate));
      
      // Debug for Feb
      if (student.name?.toLowerCase().includes("febin")) {
        console.log("Febin - totalFee:", totalFee, "totalCashCollected:", totalCashCollected, "dueAmount:", dueAmount);
        console.log("Febin - lastPaymentDate:", lastPaymentDate, "daysOverdue:", daysOverdue);
        console.log("Febin - qualifies?", daysOverdue > 20 && dueAmount > 0);
      }

      // Check if student qualifies for follow-up (>20 days AND due amount > 0)
      if (daysOverdue > 20 && dueAmount > 0) {
        // Check if there's an existing follow-up record
        const existingRecord = followUpRecords.find(r => r.studentId === student.id);

        // Convert lastPaymentDate to ISO string format for storage
        const lastPaymentDateStr = lastPaymentDate && typeof lastPaymentDate === "object" && "toDate" in lastPaymentDate 
          ? (lastPaymentDate as { toDate: () => Date }).toDate().toISOString()
          : String(lastPaymentDate);

        if (existingRecord) {
          // Update existing record with fresh calculations
          // Check if remind date has passed before resetting status
          const today = new Date();
          const remindDate = existingRecord.remindAfter ? new Date(existingRecord.remindAfter) : null;
          const remindDatePassed = remindDate && today >= remindDate;
          
          // Reset status to pending if deleted/completed AND remind date has passed (or no remind date)
          let newStatus = existingRecord.status;
          if ((existingRecord.status === "deleted" || existingRecord.status === "completed") && remindDatePassed) {
            newStatus = "pending";
          }
          items.push({
            ...existingRecord,
            dueAmount,
            daysOverdue,
            lastPaymentDate: lastPaymentDateStr,
            status: newStatus,
            studentData: student,
            university: student.university,
            faculty: student.faculty,
            duration: student.duration,
            totalFee: student.totalFee,
            discountAmount: student.discountAmount,
          });
        } else {
          // Create new pending record
          items.push({
            id: `followup_${student.id}_${Date.now()}`,
            studentId: student.studentId || student.id,
            studentName: student.name,
            studentPhone: student.phone,
            studentEmail: student.email,
            dueAmount,
            daysOverdue,
            lastPaymentDate: lastPaymentDateStr,
            status: "pending",
            remarks: [],
            course: student.course,
            stream: student.stream,
            university: student.university,
            faculty: student.faculty,
            duration: student.duration,
            totalFee: student.totalFee,
            discountAmount: student.discountAmount,
            studentData: student,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });

    
    // Debug logging
    console.log("calculatedFollowUps count:", items.length);
    console.log("calculatedFollowUps items:", items);
    
    return items.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [students, payments, followUpRecords]);

  // Helper function to abbreviate course name (e.g., "MJMC (Master of Journalism...)" → "MJMC")
  function abbreviateCourse(course: string | undefined): string {
    if (!course) return "";
    // Extract the short code before the parenthesis
    const match = course.match(/^([A-Za-z]+)\s*\(/);
    return match ? match[1] : course;
  }

  // Auto-create/update follow-up records in database
  useEffect(() => {
    async function syncFollowUps() {
      if (calculatedFollowUps.length === 0) return;

      for (const item of calculatedFollowUps) {
        const existing = followUpRecords.find(r => r.studentId === item.studentId);
        if (!existing) {
          // Create new record
          await setDoc(doc(db, "followUps", item.id), item);
        } else if (existing.dueAmount !== item.dueAmount || existing.daysOverdue !== item.daysOverdue || existing.status !== item.status) {
          // Update existing record with new calculations (including status if it changed from deleted)
          await setDoc(doc(db, "followUps", existing.id), {
            ...existing,
            dueAmount: item.dueAmount,
            daysOverdue: item.daysOverdue,
            lastPaymentDate: item.lastPaymentDate,
            status: item.status,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
    syncFollowUps();
  }, [calculatedFollowUps, followUpRecords]);

  // Filter by tab
  const filteredItems = calculatedFollowUps.filter((item) => {
    if (activeTab === "archived") {
      return item.status === "deleted";
    }
    return item.status === activeTab;
  });

  // Counts for tabs
  const tabCounts = {
    pending: calculatedFollowUps.filter((i) => i.status === "pending").length,
    inprogress: calculatedFollowUps.filter((i) => i.status === "inprogress").length,
    completed: calculatedFollowUps.filter((i) => i.status === "completed").length,
    archived: calculatedFollowUps.filter((i) => i.status === "deleted").length,
  };
  
  // Debug logging
  console.log("activeTab:", activeTab, "filteredItems count:", filteredItems.length);
  console.log("tabCounts:", tabCounts);

  // Handle adding note
  const handleAddNote = async () => {
    if (!selectedStudent || !noteText.trim()) return;
    
    setSavingNote(true);
    try {
      const updatedRemarks = [...selectedStudent.remarks, `${new Date().toLocaleDateString()}: ${noteText}`];
      const updatedRecord: FollowUpRecord = {
        ...selectedStudent,
        remarks: updatedRemarks,
        status: "inprogress",
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, "followUps", selectedStudent.id), updatedRecord);
      
      // Update local state
      setFollowUpRecords(prev => 
        prev.map(r => r.id === selectedStudent.id ? updatedRecord : r)
      );
      
      setNoteModalOpen(false);
      setNoteText("");
      setSelectedStudent(null);
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  // Handle mark as done - opens schedule modal
  const handleMarkDone = (item: FollowUpRecord) => {
    setSchedulingItem(item);
    setScheduleDays(5); // Default 5 days
    setScheduleNote(""); // Reset note
    setScheduleModalOpen(true);
  };
  
  // Handle schedule completion with selected days and note
  const handleScheduleDone = async () => {
    if (!schedulingItem || !scheduleNote.trim()) return;
    
    try {
      // Calculate remind date based on days selected
      const remindDate = new Date();
      remindDate.setDate(remindDate.getDate() + scheduleDays);
      
      // Add note to remarks
      const newRemark = `${new Date().toLocaleDateString()}: ${scheduleNote}`;
      const updatedRemarks = [...schedulingItem.remarks, newRemark];
      
      const updatedRecord: FollowUpRecord = {
        ...schedulingItem,
        status: "completed",
        remindAfter: remindDate.toISOString(),
        remarks: updatedRemarks,
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, "followUps", schedulingItem.id), updatedRecord);
      
      setFollowUpRecords(prev => 
        prev.map(r => r.id === schedulingItem.id ? updatedRecord : r)
      );
      
      setScheduleModalOpen(false);
      setSchedulingItem(null);
      setScheduleNote("");
    } catch (err) {
      console.error("Error marking as done:", err);
    }
  };

  // Handle delete
  const handleDelete = (item: FollowUpRecord) => {
    setConfirmMessage(`Are you sure you want to remove follow-up for "${item.studentName}"?`);
    setConfirmCallback(() => async () => {
      try {
        const deletedRecord = { ...item, status: "deleted" as const, updatedAt: new Date().toISOString() };
        await setDoc(doc(db, "followUps", item.id), deletedRecord);
        setFollowUpRecords(prev => prev.map(r => r.id === item.id ? deletedRecord : r));
      } catch (err) {
        console.error("Error deleting:", err);
      } finally {
        setConfirmModalOpen(false);
        setConfirmCallback(null);
      }
    });
    setConfirmModalOpen(true);
  };

  // Handle start follow-up - moves from pending to inprogress
  const handleStartFollowUp = async (item: FollowUpRecord) => {
    try {
      const updatedRecord: FollowUpRecord = {
        ...item,
        status: "inprogress",
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, "followUps", item.id), updatedRecord);
      
      setFollowUpRecords(prev => 
        prev.map(r => r.id === item.id ? updatedRecord : r)
      );
    } catch (err) {
      console.error("Error starting follow-up:", err);
    }
  };

  const tabs = [
    { key: "pending" as FollowUpTab, label: "Pending Follow-Up", count: tabCounts.pending },
    { key: "inprogress" as FollowUpTab, label: "In Progress", count: tabCounts.inprogress },
    { key: "completed" as FollowUpTab, label: "Completed", count: tabCounts.completed },
    { key: "archived" as FollowUpTab, label: "Archived", count: tabCounts.archived },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Professional Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Follow-up Management</h1>
            <p className="text-sm text-slate-500 mt-0.5 font-normal">Track and manage student fee dues</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1.5">
          <button
            onClick={() => setViewMode("dues")}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
              viewMode === "dues"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Student Dues
          </button>
          <button
            onClick={() => setViewMode("enquiries")}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
              viewMode === "enquiries"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Website Enquiries
          </button>
        </div>
      </div>

      {viewMode === "enquiries" ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Website Enquiries coming soon</p>
          </div>
        </div>
      ) : (
        <>
          {/* Status Tabs - Red Theme */}
          <div className="flex items-center gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium rounded-xl transition-all flex items-center gap-2.5 ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg"
                    : "bg-white text-slate-600 hover:bg-red-50 border border-slate-200 hover:border-red-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  tab.key === 'pending' ? 'bg-amber-400' : 
                  tab.key === 'inprogress' ? 'bg-blue-400' : 'bg-emerald-400'
                }`} />
                {tab.label}
                <span className={`ml-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Professional Data List */}
          <div className="bg-slate-50 rounded-2xl overflow-hidden flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-3" />
                <p className="text-slate-600 font-medium text-lg">
                  {activeTab === "pending" 
                    ? "No students pending follow-up" 
                    : activeTab === "inprogress" 
                    ? "No follow-ups in progress" 
                    : "No completed follow-ups"}
                </p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[calc(100vh-200px)]">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-rose-700 to-red-600 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-5 py-4 text-sm font-semibold text-white/90">Student</th>
                      <th className="text-left px-5 py-4 text-sm font-semibold text-white/90">Student ID</th>
                      <th className="text-left px-5 py-4 text-sm font-semibold text-white/90">University</th>
                      <th className="text-left px-5 py-4 text-sm font-semibold text-white/90">Contact</th>
                      <th className="text-right px-5 py-4 text-sm font-semibold text-white/90">Due Amount</th>
                      <th className="text-left px-5 py-4 text-sm font-semibold text-white/90">Overdue</th>
                      <th className="text-center px-5 py-4 text-sm font-semibold text-white/90">Notes</th>
                      <th className="text-center px-5 py-4 text-sm font-semibold text-white/90">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr className="bg-white hover:bg-red-50/40 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">{item.studentName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{abbreviateCourse(item.course)}{item.stream ? ` · ${item.stream}` : ''}</p>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => item.studentData && setDetailStudent(item.studentData)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              {item.studentId}
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm text-slate-600">{item.studentData?.university || item.university || '—'}</p>
                          </td>
                          <td className="px-5 py-4">
                            <a 
                              href={`tel:${item.studentPhone}`}
                              className="text-sm text-slate-600 hover:text-red-600 transition-colors"
                            >
                              {item.studentPhone}
                            </a>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-base font-bold text-red-600">₹{item.dueAmount.toLocaleString("en-IN")}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-medium ${item.daysOverdue > 30 ? 'text-violet-600' : 'text-violet-500'}`}>
                              {item.daysOverdue} days
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => setExpandedNotes(expandedNotes === item.id ? null : item.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                expandedNotes === item.id
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {item.remarks.length}
                              {expandedNotes === item.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1">
                              {item.status !== "completed" && item.status !== "deleted" && (
                                <button
                                  onClick={() => handleMarkDone(item)}
                                  className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  title="Mark as Done"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              {item.status === "pending" && (
                                <button
                                  onClick={() => handleStartFollowUp(item)}
                                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Start Follow-up"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              )}
                              {item.status === "inprogress" && (
                                <button
                                  onClick={() => {
                                    setSelectedStudent(item);
                                    setNoteModalOpen(true);
                                  }}
                                  className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                                  title="Add Note"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                              {item.status !== "deleted" && (
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                  title="Remove"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Expanded Notes */}
                        {expandedNotes === item.id && item.remarks.length > 0 && (
                          <tr className="bg-red-50/30">
                            <td colSpan={8} className="px-5 py-4">
                              <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <MessageSquare className="w-4 h-4 text-red-500" />
                                  <h4 className="text-sm font-semibold text-slate-700">Follow-up Notes</h4>
                                  <span className="text-xs text-slate-400">({item.remarks.length})</span>
                                </div>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                  {item.remarks.slice().reverse().map((remark, idx) => {
                                    const [date, ...noteParts] = remark.split(':');
                                    const noteText = noteParts.join(':').trim();
                                    return (
                                      <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-semibold flex items-center justify-center">
                                          {item.remarks.length - idx}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-red-500 font-medium mb-0.5">{date}</p>
                                          <p className="text-sm text-slate-700">{noteText}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Note Modal */}
      {noteModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Follow-Up Note</h3>
              <button
                onClick={() => {
                  setNoteModalOpen(false);
                  setNoteText("");
                  setSelectedStudent(null);
                }}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">
                Student: <span className="font-medium text-slate-900">{selectedStudent.studentName}</span>
              </p>
              <p className="text-sm text-slate-600">
                Due: <span className="font-medium text-red-600">₹{selectedStudent.dueAmount.toLocaleString("en-IN")}</span>
              </p>
            </div>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter follow-up remarks..."
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none resize-none mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setNoteModalOpen(false);
                  setNoteText("");
                  setSelectedStudent(null);
                }}
                className="flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || savingNote}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50"
              >
                {savingNote ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    {selectedStudent?.status === "inprogress" ? "Save Note" : "Save & Move to In Progress"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Follow-Up Modal */}
      {scheduleModalOpen && schedulingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Schedule Next Follow-Up</h3>
              <button
                onClick={() => {
                  setScheduleModalOpen(false);
                  setSchedulingItem(null);
                }}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-5">
              <p className="text-sm text-slate-600 mb-2">
                Student: <span className="font-medium text-slate-900">{schedulingItem.studentName}</span>
              </p>
              <p className="text-sm text-slate-600 mb-4">
                Due: <span className="font-medium text-red-600">₹{schedulingItem.dueAmount.toLocaleString("en-IN")}</span>
              </p>
              
              {/* Previous Notes */}
              {schedulingItem.remarks.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Previous Notes
                  </label>
                  <div className="bg-slate-50 rounded-lg p-3 max-h-[120px] overflow-y-auto space-y-2">
                    {schedulingItem.remarks.map((remark, idx) => {
                      const [date, ...noteParts] = remark.split(':');
                      const noteText = noteParts.join(':').trim();
                      return (
                        <div key={idx} className="flex gap-2 text-sm">
                          <span className="text-slate-400 text-xs whitespace-nowrap">{date}</span>
                          <span className="text-slate-700">{noteText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Note Input - Required */}
              <div className="mb-4">
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Follow-up Note <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={scheduleNote}
                  onChange={(e) => setScheduleNote(e.target.value)}
                  placeholder="What did the student promise? (e.g., 'Will pay after 10 days', 'Payment pending from bank')"
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none resize-none"
                />
              </div>
              
              <p className="text-sm text-slate-700 font-medium mb-3">
                When should I remind you about this follow-up?
              </p>
              
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600">Remind after:</label>
                <input
                  type="number"
                  value={scheduleDays}
                  onChange={(e) => setScheduleDays(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={365}
                  className="w-20 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-center"
                />
                <span className="text-sm text-slate-600">days</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This follow-up will reappear in Pending tab on {new Date(Date.now() + scheduleDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setScheduleModalOpen(false);
                  setSchedulingItem(null);
                }}
                className="flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleDone}
                disabled={!scheduleNote.trim()}
                className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Action</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-6">
              {confirmMessage}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setConfirmModalOpen(false);
                  setConfirmCallback(null);
                }}
                className="flex-1 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmCallback?.()}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors font-medium"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {detailStudent && (
        <StudentDetailModal 
          student={detailStudent} 
          onClose={() => setDetailStudent(null)}
          payments={payments}
        />
      )}
    </div>
  );
}

// Student Detail Modal Component
function StudentDetailModal({ student, onClose, payments }: { student: Student; onClose: () => void; payments: Payment[] }) {
  const [showPayments, setShowPayments] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  
  // Filter payments for this student
  const studentPayments = payments.filter(p => p.studentPhone === student.phone || p.studentName === student.name);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 ${showPayments ? 'max-w-3xl' : ''}`}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-700 to-red-600 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{student.name}</h2>
            <p className="text-sm text-white/80">{student.studentId || student.id}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Phone Number</p>
              </div>
              <a href={`tel:${student.phone}`} className="text-sm text-blue-700 hover:text-blue-900 hover:underline">
                {student.phone}
              </a>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-slate-600" />
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">Email Address</p>
              </div>
              <p className="text-sm text-slate-800">{student.email || "—"}</p>
            </div>
          </div>
          
          {/* Course Info */}
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-amber-600" />
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">Course Details</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">University:</span> <span className="font-medium">{student.university || "—"}</span></div>
              <div><span className="text-slate-500">Faculty:</span> <span className="font-medium">{student.faculty || "—"}</span></div>
              <div><span className="text-slate-500">Course:</span> <span className="font-medium">{student.course || "—"}</span></div>
              <div><span className="text-slate-500">Stream:</span> <span className="font-medium">{student.stream || "—"}</span></div>
              <div><span className="text-slate-500">Duration:</span> <span className="font-medium">{student.duration || "—"}</span></div>
            </div>
          </div>
          
          {/* Fee Info */}
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-xs text-red-600 uppercase mb-2">Fee Information</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Total Fee</p>
                <p className="font-bold text-slate-900">₹{(Number(student.totalFee) || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-slate-500">Discount</p>
                <p className="font-bold text-green-700">₹{(Number(student.discountAmount) || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-red-600">Due Amount</p>
                <p className="font-bold text-red-700">₹{((Number(student.totalFee) || 0) - (Number(student.discountAmount) || 0)).toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="flex-1 bg-red-600 text-white text-center py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              {showFullDetails ? 'Hide Full Details' : 'View Full Profile'}
            </button>
            <button
              onClick={() => setShowPayments(!showPayments)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
            >
              <Receipt className="w-4 h-4" />
              {showPayments ? 'Hide Payments' : `View Payments (${studentPayments.length})`}
            </button>
            <a 
              href={`tel:${student.phone}`}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
          </div>
          
          {/* Full Details Section */}
          {showFullDetails && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="w-5 h-5 text-red-600" />
                <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Full Profile Details</p>
              </div>
              
              {/* Basic Information */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-3">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3">Basic Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Student ID:</span> <span className="font-medium text-slate-900">{student.studentId || student.id}</span></div>
                  <div><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-900">{student.name}</span></div>
                  <div><span className="text-slate-500">Phone:</span> <span className="font-medium text-slate-900">{student.phone}</span></div>
                  <div><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-900">{student.email || "—"}</span></div>
                  <div><span className="text-slate-500">Enrollment Date:</span> <span className="font-medium text-slate-900">{student.enrollmentDate || "—"}</span></div>
                  <div><span className="text-slate-500">Profile Edit:</span> <span className="font-medium text-slate-900">{student.profileEditEnabled ? 'Enabled' : 'Disabled'}</span></div>
                </div>
              </div>
              
              {/* Academic Information */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mb-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-3">Academic Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">University:</span> <span className="font-medium text-slate-900">{student.university || "—"}</span></div>
                  <div><span className="text-slate-500">Faculty:</span> <span className="font-medium text-slate-900">{student.faculty || "—"}</span></div>
                  <div><span className="text-slate-500">Course:</span> <span className="font-medium text-slate-900">{student.course || "—"}</span></div>
                  <div><span className="text-slate-500">Stream:</span> <span className="font-medium text-slate-900">{student.stream || "—"}</span></div>
                  <div><span className="text-slate-500">Duration:</span> <span className="font-medium text-slate-900">{student.duration || "—"}</span></div>
                  <div><span className="text-slate-500">Start Year:</span> <span className="font-medium text-slate-900">{student.startYear || "—"}</span></div>
                  <div><span className="text-slate-500">End Year:</span> <span className="font-medium text-slate-900">{student.endYear || "—"}</span></div>
                </div>
              </div>
              
              {/* Fee Information */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-100 mb-3">
                <p className="text-xs font-bold text-green-900 uppercase tracking-wide mb-3">Fee Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Total Fee:</span> <span className="font-medium text-slate-900">₹{(Number(student.totalFee) || 0).toLocaleString("en-IN")}</span></div>
                  <div><span className="text-slate-500">Discount:</span> <span className="font-medium text-green-700">₹{(Number(student.discountAmount) || 0).toLocaleString("en-IN")}</span></div>
                  <div><span className="text-slate-500">Due Amount:</span> <span className="font-medium text-red-700">₹{((Number(student.totalFee) || 0) - (Number(student.discountAmount) || 0)).toLocaleString("en-IN")}</span></div>
                </div>
              </div>
              
              {/* Personal Details */}
              {student.personalDetails && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-3">Personal Details</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {student.personalDetails.dob && <div><span className="text-slate-500">Date of Birth:</span> <span className="font-medium text-slate-900">{student.personalDetails.dob}</span></div>}
                    {student.personalDetails.gender && <div><span className="text-slate-500">Gender:</span> <span className="font-medium text-slate-900">{student.personalDetails.gender}</span></div>}
                    {student.personalDetails.bloodGroup && <div><span className="text-slate-500">Blood Group:</span> <span className="font-medium text-slate-900">{student.personalDetails.bloodGroup}</span></div>}
                    {student.personalDetails.aadhaarNumber && <div><span className="text-slate-500">Aadhaar:</span> <span className="font-medium text-slate-900">{student.personalDetails.aadhaarNumber}</span></div>}
                    {student.personalDetails.fatherName && <div><span className="text-slate-500">Father's Name:</span> <span className="font-medium text-slate-900">{student.personalDetails.fatherName}</span></div>}
                    {student.personalDetails.motherName && <div><span className="text-slate-500">Mother's Name:</span> <span className="font-medium text-slate-900">{student.personalDetails.motherName}</span></div>}
                    {student.personalDetails.guardianName && <div><span className="text-slate-500">Guardian:</span> <span className="font-medium text-slate-900">{student.personalDetails.guardianName}</span></div>}
                    {student.personalDetails.guardianPhone && <div><span className="text-slate-500">Guardian Phone:</span> <span className="font-medium text-slate-900">{student.personalDetails.guardianPhone}</span></div>}
                    {student.personalDetails.address && <div className="col-span-2"><span className="text-slate-500">Address:</span> <span className="font-medium text-slate-900">{student.personalDetails.address}</span></div>}
                    {student.personalDetails.city && <div><span className="text-slate-500">City:</span> <span className="font-medium text-slate-900">{student.personalDetails.city}</span></div>}
                    {student.personalDetails.state && <div><span className="text-slate-500">State:</span> <span className="font-medium text-slate-900">{student.personalDetails.state}</span></div>}
                    {student.personalDetails.pincode && <div><span className="text-slate-500">Pincode:</span> <span className="font-medium text-slate-900">{student.personalDetails.pincode}</span></div>}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Payment History Section */}
          {showPayments && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Payment History</p>
              </div>
              {studentPayments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No payments found</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {studentPayments.map((payment, idx) => (
                    <div key={payment.id || idx} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Receipt #{payment.receiptNumber}</p>
                        <p className="text-xs text-slate-500">{payment.paymentDate}</p>
                      </div>
                      <p className="text-sm font-bold text-green-700">₹{Number(payment.amountPaid).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
