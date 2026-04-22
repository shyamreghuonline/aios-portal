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
  MessageSquare
} from "lucide-react";

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
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Receipt generation states
  const [installmentNumber, setInstallmentNumber] = useState(1);
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [remarks, setRemarks] = useState("");

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
              stream: sData.stream || ""
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

      // Generate receipt ID
      const now = new Date();
      const monthCodes: Record<number, string> = { 0: "A", 1: "B", 2: "C", 3: "D", 4: "E", 5: "F", 6: "G", 7: "H", 8: "I", 9: "J", 10: "K", 11: "L" };
      const monthCode = monthCodes[now.getMonth()];
      const yearShort = now.getFullYear().toString().slice(-2);
      const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
      const receiptNumber = `REC${yearShort}${monthCode}${randomStr}`;

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
        studentId: student.id,
        program: student.course,
        university: student.university,
        course: student.course,
        stream: student.stream || "",
        totalFee: student.totalFee,
        amountPaid: selectedPayment.amount,
        installmentNumber: parseInt(installmentNumber.toString()),
        totalInstallments: parseInt(totalInstallments.toString()),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMode: paymentMode,
        transactionRef: selectedPayment.transactionId || `QR-${selectedPayment.id.slice(-6)}`,
        balanceAmount: newBalance,
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
          ? { ...p, status: "approved", receiptNumber }
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
          ? { ...p, status: "rejected", rejectionReason }
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
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin/payments" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Pending Payment Approvals</h1>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/admin/payments" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Pending Payment Approvals</h1>
        </div>
        <div className="text-sm text-slate-600">
          {pendingPayments.filter(p => p.status === "pending").length} pending
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-slate-900">
            {pendingPayments.filter(p => p.status === "pending").length}
          </div>
          <div className="text-xs text-slate-500">Pending</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">
            {pendingPayments.filter(p => p.status === "approved").length}
          </div>
          <div className="text-xs text-slate-500">Approved</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-red-600">
            {pendingPayments.filter(p => p.status === "rejected").length}
          </div>
          <div className="text-xs text-slate-500">Rejected</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-slate-900">
            ₹{pendingPayments
              .filter(p => p.status === "pending")
              .reduce((sum, p) => sum + p.amount, 0)
              .toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-slate-500">Pending Amount</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or student ID..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Student</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Amount</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Method</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Submitted</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPayments.map((payment) => {
              const student = students[payment.studentPhone];
              return (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{payment.studentName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {payment.studentPhone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900">
                      ₹{payment.amount.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {payment.paymentMethod === "qr" ? (
                        <>
                          <QrCode className="w-4 h-4 text-blue-600" />
                          <span className="text-sm">UPI/QR</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 text-purple-600" />
                          <span className="text-sm">Card</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">
                        {payment.createdAt?.toDate?.().toLocaleDateString() || "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {payment.status === "pending" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                    {payment.status === "approved" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        Approved
                      </span>
                    )}
                    {payment.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3" />
                        Rejected
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
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
                            onClick={() => { setSelectedPayment(payment); setApproveModalOpen(true); }}
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
                  <label className="text-xs text-slate-500 block mb-2">Payment Screenshot</label>
                  <a 
                    href={selectedPayment.screenshotUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block border rounded-lg overflow-hidden hover:border-red-400"
                  >
                    <img 
                      src={selectedPayment.screenshotUrl} 
                      alt="Payment Screenshot" 
                      className="w-full h-48 object-cover"
                    />
                  </a>
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
      {approveModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Approve Payment</h2>
              <p className="text-sm text-slate-600">Generate receipt for ₹{selectedPayment.amount.toLocaleString("en-IN")}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Installment #</label>
                  <input
                    type="number"
                    value={installmentNumber}
                    onChange={(e) => setInstallmentNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Total Installments</label>
                  <input
                    type="number"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    min={1}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online">Online</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any notes..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                />
              </div>
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
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : "Approve & Generate Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
