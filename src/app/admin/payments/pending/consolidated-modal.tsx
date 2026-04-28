"use client";

import { XCircle, Loader2, Receipt, Hourglass } from "lucide-react";
import Link from "next/link";

interface PendingPayment {
  id: string;
  status: "pending" | "approved" | "rejected";
  amount: number;
  paymentMethod: string;
  rejectionReason?: string;
  createdAt: any;
}

interface ConfirmedPayment {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string;
}

interface Student {
  name: string;
  totalFee: number;
  discountAmount: number;
}

export default function ConsolidatedPaymentsModal({
  open,
  onClose,
  studentPhone,
  student,
  pending,
  confirmed,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  studentPhone: string;
  student: Student | undefined;
  pending: PendingPayment[];
  confirmed: ConfirmedPayment[];
  loading: boolean;
}) {
  if (!open) return null;
  const totalFee = student?.totalFee || 0;
  const discount = student?.discountAmount || 0;
  const effectiveFee = totalFee - discount;
  const totalPaid = confirmed.reduce((s, p) => s + (p.amountPaid || 0), 0);
  const balanceDue = Math.max(0, effectiveFee - totalPaid);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Transaction Statement</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {student?.name || studentPhone} · {pending.length + confirmed.length} records
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          {student && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Fee</p>
                <p className="text-sm font-bold text-slate-900">₹{totalFee.toLocaleString("en-IN")}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Discount</p>
                <p className="text-sm font-bold text-blue-600">-₹{discount.toLocaleString("en-IN")}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Paid</p>
                <p className="text-sm font-bold text-emerald-600">₹{totalPaid.toLocaleString("en-IN")}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Balance</p>
                <p className={`text-sm font-bold ${balanceDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  ₹{balanceDue.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-red-600" />
            </div>
          ) : pending.length === 0 && confirmed.length === 0 ? (
            <div className="text-center py-10">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600">No transactions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-700 uppercase w-10">S.No</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-700 uppercase">Receipt #</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-700 uppercase">Date</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-700 uppercase">Mode</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-700 uppercase">Amount</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-700 uppercase">Status</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-700 uppercase">Reason</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-700 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pending.map((p, i) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-bold text-amber-700">{i + 1}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs text-slate-400">-</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-600">
                          {p.createdAt?.toDate?.().toLocaleDateString("en-GB").replace(/\//g, "-") || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-600">
                          {p.paymentMethod === "qr" || p.paymentMethod === "upi"
                            ? "UPI"
                            : p.paymentMethod === "bank"
                            ? "Bank"
                            : p.paymentMethod === "cash"
                            ? "Cash"
                            : "Card"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`font-bold text-xs ${p.status === "rejected" ? "text-red-700" : "text-amber-800"}`}>
                          ₹{p.amount.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {p.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                            <Hourglass className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-medium ${p.status === "rejected" ? "text-red-600" : "text-amber-600 italic"}`}>
                          {p.status === "rejected" ? p.rejectionReason || "Rejected" : "Waiting Approval"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-500">-</span>
                      </td>
                    </tr>
                  ))}
                  {confirmed.map((p, i) => {
                    const cumPaid = confirmed
                      .slice(0, i + 1)
                      .reduce((s, x) => s + (x.amountPaid || 0), 0);
                    const dueAfter = Math.max(0, effectiveFee - cumPaid);
                    const rowNum = pending.length + i + 1;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs font-bold text-slate-700">{rowNum}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/student/payments/${p.id}`}
                            className="font-mono text-xs text-blue-700 font-medium hover:underline"
                            target="_blank"
                          >
                            {p.receiptNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-slate-700">{p.paymentDate ? (() => { const [y,m,d] = p.paymentDate.split("-"); return `${d}-${m}-${y}`; })() : "—"}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-slate-600">{p.paymentMode}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-xs text-slate-900">
                            ₹{(p.amountPaid || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                            Paid
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-emerald-600 font-medium">Verified OK</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`font-bold text-xs ${dueAfter > 0 ? "text-red-700" : "text-emerald-700"}`}>
                            ₹{dueAfter.toLocaleString("en-IN")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
