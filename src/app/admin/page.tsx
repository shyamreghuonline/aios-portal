"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, IndianRupee, Receipt, AlertTriangle, TrendingUp, CalendarDays } from "lucide-react";
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
  allPayments: Payment[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalPayments: 0,
    totalCollected: 0,
    totalPending: 0,
    allPayments: [],
  });
  const [loading, setLoading] = useState(true);
  const [periodTab, setPeriodTab] = useState<PeriodTab>("today");

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

        setStats({
          totalStudents,
          totalPayments: paymentsSnap.size,
          totalCollected,
          totalPending: totalFees - totalCollected,
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
      label: "Total Receipts",
      value: stats.totalPayments,
      icon: Receipt,
      color: "bg-purple-50 text-purple-600",
      iconBg: "bg-purple-100",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of your payment management</p>
        </div>
        <Link
          href="/admin/payments/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg gradient-bg hover:shadow-lg transition-all"
        >
          <Receipt className="w-4 h-4" />
          New Payment
        </Link>
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

      <PaymentReport stats={stats} loading={loading} periodTab={periodTab} setPeriodTab={setPeriodTab} />
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
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const filtered = useMemo(() => {
    return stats.allPayments.filter((p) => {
      const d = p.paymentDate;
      if (periodTab === "today") return d === today;
      if (periodTab === "week") return d >= weekAgo && d <= today;
      if (periodTab === "month") return d >= monthAgo && d <= today;
      return true;
    });
  }, [stats.allPayments, periodTab, today, weekAgo, monthAgo]);

  const periodTotal = filtered.reduce((sum, p) => sum + parseFloat(p.amountPaid as string || "0"), 0);

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
        <div className="ml-auto text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Collected</p>
          <p className="text-sm font-bold text-green-700">₹{periodTotal.toLocaleString("en-IN")}</p>
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
