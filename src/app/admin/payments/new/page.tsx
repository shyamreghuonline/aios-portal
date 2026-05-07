"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft,
  User,
  IndianRupee,
  Calendar,
  CreditCard,
  Hash,
  Receipt,
  Loader2,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Student {
  id: string;
  studentId?: string;
  name: string;
  email: string;
  phone: string;
  university?: string;
  course: string;
  faculty: string;
  stream: string;
  program?: string;
  totalFee: number;
}

// Month code mapping for receipt IDs
const MONTH_CODES: Record<number, string> = {
  0: "JA", // Jan
  1: "FB", // Feb
  2: "MR", // Mar
  3: "AP", // Apr
  4: "MY", // May
  5: "JU", // Jun
  6: "JL", // Jul
  7: "AG", // Aug
  8: "SP", // Sep
  9: "OC", // Oct
  10: "NV", // Nov
  11: "DC", // Dec
};

// Generate receipt/voucher ID with shared global serial
// RCP[YY][MonthCode][6-Digit Serial] - for standard payments
// VCH[YY][MonthCode][6-Digit Serial] - for discounts/vouchers
// Both share the same serial counter (continuous, never resets)
async function generateReceiptId(type: "payment" | "discount" = "payment"): Promise<string> {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const monthCode = MONTH_CODES[now.getMonth()];
  const prefix = type === "discount" ? "VCH" : "RCP";

  // Query all payments to find the highest serial number across ALL prefixes
  const snapshot = await getDocs(collection(db, "payments"));
  let maxSerial = 0;

  snapshot.forEach((doc: any) => {
    const receiptNumber = doc.data().receiptNumber as string;
    if (receiptNumber && (receiptNumber.startsWith("RCP") || receiptNumber.startsWith("VCH"))) {
      // Extract serial from [Prefix][YY][Month][Serial] format
      // RCP = 3 chars, YY = 2 chars, Month = 2 chars, Serial = 6 chars
      const serialPart = receiptNumber.slice(7); // After 3-char prefix + 2 digit year + 2 char month
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

export default function NewPaymentPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [previousPayments, setPreviousPayments] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    amountPaid: "",
    installmentNumber: "1",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMode: "",
    transactionRef: "",
    remarks: "",
  });
  const [totalInstallments, setTotalInstallments] = useState(1);

  useEffect(() => {
    async function fetchStudents() {
      const snap = await getDocs(collection(db, "students"));
      const data = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as (Student & { archived?: boolean })[];
      // Exclude archived (alumni) students from selection
      const active = data.filter((s: any) => !s.archived);
      setStudents(active.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    }
    fetchStudents();
  }, []);

  async function handleStudentSelect(studentId: string) {
    const student = students.find((s: any) => s.id === studentId) || null;
    setSelectedStudent(student);

    if (student) {
      // Fetch previous payments for this student
      const q = query(collection(db, "payments"), where("studentId", "==", student.studentId || student.id));
      const snap = await getDocs(q);
      let totalPaid = 0;
      let maxInstallment = 0;
      snap.forEach((d: any) => {
        totalPaid += parseFloat(d.data().amountPaid || "0");
        const inst = parseInt(d.data().installmentNumber || "0");
        if (inst > maxInstallment) maxInstallment = inst;
      });
      setPreviousPayments(totalPaid);
      const nextInstallment = maxInstallment + 1;
      setTotalInstallments(nextInstallment);
      setFormData((prev) => ({
        ...prev,
        installmentNumber: nextInstallment.toString(),
      }));
    }
  }

  const balanceAmount = selectedStudent
    ? selectedStudent.totalFee - previousPayments - (parseFloat(formData.amountPaid) || 0)
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);

    try {
      const receiptNumber = await generateReceiptId("payment");
      const paymentId = receiptNumber;

      await setDoc(doc(db, "payments", paymentId), {
        receiptNumber,
        studentId: selectedStudent.studentId || selectedStudent.id,
        studentName: selectedStudent.name,
        studentEmail: selectedStudent.email,
        studentPhone: selectedStudent.phone,
        phone: selectedStudent.phone,
        program: selectedStudent.course || selectedStudent.program || "",
        university: selectedStudent.university || "",
        course: selectedStudent.course || "",
        stream: selectedStudent.stream || "",
        totalFee: selectedStudent.totalFee,
        amountPaid: parseFloat(formData.amountPaid),
        installmentNumber: parseInt(formData.installmentNumber),
        totalInstallments: totalInstallments,
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        transactionRef: formData.transactionRef,
        balanceAmount: Math.max(0, balanceAmount),
        remarks: formData.remarks,
        previouslyPaid: previousPayments,
        createdAt: serverTimestamp(),
      });

      setSaved(true);
      setTimeout(() => {
        router.push(`/admin/payments/${paymentId}`);
      }, 1000);
    } catch (err) {
      console.error("Error saving payment:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/admin/payments"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Payments
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Record Payment</h1>
      <p className="text-sm text-gray-500 mb-6">Select a student and enter payment details</p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6"
      >
        {/* Student Selection */}
        <div>
          <label className="block text-xs font-semibold text-black mb-2">Select Student *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedStudent?.id || ""}
              onChange={(e) => handleStudentSelect(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
            >
              <option value="">Choose student...</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.studentId || s.id}) — {(s.course || s.program || "").replace(/\s*\([^)]*\)/g, "")}{s.stream ? `-${s.stream}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Student Info Card */}
        {selectedStudent && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Fee:</span>
              <span className="font-bold">₹{selectedStudent.totalFee.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Previously Paid:</span>
              <span className="font-medium text-green-600">₹{previousPayments.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-500">Outstanding:</span>
              <span className="font-bold text-red-600">
                ₹{Math.max(0, selectedStudent.totalFee - previousPayments).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-black mb-2">Amount Paid (₹) *</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.amountPaid}
                onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                required
                min="1"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                placeholder="10000"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-black mb-2">Payment Date *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                required
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-black mb-2">Payment Mode *</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                required
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
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
          </div>
          <div>
            <label className="block text-xs font-semibold text-black mb-2">Transaction Ref / UTR</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.transactionRef}
                onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                placeholder="UPI ref / UTR"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-black mb-2">Remarks</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none resize-none"
            placeholder="Any additional notes..."
          />
        </div>

        {/* Balance Preview */}
        {selectedStudent && formData.amountPaid && (
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between text-sm">
            <span className="text-gray-600">Balance after this payment:</span>
            <span className={`font-bold text-lg ${balanceAmount > 0 ? "text-red-600" : "text-green-600"}`}>
              ₹{Math.max(0, balanceAmount).toLocaleString("en-IN")}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || saved}
          className="w-full py-3 text-sm text-white font-semibold rounded-lg gradient-bg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saved ? (
            <><CheckCircle className="w-5 h-5" /> Saved! Redirecting...</>
          ) : saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
          ) : (
            <><Receipt className="w-5 h-5" /> Save &amp; Generate Receipt</>
          )}
        </button>
      </form>
    </div>
  );
}
