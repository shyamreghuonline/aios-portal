"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreditCard, Search, Loader2, Receipt, Plus, Printer } from "lucide-react";
import Link from "next/link";

interface Payment {
  id: string;
  receiptNumber: string;
  studentName: string;
  phone: string;
  program: string;
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

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, receipt no, or phone..."
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
                <th className="text-left px-4 py-3 font-bold text-white text-[10px] uppercase tracking-widest">Receipt</th>
                <th className="text-left px-4 py-3 font-bold text-white text-[10px] uppercase tracking-widest">Student</th>
                <th className="text-left px-4 py-3 font-bold text-white text-[10px] uppercase tracking-widest">Program</th>
                <th className="text-left px-4 py-3 font-bold text-white text-[10px] uppercase tracking-widest">Amount</th>
                <th className="text-left px-4 py-3 font-bold text-white text-[10px] uppercase tracking-widest">Installment</th>
                <th className="text-left px-4 py-3 font-bold text-white text-[10px] uppercase tracking-widest">Balance</th>
                <th className="text-left px-4 py-3 font-bold text-white text-[10px] uppercase tracking-widest">Date</th>
                <th className="text-right px-4 py-3 font-bold text-white text-[10px] uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => (
                <tr key={payment.id} className="border-b border-red-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-900 font-medium">
                      {payment.receiptNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{payment.studentName}</p>
                    <p className="text-xs text-slate-600">{payment.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                      {payment.program}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-green-600">
                    ₹{(payment.amountPaid || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    #{payment.installmentNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${(payment.balanceAmount || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                      ₹{(payment.balanceAmount || 0).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs font-medium">{payment.paymentDate}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/payments/${payment.id}`}
                      className="p-1.5 text-slate-600 hover:text-blue-600 transition-colors inline-flex"
                      title="View Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
