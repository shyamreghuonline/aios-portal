"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreditCard, Search, Loader2, Receipt, Plus, Printer, Clock, ArrowRight, Calendar, X } from "lucide-react";
import Link from "next/link";

interface Payment {
  id: string;
  receiptNumber: string;
  studentName: string;
  studentId?: string;
  phone: string;
  program: string;
  university?: string;
  course?: string;
  stream?: string;
  amountPaid: number;
  totalFee: number;
  installmentNumber: number;
  totalInstallments: number;
  paymentDate: string;
  paymentMode: string;
  balanceAmount: number;
  createdAt?: unknown;
}

type DatePreset = "all" | "today" | "week" | "month" | "custom";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    async function fetchPayments() {
      try {
        const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Payment[];
        setPayments(data);
      } catch (err) {
        console.error("Error fetching payments:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  // Compute date range from preset
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  function inDateRange(d: string): boolean {
    if (!d) return datePreset === "all";
    if (datePreset === "all") return true;
    if (datePreset === "today") return d === today;
    if (datePreset === "week") return d >= weekStartStr && d <= today;
    if (datePreset === "month") return d >= monthStart && d <= today;
    if (datePreset === "custom") {
      if (customFrom && d < customFrom) return false;
      if (customTo && d > customTo) return false;
      return true;
    }
    return true;
  }

  const filtered = payments.filter(
    (p) =>
      (p.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      p.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.studentId?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search)) &&
      inDateRange(p.paymentDate)
  );

  const presets: { key: DatePreset; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Payments</h1>
          <p className="text-sm text-slate-600">{payments.length} payment records</p>
        </div>
        <Link
          href="/admin/payments/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg gradient-bg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </Link>
      </div>

      {/* Pending Payments Alert */}
      <Link
        href="/admin/payments/pending"
        className="flex items-center justify-between p-4 mb-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-900">Pending Payment Approvals</p>
            <p className="text-sm text-amber-700">Review and approve student payment screenshots</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-amber-600" />
      </Link>

      {/* Search + Date Filter (single line) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, receipt, phone, or student ID..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
          />
        </div>
        <Calendar className="w-4 h-4 text-slate-500" />
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => setDatePreset(p.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              datePreset === p.key
                ? "gradient-bg text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
        {datePreset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => {
                const v = e.target.value;
                setCustomFrom(v);
                if (customTo && v && v > customTo) setCustomTo("");
              }}
              className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
            />
            <span className="text-xs text-slate-500">to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => {
                const v = e.target.value;
                if (customFrom && v && v < customFrom) {
                  alert("'To' date must be on or after the 'From' date");
                  return;
                }
                setCustomTo(v);
              }}
              className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
            />
            {(customFrom || customTo) && (
              <button
                onClick={() => { setCustomFrom(""); setCustomTo(""); }}
                className="p-1 text-slate-400 hover:text-slate-700"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        <span className="ml-auto text-xs text-slate-500">
          {filtered.length} of {payments.length} shown
        </span>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-10 h-10 text-red-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              {search ? "No payments match your search" : "No payments recorded yet."}
            </p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="gradient-bg border-b-2 border-red-900">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Receipt</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Student</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">University</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Course</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Amount</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Balance</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => (
                <tr key={payment.id} className="border-b border-red-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/payments/${payment.id}`}
                      className="text-sm text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                    >
                      {payment.receiptNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-slate-900 text-sm">{payment.studentName}</p>
                    <p className="text-sm text-slate-600">{payment.phone}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-sm text-slate-900">
                      {payment.university || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-slate-900">
                    {(payment.course || payment.program || "").replace(/\s*\([^)]*\)/g, "")}{payment.stream ? `-${payment.stream}` : ""}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-green-600 text-sm">
                    ₹{(payment.amountPaid || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2.5 text-sm">
                    <span className={`${(payment.balanceAmount || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                      ₹{(payment.balanceAmount || 0).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 text-sm whitespace-nowrap">{payment.paymentDate}</td>
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
