"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreditCard, Search, Loader2, Receipt, Plus, Printer, Clock, ArrowRight } from "lucide-react";
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filtered = payments.filter(
    (p) =>
      p.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      p.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.studentId?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search)
  );

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

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, receipt, phone, or student ID..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
        />
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
          <table className="w-full text-sm">
            <thead>
              <tr className="gradient-bg border-b-2 border-red-900">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Receipt</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Student</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">University</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Course</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Amount</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Inst.</th>
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
                      className="text-[11px] lg:text-xs text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                    >
                      {payment.receiptNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-slate-900 text-[11px] lg:text-xs">{payment.studentName}</p>
                    <p className="text-[11px] lg:text-xs text-slate-600">{payment.phone}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] lg:text-xs text-slate-900">
                      {payment.university || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] lg:text-xs text-slate-900">
                    {(payment.course || payment.program || "").replace(/\s*\([^)]*\)/g, "")}{payment.stream ? `-${payment.stream}` : ""}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-green-600 text-[11px] lg:text-xs">
                    ₹{(payment.amountPaid || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 text-[11px] lg:text-xs">
                    #{payment.installmentNumber}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] lg:text-xs">
                    <span className={`${(payment.balanceAmount || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                      ₹{(payment.balanceAmount || 0).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 text-[11px] lg:text-xs whitespace-nowrap">{payment.paymentDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
