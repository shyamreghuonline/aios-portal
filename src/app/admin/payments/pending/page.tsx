"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { 
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  ImageIcon,
  CreditCard,
  QrCode,
  User,
  Phone,
  Calendar,
  IndianRupee,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  Trash2,
  Receipt,
  Hourglass,
  Landmark
} from "lucide-react";
import ConsolidatedPaymentsModal from "./consolidated-modal";

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
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface Student {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalFee: number;
  discountAmount: number;
  course: string;
  university: string;
  stream: string;
  studentId?: string;
}

interface ConfirmedPayment {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string;
  studentPhone: string;
}

// Month code mapping for receipt IDs (same as new payment page)
const MONTH_CODES: Record<number, string> = {
  0: "JA", 1: "FB", 2: "MR", 3: "AP", 4: "MY", 5: "JU",
  6: "JL", 7: "AG", 8: "SP", 9: "OC", 10: "NV", 11: "DC",
};

async function generateReceiptId(type: "payment" | "discount" = "payment"): Promise<string> {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const monthCode = MONTH_CODES[now.getMonth()];
  const prefix = type === "discount" ? "VCH" : "RCP";

  const snapshot = await getDocs(collection(db, "payments"));
  let maxSerial = 0;

  snapshot.forEach((doc) => {
    const receiptNumber = doc.data().receiptNumber as string;
    if (receiptNumber && (receiptNumber.startsWith("RCP") || receiptNumber.startsWith("VCH"))) {
      const serialPart = receiptNumber.slice(7);
      if (serialPart && serialPart.length === 6) {
        const serial = parseInt(serialPart, 10);
        if (!isNaN(serial) && serial > maxSerial) {
          maxSerial = serial;
        }
      }
    }
  });

  const nextSerial = maxSerial + 1;
  const paddedSerial = String(nextSerial).padStart(6, "0");
  return `${prefix}${year}${monthCode}${paddedSerial}`;
}

export default function PendingPaymentsPage() {
  const { user } = useAuth();
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  
  // Modal states
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Receipt generation states
  const [installmentNumber, setInstallmentNumber] = useState(1);
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionRef, setTransactionRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [previousPayments, setPreviousPayments] = useState(0);

  // Consolidated view states
  const [consolidatedModalOpen, setConsolidatedModalOpen] = useState(false);
  const [consolidatedStudentPhone, setConsolidatedStudentPhone] = useState<string | null>(null);
  const [consolidatedConfirmed, setConsolidatedConfirmed] = useState<ConfirmedPayment[]>([]);
  const [consolidatedLoading, setConsolidatedLoading] = useState(false);

  async function openConsolidatedView(phone: string) {
    setConsolidatedStudentPhone(phone);
    setConsolidatedModalOpen(true);
    setConsolidatedLoading(true);
    try {
      const pq = query(collection(db, "payments"), where("studentPhone", "==", phone), orderBy("paymentDate", "desc"));
      const ps = await getDocs(pq);
      const confirmed = ps.docs.map(d => ({ id: d.id, ...d.data() } as ConfirmedPayment));
      setConsolidatedConfirmed(confirmed);
    } catch (err) {
      console.error("Error fetching confirmed payments:", err);
    } finally {
      setConsolidatedLoading(false);
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all pending payments
        const q = query(
          collection(db, "pendingPayments"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const paymentsData = snap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        })) as PendingPayment[];
        setPendingPayments(paymentsData);

        // Fetch student details for each unique phone
        const uniquePhones = [...new Set(paymentsData.map(p => p.studentPhone))];
        const studentsMap: Record<string, Student> = {};
        
        for (const phone of uniquePhones) {
          const studentQuery = query(
            collection(db, "students"),
            where("phone", "==", phone)
          );
          const studentSnap = await getDocs(studentQuery);
          if (!studentSnap.empty) {
            const sData = studentSnap.docs[0].data();
            studentsMap[phone] = {
              id: studentSnap.docs[0].id,
              name: sData.name,
              phone: sData.phone,
              email: sData.email,
              totalFee: sData.totalFee || 0,
              discountAmount: sData.discountAmount || 0,
              course: sData.course || "",
              university: sData.university || "",
              stream: sData.stream || "",
              studentId: sData.studentId || ""
            };
          }
        }
        setStudents(studentsMap);
      } catch (err) {
        console.error("Error fetching pending payments:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleApprove() {
    if (!selectedPayment || !user) return;
    
    setProcessing(true);
    try {
      const student = students[selectedPayment.studentPhone];
      if (!student) {
        alert("Student data not found!");
        return;
      }

      // Get existing payments to calculate balance
      const paymentsQuery = query(
        collection(db, "payments"),
        where("studentPhone", "==", selectedPayment.studentPhone)
      );
      const paymentsSnap = await getDocs(paymentsQuery);
      const existingPayments = paymentsSnap.docs.map(d => d.data());
      const totalPaid = existingPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const newBalance = Math.max(0, (student.totalFee - student.discountAmount) - totalPaid - selectedPayment.amount);

      // Generate receipt ID using same format as new payment page
      const receiptNumber = await generateReceiptId("payment");

      // Create batch write
      const batch = writeBatch(db);

      // 1. Create confirmed payment
      const paymentRef = doc(collection(db, "payments"));
      batch.set(paymentRef, {
        receiptNumber,
        studentName: student.name,
        studentEmail: student.email,
        studentPhone: student.phone,
        phone: student.phone,
        studentId: student.studentId || "",
        program: student.course,
        university: student.university,
        course: student.course,
        stream: student.stream || "",
        totalFee: student.totalFee,
        amountPaid: selectedPayment.amount,
        installmentNumber: parseInt(installmentNumber.toString()),
        totalInstallments: parseInt(totalInstallments.toString()),
        paymentDate: paymentDate,
        paymentMode: paymentMode,
        transactionRef: transactionRef || selectedPayment.transactionId || `QR-${selectedPayment.id.slice(-6)}`,
        balanceAmount: newBalance,
        previouslyPaid: totalPaid,
        remarks: remarks || `Approved from pending payment ${selectedPayment.id}`,
        status: "confirmed",
        createdAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        approvedBy: user.email || user.uid,
        pendingPaymentId: selectedPayment.id
      });

      // 2. Update pending payment status
      const pendingRef = doc(db, "pendingPayments", selectedPayment.id);
      batch.update(pendingRef, {
        status: "approved",
        reviewedAt: serverTimestamp(),
        reviewedBy: user.email || user.uid,
        receiptId: paymentRef.id,
        receiptNumber
      });

      await batch.commit();

      // 3. Send notifications
      await sendNotifications(student, selectedPayment.amount, receiptNumber);

      // Update local state
      setPendingPayments(prev => prev.map(p =>
        p.id === selectedPayment.id
          ? { ...p, status: "approved", receiptNumber, reviewedAt: new Date() }
          : p
      ));

      setApproveModalOpen(false);
      setSelectedPayment(null);
      alert("Payment approved! Receipt generated and notifications sent.");
    } catch (err) {
      console.error("Error approving payment:", err);
      alert("Failed to approve payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selectedPayment || !user) return;
    
    setProcessing(true);
    try {
      await updateDoc(doc(db, "pendingPayments", selectedPayment.id), {
        status: "rejected",
        reviewedAt: serverTimestamp(),
        reviewedBy: user.email || user.uid,
        rejectionReason: rejectionReason
      });

      setPendingPayments(prev => prev.map(p =>
        p.id === selectedPayment.id
          ? { ...p, status: "rejected", rejectionReason, reviewedAt: new Date() }
          : p
      ));

      setRejectModalOpen(false);
      setRejectionReason("");
      setSelectedPayment(null);
      alert("Payment rejected.");
    } catch (err) {
      console.error("Error rejecting payment:", err);
      alert("Failed to reject payment.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    if (!selectedPayment) return;
    
    setProcessing(true);
    try {
      await deleteDoc(doc(db, "pendingPayments", selectedPayment.id));
      
      setPendingPayments(prev => prev.filter(p => p.id !== selectedPayment.id));
      
      setDeleteModalOpen(false);
      setSelectedPayment(null);
      alert("Payment record deleted.");
    } catch (err) {
      console.error("Error deleting payment:", err);
      alert("Failed to delete payment record.");
    } finally {
      setProcessing(false);
    }
  }

  function openScreenshot(url: string) {
    try {
      // If it's a data URL, convert to blob URL (browsers block top-level nav to data: URIs)
      if (url.startsWith("data:")) {
        const [meta, base64] = url.split(",");
        const mime = meta.match(/data:([^;]+)/)?.[1] || "image/png";
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const w = window.open(blobUrl, "_blank");
        // Revoke after a delay so the new tab has time to load
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        if (!w) alert("Popup blocked — allow popups to preview the screenshot.");
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Failed to open screenshot:", err);
      alert("Could not open screenshot.");
    }
  }

  async function sendNotifications(student: Student, amount: number, receiptNumber: string) {
    try {
      // Send SMS
      await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: student.phone,
          message: `Dear ${student.name}, your payment of Rs.${amount} has been received. Receipt No: ${receiptNumber}. View receipt at: ${window.location.origin}/student/payments`,
          provider: "msg91"
        })
      });

      // Send email if email exists
      if (student.email) {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: student.email,
            subject: `Payment Receipt - ${receiptNumber}`,
            body: `Dear ${student.name},

Your payment of Rs.${amount} has been confirmed.

Receipt Number: ${receiptNumber}
Amount: Rs.${amount}
Date: ${new Date().toLocaleDateString()}

View your receipt at: ${window.location.origin}/student/payments

Thank you!`,
          })
        });
      }
    } catch (err) {
      console.error("Error sending notifications:", err);
    }
  }

  // Filter and search
  const filteredPayments = pendingPayments.filter(payment => {
    const matchesFilter = filter === "all" || payment.status === filter;
    const matchesSearch = searchQuery === "" || 
      payment.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.studentPhone?.includes(searchQuery) ||
      payment.studentId?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin/payments" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Pending Payment Approvals</h1>
            <p className="text-xs text-slate-700 uppercase tracking-wide">Review and approve student payment submissions</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/admin/payments" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Pending Payment Approvals</h1>
            <p className="text-xs text-slate-700 uppercase tracking-wide">{pendingPayments.filter(p => p.status === "pending").length} pending · Review student payment submissions</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <p className="text-xs text-slate-700 uppercase tracking-wide">Pending</p>
          </div>
          <p className="text-sm font-bold text-slate-800">
            {pendingPayments.filter(p => p.status === "pending").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <p className="text-xs text-slate-700 uppercase tracking-wide">Approved Today</p>
          </div>
          <p className="text-sm font-bold text-green-700">
            {pendingPayments.filter(p => {
              if (p.status !== "approved") return false;
              const approvedDate = p.reviewedAt ? (p.reviewedAt.toDate ? p.reviewedAt.toDate() : new Date(p.reviewedAt)) : null;
              if (!approvedDate || isNaN(approvedDate.getTime())) return false;
              const today = new Date();
              return approvedDate.toDateString() === today.toDateString();
            }).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <p className="text-xs text-slate-700 uppercase tracking-wide">Rejected Today</p>
          </div>
          <p className="text-sm font-bold text-red-600">
            {pendingPayments.filter(p => {
              if (p.status !== "rejected") return false;
              const rejectedDate = p.reviewedAt ? (p.reviewedAt.toDate ? p.reviewedAt.toDate() : new Date(p.reviewedAt)) : null;
              if (!rejectedDate || isNaN(rejectedDate.getTime())) return false;
              const today = new Date();
              return rejectedDate.toDateString() === today.toDateString();
            }).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-3.5 h-3.5 text-slate-600" />
            <p className="text-xs text-slate-700 uppercase tracking-wide">Pending Amount</p>
          </div>
          <p className="text-sm font-bold text-blue-700">
            ₹{pendingPayments
              .filter(p => p.status === "pending")
              .reduce((sum, p) => sum + p.amount, 0)
              .toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or student ID..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all appearance-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="gradient-bg border-b-2 border-red-900">
              <th className="text-left px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wide">Student</th>
              <th className="text-left px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wide">University</th>
              <th className="text-left px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wide">Student ID</th>
              <th className="text-left px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wide">Course</th>
              <th className="text-left px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wide">Amount</th>
              <th className="text-left px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wide">Method</th>
              <th className="text-left px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wide">Submitted</th>
              <th className="text-center px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wide">Status</th>
              <th className="text-center px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => {
              const student = students[payment.studentPhone];
              return (
                <tr key={payment.id} className="border-b border-red-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-xs font-bold text-red-700">
                        {(payment.studentName || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-slate-900 font-bold">{payment.studentName}</p>
                        <p className="text-sm text-slate-600">{payment.studentPhone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-slate-900">
                    {student?.university || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-slate-900 font-mono">
                    {student?.studentId ? (
                      <button
                        onClick={() => openConsolidatedView(payment.studentPhone)}
                        className="text-blue-700 hover:underline hover:text-blue-900 transition-colors cursor-pointer"
                        title="View consolidated transaction statement"
                      >
                        {student.studentId}
                      </button>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-slate-900">
                    {student ? `${(student.course || "").replace(/\s*\([^)]*\)/g, "")}${student.stream ? `-${student.stream}` : ""}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-green-600 text-sm">
                    ₹{payment.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 text-sm text-slate-700">
                      {payment.paymentMethod === "qr" ? (
                        <>
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                          <span>UPI/QR</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                          <span>Card</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 text-sm whitespace-nowrap">
                    {payment.createdAt?.toDate?.().toLocaleDateString() || "Unknown"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {payment.status === "pending" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs lg:text-xs font-medium bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                    {payment.status === "approved" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs lg:text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        Approved
                      </span>
                    )}
                    {payment.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs lg:text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3" />
                        Rejected
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setSelectedPayment(payment); setViewModalOpen(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {payment.status === "pending" && (
                        <>
                          <button
                            onClick={async () => {
                              setSelectedPayment(payment);
                              // Fetch previous payments for balance calculation
                              const pq = query(collection(db, "payments"), where("studentPhone", "==", payment.studentPhone));
                              const ps = await getDocs(pq);
                              let totalPaid = 0;
                              let maxInst = 0;
                              ps.forEach((d) => {
                                totalPaid += parseFloat(d.data().amountPaid || "0");
                                const inst = parseInt(d.data().installmentNumber || "0");
                                if (inst > maxInst) maxInst = inst;
                              });
                              setPreviousPayments(totalPaid);
                              setInstallmentNumber(maxInst + 1);
                              setPaymentDate(new Date().toISOString().split("T")[0]);
                              setPaymentMode(payment.paymentMethod === "qr" ? "UPI / QR Code" : payment.paymentMethod === "card" ? "Credit/Debit Card" : "");
                              setTransactionRef(payment.transactionId || "");
                              setRemarks("");
                              setApproveModalOpen(true);
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedPayment(payment); setRejectModalOpen(true); }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {(payment.status === "approved" || payment.status === "rejected") && (
                        <button
                          onClick={() => { setSelectedPayment(payment); setDeleteModalOpen(true); }}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No pending payments found</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Payment Details</h2>
                <button onClick={() => setViewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Student Name</label>
                  <p className="font-medium">{selectedPayment.studentName}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Phone</label>
                  <p className="font-medium">{selectedPayment.studentPhone}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Amount</label>
                  <p className="font-medium text-lg">₹{selectedPayment.amount.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Payment Method</label>
                  <p className="font-medium">{selectedPayment.paymentMethod === "qr" ? "UPI/QR" : "Card"}</p>
                </div>
              </div>
              
              {selectedPayment.screenshotUrl && (
                <div>
                  <label className="text-xs text-slate-500 block mb-2">Payment Screenshot (click to enlarge)</label>
                  <button
                    type="button"
                    onClick={() => openScreenshot(selectedPayment.screenshotUrl!)}
                    className="block w-full border rounded-lg overflow-hidden hover:border-red-400"
                  >
                    <img
                      src={selectedPayment.screenshotUrl}
                      alt="Payment Screenshot"
                      className="w-full h-48 object-contain bg-slate-50"
                    />
                  </button>
                </div>
              )}
              
              {selectedPayment.transactionId && (
                <div>
                  <label className="text-xs text-slate-500">Transaction ID</label>
                  <p className="font-mono text-sm">{selectedPayment.transactionId}</p>
                </div>
              )}
              
              {selectedPayment.rejectionReason && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <label className="text-xs text-red-600">Rejection Reason</label>
                  <p className="text-sm text-red-800">{selectedPayment.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModalOpen && selectedPayment && (() => {
        const student = students[selectedPayment.studentPhone];
        const approveBalance = student
          ? Math.max(0, (student.totalFee - student.discountAmount) - previousPayments - selectedPayment.amount)
          : 0;
        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Approve Payment</h2>
              <p className="text-sm text-slate-600">Generate receipt for <span className="font-semibold">{selectedPayment.studentName}</span> — ₹{selectedPayment.amount.toLocaleString("en-IN")}</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Student Info Card */}
              {student && (
                <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Student</span>
                    <span className="font-medium">{student.name} ({student.id})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Course</span>
                    <span className="font-medium">{student.course}{student.stream ? ` - ${student.stream}` : ""}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Fee</span>
                    <span className="font-bold">₹{student.totalFee.toLocaleString("en-IN")}</span>
                  </div>
                  {student.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Discount</span>
                      <span className="font-medium text-blue-600">-₹{student.discountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Previously Paid</span>
                    <span className="font-medium text-green-600">₹{previousPayments.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-500">Outstanding</span>
                    <span className="font-bold text-red-600">
                      ₹{Math.max(0, (student.totalFee - student.discountAmount) - previousPayments).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Amount (₹)</label>
                  <input
                    type="text"
                    value={`₹${selectedPayment.amount.toLocaleString("en-IN")}`}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                  >
                    <option value="">Select mode</option>
                    <option>UPI / QR Code</option>
                    <option>Bank Transfer / NEFT</option>
                    <option>Cash</option>
                    <option>Cheque</option>
                    <option>Credit/Debit Card</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-600 block mb-1">Transaction Ref / UTR</label>
                  <input
                    type="text"
                    value={transactionRef || selectedPayment.transactionId || ""}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                    placeholder="UPI ref / UTR"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none resize-none"
                  rows={2}
                />
              </div>

              {/* Balance Preview */}
              {student && (
                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between text-sm">
                  <span className="text-slate-600">Balance after this payment:</span>
                  <span className={`font-bold text-lg ${approveBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                    ₹{approveBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing || !paymentMode}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : "Approve & Generate Receipt"}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Reject Modal */}
      {rejectModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-red-600">Reject Payment</h2>
              <p className="text-sm text-slate-600">This action cannot be undone</p>
            </div>
            <div className="p-6">
              <label className="text-xs text-slate-500 block mb-1">Rejection Reason (Optional)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Why is this payment being rejected?"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={3}
              />
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : "Reject Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-red-600">Delete Payment Record</h2>
              <p className="text-sm text-slate-600">This action cannot be undone</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700 mb-4">
                Are you sure you want to delete the payment record for
                <span className="font-semibold"> {selectedPayment.studentName}</span> of
                <span className="font-semibold"> ₹{selectedPayment.amount.toLocaleString("en-IN")}</span>?
              </p>
              <p className="text-xs text-slate-500">Status: {selectedPayment.status}</p>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : "Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConsolidatedPaymentsModal
        open={consolidatedModalOpen}
        onClose={() => setConsolidatedModalOpen(false)}
        studentPhone={consolidatedStudentPhone || ""}
        student={consolidatedStudentPhone ? students[consolidatedStudentPhone] : undefined}
        pending={consolidatedStudentPhone ? pendingPayments.filter(p => p.studentPhone === consolidatedStudentPhone) : []}
        confirmed={consolidatedConfirmed}
        loading={consolidatedLoading}
      />
    </div>
  );
}
