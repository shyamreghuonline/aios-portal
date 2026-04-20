"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { 
  Receipt, 
  Loader2, 
  Lock,
  ArrowRight,
  Shield,
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
}

export default function MakePaymentPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<{ totalFee: number; discountAmount: number } | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchPayments() {
      if (!user?.phone) return;
      try {
        const q = query(
          collection(db, "payments"),
          where("studentPhone", "==", user.phone),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as Payment[];
        setPayments(data);
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

  function handlePayNow() {
    if (!amount) return;
    setSubmitting(true);
    // Simulate payment processing
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 2000);
  }

  if (loading) {
    return (
      <div className="pb-20">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Make Payment</h1>
        <p className="text-sm text-gray-500 mb-6">Track your dues and initiate secure payments</p>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="pb-20">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Make Payment</h1>
        <p className="text-sm text-gray-500 mb-6">Track your dues and initiate secure payments</p>
        
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Payment Successful!</h2>
          <p className="text-sm text-slate-600 mb-4">
            Your payment of ₹{parseInt(amount).toLocaleString("en-IN")} has been processed successfully.
          </p>
          <p className="text-xs text-slate-500 mb-6">
            You will receive a receipt via email shortly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setAmount("");
            }}
            className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            Make Another Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Make Payment</h1>
        <p className="text-sm text-gray-500">Track your dues and initiate secure payments</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT CARD: Student Dues & Billing */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 gradient-bg">
            <h2 className="text-sm font-bold text-white">Student Dues & Billing context (Flexible Plan)</h2>
          </div>
          
          <div className="p-5">
            {/* Total Remaining Dues */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-600 mb-1">Total Remaining Dues (Net Cash Amount)</p>
              <p className="text-4xl font-extrabold text-slate-900">₹{balanceDue.toLocaleString("en-IN")}</p>
              <p className="text-xs text-slate-500 mt-1">This represents your total course balance to date, excluding any discounts.</p>
            </div>

            {/* Your Payments History */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3">Your Payments History</h3>
              
              {payments.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No payments recorded yet.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="gradient-bg">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold text-white uppercase text-[10px]">Receipt #</th>
                        <th className="text-left px-3 py-2 font-bold text-white uppercase text-[10px]">Due Date</th>
                        <th className="text-right px-3 py-2 font-bold text-white uppercase text-[10px]">Amount</th>
                        <th className="text-center px-3 py-2 font-bold text-white uppercase text-[10px]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.slice(0, 5).map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <Link 
                              href={`/student/payments/${payment.id}`}
                              className="font-mono text-[11px] text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              {payment.receiptNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{payment.paymentDate}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">₹{payment.amountPaid.toLocaleString("en-IN")}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                              <span className="w-2 h-2 rounded-full bg-green-600"></span>
                              Paid
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <p className="text-[11px] text-slate-500 mt-3">
                All part-payments are recorded here in sequence. Discuss your next amount with Admin.
              </p>
            </div>

            {/* Total Cash Paid */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Total Cash Paid to Date:</span>
                <span className="text-lg font-extrabold text-slate-900">₹{totalPaid.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: Initiate Flexible Part-Payment */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 gradient-bg">
            <h2 className="text-sm font-bold text-white">Initiate Flexible Part-Payment</h2>
          </div>
          
          <div className="p-5">
            {/* Payment Amount Input */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-slate-600 mb-2 block">Enter Your Agreed Payment Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">₹</span>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10,000"
                  className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            {/* SSL Secured Badge */}
            <div className="flex items-center justify-end gap-1 mb-4">
              <Lock className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-medium text-slate-500">SSL Secured Payment</span>
            </div>

            {/* Pay Now Button */}
            <button 
              onClick={handlePayNow}
              disabled={submitting || !amount}
              className="w-full bg-red-900 hover:bg-red-950 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mb-4"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <>
                  <span>Pay Now (₹{amount ? parseInt(amount).toLocaleString("en-IN") : "10,000"})</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>Secure Checkout</span>
                </>
              )}
            </button>

            {/* Razorpay Logos Section */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-center gap-4 mb-3">
                {/* Razorpay Logo Placeholder */}
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-slate-800">Razorpay</span>
                </div>
                {/* Payment Icons */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-5 bg-red-500 rounded flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">VISA</span>
                  </div>
                  <div className="w-8 h-5 bg-orange-500 rounded flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">MC</span>
                  </div>
                </div>
                {/* Verified Badges */}
                <div className="flex items-center gap-1 text-[9px]">
                  <Shield className="w-3 h-3 text-green-600" />
                  <span className="text-slate-600">Verified by<br/>Identity Check</span>
                </div>
              </div>
              
              {/* Trust Text */}
              <p className="text-[11px] text-slate-500 text-center">
                Trusted by over 800+ educational institutions.<br/>
                Upon clicking, a secure Razorpay checkout popup will appear.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
