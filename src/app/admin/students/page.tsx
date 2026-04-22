"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  BookOpen,
  IndianRupee,
  X,
  Loader2,
  Trash2,
  Eye,
  Receipt,
  GraduationCap,
  Bell,
  Printer,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Link from "next/link";
import { getFaculties, getCourses, getStreams, getDuration } from "@/lib/courses-data";

interface Payment {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string;
  installmentNumber: number;
  totalInstallments: number;
  balanceAmount: number;
  transactionRef?: string;
  remarks?: string;
}

interface Student {
  id: string;
  studentId?: string;
  name: string;
  email: string;
  phone: string;
  faculty: string;
  course: string;
  stream: string;
  duration: string;
  university: string;
  startYear: string;
  endYear: string;
  totalFee: number;
  discountAmount?: number;
  enrollmentDate: string;
  profileEditEnabled?: boolean;
  createdAt?: unknown;
  personalDetails?: {
    photo?: string;
    dob?: string;
    gender?: string;
    bloodGroup?: string;
    aadhaarNumber?: string;
    fatherName?: string;
    motherName?: string;
    guardianName?: string;
    guardianPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    aadhaarUrl?: string;
    [key: string]: unknown;
  };
  academicDetails?: {
    sslc?: {
      institution?: string;
      board?: string;
      year?: string;
      percentage?: string;
      certificateUrl?: string;
    };
    plustwo?: {
      institution?: string;
      stream?: string;
      board?: string;
      year?: string;
      percentage?: string;
      certificateUrl?: string;
    };
    ug?: {
      institution?: string;
      degree?: string;
      board?: string;
      year?: string;
      percentage?: string;
      certificateUrl?: string;
    };
    pg?: {
      institution?: string;
      degree?: string;
      board?: string;
      year?: string;
      percentage?: string;
      certificateUrl?: string;
    };
    phd?: {
      institution?: string;
      degree?: string;
      board?: string;
      year?: string;
      percentage?: string;
      certificateUrl?: string;
    };
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [customUniversity, setCustomUniversity] = useState(false);
  const [customFaculty, setCustomFaculty] = useState(false);
  const [customCourse, setCustomCourse] = useState(false);
  const [customStream, setCustomStream] = useState(false);
  const [sortCol, setSortCol] = useState<"name" | "phone" | "studentId" | "fee" | "due" | "course" | "university" | "year" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [paidMap, setPaidMap] = useState<Record<string, number>>({});
  const [paymentsModal, setPaymentsModal] = useState<{ student: Student; payments: Payment[] } | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [togglingProfileId, setTogglingProfileId] = useState<string | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountForm, setDiscountForm] = useState({ amount: "", remarks: "" });
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    faculty: "",
    course: "",
    stream: "",
    duration: "",
    university: "",
    startYear: String(currentYear),
    endYear: "",
    totalFee: "",
    discountAmount: "",
    enrollmentDate: new Date().toISOString().split("T")[0],
  });

  const availableCourses = formData.faculty ? getCourses(formData.faculty) : [];
  const availableStreams = formData.faculty && formData.course ? getStreams(formData.faculty, formData.course) : [];
  const autoDuration = formData.faculty && formData.course ? getDuration(formData.faculty, formData.course) : "";

  // Calculate end year from duration string like "3 Years (6 Semesters)" or "4 Years"
  function calcEndYear(duration: string, startYear: string): string {
    const match = duration.match(/(\d+)\s*Year/i);
    if (match && startYear) {
      return String(parseInt(startYear) + parseInt(match[1]));
    }
    return "";
  }

  const yearOptions = Array.from({ length: currentYear - 2008 + 10 }, (_, i) => 2008 + i);

  async function toggleStudentProfileEdit(student: Student) {
    setTogglingProfileId(student.id);
    try {
      const next = !student.profileEditEnabled;
      await setDoc(doc(db, "students", student.id), { profileEditEnabled: next }, { merge: true });
      setStudents((prev) => prev.map((s) => s.id === student.id ? { ...s, profileEditEnabled: next } : s));
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingProfileId(null);
    }
  }

  async function openPaymentsModal(student: Student) {
    setLoadingPayments(true);
    setPaymentsModal({ student, payments: [] });
    try {
      const snap = await getDocs(query(collection(db, "payments"),
        orderBy("createdAt", "desc")
      ));
      const payments = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Payment))
        .filter((p) => (p as unknown as Record<string,string>).phone === student.phone || (p as unknown as Record<string,string>).studentPhone === student.phone);
      setPaymentsModal({ student, payments });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPayments(false);
    }
  }

  async function fetchPayments() {
    try {
      const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const map: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const p = d.data();
        // Skip discount payments - they don't count as cash collected
        if (p.isDiscount || p.paymentMode === "Discount") return;
        const phone = (p.studentPhone as string) || (p.phone as string);
        if (phone) map[phone] = (map[phone] || 0) + (p.amountPaid as number || 0);
      });
      setPaidMap(map);
    } catch (err) {
      console.error("Error fetching payments:", err);
    }
  }

  async function fetchStudents() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "students"));
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Student[];
      setStudents(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents();
    fetchPayments();
  }, []);

  function downloadDocument(url: string, filename: string) {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function openBase64(dataUrl: string) {
    const win = window.open();
    if (win) {
      win.document.write(`<img src="${dataUrl}" style="max-width:100%;height:auto;" />`);
    }
  }

  // Close modal on Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDetailStudent(null);
        setPaymentsModal(null);
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Month code mapping
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

  // Generate unique student ID: [YY][MonthCode]AIOS[5-Digit Serial]
  async function generateStudentId(): Promise<string> {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); // Last 2 digits
    const monthCode = MONTH_CODES[now.getMonth()];
    const prefix = `${year}${monthCode}AIOS`;

    // Query all students to find highest serial for current year-month
    const snapshot = await getDocs(collection(db, "students"));
    let maxSerial = 0;

    snapshot.forEach((doc) => {
      const studentId = doc.data().studentId as string;
      if (studentId && studentId.startsWith(prefix)) {
        const serialPart = studentId.slice(-5); // Get last 5 digits
        const serial = parseInt(serialPart, 10);
        if (!isNaN(serial) && serial > maxSerial) {
          maxSerial = serial;
        }
      }
    });

    const nextSerial = maxSerial + 1;
    const paddedSerial = String(nextSerial).padStart(5, "0");
    return `${prefix}${paddedSerial}`;
  }

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

    snapshot.forEach((doc) => {
      const receiptNumber = doc.data().receiptNumber as string;
      if (receiptNumber && (receiptNumber.startsWith("RCP") || receiptNumber.startsWith("VCH"))) {
        // Extract serial from [Prefix][YY][Month][Serial] format
        // Prefix = 3 chars, YY = 2 chars, Month = 2 chars, Serial = 6 chars
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

  // Generate PDF for student details
  async function generateStudentPDF() {
    if (!printRef.current || !detailStudent) return;
    setGeneratingPDF(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${detailStudent.studentId}_${detailStudent.name.replace(/\s+/g, "_")}_Admission.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setGeneratingPDF(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const phoneKey = "+91" + formData.phone.replace(/\D/g, "");
      const studentId = await generateStudentId();
      const discountAmount = parseFloat(formData.discountAmount) || 0;
      const totalFee = parseFloat(formData.totalFee) || 0;

      // Save student data
      await setDoc(doc(db, "students", phoneKey), {
        studentId: studentId,
        name: formData.name,
        email: formData.email,
        phone: phoneKey,
        faculty: formData.faculty,
        course: formData.course,
        stream: formData.stream,
        duration: formData.duration,
        university: formData.university,
        startYear: formData.startYear,
        endYear: formData.endYear,
        totalFee: totalFee,
        discountAmount: discountAmount,
        enrollmentDate: formData.enrollmentDate,
        createdAt: serverTimestamp(),
      });

      // If discount exists, create a discount payment record
      if (discountAmount > 0) {
        const discountReceiptId = await generateReceiptId("discount");
        await setDoc(doc(db, "payments", discountReceiptId), {
          receiptNumber: discountReceiptId,
          amountPaid: discountAmount,
          paymentDate: formData.enrollmentDate,
          paymentMode: "Discount",
          installmentNumber: 0,
          totalInstallments: 0,
          balanceAmount: totalFee - discountAmount,
          transactionRef: "Administrative Discount",
          remarks: `Discount given to ${formData.name}`,
          studentPhone: phoneKey,
          studentName: formData.name,
          studentEmail: formData.email,
          studentId: studentId,
          university: formData.university,
          course: formData.course,
          stream: formData.stream || "",
          program: formData.course,
          totalFee: totalFee,
          createdAt: serverTimestamp(),
          isDiscount: true,
        });
      }

      // Send welcome SMS to student
      try {
        await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phoneKey,
            studentName: formData.name,
            studentId: studentId,
          }),
        });
      } catch (smsErr) {
        console.error("Error sending SMS:", smsErr);
        // Don't block the flow if SMS fails
      }

      setFormData({
        name: "",
        email: "",
        phone: "",
        faculty: "",
        course: "",
        stream: "",
        duration: "",
        university: "",
        startYear: String(currentYear),
        endYear: "",
        totalFee: "",
        discountAmount: "",
        enrollmentDate: new Date().toISOString().split("T")[0],
      });
      setShowForm(false);
      setCustomUniversity(false);
      setCustomFaculty(false);
      setCustomCourse(false);
      setCustomStream(false);
      fetchStudents();
    } catch (err) {
      console.error("Error adding student:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(student: Student) {
    if (!confirm(`Delete ${student.name}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "students", student.id));
      fetchStudents();
    } catch (err) {
      console.error("Error deleting student:", err);
    }
  }

  const filtered = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search) ||
      s.studentId?.toLowerCase().includes(search.toLowerCase()) ||
      s.faculty?.toLowerCase().includes(search.toLowerCase()) ||
      s.course?.toLowerCase().includes(search.toLowerCase())
  );

  const totalFee = students.reduce((sum, s) => sum + (s.totalFee || 0), 0);
  const totalDiscount = students.reduce((sum, s) => sum + (s.discountAmount || 0), 0);
  const effectiveTotalFee = totalFee - totalDiscount;
  const totalPaid = Object.values(paidMap).reduce((a, b) => a + b, 0);
  const totalDue = effectiveTotalFee - totalPaid;

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Page Header */}
      <div>
        <h1 className="text-sm lg:text-base font-bold text-slate-900">Students</h1>
        <p className="text-[11px] lg:text-xs font-medium text-slate-700">{students.length} students enrolled</p>
      </div>

      {/* Stat Cards */}
      {!loading && students.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-700">Enrolled</p>
              <p className="text-base font-extrabold text-slate-900 leading-tight">{students.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">
              <IndianRupee className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-700">Collected</p>
              <p className="text-sm font-extrabold text-green-700 leading-tight">₹{totalPaid.toLocaleString("en-IN")}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">
              <Bell className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-700">Fees Due</p>
              <p className="text-sm font-extrabold text-red-600 leading-tight">₹{totalDue.toLocaleString("en-IN")}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-700">Cleared</p>
              <p className="text-base font-extrabold text-green-700 leading-tight">{students.filter((s) => ((s.totalFee || 0) - (s.discountAmount || 0)) - (paidMap[s.phone] || 0) <= 0).length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">

        {/* Search bar with Add Student button */}
        {!loading && students.length > 0 && (
          <div className="px-3 lg:px-5 py-2 lg:py-3 border-b border-slate-100 flex items-center gap-2 lg:gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, ID..."
                className="w-full pl-9 pr-4 py-2 text-xs lg:text-sm rounded-xl border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
              />
            </div>
            <span className="text-[10px] lg:text-xs font-semibold text-slate-700 ml-auto flex-shrink-0">{filtered.length} of {students.length}</span>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold text-white rounded-xl gradient-bg hover:shadow-lg transition-all flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span className="hidden sm:inline">Add Student</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 mb-4">No students yet. Add one to get started.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl gradient-bg hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          </div>
        ) : (
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="gradient-bg sticky top-0 z-10 shadow-md">
                  <th
                    className={`text-left px-3 lg:px-5 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors ${sortCol === "name" ? "bg-white/20" : ""}`}
                    onClick={() => { setSortCol("name"); setSortDir(sortCol === "name" && sortDir === "asc" ? "desc" : "asc"); }}
                  >
                    Name {sortCol === "name" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className={`text-left px-3 lg:px-5 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors ${sortCol === "phone" ? "bg-white/20" : ""}`}
                    onClick={() => { setSortCol("phone"); setSortDir(sortCol === "phone" && sortDir === "asc" ? "desc" : "asc"); }}
                  >
                    Phone {sortCol === "phone" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className={`text-left px-3 lg:px-5 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors hidden sm:table-cell ${sortCol === "studentId" ? "bg-white/20" : ""}`}
                    onClick={() => { setSortCol("studentId"); setSortDir(sortCol === "studentId" && sortDir === "asc" ? "desc" : "asc"); }}
                  >
                    Student ID {sortCol === "studentId" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className={`text-left px-3 lg:px-5 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors hidden sm:table-cell ${sortCol === "fee" ? "bg-white/20" : ""}`}
                    onClick={() => { setSortCol("fee"); setSortDir(sortCol === "fee" && sortDir === "asc" ? "desc" : "asc"); }}
                  >
                    Total Fee {sortCol === "fee" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className={`text-left px-3 lg:px-5 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors ${sortCol === "due" ? "bg-white/20" : ""}`}
                    onClick={() => { setSortCol("due"); setSortDir(sortCol === "due" && sortDir === "asc" ? "desc" : "asc"); }}
                  >
                    Due {sortCol === "due" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className={`text-left px-3 lg:px-5 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors hidden md:table-cell ${sortCol === "course" ? "bg-white/20" : ""}`}
                    onClick={() => { setSortCol("course"); setSortDir(sortCol === "course" && sortDir === "asc" ? "desc" : "asc"); }}
                  >
                    Course {sortCol === "course" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className={`text-left px-3 lg:px-5 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors hidden lg:table-cell ${sortCol === "university" ? "bg-white/20" : ""}`}
                    onClick={() => { setSortCol("university"); setSortDir(sortCol === "university" && sortDir === "asc" ? "desc" : "asc"); }}
                  >
                    University {sortCol === "university" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className={`text-left px-3 lg:px-5 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors hidden lg:table-cell ${sortCol === "year" ? "bg-white/20" : ""}`}
                    onClick={() => { setSortCol("year"); setSortDir(sortCol === "year" && sortDir === "asc" ? "desc" : "asc"); }}
                  >
                    Year {sortCol === "year" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-right px-3 lg:px-5 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...filtered].sort((a, b) => {
                  // Default sort: newest first by createdAt
                  if (!sortCol) {
                    const timeA = a.createdAt ? (a.createdAt as any).toMillis?.() : 0;
                    const timeB = b.createdAt ? (b.createdAt as any).toMillis?.() : 0;
                    return timeB - timeA;
                  }
                  const dir = sortDir === "asc" ? 1 : -1;
                  const effectiveFeeA = (a.totalFee || 0) - (a.discountAmount || 0);
                  const effectiveFeeB = (b.totalFee || 0) - (b.discountAmount || 0);
                  const paidA = paidMap[a.phone] || 0;
                  const paidB = paidMap[b.phone] || 0;
                  const dueA = effectiveFeeA - paidA;
                  const dueB = effectiveFeeB - paidB;

                  if (sortCol === "name") return (a.name || "").localeCompare(b.name || "") * dir;
                  if (sortCol === "phone") return (a.phone || "").localeCompare(b.phone || "") * dir;
                  if (sortCol === "studentId") return ((a.studentId || a.id || "").localeCompare(b.studentId || b.id || "")) * dir;
                  if (sortCol === "fee") return ((a.totalFee || 0) - (b.totalFee || 0)) * dir;
                  if (sortCol === "due") return (dueA - dueB) * dir;
                  if (sortCol === "course") return (a.course || "").localeCompare(b.course || "") * dir;
                  if (sortCol === "university") return (a.university || "").localeCompare(b.university || "") * dir;
                  if (sortCol === "year") return ((a.startYear || "").localeCompare(b.startYear || "")) * dir;
                  return 0;
                }).map((student, idx) => {
                  const initials = student.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";
                  const effectiveFee = (student.totalFee || 0) - (student.discountAmount || 0);
                  const due = effectiveFee - (paidMap[student.phone] || 0);
                  const photoUrl = student.personalDetails?.photo;
                  return (
                    <tr key={student.id} className={`border-b border-red-50 hover:bg-red-50/60 transition-colors ${idx % 2 !== 0 ? "bg-red-50/20" : "bg-white"}`}>
                      <td className="px-3 lg:px-5 py-2 lg:py-3">
                        <button onClick={() => setDetailStudent(student)} className="text-left flex items-center gap-2 lg:gap-3 group/name">
                          <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                            {photoUrl ? (
                              <img src={photoUrl} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] lg:text-[10px] font-extrabold text-white">{initials}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-[11px] lg:text-xs group-hover/name:text-red-700 transition-colors truncate max-w-[100px] lg:max-w-none">{student.name}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 hidden sm:block">{student.email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-3 lg:px-5 py-2 lg:py-3 text-slate-800 text-[11px] lg:text-xs whitespace-nowrap">{student.phone}</td>
                      <td className="px-3 lg:px-5 py-2 lg:py-3 whitespace-nowrap hidden sm:table-cell">
                        <button onClick={() => setDetailStudent(student)} className="text-[11px] lg:text-xs text-blue-700 hover:text-blue-900 hover:underline transition-colors">
                          {student.studentId || student.id}
                        </button>
                      </td>
                      <td className="px-3 lg:px-5 py-2 lg:py-3 whitespace-nowrap hidden sm:table-cell">
                        <span className="text-[11px] lg:text-xs text-slate-800">₹{(student.totalFee || 0).toLocaleString("en-IN")}</span>
                      </td>
                      <td className="px-3 lg:px-5 py-2 lg:py-3 whitespace-nowrap">
                        {due <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full bg-green-100 text-green-800 text-[11px] lg:text-xs">✓</span>
                        ) : (
                          <div>
                            <p className="text-[11px] lg:text-xs text-red-600">₹{due.toLocaleString("en-IN")}</p>
                            <span className="inline-block mt-0.5 px-1.5 lg:px-2 py-0.5 text-[10px] lg:text-xs bg-red-100 text-red-700 rounded-md">Due</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 lg:px-5 py-2 lg:py-3 max-w-[100px] lg:max-w-[160px] hidden md:table-cell">
                        <span className="text-[11px] lg:text-xs text-slate-900 leading-tight truncate">
                          {(student.course || "").replace(/\s*\([^)]*\)/g, "")}{student.stream ? `-${student.stream}` : ""}
                        </span>
                      </td>
                      <td className="px-3 lg:px-5 py-2 lg:py-3 text-[11px] lg:text-xs text-slate-800 font-bold hidden lg:table-cell">{student.university}</td>
                      <td className="px-3 lg:px-5 py-2 lg:py-3 whitespace-nowrap hidden lg:table-cell">
                        <span className="text-[11px] lg:text-xs text-slate-800 bg-slate-100 px-1.5 lg:px-2 py-0.5 rounded-md">
                          {student.startYear}{student.endYear ? ` – ${student.endYear}` : ""}
                        </span>
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openPaymentsModal(student)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 transition-colors"
                            title="View Payments"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleStudentProfileEdit(student)}
                            disabled={togglingProfileId === student.id}
                            title={student.profileEditEnabled ? "Disable profile editing" : "Enable profile editing"}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                              togglingProfileId === student.id ? "opacity-50 cursor-wait" : "cursor-pointer"
                            } ${student.profileEditEnabled ? "bg-green-500" : "bg-amber-700"}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${student.profileEditEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                          <button
                            onClick={() => handleDelete(student)}
                            className="p-1.5 text-slate-600 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Student Detail Modal */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-2 sm:px-4 py-4 sm:py-6 overflow-auto">
          <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-3xl mx-2 sm:mx-4 overflow-hidden max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-slate-200">

            {/* ── Header ── */}
            <div className="gradient-bg px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white/30">
                    {detailStudent.personalDetails?.photo ? (
                      <img src={detailStudent.personalDetails.photo} alt={detailStudent.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-lg font-extrabold text-white tracking-tight truncate">{detailStudent.name}</h2>
                    <p className="text-[11px] sm:text-xs text-white/90 font-medium mt-0.5">{detailStudent.course?.replace(/\s*\(.*?\)/g, "")}{detailStudent.stream ? `-${detailStudent.stream}` : ""}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] sm:text-[11px] text-white/70">{detailStudent.studentId || detailStudent.id}</span>
                      <span className="text-white/30">|</span>
                      <a href={`tel:${detailStudent.phone}`} className="text-[10px] sm:text-[11px] text-white/70 hover:text-white hover:underline">{detailStudent.phone}</a>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setShowDiscountModal(true)} className="px-3 py-1.5 text-[10px] sm:text-[11px] font-bold text-green-700 bg-white rounded-lg hover:bg-green-50 transition-colors shadow-sm hidden sm:block">
                    Add Discount
                  </button>
                  <button onClick={generateStudentPDF} disabled={generatingPDF} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold text-blue-700 bg-white rounded-lg hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-60">
                    {generatingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                    {generatingPDF ? "..." : "Print"}
                  </button>
                  <button onClick={() => setDetailStudent(null)} className="text-white/60 hover:text-white transition-colors p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Mobile action buttons */}
              <div className="sm:hidden flex gap-2 mt-3 pt-3 border-t border-white/15">
                <button onClick={() => setShowDiscountModal(true)} className="flex-1 py-1.5 text-[10px] font-bold text-white bg-white/15 rounded-lg border border-white/20">
                  Add Discount
                </button>
                <button onClick={generateStudentPDF} disabled={generatingPDF} className="flex-1 py-1.5 text-[10px] font-bold text-white bg-white/15 rounded-lg border border-white/20 disabled:opacity-50 flex items-center justify-center gap-1">
                  {generatingPDF ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}Print
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="p-4 sm:p-5 space-y-4">

              {/* ── Enrollment Details ── */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-black mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-red-500" />Enrollment Details
                </h3>
                <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-2.5">
                    {[
                      { label: "Student ID", value: detailStudent.studentId || detailStudent.id },
                      { label: "Faculty", value: detailStudent.faculty },
                      { label: "Course", value: detailStudent.course },
                      { label: "Stream", value: detailStudent.stream || "—" },
                      { label: "Duration", value: detailStudent.duration || "—" },
                      { label: "University", value: detailStudent.university },
                      { label: "Academic Year", value: `${detailStudent.startYear}${detailStudent.endYear ? ` – ${detailStudent.endYear}` : ""}` },
                      { label: "Total Fee", value: `₹${(detailStudent.totalFee || 0).toLocaleString("en-IN")}` },
                      ...(detailStudent.discountAmount && detailStudent.discountAmount > 0
                        ? [
                            { label: "Discount", value: `₹${detailStudent.discountAmount.toLocaleString("en-IN")}`, color: "text-green-700" },
                            { label: "Effective Fee", value: `₹${((detailStudent.totalFee || 0) - detailStudent.discountAmount).toLocaleString("en-IN")}`, color: "text-blue-700" },
                          ]
                        : []),
                      { label: "Enrolled On", value: detailStudent.enrollmentDate || "—" },
                    ].map(({ label, value, color }: any) => (
                      <div key={label}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                        <p className={`text-[11px] lg:text-xs font-bold ${color || 'text-slate-800'} truncate`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Fee Summary Strip ── */}
              <div className="flex flex-wrap gap-2">
                <div className="flex-1 min-w-[120px] bg-white rounded-lg border border-slate-200 px-3 py-2 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total Fee</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">₹{(detailStudent.totalFee || 0).toLocaleString("en-IN")}</p>
                </div>
                {(detailStudent.discountAmount || 0) > 0 && (
                  <div className="flex-1 min-w-[120px] bg-green-50 rounded-lg border border-green-200 px-3 py-2 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-green-500">Discount</p>
                    <p className="text-sm font-bold text-green-700 mt-0.5">₹{(detailStudent.discountAmount || 0).toLocaleString("en-IN")}</p>
                  </div>
                )}
                <div className="flex-1 min-w-[120px] bg-red-50 rounded-lg border border-red-200 px-3 py-2 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-red-400">Effective Fee</p>
                  <p className="text-sm font-bold text-red-700 mt-0.5">₹{((detailStudent.totalFee || 0) - (detailStudent.discountAmount || 0)).toLocaleString("en-IN")}</p>
                </div>
              </div>

              {/* ── Documents ── */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-black mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Documents
                </h3>
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {/* Photo */}
                    {detailStudent.personalDetails?.photo ? (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                        <button onClick={() => openBase64(detailStudent.personalDetails!.photo as string)} className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <span className="text-[9px] font-bold text-slate-700">Photo</span>
                        <button onClick={() => downloadDocument(detailStudent.personalDetails!.photo as string, `${detailStudent.name.replace(/\s+/g, "_")}_Photo.jpg`)} className="text-[8px] font-semibold text-red-600 hover:underline">Download</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-red-50/50 border border-red-100">
                        <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
                          <X className="w-3.5 h-3.5 text-red-300" />
                        </div>
                        <span className="text-[9px] font-bold text-red-400">Photo</span>
                        <span className="text-[8px] text-red-300">Missing</span>
                      </div>
                    )}
                    {/* Aadhaar */}
                    {detailStudent.personalDetails?.aadhaarUrl ? (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                        <button onClick={() => openBase64(detailStudent.personalDetails!.aadhaarUrl as string)} className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <span className="text-[9px] font-bold text-slate-700">Aadhaar</span>
                        <button onClick={() => downloadDocument(detailStudent.personalDetails!.aadhaarUrl as string, `${detailStudent.name.replace(/\s+/g, "_")}_Aadhaar.jpg`)} className="text-[8px] font-semibold text-red-600 hover:underline">Download</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-red-50/50 border border-red-100">
                        <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
                          <X className="w-3.5 h-3.5 text-red-300" />
                        </div>
                        <span className="text-[9px] font-bold text-red-400">Aadhaar</span>
                        <span className="text-[8px] text-red-300">Missing</span>
                      </div>
                    )}
                    {/* SSLC */}
                    {detailStudent.academicDetails?.sslc?.certificateUrl ? (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                        <button onClick={() => openBase64(detailStudent.academicDetails!.sslc!.certificateUrl as string)} className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <span className="text-[9px] font-bold text-slate-700">SSLC</span>
                        <button onClick={() => downloadDocument(detailStudent.academicDetails!.sslc!.certificateUrl as string, `${detailStudent.name.replace(/\s+/g, "_")}_SSLC.jpg`)} className="text-[8px] font-semibold text-red-600 hover:underline">Download</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-red-50/50 border border-red-100">
                        <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
                          <X className="w-3.5 h-3.5 text-red-300" />
                        </div>
                        <span className="text-[9px] font-bold text-red-400">SSLC</span>
                        <span className="text-[8px] text-red-300">Missing</span>
                      </div>
                    )}
                    {/* HSC */}
                    {detailStudent.academicDetails?.plustwo?.certificateUrl ? (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                        <button onClick={() => openBase64(detailStudent.academicDetails!.plustwo!.certificateUrl as string)} className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <span className="text-[9px] font-bold text-slate-700">HSC</span>
                        <button onClick={() => downloadDocument(detailStudent.academicDetails!.plustwo!.certificateUrl as string, `${detailStudent.name.replace(/\s+/g, "_")}_HSC.jpg`)} className="text-[8px] font-semibold text-red-600 hover:underline">Download</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-red-50/50 border border-red-100">
                        <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
                          <X className="w-3.5 h-3.5 text-red-300" />
                        </div>
                        <span className="text-[9px] font-bold text-red-400">HSC</span>
                        <span className="text-[8px] text-red-300">Missing</span>
                      </div>
                    )}
                    {/* UG */}
                    {detailStudent.academicDetails?.ug?.certificateUrl ? (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                        <button onClick={() => openBase64(detailStudent.academicDetails!.ug!.certificateUrl as string)} className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <span className="text-[9px] font-bold text-slate-700">UG</span>
                        <button onClick={() => downloadDocument(detailStudent.academicDetails!.ug!.certificateUrl as string, `${detailStudent.name.replace(/\s+/g, "_")}_UG.jpg`)} className="text-[8px] font-semibold text-red-600 hover:underline">Download</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-100 opacity-40">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">UG</span>
                        <span className="text-[8px] text-slate-300">N/A</span>
                      </div>
                    )}
                    {/* PG */}
                    {detailStudent.academicDetails?.pg?.certificateUrl && (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                        <button onClick={() => openBase64(detailStudent.academicDetails!.pg!.certificateUrl as string)} className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <span className="text-[9px] font-bold text-slate-700">PG</span>
                        <button onClick={() => downloadDocument(detailStudent.academicDetails!.pg!.certificateUrl as string, `${detailStudent.name.replace(/\s+/g, "_")}_PG.jpg`)} className="text-[8px] font-semibold text-red-600 hover:underline">Download</button>
                      </div>
                    )}
                    {/* PhD */}
                    {detailStudent.academicDetails?.phd?.certificateUrl && (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                        <button onClick={() => openBase64(detailStudent.academicDetails!.phd!.certificateUrl as string)} className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <span className="text-[9px] font-bold text-slate-700">PhD</span>
                        <button onClick={() => downloadDocument(detailStudent.academicDetails!.phd!.certificateUrl as string, `${detailStudent.name.replace(/\s+/g, "_")}_PhD.jpg`)} className="text-[8px] font-semibold text-red-600 hover:underline">Download</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Academic Background ── */}
              {(detailStudent.academicDetails?.sslc?.institution || detailStudent.academicDetails?.plustwo?.institution || detailStudent.academicDetails?.ug?.institution || detailStudent.academicDetails?.pg?.institution) && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-black mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-red-500" />Academic Background
                  </h3>
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-slate-500">Qualification</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-slate-500">Institution</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-slate-500">Board / Univ.</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-slate-500">Year</th>
                          <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailStudent.academicDetails?.sslc?.institution && (
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2 text-[11px] font-semibold text-slate-800">SSLC / 10th</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.sslc.institution}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.sslc.board || "—"}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.sslc.year || "—"}</td>
                            <td className="px-3 py-2 text-[11px] font-bold text-green-600 text-right">{detailStudent.academicDetails.sslc.percentage || "—"}%</td>
                          </tr>
                        )}
                        {detailStudent.academicDetails?.plustwo?.institution && (
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2 text-[11px] font-semibold text-slate-800">HSC / 12th</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.plustwo.institution}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.plustwo.board || detailStudent.academicDetails.plustwo.stream || "—"}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.plustwo.year || "—"}</td>
                            <td className="px-3 py-2 text-[11px] font-bold text-green-600 text-right">{detailStudent.academicDetails.plustwo.percentage || "—"}%</td>
                          </tr>
                        )}
                        {detailStudent.academicDetails?.ug?.institution && (
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2 text-[11px] font-semibold text-slate-800">UG Degree</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.ug.institution}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.ug.degree || detailStudent.academicDetails.ug.board || "—"}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.ug.year || "—"}</td>
                            <td className="px-3 py-2 text-[11px] font-bold text-green-600 text-right">{detailStudent.academicDetails.ug.percentage || "—"}%</td>
                          </tr>
                        )}
                        {detailStudent.academicDetails?.pg?.institution && (
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2 text-[11px] font-semibold text-slate-800">PG Degree</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.pg.institution}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.pg.degree || detailStudent.academicDetails.pg.board || "—"}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{detailStudent.academicDetails.pg.year || "—"}</td>
                            <td className="px-3 py-2 text-[11px] font-bold text-green-600 text-right">{detailStudent.academicDetails.pg.percentage || "—"}%</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Personal & Family (side by side) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-red-500" />Personal Information
                  </h3>
                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                      {[
                        { label: "Date of Birth", value: detailStudent.personalDetails?.dob || "—" },
                        { label: "Gender", value: detailStudent.personalDetails?.gender || "—" },
                        { label: "Blood Group", value: detailStudent.personalDetails?.bloodGroup || "—" },
                        { label: "Aadhaar No.", value: detailStudent.personalDetails?.aadhaarNumber || "—" },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                          <p className="text-[11px] font-bold text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Family Details
                  </h3>
                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                      {[
                        { label: "Father's Name", value: detailStudent.personalDetails?.fatherName || "—" },
                        { label: "Mother's Name", value: detailStudent.personalDetails?.motherName || "—" },
                        { label: "Guardian", value: detailStudent.personalDetails?.guardianName || "—" },
                        { label: "Guardian Phone", value: detailStudent.personalDetails?.guardianPhone || "—", isPhone: true },
                      ].map(({ label, value, isPhone }) => (
                        <div key={label}>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                          {isPhone && value !== "—" ? (
                            <a href={`tel:${value}`} className="text-[11px] font-bold text-red-600 hover:underline">{value}</a>
                          ) : (
                            <p className="text-[11px] font-bold text-slate-800 truncate">{value}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Address ── */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Address
                </h3>
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <p className="text-[11px] font-bold text-slate-800">
                    {[detailStudent.personalDetails?.address, detailStudent.personalDetails?.city, detailStudent.personalDetails?.state, detailStudent.personalDetails?.pincode].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              </div>

            </div>

            {/* ── Footer ── */}
            <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-end">
              <button onClick={() => setDetailStudent(null)} className="px-4 py-1.5 text-[11px] font-bold text-white gradient-bg rounded-md hover:shadow-md transition-all">Close</button>
            </div>

          </div>
        </div>
      )}

      {/* Hidden Print Form for PDF Generation - Admission Form */}
      {detailStudent && (
        <div ref={printRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div style={{ backgroundColor: "#ffffff", padding: "20px 24px", width: "210mm", minHeight: "297mm", fontFamily: "Arial, sans-serif", boxSizing: "border-box" }}>
            {/* Header with Emblem Left, Details Right */}
            <div style={{ border: "2px solid #dc2626", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", padding: "12px" }}>
                {/* Left: Emblem */}
                <div style={{ flexShrink: 0, marginRight: "16px" }}>
                  <img src="/emblem.png" alt="Emblem" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
                </div>
                {/* Center: Institute Name */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <h1 style={{ fontSize: "22px", fontWeight: "bold", color: "#b91c1c", margin: 0, lineHeight: 1.2 }}>AIOS Institute of Advanced Management</h1>
                  <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#dc2626", margin: "4px 0", lineHeight: 1.2 }}>& Technology Pvt. Ltd</h2>
                  <p style={{ fontSize: "11px", color: "#475569", margin: "4px 0" }}>An ISO 9001:2015 Certified Organisation</p>
                  <p style={{ fontSize: "10px", color: "#334155", margin: "2px 0" }}>Phone: 0481 291 9090, +91 62829 69090 | Email: institute.aios@gmail.com</p>
                  <p style={{ fontSize: "10px", color: "#334155", margin: "2px 0" }}>www.aiosinstitute.com | 2nd Floor, Vishnu Arcade, Maruthi Nagar Main Road, Bangalore, Karnataka, India</p>
                </div>
              </div>
            </div>

            {/* Application Title - Compact */}
            <div style={{ textAlign: "center", marginBottom: "10px", borderBottom: "2px solid #dc2626", paddingBottom: "6px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1a1a1a", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>
                ADMISSION FORM
              </h3>
              <p style={{ fontSize: "10px", color: "#555555", margin: "2px 0 0 0" }}>Student Admission - Academic Year {detailStudent.startYear || new Date().getFullYear()}-{detailStudent.endYear || (new Date().getFullYear() + 1)}</p>
            </div>

            {/* Photo + Enrollment Details - Side by Side Aligned */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "stretch" }}>
              {/* Photo Box - Left Side */}
              <div style={{ width: "110px", minHeight: "130px", border: "2px solid #333333", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", flexShrink: 0 }}>
                {detailStudent.personalDetails?.photo ? (
                  <img src={detailStudent.personalDetails.photo} alt="Student Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div>
                    <span style={{ fontSize: "8px", color: "#666666", display: "block" }}>Affix</span>
                    <span style={{ fontSize: "8px", color: "#666666", display: "block" }}>Recent</span>
                    <span style={{ fontSize: "8px", color: "#666666", display: "block" }}>Photo</span>
                  </div>
                )}
              </div>

              {/* Enrollment Details - Right Side */}
              <div style={{ flex: 1, border: "2px solid #dc2626", display: "flex", flexDirection: "column" }}>
                <div style={{ backgroundColor: "#dc2626", padding: "5px 10px", textAlign: "center" }}>
                  <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#ffffff", margin: 0, textTransform: "uppercase" }}>Enrollment Details</h4>
                </div>
                <div style={{ padding: "6px", backgroundColor: "#fef2f2", flex: 1 }}>
                  <table style={{ width: "100%", fontSize: "9px", borderCollapse: "separate", borderSpacing: "0 3px" }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "20%", padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>University</td>
                        <td style={{ width: "30%", padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.university || "—"}</td>
                        <td style={{ width: "20%", padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Faculty</td>
                        <td style={{ width: "30%", padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.faculty || "—"}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Course</td>
                        <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.course || "—"}</td>
                        <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Stream</td>
                        <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.stream || "—"}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Duration</td>
                        <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.duration ? `${detailStudent.duration} Years` : "—"}</td>
                        <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Academic Year</td>
                        <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.startYear ? `${detailStudent.startYear}-${detailStudent.endYear}` : "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Personal Information - Same Style as Enrollment */}
            <div style={{ marginBottom: "10px", border: "1px solid #dc2626" }}>
              <div style={{ backgroundColor: "#dc2626", padding: "5px 10px", textAlign: "center" }}>
                <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#ffffff", margin: 0, textTransform: "uppercase" }}>Personal Information</h4>
              </div>
              <div style={{ padding: "6px", backgroundColor: "#fef2f2" }}>
                <table style={{ width: "100%", fontSize: "9px", borderCollapse: "separate", borderSpacing: "0 3px" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "20%", padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Full Name</td>
                      <td style={{ width: "30%", padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.name || "—"}</td>
                      <td style={{ width: "20%", padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Date of Birth</td>
                      <td style={{ width: "30%", padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.personalDetails?.dob || "—"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Gender</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.personalDetails?.gender || "—"}</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Blood Group</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.personalDetails?.bloodGroup || "—"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Father&apos;s Name</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.personalDetails?.fatherName || "—"}</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Mother&apos;s Name</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.personalDetails?.motherName || "—"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Guardian</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.personalDetails?.guardianName || "—"}</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Aadhaar No</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0", fontFamily: "monospace" }}>{detailStudent.personalDetails?.aadhaarNumber || "—"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Contact</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.phone || "—"}</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Email</td>
                      <td style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>{detailStudent.email || "—"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px", backgroundColor: "#fee2e2", fontWeight: 700, color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "2px 0 0 2px" }}>Address</td>
                      <td colSpan={3} style={{ padding: "4px 6px", backgroundColor: "#ffffff", fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1d5db", borderLeft: "none", borderRadius: "0 2px 2px 0" }}>
                        {[detailStudent.personalDetails?.address, detailStudent.personalDetails?.city, detailStudent.personalDetails?.state, detailStudent.personalDetails?.pincode].filter(Boolean).join(", ") || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Academic Details Section */}
            {(detailStudent.academicDetails?.sslc?.institution || detailStudent.academicDetails?.plustwo?.institution || detailStudent.academicDetails?.ug?.institution || detailStudent.academicDetails?.pg?.institution) && (
              <div style={{ marginBottom: "16px", border: "1px solid #dc2626" }}>
                <div style={{ backgroundColor: "#dc2626", padding: "6px 12px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#ffffff", margin: 0 }}>ACADEMIC DETAILS</h4>
                </div>
                <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#fef2f2" }}>
                      <th style={{ padding: "6px 8px", fontWeight: "bold", color: "#b91c1c", border: "1px solid #fecaca", textAlign: "left", width: "20%" }}>Qualification</th>
                      <th style={{ padding: "6px 8px", fontWeight: "bold", color: "#b91c1c", border: "1px solid #fecaca", textAlign: "left", width: "30%" }}>Institution / University</th>
                      <th style={{ padding: "6px 8px", fontWeight: "bold", color: "#b91c1c", border: "1px solid #fecaca", textAlign: "left", width: "20%" }}>Board / Stream</th>
                      <th style={{ padding: "6px 8px", fontWeight: "bold", color: "#b91c1c", border: "1px solid #fecaca", textAlign: "left", width: "15%" }}>Year</th>
                      <th style={{ padding: "6px 8px", fontWeight: "bold", color: "#b91c1c", border: "1px solid #fecaca", textAlign: "left", width: "15%" }}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailStudent.academicDetails?.sslc?.institution && (
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 600, color: "#334155", border: "1px solid #e2e8f0" }}>SSLC / 10th</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.sslc.institution}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.sslc.board || "—"}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.sslc.year || "—"}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.sslc.percentage || "—"}</td>
                      </tr>
                    )}
                    {detailStudent.academicDetails?.plustwo?.institution && (
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 600, color: "#334155", border: "1px solid #e2e8f0" }}>HSC / 12th</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.plustwo.institution}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.plustwo.stream || detailStudent.academicDetails.plustwo.board || "—"}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.plustwo.year || "—"}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.plustwo.percentage || "—"}</td>
                      </tr>
                    )}
                    {detailStudent.academicDetails?.ug?.institution && (
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 600, color: "#334155", border: "1px solid #e2e8f0" }}>Under Graduate (UG)</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.ug.institution}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.ug.degree || detailStudent.academicDetails.ug.board || "—"}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.ug.year || "—"}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.ug.percentage || "—"}</td>
                      </tr>
                    )}
                    {detailStudent.academicDetails?.pg?.institution && (
                      <tr>
                        <td style={{ padding: "6px 8px", fontWeight: 600, color: "#334155", border: "1px solid #e2e8f0" }}>Post Graduate (PG)</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.pg.institution}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.pg.degree || detailStudent.academicDetails.pg.board || "—"}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.pg.year || "—"}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: "#0f172a", border: "1px solid #e2e8f0" }}>{detailStudent.academicDetails.pg.percentage || "—"}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Declaration Section */}
            <div style={{ marginBottom: "16px", border: "1px solid #dc2626" }}>
              <div style={{ backgroundColor: "#dc2626", padding: "6px 12px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#ffffff", margin: 0 }}>DECLARATION</h4>
              </div>
              <div style={{ padding: "12px" }}>
                <p style={{ fontSize: "11px", color: "#334155", lineHeight: "1.5", margin: "0 0 16px 0" }}>
                  I hereby declare that all the information furnished above is true to the best of my knowledge and belief.
                  I understand that any false information or concealment of facts may result in the cancellation of my admission
                  and/or disciplinary action as deemed fit by the institution.
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "#475569", margin: 0 }}>Date: ____________________</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "11px", color: "#475569", margin: "0 0 16px 0" }}>Signature of Applicant</p>
                    <div style={{ width: "140px", borderBottom: "1px solid #64748b", marginLeft: "auto" }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", padding: "10px", backgroundColor: "#f3f4f6", borderTop: "2px solid #4b5563", marginTop: "12px" }}>
              <p style={{ margin: "2px 0", fontSize: "10px", color: "#1f2937", fontWeight: 600 }}>AIOS Institute of Advanced Management & Technology Pvt. Ltd.</p>
              <p style={{ margin: "2px 0", fontSize: "9px", color: "#4b5563" }}>ISO 9001:2015 Certified | Phone: 0481 291 9090 | www.aiosinstitute.com</p>
              <p style={{ margin: "2px 0", fontSize: "9px", color: "#6b7280" }}>2nd Floor, Vishnu Arcade, Maruthi Nagar Main Road, Bangalore, Karnataka, India</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Discount Modal */}
      {showDiscountModal && detailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200">
            <div className="gradient-bg px-6 py-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Add Discount</h2>
              <button onClick={() => { setShowDiscountModal(false); setDiscountForm({ amount: "", remarks: "" }); }} className="text-white/60 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Student</label>
                <p className="text-sm font-semibold text-slate-900">{detailStudent.name}</p>
                <p className="text-xs text-slate-500">{detailStudent.phone}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Current Fee Details</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded">
                    <p className="text-slate-500">Total Fee</p>
                    <p className="font-bold text-slate-900">₹{(detailStudent.totalFee || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <p className="text-green-600">Discount</p>
                    <p className="font-bold text-green-700">₹{(detailStudent.discountAmount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-blue-600">Effective</p>
                    <p className="font-bold text-blue-700">₹{((detailStudent.totalFee || 0) - (detailStudent.discountAmount || 0)).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Additional Discount Amount (₹) *</label>
                <input
                  type="number"
                  value={discountForm.amount}
                  onChange={(e) => setDiscountForm({ ...discountForm, amount: e.target.value })}
                  min="1"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  placeholder="Enter discount amount"
                />
                {discountForm.amount && (
                  <div className="mt-1 flex items-center gap-3">
                    <p className="text-[10px] text-green-600">
                      New Total Discount: ₹{((detailStudent.discountAmount || 0) + parseFloat(discountForm.amount || "0")).toLocaleString("en-IN")}
                    </p>
                    <span className="text-slate-300">|</span>
                    <p className="text-[10px] text-blue-600">
                      Effective Fee: ₹{((detailStudent.totalFee || 0) - (detailStudent.discountAmount || 0) - parseFloat(discountForm.amount || "0")).toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Remarks (Optional)</label>
                <textarea
                  value={discountForm.remarks}
                  onChange={(e) => setDiscountForm({ ...discountForm, remarks: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none resize-none"
                  placeholder="Reason for discount..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowDiscountModal(false); setDiscountForm({ amount: "", remarks: "" }); }}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const amount = parseFloat(discountForm.amount);
                    if (!amount || amount <= 0) return;
                    setSavingDiscount(true);
                    try {
                      const newDiscountTotal = (detailStudent.discountAmount || 0) + amount;
                      // Update student discount amount
                      await setDoc(doc(db, "students", detailStudent.id), { discountAmount: newDiscountTotal }, { merge: true });
                      // Create voucher payment record
                      const voucherId = await generateReceiptId("discount");
                      await setDoc(doc(db, "payments", voucherId), {
                        receiptNumber: voucherId,
                        amountPaid: amount,
                        paymentDate: new Date().toISOString().split("T")[0],
                        paymentMode: "Discount",
                        installmentNumber: 0,
                        totalInstallments: 0,
                        balanceAmount: (detailStudent.totalFee || 0) - newDiscountTotal,
                        transactionRef: discountForm.remarks || "Administrative Discount",
                        remarks: discountForm.remarks || `Discount given to ${detailStudent.name}`,
                        studentPhone: detailStudent.phone,
                        studentName: detailStudent.name,
                        studentEmail: detailStudent.email,
                        studentId: detailStudent.studentId || "",
                        program: detailStudent.course,
                        university: detailStudent.university || "",
                        course: detailStudent.course || "",
                        stream: detailStudent.stream || "",
                        totalFee: detailStudent.totalFee,
                        createdAt: serverTimestamp(),
                        isDiscount: true,
                      });
                      // Refresh and close
                      await fetchStudents();
                      setShowDiscountModal(false);
                      setDiscountForm({ amount: "", remarks: "" });
                      // Refresh detail student
                      const refreshed = await getDoc(doc(db, "students", detailStudent.id));
                      if (refreshed.exists()) {
                        setDetailStudent({ ...detailStudent, ...refreshed.data(), id: detailStudent.id } as Student);
                      }
                    } catch (err) {
                      console.error("Error saving discount:", err);
                    } finally {
                      setSavingDiscount(false);
                    }
                  }}
                  disabled={savingDiscount || !discountForm.amount || parseFloat(discountForm.amount || "0") <= 0}
                  className="flex-1 py-2 text-xs font-bold text-white gradient-bg rounded-lg hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Discount"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments Modal */}
      {paymentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="text-sm lg:text-base font-bold text-slate-900">{paymentsModal.student.name}</h2>
                <p className="text-[10px] lg:text-xs text-slate-500 mt-0.5">{paymentsModal.student.phone} &bull; {paymentsModal.student.course}</p>
              </div>
              <button onClick={() => setPaymentsModal(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 lg:px-6 py-3 lg:py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-3 gap-2 lg:gap-4 text-center flex-shrink-0">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Total Fee</p>
                <p className="text-sm lg:text-base font-bold text-slate-800">₹{(paymentsModal.student.totalFee || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Paid</p>
                <p className="text-sm lg:text-base font-bold text-blue-700">
                  ₹{(paidMap[paymentsModal.student.phone] || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Balance</p>
                {(() => {
                  const due = (paymentsModal.student.totalFee || 0) - (paidMap[paymentsModal.student.phone] || 0);
                  return <p className={`text-sm lg:text-base font-bold ${due <= 0 ? "text-green-700" : "text-red-600"}`}>{due <= 0 ? "✓ Cleared" : `₹${due.toLocaleString("en-IN")}`}</p>;
                })()}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {loadingPayments ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-red-600" /></div>
              ) : paymentsModal.payments.length === 0 ? (
                <div className="text-center py-10">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No payments recorded yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="gradient-bg">
                      <th className="text-left px-4 lg:px-6 py-2 lg:py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Receipt</th>
                      <th className="text-left px-4 lg:px-6 py-2 lg:py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Date</th>
                      <th className="text-left px-4 lg:px-6 py-2 lg:py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Mode</th>
                      <th className="text-right px-4 lg:px-6 py-2 lg:py-2.5 text-xs font-semibold text-white uppercase tracking-widest">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsModal.payments.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 lg:px-6 py-2 lg:py-3">
                          <Link href={`/admin/payments/${p.id}`} className="text-xs font-mono text-blue-600 hover:underline" target="_blank">{p.receiptNumber}</Link>
                          <p className="text-[10px] text-slate-400 mt-0.5">Installment {p.installmentNumber}</p>
                        </td>
                        <td className="px-4 lg:px-6 py-2 lg:py-3 text-xs text-slate-700">{p.paymentDate}</td>
                        <td className="px-4 lg:px-6 py-2 lg:py-3 text-xs text-slate-600">{p.paymentMode}</td>
                        <td className="px-4 lg:px-6 py-2 lg:py-3 text-right text-sm font-bold text-green-700">₹{(p.amountPaid || 0).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-4 lg:px-6 py-3 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button onClick={() => setPaymentsModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Add Student</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                      placeholder="Full name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      required
                      maxLength={10}
                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                      placeholder="XXXXX XXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Faculty & Course on same row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Faculty *</label>
                  {customFaculty ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={formData.faculty}
                        onChange={(e) => setFormData({ ...formData, faculty: e.target.value, course: "", stream: "", duration: "", endYear: "" })}
                        required
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                        placeholder="Type faculty name"
                      />
                      <button type="button" onClick={() => { setCustomFaculty(false); setCustomCourse(false); setCustomStream(false); setFormData({ ...formData, faculty: "", course: "", stream: "", duration: "", endYear: "" }); }}
                        className="px-2 text-xs text-slate-600 hover:text-red-500 whitespace-nowrap">✕</button>
                    </div>
                  ) : (
                    <select
                      value={formData.faculty}
                      onChange={(e) => {
                        if (e.target.value === "__other__") {
                          setCustomFaculty(true);
                          setCustomCourse(true);
                          setCustomStream(true);
                          setFormData({ ...formData, faculty: "", course: "", stream: "", duration: "", endYear: "" });
                        } else {
                          setCustomCourse(false);
                          setCustomStream(false);
                          setFormData({ ...formData, faculty: e.target.value, course: "", stream: "", duration: "", endYear: "" });
                        }
                      }}
                      required
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                    >
                      <option value="">Select Faculty</option>
                      {getFaculties().map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                      <option value="__other__">Other (Type custom)</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Course *</label>
                  {customCourse ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.course}
                        onChange={(e) => setFormData({ ...formData, course: e.target.value, stream: "", duration: "", endYear: "" })}
                        required
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                        placeholder="Type course name"
                      />
                      {!customFaculty && (
                        <button type="button" onClick={() => { setCustomCourse(false); setCustomStream(false); setFormData({ ...formData, course: "", stream: "", duration: "", endYear: "" }); }}
                          className="px-2 text-xs text-slate-600 hover:text-red-500 whitespace-nowrap">✕</button>
                      )}
                    </div>
                  ) : formData.faculty ? (
                    <select
                      value={formData.course}
                      onChange={(e) => {
                        if (e.target.value === "__other__") {
                          setCustomCourse(true);
                          setCustomStream(true);
                          setFormData({ ...formData, course: "", stream: "", duration: "", endYear: "" });
                        } else {
                          const course = e.target.value;
                          const dur = formData.faculty && course ? getDuration(formData.faculty, course) : "";
                          const end = dur ? calcEndYear(dur, formData.startYear) : "";
                          setCustomStream(false);
                          setFormData({ ...formData, course, stream: "", duration: dur, endYear: end });
                        }
                      }}
                      required
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                    >
                      <option value="">Select Course</option>
                      {availableCourses.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__other__">Other (Type custom)</option>
                    </select>
                  ) : (
                    <select disabled className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-500 appearance-none">
                      <option>Select faculty first</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Stream & University on same row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Stream / Specialization *</label>
                  {customStream ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.stream}
                        onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                        required
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                        placeholder="Type stream / specialization"
                      />
                      {!customCourse && (
                        <button type="button" onClick={() => { setCustomStream(false); setFormData({ ...formData, stream: "" }); }}
                          className="px-2 text-xs text-slate-600 hover:text-red-500 whitespace-nowrap">✕</button>
                      )}
                    </div>
                  ) : formData.course ? (
                    <select
                      value={formData.stream}
                      onChange={(e) => {
                        if (e.target.value === "__other__") {
                          setCustomStream(true);
                          setFormData({ ...formData, stream: "" });
                        } else {
                          setFormData({ ...formData, stream: e.target.value });
                        }
                      }}
                      required
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                    >
                      <option value="">Select Stream</option>
                      {availableStreams.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      <option value="__other__">Other (Type custom)</option>
                    </select>
                  ) : (
                    <select disabled className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-500 appearance-none">
                      <option>Select course first</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">University *</label>
                  {customUniversity ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={formData.university}
                        onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                        required
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                        placeholder="Type university name"
                      />
                      <button type="button" onClick={() => { setCustomUniversity(false); setFormData({ ...formData, university: "" }); }}
                        className="px-2 text-xs text-slate-600 hover:text-red-500 whitespace-nowrap">✕</button>
                    </div>
                  ) : (
                    <select
                      value={formData.university}
                      onChange={(e) => {
                        if (e.target.value === "__other__") {
                          setCustomUniversity(true);
                          setFormData({ ...formData, university: "" });
                        } else {
                          setFormData({ ...formData, university: e.target.value });
                        }
                      }}
                      required
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                    >
                      <option value="">Select University</option>
                      <option value="Capital University">Capital University</option>
                      <option value="Asian International University">Asian International University</option>
                      <option value="North East Frontier Technical University">North East Frontier Technical University</option>
                      <option value="Niilm University">Niilm University</option>
                      <option value="__other__">Other (Type custom)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Duration, Start Year, End Year */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Duration{customCourse ? " *" : ""}</label>
                  {customCourse ? (
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      required
                      placeholder="e.g., 3 Years"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.duration || autoDuration}
                      readOnly
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Year *</label>
                  <select
                    value={formData.startYear}
                    onChange={(e) => {
                      const start = e.target.value;
                      const dur = formData.duration || autoDuration;
                      const end = calcEndYear(dur, start);
                      setFormData({ ...formData, startYear: start, endYear: end || formData.endYear });
                    }}
                    required
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Year *</label>
                  <select
                    value={formData.endYear}
                    onChange={(e) => setFormData({ ...formData, endYear: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                  >
                    <option value="">Select</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fee, Discount & Enrollment Date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Fee (₹) *</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      value={formData.totalFee}
                      onChange={(e) => setFormData({ ...formData, totalFee: e.target.value })}
                      required
                      min="1"
                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                      placeholder="50000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Discount (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                      min="0"
                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                      placeholder="0"
                    />
                  </div>
                  {formData.discountAmount && parseFloat(formData.discountAmount) > 0 && (
                    <p className="text-[10px] text-green-600 mt-1">Effective Fee: ₹{(parseFloat(formData.totalFee || "0") - parseFloat(formData.discountAmount || "0")).toLocaleString("en-IN")}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Enrollment Date</label>
                  <input
                    type="text"
                    value={formData.enrollmentDate}
                    readOnly
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 text-sm text-white font-semibold rounded-lg gradient-bg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Plus className="w-4 h-4" /> Add Student</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
