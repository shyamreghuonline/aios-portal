"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, setDoc, doc, getDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Phone, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Loader2, 
  X,
  ArrowLeft,
  Save,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FollowUpTab = "pending" | "inprogress" | "completed";

interface Student {
  id: string;
  name: string;
  studentId: string;
  phone: string;
  email?: string;
  totalFee: number;
  discountAmount?: number;
  course?: string;
  stream?: string;
  createdAt?: string;
}

interface Payment {
  id: string;
  studentPhone: string;
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
  createdAt: string;
  updatedAt: string;
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
          // Reset status to pending if it was deleted but now qualifies again
          const newStatus = existingRecord.status === "deleted" ? "pending" : existingRecord.status;
          items.push({
            ...existingRecord,
            dueAmount,
            daysOverdue,
            lastPaymentDate: lastPaymentDateStr,
            status: newStatus,
          });
        } else {
          // Create new pending record
          items.push({
            id: `followup_${student.id}_${Date.now()}`,
            studentId: student.id,
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
  const filteredItems = calculatedFollowUps.filter((item) => item.status === activeTab);

  // Counts for tabs
  const tabCounts = {
    pending: calculatedFollowUps.filter((i) => i.status === "pending").length,
    inprogress: calculatedFollowUps.filter((i) => i.status === "inprogress").length,
    completed: calculatedFollowUps.filter((i) => i.status === "completed").length,
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

  // Handle mark as done
  const handleMarkDone = async (item: FollowUpRecord) => {
    try {
      const updatedRecord: FollowUpRecord = {
        ...item,
        status: "completed",
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, "followUps", item.id), updatedRecord);
      
      setFollowUpRecords(prev => 
        prev.map(r => r.id === item.id ? updatedRecord : r)
      );
    } catch (err) {
      console.error("Error marking as done:", err);
    }
  };

  // Handle delete
  const handleDelete = async (item: FollowUpRecord) => {
    if (!confirm("Are you sure you want to remove this follow-up?")) return;
    
    try {
      await setDoc(doc(db, "followUps", item.id), { ...item, status: "deleted" });
      setFollowUpRecords(prev => prev.filter(r => r.id !== item.id));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const tabs = [
    { key: "pending" as FollowUpTab, label: "Pending Follow-Up", count: tabCounts.pending },
    { key: "inprogress" as FollowUpTab, label: "In Progress", count: tabCounts.inprogress },
    { key: "completed" as FollowUpTab, label: "Completed", count: tabCounts.completed },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Follow-Up Management</h1>
            <p className="text-sm text-slate-500">Track and manage fee dues</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("dues")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === "dues"
                ? "bg-white text-red-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Student Dues
          </button>
          <button
            onClick={() => setViewMode("enquiries")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === "enquiries"
                ? "bg-white text-blue-700 shadow-sm"
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
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wide transition-all border-b-2 -mb-[2px] ${
                  activeTab === tab.key
                    ? "border-red-700 text-red-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-slate-500 font-medium">
                  {activeTab === "pending" 
                    ? "No students pending follow-up" 
                    : activeTab === "inprogress" 
                    ? "No follow-ups in progress" 
                    : "No completed follow-ups"}
                </p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[calc(100vh-280px)]">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Due Amount
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Days Overdue
                      </th>
                      <th className="text-center px-4 py-3 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Quick Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr 
                        key={item.id} 
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{item.studentName}</p>
                          {item.remarks.length > 0 && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                              {item.remarks[item.remarks.length - 1]}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-blue-700">{item.studentId || item.studentId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <a 
                            href={`tel:${item.studentPhone}`}
                            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-blue-700"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {item.studentPhone}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-red-600">
                            ₹{item.dueAmount.toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${item.daysOverdue > 30 ? "text-red-600" : "text-orange-600"}`}>
                            {item.daysOverdue} days
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleMarkDone(item)}
                              className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors"
                              title="Mark as Done"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStudent(item);
                                setNoteModalOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                              title="Add Note"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
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
                disabled={savingNote || !noteText.trim()}
                className="flex-1 py-2 text-sm font-bold text-white gradient-bg rounded-lg hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingNote ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save & Move to In Progress
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
