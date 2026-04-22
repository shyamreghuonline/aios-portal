"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { 
  Receipt, 
  Download, 
  Loader2, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Landmark,
  Clock,
  Hourglass,
} from "lucide-react";

interface Payment {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string;
  installmentNumber: number;
  totalInstallments: number;
  balanceAmount: number;
  totalFee: number;
  transactionRef?: string;
  status?: "confirmed" | "pending" | "rejected";
  isPending?: boolean;
  screenshotUrl?: string;
}

interface PendingPayment {
  id: string;
  studentId: string;
  studentPhone: string;
  studentName: string;
  amount: number;
  paymentMethod: "qr" | "card";
  status: "pending" | "approved" | "rejected";
  screenshotUrl?: string;
  transactionId?: string;
  createdAt: any;
}

export default function StudentPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<{ totalFee: number; discountAmount: number } | null>(null);

  useEffect(() => {
    async function fetchPayments() {
      if (!user?.phone) return;
      try {
        // Fetch confirmed payments
        const q = query(
          collection(db, "payments"),
          where("studentPhone", "==", user.phone)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data(),
          status: "confirmed"
        })) as unknown as Payment[];
        
        // Fetch pending payments
        const pendingQuery = query(
          collection(db, "pendingPayments"),
          where("studentPhone", "==", user.phone)
        );
        const pendingSnap = await getDocs(pendingQuery);
        const pendingData = pendingSnap.docs.map((d) => {
          const p = d.data() as PendingPayment;
          return {
            id: d.id,
            receiptNumber: `PENDING-${d.id.slice(-6)}`,
            amountPaid: p.amount,
            paymentDate: p.createdAt?.toDate?.().toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            paymentMode: p.paymentMethod === "qr" ? "UPI/QR" : "Card",
            installmentNumber: 0,
            totalInstallments: 0,
            balanceAmount: 0,
            totalFee: 0,
            transactionRef: p.transactionId || "",
            status: "pending" as const,
            isPending: true,
            screenshotUrl: p.screenshotUrl,
          };
        });
        
        // Combine and sort by date (newest first)
        const allPayments = [...data, ...pendingData].sort((a, b) => 
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );
        
        setPayments(allPayments);
        setPendingPayments(pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as PendingPayment[]);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, [user]);

  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalFee = studentData?.totalFee || payments[0]?.totalFee || 0;
  const discountAmount = studentData?.discountAmount || 0;
  const effectiveFee = totalFee - discountAmount;
  const balanceDue = Math.max(0, effectiveFee - totalPaid);
  const paymentProgress = effectiveFee > 0 ? Math.round((totalPaid / effectiveFee) * 100) : 0;

  return (
    <div className="pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">My Payments</h1>
        <p className="text-sm text-gray-500">Track your fee payments and download receipts</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards - Professional Design */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Total Course Fee */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center relative overflow-hidden">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                <Landmark className="w-6 h-6 text-amber-700" />
              </div>
              <p className="text-[11px] font-semibold text-slate-600 mb-1">Total Course Fee</p>
              <p className="text-xl font-extrabold text-slate-900">₹{totalFee.toLocaleString("en-IN")}</p>
              {discountAmount > 0 && (
                <p className="text-[10px] text-green-600 mt-1 font-medium">-₹{discountAmount.toLocaleString("en-IN")} discount applied</p>
              )}
            </div>

            {/* Your Payments */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center relative overflow-hidden">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-700" />
              </div>
              <p className="text-[11px] font-semibold text-slate-600 mb-1">Your Payments</p>
              <p className="text-xl font-extrabold text-green-700">₹{totalPaid.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {payments.filter(p => !p.isPending).length} confirmed
                {pendingPayments.length > 0 && (
                  <span className="text-amber-600"> • {pendingPayments.length} pending</span>
                )}
              </p>
            </div>

            {/* Remaining Balance */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center relative overflow-hidden">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${balanceDue > 0 ? "bg-red-50" : "bg-green-50"}`}>
                {balanceDue > 0 ? (
                  <Clock className="w-6 h-6 text-red-700" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-700" />
                )}
              </div>
              <p className="text-[11px] font-semibold text-slate-600 mb-1">Remaining Balance</p>
              <p className={`text-xl font-extrabold ${balanceDue > 0 ? "text-red-700" : "text-green-700"}`}>
                ₹{balanceDue.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {balanceDue > 0 ? "Payment pending" : "Course fee cleared"}
              </p>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Payment Summary</h2>
              <span className="text-[10px] font-semibold text-slate-700">{payments.length} records</span>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {/* Table Header */}
                  <thead className="gradient-bg">
                    <tr>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider w-12">S.No</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider">Receipt #</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider">Paid On</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider">Amount</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider">Due After</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  
                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((payment, index) => {
                      // Calculate running balance (due amount after this payment)
                      const effectiveFee = totalFee - discountAmount;
                      const paymentsUpToThis = payments
                        .slice(0, index + 1)
                        .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
                      const dueAfter = Math.max(0, effectiveFee - paymentsUpToThis);
                      
                      return (
                        <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center">
                            <span className="text-[11px] lg:text-xs font-bold text-slate-700">{index + 1}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Link 
                              href={`/student/payments/${payment.id}`}
                              className="font-mono text-[11px] lg:text-xs text-blue-700 font-medium hover:text-blue-900 hover:underline transition-colors"
                            >
                              {payment.receiptNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] lg:text-xs text-slate-700">{payment.paymentDate}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-[11px] lg:text-xs text-slate-900">₹{payment.amountPaid.toLocaleString("en-IN")}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {payment.isPending ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] lg:text-xs font-bold">
                                <Hourglass className="w-3 h-3" />
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-[11px] lg:text-xs font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                                Paid
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold text-[11px] lg:text-xs ${dueAfter > 0 ? "text-red-700" : "text-green-700"}`}>
                              ₹{dueAfter.toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {!payment.isPending && (
                                <>
                                  <Link
                                    href={`/student/payments/${payment.id}`}
                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-red-700 transition-colors"
                                    title="View Receipt"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </Link>
                                  <button
                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-red-700 transition-colors"
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {payment.isPending && payment.screenshotUrl && (
                                <a
                                  href={payment.screenshotUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-700 transition-colors"
                                  title="View Screenshot"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
}
