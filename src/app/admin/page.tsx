"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, IndianRupee, Receipt, AlertTriangle, TrendingUp, CalendarDays, Plus, ArrowRight, X, Phone, CheckCircle2, Edit3, Trash2, Loader2, Save, Clock } from "lucide-react";
import Link from "next/link";

type PeriodTab = "today" | "week" | "month";

interface Payment extends Record<string, unknown> {
  id: string;
  studentName: string;
  receiptNumber: string;
  paymentDate: string;
  amountPaid: number | string;
}

interface DashboardStats {
  totalStudents: number;
  totalPayments: number;
  totalCollected: number;
  totalPending: number;
  pendingPaymentCount: number;
  allPayments: Payment[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalPayments: 0,
    totalCollected: 0,
    totalPending: 0,
    pendingPaymentCount: 0,
    allPayments: [],
  });
  const [loading, setLoading] = useState(true);
  const [periodTab, setPeriodTab] = useState<PeriodTab>("today");
  
  // Follow-ups data state
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  // Student detail modal state
  const [detailStudent, setDetailStudent] = useState<any>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Get students
        const studentsSnap = await getDocs(collection(db, "students"));
        const totalStudents = studentsSnap.size;

        // Get payments
        const paymentsSnap = await getDocs(collection(db, "payments"));
        let totalCollected = 0;
        paymentsSnap.forEach((doc) => {
          totalCollected += parseFloat(doc.data().amountPaid || "0");
        });

        // Get pending payment count
        const pendingSnap = await getDocs(
          query(collection(db, "pendingPayments"), where("status", "==", "pending"))
        );
        const pendingPaymentCount = pendingSnap.size;

        // Calculate pending
        let totalFees = 0;
        studentsSnap.forEach((doc) => {
          totalFees += parseFloat(doc.data().totalFee || "0");
        });

        // All payments sorted
        const allQuery = query(collection(db, "payments"), orderBy("createdAt", "desc"));
        const allSnap = await getDocs(allQuery);
        const allPayments = allSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Payment[];
        
        // Fetch students and payments for follow-ups
        const studentsData = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const paymentsData = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStudents(studentsData);
        setPayments(paymentsData);

        setStats({
          totalStudents,
          totalPayments: paymentsSnap.size,
          totalCollected,
          totalPending: totalFees - totalCollected,
          pendingPaymentCount,
          allPayments,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      label: "Total Collected",
      value: `₹${stats.totalCollected.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "bg-green-50 text-green-600",
      iconBg: "bg-green-100",
    },
    {
      label: "Pending Amount",
      value: `₹${Math.max(0, stats.totalPending).toLocaleString("en-IN")}`,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
      iconBg: "bg-red-100",
    },
    {
      label: "Pending Approvals",
      value: stats.pendingPaymentCount,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
      iconBg: "bg-amber-100",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of your payment management</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/students/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg gradient-bg hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </Link>
          <Link
            href="/admin/payments/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg gradient-bg hover:shadow-lg transition-all"
          >
            <Receipt className="w-4 h-4" />
            New Payment
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color.split(" ")[1]}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-slate-300" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? "..." : card.value}
            </p>
            <p className="text-xs text-slate-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Two Column Layout: Follow-Up List + Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionCenter>
          <FollowUpList 
            loading={loading} 
            students={students} 
            payments={payments}
            onViewStudent={setDetailStudent}
          />
        </ActionCenter>
        {/* Right: Action Center with Payment Report */}
        <ActionCenter>
          <PaymentReport stats={stats} loading={loading} periodTab={periodTab} setPeriodTab={setPeriodTab} />
        </ActionCenter>
      </div>
      
      {/* Student Detail Modal */}
      {detailStudent && (
        <StudentDetailModal 
          student={detailStudent} 
          onClose={() => setDetailStudent(null)} 
        />
      )}
    </div>
  );
}

// Student Detail Modal Component
function StudentDetailModal({ student, onClose }: { student: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase">Phone</p>
              <a href={`tel:${student.phone}`} className="text-sm font-medium text-blue-700 hover:underline">
                {student.phone}
              </a>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase">Email</p>
              <p className="text-sm font-medium text-slate-900">{student.email || "—"}</p>
            </div>
          </div>
          
          {/* Course Info */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase mb-2">Course Details</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
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
                <p className="font-bold text-slate-900">₹{(student.totalFee || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-slate-500">Discount</p>
                <p className="font-bold text-green-700">₹{(student.discountAmount || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-red-600">Due Amount</p>
                <p className="font-bold text-red-700">₹{((student.totalFee || 0) - (student.discountAmount || 0)).toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Link 
              href={`/admin/students?id=${student.id}`}
              className="flex-1 bg-red-600 text-white text-center py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              View Full Profile
            </Link>
            <a 
              href={`tel:${student.phone}`}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentReport({ stats, loading, periodTab, setPeriodTab }: {
  stats: DashboardStats;
  loading: boolean;
  periodTab: PeriodTab;
  setPeriodTab: (t: PeriodTab) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  
  // Get start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  
  // Get start of current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const filtered = useMemo(() => {
    return stats.allPayments.filter((p) => {
      const d = p.paymentDate;
      if (periodTab === "today") return d === today;
      if (periodTab === "week") return d >= weekStartStr && d <= today;
      if (periodTab === "month") return d >= monthStartStr && d <= today;
      return true;
    });
  }, [stats.allPayments, periodTab, today, weekStartStr, monthStartStr]);

  const periodDiscount = filtered
    .filter((p) => p.isDiscount || p.paymentMode === "Discount")
    .reduce((sum, p) => sum + parseFloat(p.amountPaid as string || "0"), 0);
  const periodCollected = filtered
    .filter((p) => !p.isDiscount && p.paymentMode !== "Discount")
    .reduce((sum, p) => sum + parseFloat(p.amountPaid as string || "0"), 0);
  const periodTotal = periodCollected + periodDiscount;

  const tabs: { key: PeriodTab; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-800">Payment Report</h2>
        </div>
        <Link href="/admin/payments" className="text-xs text-red-600 hover:underline">View All</Link>
      </div>

      {/* Period Tabs */}
      <div className="px-5 pt-4 flex items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setPeriodTab(t.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              periodTab === t.key
                ? "gradient-bg text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-700 uppercase tracking-wide">Discount</p>
            <p className="text-sm font-bold text-amber-600">₹{periodDiscount.toLocaleString("en-IN")}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-700 uppercase tracking-wide">Collected</p>
            <p className="text-sm font-bold text-green-700">₹{periodCollected.toLocaleString("en-IN")}</p>
          </div>
          <div className="text-right border-l border-slate-200 pl-4">
            <p className="text-xs text-slate-700 uppercase tracking-wide">Total</p>
            <p className="text-sm font-bold text-blue-700">₹{periodTotal.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No payments for this period</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((payment) => (
              <Link
                key={payment.id}
                href={`/admin/payments/${payment.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-300 hover:bg-white transition-all group"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-red-700 transition-colors">
                    {payment.studentName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {payment.receiptNumber} &bull; {payment.paymentDate}
                  </p>
                </div>
                <p className="text-sm font-bold text-green-600">
                  ₹{parseFloat(payment.amountPaid as string || "0").toLocaleString("en-IN")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Parse date safely
function parseLocalDate(dateValue: string | { toDate: () => Date } | unknown): Date {
  if (!dateValue) return new Date();
  if (typeof dateValue === "object" && dateValue !== null && "toDate" in dateValue && typeof (dateValue as { toDate: () => Date }).toDate === "function") {
    return (dateValue as { toDate: () => Date }).toDate();
  }
  if (typeof dateValue === "string") {
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return new Date(dateValue);
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  return new Date();
}

function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

// Action Center Container
function ActionCenter({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-sm font-bold text-slate-800">Action Center</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

// Follow-Up List Component - Fee Dues
type FollowUpTab = "pending" | "inprogress" | "completed";

interface FollowUpStudent {
  id: string;
  studentName: string;
  studentId: string;
  phone: string;
  dueAmount: number;
  daysOverdue: number;
  lastPaymentDays: number;
  status: FollowUpTab;
  studentData?: any;
}

function FollowUpList({ loading, students, payments, onViewStudent }: { loading: boolean; students: any[]; payments: any[]; onViewStudent: (student: any) => void }) {
  const [activeTab, setActiveTab] = useState<FollowUpTab>("pending");
  const today = new Date();

  // Calculate real follow-up data from students and payments
  const followUpData: FollowUpStudent[] = useMemo(() => {
    if (!students.length || !payments.length) return [];
    
    const items: FollowUpStudent[] = [];
    
    students.forEach((student) => {
      // Get payments for this student
      const studentPayments = payments.filter((p) => p.studentPhone === student.phone);
      
      // Calculate total cash collected (ignore discounts)
      const totalCashCollected = studentPayments.reduce(
        (sum, p) => sum + (parseFloat(String(p.amountPaid || "0")) || 0), 
        0
      );
      
      // Due amount = Total Fee - Cash Collected
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
      
      // Only include students with due amount > 0 and overdue > 20 days
      if (dueAmount > 0 && daysOverdue > 20) {
        items.push({
          id: student.id,
          studentName: student.name,
          studentId: student.studentId || student.id,
          phone: student.phone,
          dueAmount,
          daysOverdue,
          lastPaymentDays: daysOverdue,
          status: "pending", // Default to pending for dashboard view
          studentData: student,
        });
      }
    });
    
    return items.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [students, payments]);

  const filteredData = followUpData.filter((s) => s.status === activeTab);

  const tabCounts = {
    pending: followUpData.filter((s) => s.status === "pending").length,
    inprogress: followUpData.filter((s) => s.status === "inprogress").length,
    completed: followUpData.filter((s) => s.status === "completed").length,
  };

  const tabs = [
    { key: "pending" as FollowUpTab, label: "Pending Follow-Up", count: tabCounts.pending },
    { key: "inprogress" as FollowUpTab, label: "In Progress", count: tabCounts.inprogress },
    { key: "completed" as FollowUpTab, label: "Completed Follow-Ups", count: tabCounts.completed },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">Follow-Up List (Fee Dues)</h2>
        <Link
          href="/admin/follow-ups"
          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
        >
          Manage All Follow-ups
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-4 flex items-center gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 -mb-[2px] ${
              activeTab === tab.key
                ? "border-red-600 text-red-600 bg-red-50"
                : "border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="p-5">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">No records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Student Name
                  </th>
                  <th className="text-left py-2 px-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                    ID
                  </th>
                  <th className="text-left py-2 px-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Contact
                  </th>
                  <th className="text-left py-2 px-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Due Amount
                  </th>
                  <th className="text-left py-2 px-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Days Overdue
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2">
                      <p className="text-sm font-medium text-slate-900">{student.studentName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Last payment done {student.lastPaymentDays} days ago
                      </p>
                    </td>
                    <td className="py-3 px-2">
                      <button 
                        onClick={() => student.studentData && onViewStudent(student.studentData)}
                        className="text-xs font-mono text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                      >
                        {student.studentId}
                      </button>
                    </td>
                    <td className="py-3 px-2">
                      <a 
                        href={`tel:${student.phone}`}
                        className="text-xs text-slate-700 hover:text-blue-700"
                      >
                        {student.phone}
                      </a>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-sm font-bold text-red-600">₹{student.dueAmount.toLocaleString("en-IN")}</p>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-sm font-bold ${student.daysOverdue > 30 ? "text-red-600" : "text-orange-600"}`}>
                        {student.daysOverdue}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
