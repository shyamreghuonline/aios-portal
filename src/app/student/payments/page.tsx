"use client";

import { useEffect, useRef, useState } from "react";
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  Loader2, X, CheckCircle, Clock, QrCode, CreditCard,
  ImageIcon, Receipt, Hourglass, FileUp, ArrowRight, Wallet, Landmark, Banknote,
} from "lucide-react";

// ─── Doc Modal ───────────────────────────────────────────────────────────────
function DocModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <p className="text-sm font-bold text-slate-800">Payment Screenshot</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="p-4 flex items-center justify-center min-h-[200px]">
          <img src={url} alt="Screenshot" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Arc Progress Gauge ───────────────────────────────────────────────────────
function ProgressArc({ percent }: { percent: number }) {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const gap = circ - arcLen;
  const filled = arcLen * Math.min(percent, 100) / 100;
  return (
    <div className="relative inline-flex items-center justify-center w-28 h-28 flex-shrink-0">
      <svg width="112" height="112" viewBox="0 0 112 112">
        <defs>
          <linearGradient id="pgArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,255,255,0.15)"
          strokeWidth="9" strokeDasharray={`${arcLen} ${gap}`} strokeLinecap="round"
          transform="rotate(135 56 56)" />
        {/* Progress */}
        <circle cx="56" cy="56" r={r} fill="none" stroke="url(#pgArcGrad)"
          strokeWidth="9" strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform="rotate(135 56 56)" style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white leading-none">{percent}%</span>
        <span className="text-[9px] text-white/60 uppercase tracking-widest">Paid</span>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ConfirmedPayment {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string;
  totalFee?: number;
  balanceAmount?: number;
}

interface PendingPayment {
  id: string;
  amount: number;
  paymentMethod: "qr" | "card" | "upi" | "bank" | "cash";
  status: "pending" | "approved" | "rejected";
  screenshotUrl?: string;
  transactionId?: string;
  rejectionReason?: string;
  createdAt: any;
}

type PayStep = "amount" | "method" | "qr" | "upload" | "success";
type Action = "none" | "custom" | "upload";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PaymentsHub() {
  const { user } = useAuth();
  const studentPhone = user?.studentData
    ? (user.studentData.id as string) || (user.studentData.phone as string)
    : undefined;

  const [confirmedPayments, setConfirmedPayments] = useState<ConfirmedPayment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [studentMeta, setStudentMeta] = useState<{
    totalFee: number; discountAmount: number; name: string; studentId?: string; course?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeAction, setActiveAction] = useState<Action>("none");
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);

  // Payment flow
  const [step, setStep] = useState<PayStep>("amount");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "card" | "upi" | "bank" | "cash" | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCardNotice, setShowCardNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upiId = "aiosedu@ptaxis";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    `upi://pay?pa=${upiId}&pn=AIOS EDU&am=${amount}&cu=INR`
  )}`;

  // (No auto-scroll — panel opens in-place)

  // Fetch payments data
  const fetchAll = async () => {
    if (!studentPhone) { setLoading(false); return; }
    try {
      const [pSnap, pendSnap, sDoc] = await Promise.all([
        getDocs(query(collection(db, "payments"), where("studentPhone", "==", studentPhone))),
        getDocs(query(collection(db, "pendingPayments"), where("studentPhone", "==", studentPhone))),
        getDoc(doc(db, "students", studentPhone)),
      ]);
      setConfirmedPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as ConfirmedPayment)));
      setPendingPayments(
        pendSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as PendingPayment))
          .filter(p => p.status !== "approved")
      );
      if (sDoc.exists()) {
        const d = sDoc.data();
        setStudentMeta({
          totalFee: d.totalFee || 0,
          discountAmount: d.discountAmount || 0,
          name: d.name || "",
          studentId: d.studentId || "",
          course: d.course || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch when studentPhone changes
  useEffect(() => {
    fetchAll();
  }, [studentPhone]);

  // Refresh data when window gains focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (studentPhone) fetchAll();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [studentPhone]);

  // Totals
  const totalPaid = confirmedPayments.reduce((s, p) => s + (p.amountPaid || 0), 0);
  const totalPending = pendingPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalFee = studentMeta?.totalFee || confirmedPayments[0]?.totalFee || 0;
  const discount = studentMeta?.discountAmount || 0;
  const effectiveFee = totalFee - discount;
  const balanceDue = Math.max(0, effectiveFee - totalPaid);
  const payPercent = effectiveFee > 0 ? Math.round((totalPaid / effectiveFee) * 100) : 0;

  const sd = user?.studentData as Record<string, unknown> | undefined;
  const studentName = (sd?.name as string) || studentMeta?.name || "Student";
  const studentIdStr = (sd?.studentId as string) || studentMeta?.studentId || "";
  const courseStr = (sd?.course as string) || studentMeta?.course || "";

  // ── Upload helpers ──────────────────────────────────────────────────────────
  async function toBase64(file: File): Promise<string> {
    if (file.size > 4 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
    if (file.type.startsWith("image/")) {
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const MAX = 900;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
            else { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = reject;
        img.src = url;
      });
    }
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert("File must be under 4MB"); return; }
    setScreenshot(file);
    try { setScreenshotPreview(await toBase64(file)); }
    catch (err: any) { alert(`Could not process image: ${err.message}`); }
  }

  async function handleSubmitPayment() {
    if (!amount || !paymentMethod || !studentPhone) return;
    setSubmitting(true);
    try {
      const screenshotUrl = screenshotPreview || "";
      await addDoc(collection(db, "pendingPayments"), {
        studentId: studentMeta?.studentId || studentPhone,
        studentPhone,
        studentName: studentMeta?.name || "",
        amount: parseFloat(amount),
        paymentMethod,
        status: "pending",
        screenshotUrl,
        transactionId: transactionId || null,
        createdAt: serverTimestamp(),
      });
      setStep("success");
      setPendingPayments(prev => [
        ...prev,
        { id: `tmp-${Date.now()}`, amount: parseFloat(amount), paymentMethod, status: "pending", createdAt: null },
      ]);
      // Close upload panel immediately after success so user can't resubmit
      if (activeAction === "upload") {
        setActiveAction("none");
        resetFlow();
      }
    } catch (err: any) {
      alert(`Failed to submit: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep("amount"); setAmount(""); setPaymentMethod(null);
    setScreenshot(null); setScreenshotPreview(null); setTransactionId("");
    setShowCardNotice(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  const STEP_LABELS: Record<string, string> = { amount: "Amount", method: "Method", qr: "QR Code", upload: "Proof" };

  return (
    <div className="pb-24">
      {/* ── FINANCE HEADER ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Fee Account</h1>
            <p className="text-xs text-slate-500">Manage your payments & receipts</p>
          </div>
          {balanceDue > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Outstanding</p>
              <p className="text-xl font-extrabold text-red-700">₹{balanceDue.toLocaleString("en-IN")}</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
            <Wallet className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
            <p className="text-[10px] text-blue-600 uppercase font-bold mb-1">Total Fee</p>
            <p className="text-sm font-extrabold text-blue-800">₹{effectiveFee.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1">Paid</p>
            <p className="text-sm font-extrabold text-emerald-700">₹{totalPaid.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
            <Clock className="w-5 h-5 text-red-500 mx-auto mb-1.5" />
            <p className="text-[10px] text-red-500 uppercase font-bold mb-1">Balance</p>
            <p className={`text-sm font-extrabold ${balanceDue > 0 ? "text-red-700" : "text-emerald-700"}`}>₹{balanceDue.toLocaleString("en-IN")}</p>
          </div>
        </div>
        {payPercent > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Payment Progress</span>
              <span className="font-bold">{payPercent}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full gradient-bg rounded-full transition-all" style={{ width: `${payPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── PENDING ALERT ─────────────────────────────────────────────────── */}
      {pendingPayments.length > 0 && (
        <div className="mb-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
          <p className="text-xs text-amber-800 font-medium">
            <strong>{pendingPayments.length}</strong> payment{pendingPayments.length > 1 ? "s" : ""} awaiting admin confirmation
            {totalPending > 0 && ` · ₹${totalPending.toLocaleString("en-IN")}`}
          </p>
        </div>
      )}

      {/* ── TRANSACTION STATEMENT ────────────────────────────────────────── */}
      {activeAction === "none" && (
        <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm mb-5">
          {/* Header — matching Enrollment Details style */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
            <span className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Receipt className="w-5 h-5 text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-900">Transaction Statement</h2>
              <p className="text-xs text-slate-500">{confirmedPayments.length + pendingPayments.length} payment records</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {balanceDue > 0 && (
                <button
                  onClick={() => { resetFlow(); setActiveAction("custom"); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                >
                  <Banknote className="w-4 h-4" /> Pay Now
                </button>
              )}
              <button
                onClick={() => { resetFlow(); setActiveAction("upload"); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
              >
                <FileUp className="w-4 h-4" /> Upload Receipt
              </button>
            </div>
          </header>
            {confirmedPayments.length === 0 && pendingPayments.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600">No transactions yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider w-12">S.No</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Receipt #</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Mode</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Amount</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Reason</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Balance</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pendingPayments.map((p, i) => (
                      <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-center"><span className="text-xs font-bold text-amber-700">{i + 1}</span></td>
                        <td className="px-4 py-3"><span className="font-mono text-xs text-slate-400">-</span></td>
                        <td className="px-4 py-3"><span className="text-xs text-slate-600">{p.createdAt?.toDate?.().toISOString().split('T')[0] || "-"}</span></td>
                        <td className="px-4 py-3"><span className="text-xs text-slate-600">{p.paymentMethod === "qr" || p.paymentMethod === "upi" ? "UPI" : p.paymentMethod === "bank" ? "Bank" : p.paymentMethod === "cash" ? "Cash" : "Card"}</span></td>
                        <td className="px-4 py-3"><span className={`font-bold text-xs ${p.status === "rejected" ? "text-red-700" : "text-amber-800"}`}>₹{p.amount.toLocaleString("en-IN")}</span></td>
                        <td className="px-4 py-3 text-center">
                          {p.status === "rejected" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                              <X className="w-3 h-3" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                              <Hourglass className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${
                            p.status === "rejected" ? "text-red-600" : p.status === "pending" ? "text-amber-600 italic" : "text-slate-500"
                          }`}>
                            {p.status === "rejected" ? (p.rejectionReason || "Rejected") : p.status === "pending" ? "Waiting Approval" : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs text-slate-500">-</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center h-4">
                            {p.screenshotUrl ? (
                              <button onClick={() => setViewDocUrl(p.screenshotUrl!)}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-700 transition-colors" title="View Proof">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {confirmedPayments.map((p, i) => {
                      const cumPaid = confirmedPayments.slice(0, i + 1).reduce((s, x) => s + (x.amountPaid || 0), 0);
                      const dueAfter = Math.max(0, effectiveFee - cumPaid);
                      const rowNum = pendingPayments.length + i + 1;
                      return (
                        <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center"><span className="text-xs font-bold text-slate-700">{rowNum}</span></td>
                          <td className="px-4 py-3">
                            <Link href={`/student/payments/${p.id}`} className="font-mono text-xs text-blue-700 font-medium hover:underline">
                              {p.receiptNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3"><span className="text-xs text-slate-700">{p.paymentDate}</span></td>
                          <td className="px-4 py-3"><span className="text-xs text-slate-600">{p.paymentMode}</span></td>
                          <td className="px-4 py-3"><span className="font-bold text-xs text-slate-900">₹{p.amountPaid.toLocaleString("en-IN")}</span></td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                              <CheckCircle className="w-3 h-3" /> Paid
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-emerald-600 font-medium">Verified OK</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold text-xs ${dueAfter > 0 ? "text-red-700" : "text-emerald-700"}`}>
                              ₹{dueAfter.toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link href={`/student/payments/${p.id}`}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-red-700 transition-colors" title="View Receipt">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      )}

      {/* ── PAYMENT FLOW PANEL ────────────────────────────────────────────── */}
      {activeAction === "custom" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

          {/* Header with close */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Make Payment</h3>
            <button onClick={() => setActiveAction("none")} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step breadcrumb (not on success) */}
          {step !== "success" && (
            <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
              {(["amount", "method", "qr", "upload"] as PayStep[])
                .filter(s => !(s === "qr" && paymentMethod !== "qr"))
                .map((s, i, arr) => {
                  const allSteps = ["amount", "method", "qr", "upload"];
                  const curIdx = allSteps.indexOf(step);
                  const sIdx = allSteps.indexOf(s);
                  const isDone = sIdx < curIdx;
                  const isActive = s === step;
                  return (
                    <span key={s} className="flex items-center gap-1">
                      {i > 0 && <span className="text-slate-300 text-xs">›</span>}
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isActive ? "text-red-600" : isDone ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        {isDone && "✓ "}{STEP_LABELS[s]}
                      </span>
                    </span>
                  );
                })}
            </div>
          )}

          <div className="p-5 max-w-xl mx-auto">
            {/* Success */}
            {step === "success" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">Payment Submitted!</h3>
                <p className="text-sm text-slate-600 mb-1">
                  ₹{parseInt(amount).toLocaleString("en-IN")} is awaiting admin approval.
                </p>
                <p className="text-xs text-slate-400 mb-6">You'll be notified once confirmed.</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setActiveAction("none")}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                    View History
                  </button>
                  <button onClick={resetFlow}
                    className="px-4 py-2 text-xs font-bold text-white gradient-bg rounded-lg">
                    Pay Again
                  </button>
                </div>
              </div>
            )}

            {/* Step: Amount */}
            {step === "amount" && (
              <div className="space-y-5">
                {balanceDue > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-red-500" />
                    <p className="text-xs text-slate-600">Balance due: <strong className="text-red-700">₹{balanceDue.toLocaleString("en-IN")}</strong></p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Enter Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">₹</span>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0" min={1}
                      className="w-full pl-11 pr-4 py-4 border-2 border-slate-200 focus:border-red-400 rounded-xl text-2xl font-extrabold text-slate-900 outline-none transition-colors" />
                  </div>
                </div>
                {/* Quick amounts */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Select</p>
                  <div className="flex flex-wrap gap-2">
                    {[5000, 10000, 15000, ...(balanceDue > 0 && ![5000, 10000, 15000].includes(balanceDue) ? [balanceDue] : [])]
                      .filter(v => v > 0)
                      .map(v => (
                        <button key={v} onClick={() => setAmount(String(v))}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                            amount === String(v)
                              ? "gradient-bg text-white border-transparent"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:border-red-300"
                          }`}>
                          ₹{v.toLocaleString("en-IN")}{v === balanceDue ? " (Full)" : ""}
                        </button>
                      ))}
                  </div>
                </div>
                <button onClick={() => amount && parseFloat(amount) > 0 && setStep("method")}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full py-3.5 text-sm font-extrabold text-white gradient-bg rounded-xl disabled:opacity-40 transition-opacity">
                  Continue →
                </button>
              </div>
            )}

            {/* Step: Method */}
            {step === "method" && (
              <>
                <p className="text-xs text-slate-500 mb-4">
                  Paying: <strong className="text-slate-900 text-sm">₹{parseInt(amount).toLocaleString("en-IN")}</strong>
                </p>
                {showCardNotice ? (
                  <div className="mb-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                        <Landmark className="w-7 h-7 text-amber-600" />
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 mb-2">In-Person Payment Required</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-1">
                        Credit card, debit card, and net banking payments must be completed directly at our admission center.
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Please visit the office during working hours to process your transaction. Online card payments are currently not supported.
                      </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setShowCardNotice(false)}
                        className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                        ← Choose Another Method
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button onClick={() => { setPaymentMethod("qr"); setStep("qr"); }}
                      className="p-5 border-2 border-slate-200 hover:border-red-400 rounded-xl flex flex-col items-center gap-2 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
                        <QrCode className="w-6 h-6 text-red-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-800">UPI / QR</span>
                      <span className="text-[10px] text-slate-400">Scan & Pay</span>
                    </button>
                    <button onClick={() => { setPaymentMethod("card"); setShowCardNotice(true); }}
                      className="p-5 border-2 border-slate-200 hover:border-red-400 rounded-xl flex flex-col items-center gap-2 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
                        <CreditCard className="w-6 h-6 text-red-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-800">Card / Net</span>
                      <span className="text-[10px] text-slate-400">In-Person</span>
                    </button>
                  </div>
                )}
                {!showCardNotice && (
                  <button onClick={() => setStep("amount")}
                    className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-700 transition-colors">
                    ← Back
                  </button>
                )}
              </>
            )}

            {/* Step: QR */}
            {step === "qr" && (
              <>
                <p className="text-xs text-slate-500 mb-4 text-center">Scan with any UPI app</p>
                <div className="flex flex-col items-center mb-4">
                  <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl inline-block mb-3">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 block" />
                  </div>
                  <div className="bg-slate-50 rounded-xl px-5 py-3 text-center w-full">
                    <p className="text-xs text-slate-600">UPI: <strong>{upiId}</strong></p>
                    <p className="text-xs text-slate-600 mt-1">
                      Amount: <strong className="text-emerald-700">₹{parseInt(amount).toLocaleString("en-IN")}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep("method")}
                    className="flex-1 py-3 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button onClick={() => setStep("upload")}
                    className="flex-1 py-3 text-xs font-bold text-white gradient-bg rounded-xl">I've Paid →</button>
                </div>
              </>
            )}

            {/* Step: Upload */}
            {step === "upload" && (
              <>
                {paymentMethod === "qr" ? (
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-700 mb-2 block">
                      Upload Screenshot <span className="text-red-500">*</span>
                    </label>
                    <div onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-red-400 rounded-xl p-6 text-center cursor-pointer transition-colors">
                      {screenshotPreview ? (
                        <div className="relative">
                          <img src={screenshotPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                          <button onClick={e => { e.stopPropagation(); setScreenshot(null); setScreenshotPreview(null); }}
                            className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">Tap to upload screenshot</p>
                          <p className="text-[10px] text-slate-400 mt-1">JPG, PNG up to 4MB</p>
                        </>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-700 mb-2 block">
                      Transaction Reference <span className="text-slate-400">(optional)</span>
                    </label>
                    <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)}
                      placeholder="e.g. RZP1234567"
                      className="w-full px-4 py-3 border-2 border-slate-200 focus:border-red-400 rounded-xl text-sm outline-none" />
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setStep(paymentMethod === "qr" ? "qr" : "method")}
                    className="flex-1 py-3 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button onClick={handleSubmitPayment}
                    disabled={submitting || (paymentMethod === "qr" && !screenshot)}
                    className="flex-1 py-3 text-xs font-bold text-white gradient-bg rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Payment"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── UPLOAD RECEIPT PANEL ──────────────────────────────────────────── */}
      {activeAction === "upload" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Upload External Payment Receipt</h3>
            <button onClick={() => setActiveAction("none")} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 max-w-xl mx-auto">
            <div className="space-y-5">
              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Amount Paid (₹) <span className="text-red-500">*</span></label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount" min={1}
                  className="w-full px-4 py-3 border-2 border-slate-200 focus:border-red-400 rounded-xl text-sm font-bold text-slate-900 outline-none transition-colors" />
              </div>

              {/* Method */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Payment Method <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["UPI", "Card", "Bank Transfer", "Cash"] as const).map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m.toLowerCase() as any)}
                      className={`px-3 py-2.5 text-xs font-bold rounded-lg border transition-all ${
                        paymentMethod === m.toLowerCase()
                          ? "gradient-bg text-white border-transparent"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:border-red-300"
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
                {paymentMethod === "card" && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <Landmark className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>In-person payment required.</strong> Card payments must be completed directly at the admission center. If you have already paid in person, please upload your receipt below.
                    </p>
                  </div>
                )}
              </div>

              {/* Transaction ID */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Transaction / Reference ID</label>
                <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)}
                  placeholder="e.g. TXN12345678" className="w-full px-4 py-3 border-2 border-slate-200 focus:border-red-400 rounded-xl text-sm outline-none transition-colors" />
              </div>

              {/* Upload */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Upload Receipt Screenshot <span className="text-red-500">*</span></label>
                <div onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    screenshotPreview ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-red-300 hover:bg-red-50"
                  }`}>
                  {screenshotPreview ? (
                    <img src={screenshotPreview} alt="Preview" className="mx-auto max-h-40 rounded-lg shadow-sm" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                      <p className="text-xs font-bold text-slate-700">Click to upload receipt</p>
                      <p className="text-[10px] text-slate-400">JPEG, PNG (max 4MB)</p>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setActiveAction("none")}
                  className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={handleSubmitPayment}
                  disabled={submitting || !amount || parseFloat(amount) <= 0 || !screenshot}
                  className="flex-1 py-3 text-xs font-bold text-white gradient-bg rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Receipt"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewDocUrl && <DocModal url={viewDocUrl} onClose={() => setViewDocUrl(null)} />}
    </div>
  );
}
