"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, IndianRupee, Receipt, AlertTriangle, TrendingUp, CalendarDays, Plus, ArrowRight, X, Phone, CheckCircle2, Edit3, Trash2, Loader2, Save, Clock, Mail, GraduationCap } from "lucide-react";
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
  const [followUpRecords, setFollowUpRecords] = useState<any[]>([]);
  
  // Student detail modal state
  const [detailStudent, setDetailStudent] = useState<any>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Get students (exclude archived)
        const studentsSnap = await getDocs(collection(db, "students"));
        const activeStudents = studentsSnap.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as { id: string; [k: string]: unknown }))
          .filter((s: any) => !(s as { archived?: boolean }).archived);
        const totalStudents = activeStudents.length;

        // Get payments (exclude archived)
        const paymentsSnap = await getDocs(collection(db, "payments"));
        const activePayments = paymentsSnap.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as { id: string; [k: string]: unknown }))
          .filter((p: any) => !(p as { archived?: boolean }).archived);
        let totalCollected = 0;
        activePayments.forEach((p: any) => {
          totalCollected += parseFloat((p as { amountPaid?: string }).amountPaid || "0");
        });

        // Get pending payment count
        const pendingSnap = await getDocs(
          query(collection(db, "pendingPayments"), where("status", "==", "pending"))
        );
        const pendingPaymentCount = pendingSnap.size;

        // Calculate pending fees from active students only     
        let totalFees = 0;
        activeStudents.forEach((s: { totalFee?: string }) => {
          totalFees += parseFloat(s.totalFee || "0");
        });

        // All payments sorted (excluding archived)
        const allQuery = query(collection(db, "payments"), orderBy("createdAt", "desc"));
        const allSnap = await getDocs(allQuery);
        const allPayments = (
          allSnap.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          })) as (Payment & { archived?: boolean })[]
        ).filter((p: any) => !p.archived);

        // Get existing follow-up records
        const followUpsSnap = await getDocs(collection(db, "followUps"));
        const followUpsData = followUpsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

        setStudents(activeStudents);
        setPayments(activePayments);
        setFollowUpRecords(followUpsData);

        setStats({
          totalStudents,
          totalPayments: activePayments.length,
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
            followUpRecords={followUpRecords}
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
          payments={payments}
        />
      )}
    </div>
  );
}

// Student Detail Modal Component
function StudentDetailModal({ student, onClose, payments }: { student: any; onClose: () => void; payments: any[] }) {
  const [showPayments, setShowPayments] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  
  // Filter payments for this student
  const studentPayments = payments.filter(p => p.studentPhone === student.phone || p.studentName === student.name);
  
  // Helper to safely get nested personal details
  const pd = student.personalDetails || {};
  
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
                <p className="text-xs text-blue-900 uppercase tracking-wide">Phone Number</p>
              </div>
              <a href={`tel:${student.phone}`} className="text-sm text-blue-700 hover:underline">
                {student.phone}
              </a>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-slate-600" />
                <p className="text-xs text-slate-900 uppercase tracking-wide">Email Address</p>
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
                  <div><span className="text-slate-500">Total Fee:</span> <span className="font-medium text-slate-900">₹{(student.totalFee || 0).toLocaleString("en-IN")}</span></div>
                  <div><span className="text-slate-500">Discount:</span> <span className="font-medium text-green-700">₹{(student.discountAmount || 0).toLocaleString("en-IN")}</span></div>
                  <div><span className="text-slate-500">Due Amount:</span> <span className="font-medium text-red-700">₹{((student.totalFee || 0) - (student.discountAmount || 0)).toLocaleString("en-IN")}</span></div>
                </div>
              </div>
              
              {/* Personal Details */}
              {(pd.dob || pd.gender || pd.bloodGroup || pd.aadhaarNumber || pd.fatherName || pd.motherName || pd.guardianName || pd.address) && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-3">Personal Details</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {pd.dob && <div><span className="text-slate-500">Date of Birth:</span> <span className="font-medium text-slate-900">{pd.dob}</span></div>}
                    {pd.gender && <div><span className="text-slate-500">Gender:</span> <span className="font-medium text-slate-900">{pd.gender}</span></div>}
                    {pd.bloodGroup && <div><span className="text-slate-500">Blood Group:</span> <span className="font-medium text-slate-900">{pd.bloodGroup}</span></div>}
                    {pd.aadhaarNumber && <div><span className="text-slate-500">Aadhaar:</span> <span className="font-medium text-slate-900">{pd.aadhaarNumber}</span></div>}
                    {pd.fatherName && <div><span className="text-slate-500">Father's Name:</span> <span className="font-medium text-slate-900">{pd.fatherName}</span></div>}
                    {pd.motherName && <div><span className="text-slate-500">Mother's Name:</span> <span className="font-medium text-slate-900">{pd.motherName}</span></div>}
                    {pd.guardianName && <div><span className="text-slate-500">Guardian:</span> <span className="font-medium text-slate-900">{pd.guardianName}</span></div>}
                    {pd.guardianPhone && <div><span className="text-slate-500">Guardian Phone:</span> <span className="font-medium text-slate-900">{pd.guardianPhone}</span></div>}
                    {pd.address && <div className="col-span-2"><span className="text-slate-500">Address:</span> <span className="font-medium text-slate-900">{pd.address}</span></div>}
                    {pd.city && <div><span className="text-slate-500">City:</span> <span className="font-medium text-slate-900">{pd.city}</span></div>}
                    {pd.state && <div><span className="text-slate-500">State:</span> <span className="font-medium text-slate-900">{pd.state}</span></div>}
                    {pd.pincode && <div><span className="text-slate-500">Pincode:</span> <span className="font-medium text-slate-900">{pd.pincode}</span></div>}
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
                  {studentPayments.map((payment: any, idx: number) => (
                    <div key={payment.id || idx} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Receipt #{payment.receiptNumber}</p>
                        <p className="text-xs text-slate-500">{payment.paymentDate ? (() => { const [y,m,d] = payment.paymentDate.split("-"); return `${d}-${m}-${y}`; })() : "—"}</p>
                      </div>
                      <p className="text-sm font-bold text-green-700">₹{parseFloat(payment.amountPaid || "0").toLocaleString('en-IN')}</p>
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

function PaymentReport({ stats, loading, periodTab, setPeriodTab }: {
  stats: DashboardStats;
  loading: boolean;
  periodTab: PeriodTab;
  setPeriodTab: (t: PeriodTab) => void;
}) {
  // Use local timezone (not UTC) for date comparisons
  const fmt = (d: Date) => d.toLocaleDateString("en-CA");
  const today = fmt(new Date());
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = fmt(weekStart);
  const monthStartStr = fmt(new Date(now.getFullYear(), now.getMonth(), 1));

  const filtered = useMemo(() => {
    return stats.allPayments.filter((p: Payment) => {
      const d = p.paymentDate;
      if (periodTab === "today") return d === today;
      if (periodTab === "week") return d >= weekStartStr && d <= today;
      if (periodTab === "month") return d >= monthStartStr && d <= today;
      return true;
    });
  }, [stats.allPayments, periodTab, today, weekStartStr, monthStartStr]);

  const periodDiscount = filtered
    .filter((p: any) => p.isDiscount || p.paymentMode === "Discount")
    .reduce((sum: number, p: any) => sum + parseFloat(p.amountPaid as string || "0"), 0);
  const periodCollected = filtered
    .filter((p: any) => !p.isDiscount && p.paymentMode !== "Discount")
    .reduce((sum: number, p: any) => sum + parseFloat(p.amountPaid as string || "0"), 0);
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
            {filtered.map((payment: Payment) => (
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
                    {payment.receiptNumber} &bull; {payment.paymentDate ? (() => { const [y,m,d] = payment.paymentDate.split("-"); return `${d}-${m}-${y}`; })() : "—"}
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
  // Strip time component so calculation is based on calendar date only
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round(Math.abs((d1.getTime() - d2.getTime()) / oneDay));
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
type FollowUpTab = "pending" | "inprogress" | "completed" | "archived";

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

function FollowUpList({ loading, students, payments, followUpRecords, onViewStudent }: { loading: boolean; students: any[]; payments: any[]; followUpRecords: any[]; onViewStudent: (student: any) => void }) {
  const [activeTab, setActiveTab] = useState<FollowUpTab>("pending");
  const today = new Date();

  // Calculate real follow-up data from students and payments (matching follow-ups page logic)
  const followUpData: FollowUpStudent[] = useMemo(() => {
    if (!students.length || !payments.length) return [];

    const items: FollowUpStudent[] = [];

    students.forEach((student: any) => {
      // Skip archived students
      if (student.archived) return;

      // Get payments for this student by studentId, excluding discounts (same as follow-ups page)
      const studentPayments = payments.filter(
        (p: any) => p.studentId === (student.studentId || student.id) &&
               !p.isDiscount &&
               p.paymentMode !== "Discount"
      );

      // Calculate total cash collected (ignore discounts)
      const totalCashCollected = studentPayments.reduce(
        (sum: number, p: any) => sum + (parseFloat(String(p.amountPaid || "0")) || 0),
        0
      );

      // Due amount = Total Fee - Cash Collected
      const totalFee = parseFloat(String(student.totalFee || "0")) || 0;
      const dueAmount = totalFee - totalCashCollected;

      // Find last payment date
      const lastPayment = studentPayments
        .filter((p: any) => p.paymentDate)
        .sort((a: any, b: any) =>
          parseLocalDate(b.paymentDate).getTime() - parseLocalDate(a.paymentDate).getTime()
        )[0];

      const lastPaymentDate = lastPayment?.paymentDate || student.createdAt || new Date().toISOString();
      const daysOverdue = daysBetween(today, parseLocalDate(lastPaymentDate));

      // Only include students with due amount > 0 and overdue > 20 days
      if (dueAmount > 0 && daysOverdue > 20) {
        // Check for existing follow-up record to get real status
        const existingRecord = followUpRecords.find((r: any) => r.studentId === (student.studentId || student.id));

        let status: FollowUpTab = "pending";
        if (existingRecord) {
          // Check if remind date has passed before resetting status
          const remindDate = existingRecord.remindAfter ? new Date(existingRecord.remindAfter) : null;
          const remindDatePassed = remindDate && today >= remindDate;

          if ((existingRecord.status === "deleted" || existingRecord.status === "completed") && remindDatePassed) {
            status = "pending";
          } else if (existingRecord.status === "deleted") {
            status = "archived";
          } else if (["pending", "inprogress", "completed"].includes(existingRecord.status)) {
            status = existingRecord.status;
          }
        }

        items.push({
          id: student.id,
          studentName: student.name,
          studentId: student.studentId || student.id,
          phone: student.phone,
          dueAmount,
          daysOverdue,
          lastPaymentDays: daysOverdue,
          status,
          studentData: student,
        });
      }
    });

    return items.sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);
  }, [students, payments, followUpRecords]);

  const filteredData = followUpData.filter((s: any) => s.status === activeTab);

  const tabCounts = {
    pending: followUpData.filter((s: any) => s.status === "pending").length,
    inprogress: followUpData.filter((s: any) => s.status === "inprogress").length,
    completed: followUpData.filter((s: any) => s.status === "completed").length,
    archived: followUpData.filter((s: any) => s.status === "archived").length,
  };

  const tabs = [
    { key: "pending" as FollowUpTab, label: "Pending Follow-Up", count: tabCounts.pending },
    { key: "inprogress" as FollowUpTab, label: "In Progress", count: tabCounts.inprogress },
    { key: "completed" as FollowUpTab, label: "Completed", count: tabCounts.completed },
    { key: "archived" as FollowUpTab, label: "Archived", count: tabCounts.archived },
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
                <tr className="border-b-2 border-slate-300 bg-gradient-to-r from-slate-50 to-slate-100">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider letter-spacing">
                    Student Name
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Due Amount
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Days Overdue
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((student: any) => (
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
