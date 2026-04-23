"use client";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { 
  Receipt, 
  Loader2, 
  Lock,
  ArrowRight,
  Shield,
  Upload,
  QrCode,
  CreditCard,
  CheckCircle,
  Clock,
  ImageIcon,
  X
} from "lucide-react";

interface Payment {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string;
  status: "confirmed" | "pending" | "rejected";
  installmentNumber: number;
  totalInstallments: number;
  balanceAmount: number;
  totalFee: number;
  transactionRef?: string;
}

interface PendingPayment {
  id: string;
  studentId: string;
  amount: number;
  paymentMethod: "qr" | "card";
  status: "pending" | "approved" | "rejected";
  screenshotUrl?: string;
  transactionId?: string;
  createdAt: string;
}

type PaymentStep = "amount" | "method" | "qr" | "card" | "upload" | "success";

export default function MakePaymentPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<{ id: string; totalFee: number; discountAmount: number; name: string } | null>(null);
  
  // Payment flow states
  const [step, setStep] = useState<PaymentStep>("amount");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "card" | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR Code data - In production, this would be your actual UPI QR
  const upiId = "aiosedu@ptaxis";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${upiId}&pn=AIOS%20EDU&am=${amount}&cu=INR`;

  useEffect(() => {
    async function fetchData() {
      if (!user?.phone) return;
      try {
        // Fetch confirmed payments (simplified query to avoid index requirement)
        const paymentsQuery = query(
          collection(db, "payments"),
          where("studentPhone", "==", user.phone)
        );
        const paymentsSnap = await getDocs(paymentsQuery);
        const paymentsData = paymentsSnap.docs
          .map((d) => ({ 
            id: d.id, 
            ...d.data(),
            status: d.data().status || "confirmed"
          }))
          .filter((p: any) => p.status === "confirmed" || !p.status)
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)) as Payment[];
        setPayments(paymentsData);

        // Fetch pending payments (simplified query to avoid index requirement)
        const pendingQuery = query(
          collection(db, "pendingPayments"),
          where("studentPhone", "==", user.phone)
        );
        const pendingSnap = await getDocs(pendingQuery);
        const pendingData = pendingSnap.docs
          .map((d) => ({ 
            id: d.id, 
            ...d.data() 
          }))
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)) as PendingPayment[];
        setPendingPayments(pendingData);

        // Fetch student data
        const studentQuery = query(
          collection(db, "students"),
          where("phone", "==", user.phone)
        );
        const studentSnap = await getDocs(studentQuery);
        if (!studentSnap.empty) {
          const sData = studentSnap.docs[0].data();
          setStudentData({
            id: studentSnap.docs[0].id,
            totalFee: sData.totalFee || 0,
            discountAmount: sData.discountAmount || 0,
            name: sData.name || ""
          });
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalPending = pendingPayments
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalFee = studentData?.totalFee || payments[0]?.totalFee || 0;
  const discountAmount = studentData?.discountAmount || 0;
  const effectiveFee = totalFee - discountAmount;
  const balanceDue = Math.max(0, effectiveFee - totalPaid - totalPending);

  // Convert file to base64 (same method as student profile page)
  async function uploadToBase64(file: File): Promise<string> {
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
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert("File size should be less than 4MB");
        return;
      }
      setScreenshot(file);
      try {
        const base64 = await uploadToBase64(file);
        setScreenshotPreview(base64);
      } catch (err: any) {
        alert(`Failed to process image: ${err.message || "Unknown error"}`);
      }
    }
  }

  async function handleSubmitPayment() {
    if (!amount || !paymentMethod || !user?.phone) return;
    
    setSubmitting(true);
    try {
      let screenshotUrl = "";
      
      // Convert screenshot to base64 if QR payment
      if (paymentMethod === "qr" && screenshotPreview) {
        screenshotUrl = screenshotPreview;
      }

      // Create pending payment record
      await addDoc(collection(db, "pendingPayments"), {
        studentId: studentData?.id || "",
        studentPhone: user.phone,
        studentName: studentData?.name || "",
        amount: parseFloat(amount),
        paymentMethod,
        status: "pending",
        screenshotUrl,
        transactionId: transactionId || null,
        createdAt: serverTimestamp(),
      });

      setStep("success");
    } catch (err: any) {
      console.error("Error submitting payment:", err);
      alert(`Failed to submit payment: ${err.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep("amount");
    setAmount("");
    setPaymentMethod(null);
    setScreenshot(null);
    setScreenshotPreview(null);
    setTransactionId("");
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

  // Success State
  if (step === "success") {
    return (
      <div className="pb-20 max-w-2xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Payment Submitted for Review</h2>
          <p className="text-sm text-slate-600 mb-4">
            Your payment of ₹{parseInt(amount).toLocaleString("en-IN")} has been submitted and is awaiting admin confirmation.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-xs text-amber-800">
              <strong>Status:</strong> Pending Admin Approval<br/>
              You will receive an email/SMS once your payment is confirmed.
            </p>
          </div>
          <button
            onClick={resetFlow}
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

      {/* Pending Payments Alert */}
      {pendingPayments.filter(p => p.status === "pending").length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {pendingPayments.filter(p => p.status === "pending").length} Payment(s) Pending Approval
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Total: ₹{totalPending.toLocaleString("en-IN")} awaiting admin confirmation
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT CARD: Payment History & Dues */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 gradient-bg">
            <h2 className="text-sm font-bold text-white">Student Dues & Billing</h2>
          </div>
          
          <div className="p-5">
            {/* Total Remaining Dues */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-600 mb-1">Total Remaining Dues</p>
              <p className="text-4xl font-extrabold text-slate-900">₹{balanceDue.toLocaleString("en-IN")}</p>
              {totalPending > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  (₹{totalPending.toLocaleString("en-IN")} pending approval)
                </p>
              )}
            </div>

            {/* Payments History */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3">Payment History</h3>
              
              {[...payments, ...pendingPayments.filter(p => p.status === "pending")].length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No payments recorded yet.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="gradient-bg sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold text-white uppercase text-[10px]">Receipt</th>
                        <th className="text-right px-3 py-2 font-bold text-white uppercase text-[10px]">Amount</th>
                        <th className="text-center px-3 py-2 font-bold text-white uppercase text-[10px]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <Link 
                              href={`/student/payments/${payment.id}`}
                              className="font-mono text-[11px] text-blue-700 hover:underline"
                            >
                              {payment.receiptNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            ₹{payment.amountPaid.toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Paid
                            </span>
                          </td>
                        </tr>
                      ))}
                      {pendingPayments.filter(p => p.status === "pending").map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50 bg-amber-50/30">
                          <td className="px-3 py-2">
                            <span className="font-mono text-[11px] text-amber-700">PENDING</span>
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-amber-700">
                            ₹{payment.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Total Cash Paid:</span>
                <span className="text-lg font-extrabold text-slate-900">₹{totalPaid.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: Payment Flow */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 gradient-bg">
            <h2 className="text-sm font-bold text-white">
              {step === "amount" && "Enter Payment Amount"}
              {step === "method" && "Select Payment Method"}
              {step === "qr" && "Scan QR Code"}
              {step === "card" && "Card Payment"}
              {step === "upload" && "Upload Payment Proof"}
            </h2>
          </div>
          
          <div className="p-5">
            {/* Step 1: Amount */}
            {step === "amount" && (
              <>
                <div className="mb-6">
                  <label className="text-xs font-semibold text-slate-600 mb-2 block">Enter Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">₹</span>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="10,000"
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => amount && setStep("method")}
                  disabled={!amount}
                  className="w-full bg-red-900 hover:bg-red-950 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </>
            )}

            {/* Step 2: Payment Method */}
            {step === "method" && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => { setPaymentMethod("qr"); setStep("qr"); }}
                    className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === "qr" ? "border-red-600 bg-red-50" : "border-slate-200 hover:border-red-300"
                    }`}
                  >
                    <QrCode className="w-8 h-8 text-red-600" />
                    <span className="text-sm font-semibold">UPI / QR Code</span>
                    <span className="text-[10px] text-slate-500">Scan & Pay</span>
                  </button>
                  <button
                    onClick={() => { setPaymentMethod("card"); setStep("card"); }}
                    className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === "card" ? "border-red-600 bg-red-50" : "border-slate-200 hover:border-red-300"
                    }`}
                  >
                    <CreditCard className="w-8 h-8 text-red-600" />
                    <span className="text-sm font-semibold">Card / NetBanking</span>
                    <span className="text-[10px] text-slate-500">Razorpay</span>
                  </button>
                </div>
                <button 
                  onClick={() => setStep("amount")}
                  className="w-full py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  ← Back
                </button>
              </>
            )}

            {/* Step 3: QR Code */}
            {step === "qr" && (
              <>
                <div className="text-center mb-6">
                  <p className="text-sm text-slate-600 mb-4">Scan this QR code with any UPI app</p>
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block">
                    {amount && (
                      <img 
                        src={qrCodeUrl} 
                        alt="Payment QR Code" 
                        className="w-48 h-48"
                      />
                    )}
                  </div>
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600">UPI ID: <strong>{upiId}</strong></p>
                    <p className="text-xs text-slate-600">Amount: <strong>₹{parseInt(amount).toLocaleString("en-IN")}</strong></p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep("method")}
                    className="flex-1 py-3 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep("upload")}
                    className="flex-1 bg-red-900 text-white font-bold py-3 rounded-lg hover:bg-red-950"
                  >
                    I've Paid →
                  </button>
                </div>
              </>
            )}

            {/* Step 4: Card Payment (Razorpay Integration Placeholder) */}
            {step === "card" && (
              <>
                <div className="text-center mb-6 py-8">
                  <CreditCard className="w-16 h-16 text-red-600 mx-auto mb-4" />
                  <p className="text-sm text-slate-600 mb-2">Secure payment via Razorpay</p>
                  <p className="text-2xl font-bold text-slate-900">₹{parseInt(amount).toLocaleString("en-IN")}</p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-500">
                    <Lock className="w-3 h-3" />
                    <span>SSL Secured • PCI Compliant</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center mb-4">
                  Card payment will open Razorpay checkout. After payment, transaction details will be auto-captured.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep("method")}
                    className="flex-1 py-3 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep("upload")}
                    className="flex-1 bg-red-900 text-white font-bold py-3 rounded-lg hover:bg-red-950"
                  >
                    Pay with Razorpay
                  </button>
                </div>
              </>
            )}

            {/* Step 5: Upload Screenshot */}
            {step === "upload" && (
              <>
                <div className="mb-4">
                  {paymentMethod === "qr" ? (
                    <>
                      <label className="text-xs font-semibold text-slate-600 mb-2 block">
                        Upload Payment Screenshot <span className="text-red-600">*</span>
                      </label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-red-400 transition-colors"
                      >
                        {screenshotPreview ? (
                          <div className="relative">
                            <img src={screenshotPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); setScreenshot(null); setScreenshotPreview(null); }}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">Click to upload screenshot</p>
                            <p className="text-[10px] text-slate-400 mt-1">JPG, PNG up to 5MB</p>
                          </>
                        )}
                      </div>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </>
                  ) : (
                    <>
                      <label className="text-xs font-semibold text-slate-600 mb-2 block">
                        Transaction Reference (Optional)
                      </label>
                      <input 
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g., RZP123456789"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep(paymentMethod === "qr" ? "qr" : "card")}
                    className="flex-1 py-3 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleSubmitPayment}
                    disabled={submitting || (paymentMethod === "qr" && !screenshot)}
                    className="flex-1 bg-red-900 text-white font-bold py-3 rounded-lg hover:bg-red-950 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : (
                      "Submit Payment"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
