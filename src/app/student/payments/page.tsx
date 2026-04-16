"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Receipt, Download, Loader2 } from "lucide-react";

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
}

export default function StudentPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-gray-900 mb-1">My Payments</h1>
      <p className="text-sm text-gray-500 mb-6">All your payment history and receipts</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No payments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-mono text-red-600 font-medium">{payment.receiptNumber}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    ₹{payment.amountPaid.toLocaleString("en-IN")}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  payment.balanceAmount <= 0 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                }`}>
                  {payment.balanceAmount <= 0 ? "Cleared" : `₹${payment.balanceAmount.toLocaleString("en-IN")} pending`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs text-gray-500 mb-3">
                <div>
                  <p className="font-medium text-gray-400">Date</p>
                  <p className="text-gray-700">{payment.paymentDate}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-400">Mode</p>
                  <p className="text-gray-700">{payment.paymentMode}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-400">Installment</p>
                  <p className="text-gray-700">{payment.installmentNumber} of {payment.totalInstallments}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
