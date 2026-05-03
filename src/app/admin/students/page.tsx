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

  where,

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

  Filter,

  ChevronDown,

  ChevronUp,
  FileText,

  Printer,

  CreditCard,

  Lock,

  Wallet,

  Award,

  TrendingUp,

  TrendingDown,

  CheckCircle,

  AlertTriangle,

  Home,

  MapPin,

  KeyRound,

  Check,

  Copy,

  Send,

  Download,

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

  firstName?: string;

  lastName?: string;

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

  admissionCenter?: string;

  profileEditEnabled?: boolean;

  createdAt?: unknown;

  archived?: boolean;

  archivedAt?: unknown;

  personalDetails?: {

    photo?: string;

    dob?: string;

    dateOfBirth?: string;

    gender?: string;

    bloodGroup?: string;

    aadhaarNumber?: string;

    fatherName?: string;

    motherName?: string;

    guardianName?: string;

    guardianPhone?: string;

    employmentType?: string;

    yearsOfExperience?: string;

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

  admissionStatus?: "Pending" | "In Progress" | "Confirmed" | "Rejected";

  semesterResults?: Array<{

    year: number;

    status: "Pass" | "Fail" | "Not Declared";

    date?: string;

    certificateStatus?: "Not Issued" | "Issued from University" | "Sent" | "Received";

    semesters?: {

      semester: number;

      status: "Pass" | "Fail" | "Not Declared";

      certificateStatus?: "Not Issued" | "Issued from University" | "Sent" | "Received";

    }[];

  }>;

  consignments?: Array<{

    id: string;

    type: string;

    sent: boolean;

    trackingNumber?: string;

    dateSent?: string;

    status?: "In Transit" | "Delivered" | "Returned";

    deliveryPartner?: string;

    deliveredOn?: string;

  }>;

  trackingNotes?: string[];

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

  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);

  const [resetLink, setResetLink] = useState<string | null>(null);

  const [resetLinkStudentName, setResetLinkStudentName] = useState<string>("");

  const [resetLinkStudentId, setResetLinkStudentId] = useState<string>("");

  const [copied, setCopied] = useState(false);

  const [newStudentLink, setNewStudentLink] = useState<string | null>(null);

  const [newStudentName, setNewStudentName] = useState<string>("");

  const [newStudentCopied, setNewStudentCopied] = useState(false);

  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  const [showDiscountModal, setShowDiscountModal] = useState(false);

  const [discountForm, setDiscountForm] = useState({ amount: "", remarks: "" });

  const [savingDiscount, setSavingDiscount] = useState(false);

  const [generatingPDF, setGeneratingPDF] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const [addressLabelStudent, setAddressLabelStudent] = useState<Student | null>(null);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

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

    admissionCenter: "Bengaluru",

  });



  const availableCourses = formData.faculty ? getCourses(formData.faculty) : [];

  const availableStreams = formData.faculty && formData.course ? getStreams(formData.faculty, formData.course) : [];

  const autoDuration = formData.faculty && formData.course ? getDuration(formData.faculty, formData.course) : "";



  // Calculate end year from duration string like "3 Years (6 Semesters)" or "4 Years"

  function calcEndYear(duration: string, startYear: string): string {

    const yearMatch = duration.match(/(\d+)\s*Year/i);

    if (yearMatch && startYear) {

      return String(parseInt(startYear) + parseInt(yearMatch[1]));

    }

    // For 6 Months, end year is same as start year

    if (duration.toLowerCase().includes("month") && startYear) {

      return startYear;

    }

    return "";

  }



  // Duration options for custom courses

  const DURATION_OPTIONS = [

    "6 Months",

    "1 Year",

    "2 Years",

    "3 Years",

    "4 Years",

    "5 Years",

    "6 Years",

    "7 Years",

    "8 Years"

  ];



  const yearOptions = Array.from({ length: currentYear - 2008 + 10 }, (_, i) => 2008 + i);



  // Update end year when custom duration changes

  useEffect(() => {

    if (customCourse && formData.duration && formData.startYear) {

      const endYear = calcEndYear(formData.duration, formData.startYear);

      setFormData(prev => ({

        ...prev,

        endYear: endYear

      }));

    }

  }, [customCourse, formData.duration, formData.startYear]);



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

        .filter((p) => (p as unknown as Record<string,string>).studentId === student.studentId || (p as unknown as Record<string,string>).studentId === student.id);

      setPaymentsModal({ student, payments });

    } catch (err) {

      console.error(err);

    } finally {

      setLoadingPayments(false);

    }

  }



  function openAddressLabelModal(student: Student) {
    if (!student.personalDetails?.address) {
      setErrorModal({ title: "Missing Address", message: "Student address is required to generate the address label. Please add the student's address first." });
      return;
    }
    setAddressLabelStudent(student);
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

        const studentId = p.studentId as string;

        if (studentId) map[studentId] = (map[studentId] || 0) + (p.amountPaid as number || 0);

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

      // Exclude archived (soft-deleted) students from active list

      const active = data.filter((s) => !s.archived);

      setStudents(active.sort((a, b) => a.name.localeCompare(b.name)));

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



  async function handleResetPassword(student: Student) {

    setResettingPasswordId(student.id);

    try {

      const tokenRes = await fetch("/api/auth/create-password-token", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ phone: student.phone, studentId: student.studentId || student.id }),

      });

      const tokenData = await tokenRes.json();



      if (tokenRes.ok && tokenData.link) {

        // Attempt SMS auto-send (non-blocking)

        try {

          await fetch("/api/send-sms", {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({

              phone: student.phone,

              studentName: student.name,

              studentId: student.studentId || student.id,

              type: "password-link",

              passwordLink: tokenData.link,

            }),

          });

        } catch (smsErr) {

          console.error("SMS auto-send failed:", smsErr);

        }



        // Show the link in UI for admin to copy/share

        setResetLink(tokenData.link);

        setResetLinkStudentName(student.name);

        setResetLinkStudentId(student.studentId || "");

      } else {

        alert("Failed to generate password reset link.");

      }

    } catch (err) {

      console.error("Reset password error:", err);

      alert("Error generating password reset link.");

    } finally {

      setResettingPasswordId(null);

    }

  }



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

        backgroundColor: "#ffffff",

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



      // Save student data - use studentId as document ID

      await setDoc(doc(db, "students", studentId), {

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

        admissionCenter: formData.admissionCenter,

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

          studentId: studentId,

          studentPhone: phoneKey,

          studentName: formData.name,

          studentEmail: formData.email,

          university: formData.university,

          course: formData.course,

          stream: formData.stream || "",

          program: formData.course,

          totalFee: totalFee,

          createdAt: serverTimestamp(),

          isDiscount: true,

        });

      }



      // Generate password setup token and send SMS with link

      let generatedLink: string | null = null;

      try {

        const tokenRes = await fetch("/api/auth/create-password-token", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ phone: phoneKey, studentId }),

        });

        const tokenData = await tokenRes.json();



        if (tokenRes.ok && tokenData.link) {

          generatedLink = tokenData.link;



          // Attempt SMS auto-send (non-blocking)

          try {

            await fetch("/api/send-sms", {

              method: "POST",

              headers: { "Content-Type": "application/json" },

              body: JSON.stringify({

                phone: phoneKey,

                studentName: formData.name,

                studentId: studentId,

                type: "password-link",

                passwordLink: tokenData.link,

              }),

            });

          } catch (smsErr) {

            console.error("SMS auto-send failed (expected if provider not configured):", smsErr);

          }

        } else {

          console.error("Failed to generate password token:", tokenData.error);

        }

      } catch (tokenErr) {

        console.error("Error generating password token:", tokenErr);

      }



      // Show success UI with link inside the modal

      setNewStudentLink(generatedLink);

      setNewStudentName(formData.name);

      setNewStudentCopied(false);



      // Clear form for next time

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

        admissionCenter: "Bengaluru",

      });

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

    if (!confirm(`Archive ${student.name}?\n\nThe student and all their payment receipts will be hidden from active lists, but kept for outreach (alumni promotions, new course offers). View them anytime under Follow-Ups → Alumni.`)) return;

    try {

      // Soft-archive the student

      await setDoc(

        doc(db, "students", student.studentId || student.id),

        { archived: true, archivedAt: serverTimestamp() },

        { merge: true }

      );

      // Cascade: also archive all payments tied to this student (by studentId)

      if (student.studentId) {

        const paySnap = await getDocs(

          query(collection(db, "payments"), where("studentId", "==", student.studentId))

        );

        await Promise.all(

          paySnap.docs.map((p) =>

            setDoc(

              doc(db, "payments", p.id),

              { archived: true, archivedAt: serverTimestamp() },

              { merge: true }

            )

          )

        );

      }

      fetchStudents();

      fetchPayments();

    } catch (err) {

      console.error("Error archiving student:", err);

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

        <p className="text-sm font-medium text-slate-700">{students.length} students enrolled</p>

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

              <p className="text-base font-extrabold text-green-700 leading-tight">{students.filter((s) => ((s.totalFee || 0) - (s.discountAmount || 0)) - (paidMap[s.studentId || s.id] || 0) <= 0).length}</p>

            </div>

          </div>

        </div>

      )}



      {/* Students Table */}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">



        {/* Search bar with Add Student button */}

        {!loading && students.length > 0 && (

          <div className="px-2 lg:px-3 py-2 lg:py-3 border-b border-slate-100 flex items-center gap-2 lg:gap-3">

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

            <span className="text-xs lg:text-xs font-semibold text-slate-700 ml-auto flex-shrink-0">{filtered.length} of {students.length}</span>

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

                    className={`text-left px-2 lg:px-3 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors ${sortCol === "name" ? "bg-white/20" : ""}`}

                    onClick={() => { setSortCol("name"); setSortDir(sortCol === "name" && sortDir === "asc" ? "desc" : "asc"); }}

                  >

                    Name {sortCol === "name" && (sortDir === "asc" ? "↑" : "↓")}

                  </th>

                  <th

                    className={`text-left px-2 lg:px-3 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors ${sortCol === "phone" ? "bg-white/20" : ""}`}

                    onClick={() => { setSortCol("phone"); setSortDir(sortCol === "phone" && sortDir === "asc" ? "desc" : "asc"); }}

                  >

                    Phone {sortCol === "phone" && (sortDir === "asc" ? "↑" : "↓")}

                  </th>

                  <th

                    className={`text-left px-2 lg:px-3 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors hidden sm:table-cell ${sortCol === "studentId" ? "bg-white/20" : ""}`}

                    onClick={() => { setSortCol("studentId"); setSortDir(sortCol === "studentId" && sortDir === "asc" ? "desc" : "asc"); }}

                  >

                    Student ID {sortCol === "studentId" && (sortDir === "asc" ? "↑" : "↓")}

                  </th>

                  <th

                    className={`text-left px-2 lg:px-3 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors hidden sm:table-cell ${sortCol === "fee" ? "bg-white/20" : ""}`}

                    onClick={() => { setSortCol("fee"); setSortDir(sortCol === "fee" && sortDir === "asc" ? "desc" : "asc"); }}

                  >

                    Total Fee {sortCol === "fee" && (sortDir === "asc" ? "↑" : "↓")}

                  </th>

                  <th

                    className={`text-left px-2 lg:px-3 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors ${sortCol === "due" ? "bg-white/20" : ""}`}

                    onClick={() => { setSortCol("due"); setSortDir(sortCol === "due" && sortDir === "asc" ? "desc" : "asc"); }}

                  >

                    Due {sortCol === "due" && (sortDir === "asc" ? "↑" : "↓")}

                  </th>

                  <th

                    className={`text-left px-2 lg:px-3 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors hidden md:table-cell ${sortCol === "course" ? "bg-white/20" : ""}`}

                    onClick={() => { setSortCol("course"); setSortDir(sortCol === "course" && sortDir === "asc" ? "desc" : "asc"); }}

                  >

                    Course {sortCol === "course" && (sortDir === "asc" ? "↑" : "↓")}

                  </th>

                  <th

                    className={`text-left px-2 lg:px-3 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors hidden lg:table-cell ${sortCol === "university" ? "bg-white/20" : ""}`}

                    onClick={() => { setSortCol("university"); setSortDir(sortCol === "university" && sortDir === "asc" ? "desc" : "asc"); }}

                  >

                    University {sortCol === "university" && (sortDir === "asc" ? "↑" : "↓")}

                  </th>

                  <th

                    className={`text-left px-2 lg:px-3 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest cursor-pointer select-none hover:bg-white/10 transition-colors hidden lg:table-cell ${sortCol === "year" ? "bg-white/20" : ""}`}

                    onClick={() => { setSortCol("year"); setSortDir(sortCol === "year" && sortDir === "asc" ? "desc" : "asc"); }}

                  >

                    Year {sortCol === "year" && (sortDir === "asc" ? "↑" : "↓")}

                  </th>

                  <th className="text-right px-2 lg:px-3 py-2.5 lg:py-3.5 text-xs font-semibold text-white uppercase tracking-widest">Actions</th>

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

                  const due = effectiveFee - (paidMap[student.studentId || student.id] || 0);

                  const photoUrl = student.personalDetails?.photo;

                  return (

                    <tr key={student.id} className={`border-b border-red-50 hover:bg-red-50/60 transition-colors ${idx % 2 !== 0 ? "bg-red-50/20" : "bg-white"}`}>

                      <td className="px-2 lg:px-3 py-2 lg:py-3">

                        <button onClick={() => setDetailStudent(student)} className="text-left flex items-center gap-2 lg:gap-3 group/name">

                          <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">

                            {photoUrl ? (

                              <img src={photoUrl} alt={student.name} className="w-full h-full object-cover" />

                            ) : (

                              <span className="text-[9px] lg:text-xs font-extrabold text-white">{initials}</span>

                            )}

                          </div>

                          <div className="min-w-0">

                            <p className="font-bold text-slate-900 text-sm group-hover/name:text-red-700 transition-colors truncate max-w-[100px] lg:max-w-none">{student.name}</p>

                            <p className="text-xs text-slate-600 mt-0.5 hidden sm:block">{student.email}</p>

                          </div>

                        </button>

                      </td>

                      <td className="px-2 lg:px-3 py-2 lg:py-3 text-slate-800 text-sm whitespace-nowrap">{student.phone}</td>

                      <td className="px-2 lg:px-3 py-2 lg:py-3 whitespace-nowrap hidden sm:table-cell">

                        <button onClick={() => setDetailStudent(student)} className="text-sm text-blue-700 hover:text-blue-900 hover:underline transition-colors">

                          {student.studentId || student.id}

                        </button>

                      </td>

                      <td className="px-2 lg:px-3 py-2 lg:py-3 whitespace-nowrap hidden sm:table-cell">

                        <span className="text-sm text-slate-800">₹{(student.totalFee || 0).toLocaleString("en-IN")}</span>

                      </td>

                      <td className="px-2 lg:px-3 py-2 lg:py-3 whitespace-nowrap">

                        {due <= 0 ? (

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full bg-green-100 text-green-800 text-sm">✓</span>

                        ) : (

                          <div>

                            <p className="text-sm text-red-600">₹{due.toLocaleString("en-IN")}</p>

                            <span className="inline-block mt-0.5 px-1.5 lg:px-2 py-0.5 text-xs lg:text-xs bg-red-100 text-red-700 rounded-md">Due</span>

                          </div>

                        )}

                      </td>

                      <td className="px-2 lg:px-3 py-2 lg:py-3 max-w-[140px] lg:max-w-[180px] hidden md:table-cell align-top">

                        <span className="block text-sm text-slate-900 leading-snug break-words">

                          {(student.course || "").split('/')[0].trim().replace(/\s*\([^)]*\)/g, "")}{student.stream ? `-${student.stream}` : ""}

                        </span>

                      </td>

                      <td className="px-2 lg:px-3 py-2 lg:py-3 text-sm text-slate-800 font-bold hidden lg:table-cell">{student.university}</td>

                      <td className="px-2 lg:px-3 py-2 lg:py-3 whitespace-nowrap hidden lg:table-cell">

                        <span className="text-sm text-slate-800 bg-slate-100 px-1.5 lg:px-2 py-0.5 rounded-md">

                          {student.startYear}{student.endYear ? ` – ${student.endYear}` : ""}

                        </span>

                      </td>

                      <td className="px-2 lg:px-3 py-2 lg:py-3 text-right">

                        <div className="flex items-center justify-end gap-1">

                          <Link href={`/admin/students/${student.studentId || student.id}`} className="p-1.5 text-slate-600 hover:text-purple-600 transition-colors" title="View Details">

                            <FileText className="w-4 h-4" />

                          </Link>

                          <button

                            onClick={() => openPaymentsModal(student)}

                            className="p-1.5 text-slate-600 hover:text-blue-600 transition-colors"

                            title="View Payments"

                          >

                            <Eye className="w-4 h-4" />

                          </button>

                          <button

                            onClick={() => openAddressLabelModal(student)}

                            className="p-1.5 text-slate-600 hover:text-indigo-600 transition-colors"

                            title="Print Address Label"

                          >

                            <Mail className="w-4 h-4" />

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

          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-2 sm:mx-4 overflow-hidden max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-red-100">



            {/* ── Header ── */}

            <div className="gradient-bg px-4 sm:px-6 py-4">

              <div className="flex items-start justify-between gap-3">

                <div className="flex items-center gap-3 sm:gap-4 min-w-0">

                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white/30">

                    {detailStudent.personalDetails?.photo ? (

                      <img src={detailStudent.personalDetails.photo} alt={detailStudent.name} className="w-full h-full object-cover" />

                    ) : (

                      <User className="w-6 h-6 sm:w-7 sm:h-7 text-white" />

                    )}

                  </div>

                  <div className="min-w-0">

                    <h2 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">{detailStudent.name}</h2>

                    <p className="text-xs sm:text-sm text-white/90 mt-0.5">{detailStudent.course?.split('/')[0].trim().replace(/\s*\(.*?\)/g, "")}{detailStudent.stream ? `-${detailStudent.stream}` : ""}</p>

                    <div className="flex items-center gap-2 mt-1">

                      <span className="text-xs text-white/70">{detailStudent.studentId || detailStudent.id}</span>

                      <span className="text-white/30">|</span>

                      <a href={`tel:${detailStudent.phone}`} className="text-xs text-white/70 hover:text-white hover:underline">{detailStudent.phone}</a>

                    </div>

                  </div>

                </div>

                <div className="flex items-center gap-2 flex-shrink-0">

                  <button onClick={() => { if (detailStudent) handleResetPassword(detailStudent); }} disabled={resettingPasswordId === detailStudent?.id} className="px-3 py-1.5 text-xs font-bold text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors shadow-sm hidden sm:flex items-center gap-1.5 disabled:opacity-60">

                    {resettingPasswordId === detailStudent?.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}

                    Reset Password

                  </button>

                  <button onClick={() => setShowDiscountModal(true)} className="px-3 py-1.5 text-xs font-bold text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors shadow-sm hidden sm:block">

                    Add Discount

                  </button>

                  <button onClick={generateStudentPDF} disabled={generatingPDF} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors shadow-sm disabled:opacity-60">

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

                <button onClick={() => setShowDiscountModal(true)} className="flex-1 py-1.5 text-xs font-bold text-white bg-white/15 rounded-lg border border-white/20">

                  Add Discount

                </button>

                <button onClick={generateStudentPDF} disabled={generatingPDF} className="flex-1 py-1.5 text-xs font-bold text-white bg-white/15 rounded-lg border border-white/20 disabled:opacity-50 flex items-center justify-center gap-1">

                  {generatingPDF ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}Print

                </button>

              </div>

            </div>



            {/* Reset Link Banner */}

            {resetLink && (

              <div className="mx-4 sm:mx-5 mt-3">

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">

                  <div className="flex items-center gap-2 text-green-800">

                    <Check className="w-4 h-4 text-green-600" />

                    <p className="text-sm font-medium">Password reset link generated for {resetLinkStudentName} {resetLinkStudentId ? `(ID: ${resetLinkStudentId})` : ""}</p>

                  </div>

                  <div className="flex gap-2 mt-3">

                    <input

                      readOnly

                      value={resetLink}

                      className="flex-1 px-3 py-2 text-xs bg-white border border-green-100 rounded-lg text-slate-700 font-mono break-all"

                    />

                    <button

                      onClick={() => {

                        navigator.clipboard.writeText(resetLink);

                        setCopied(true);

                        setTimeout(() => setCopied(false), 2000);

                      }}

                      className="px-3 py-2 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 flex-shrink-0"

                    >

                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}

                      {copied ? "Copied!" : "Copy"}

                    </button>

                  </div>

                  <div className="flex items-center gap-3 mt-3">

                    <a

                      href={`https://wa.me/?text=${encodeURIComponent(

                        `Hello ${resetLinkStudentName}, your AIOS EDU portal password reset link: ${resetLink} (valid 24h). -AIOS EDU Team`

                      )}`}

                      target="_blank"

                      rel="noopener noreferrer"

                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"

                    >

                      <Send className="w-3.5 h-3.5" />

                      Share via WhatsApp

                    </a>

                    <button

                      onClick={() => { setResetLink(null); setResetLinkStudentName(""); setResetLinkStudentId(""); setCopied(false); }}

                      className="text-xs text-slate-500 hover:text-slate-700 underline"

                    >

                      Dismiss

                    </button>

                  </div>

                </div>

              </div>

            )}



            {/* ── Body ── */}

            <div className="p-4 sm:p-5 space-y-4">



              {/* ── Fee Summary (compact) ── */}

              <div className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">

                <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-50 via-orange-50/50 to-white border-b border-slate-200">

                  <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">

                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>

                  </div>

                  <h3 className="text-sm font-bold text-slate-900">Fee Summary</h3>

                </div>

                <div className="flex items-center divide-x divide-amber-100">

                  <div className="flex-1 px-4 py-2.5 text-center">

                    <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider">Total</p>

                    <p className="text-sm font-bold text-slate-800">₹{(detailStudent.totalFee || 0).toLocaleString("en-IN")}</p>

                  </div>

                  {(detailStudent.discountAmount || 0) > 0 && (

                    <div className="flex-1 px-4 py-2.5 text-center">

                      <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Discount</p>

                      <p className="text-sm font-bold text-emerald-700">₹{(detailStudent.discountAmount || 0).toLocaleString("en-IN")}</p>

                    </div>

                  )}

                  <div className="flex-1 px-4 py-2.5 text-center">

                    <p className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider">Effective</p>

                    <p className="text-sm font-bold text-slate-800">₹{((detailStudent.totalFee || 0) - (detailStudent.discountAmount || 0)).toLocaleString("en-IN")}</p>

                  </div>

                </div>

              </div>



              {/* ── Enrollment Details ── */}

              <div className="bg-white border border-blue-200 rounded-2xl shadow-sm overflow-hidden">

                <div className="bg-gradient-to-r from-blue-50 via-sky-50/50 to-white border-b border-slate-200 p-3">

                  <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">

                      <GraduationCap className="w-4 h-4 text-white" />

                    </div>

                    <div>

                      <h3 className="text-sm font-bold text-slate-900">Enrollment Details</h3>

                      <p className="text-xs text-slate-500">Program & institution info</p>

                    </div>

                  </div>

                </div>

                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

                  {[

                    { label: "Student ID", value: detailStudent.studentId || detailStudent.id },

                    { label: "Faculty", value: detailStudent.faculty },

                    { label: "Course", value: detailStudent.course?.split('/')[0].trim() || "—" },

                    { label: "Stream", value: detailStudent.stream || "—" },

                    { label: "Duration", value: detailStudent.duration || "—" },

                    { label: "University", value: detailStudent.university },

                    { label: "Academic Year", value: `${detailStudent.startYear}${detailStudent.endYear ? ` – ${detailStudent.endYear}` : ""}` },

                    { label: "Enrolled On", value: detailStudent.enrollmentDate ? (() => { const [y,m,d] = detailStudent.enrollmentDate.split("-"); return `${d}-${m}-${y}`; })() : "—" },

                    { label: "Admission Center", value: detailStudent.admissionCenter || "Bengaluru" },

                  ].map(({ label, value }: any) => (

                    <div key={label} className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 shadow-sm p-3">

                      <p className="text-xs text-blue-700 font-semibold mb-1">{label}</p>

                      <p className="text-sm font-medium text-slate-700 leading-tight">{value}</p>

                    </div>

                  ))}

                </div>

              </div>



              {/* ── Documents ── */}

              <div className="bg-white border border-sky-200 rounded-2xl shadow-sm overflow-hidden">

                <div className="bg-gradient-to-r from-sky-50 via-blue-50/50 to-white border-b border-slate-200 p-3">

                  <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">

                      <FileText className="w-4 h-4 text-white" />

                    </div>

                    <div>

                      <h3 className="text-sm font-bold text-slate-900">Documents</h3>

                      <p className="text-xs text-slate-500">Uploaded certificates & IDs</p>

                    </div>

                  </div>

                </div>

                <div className="divide-y divide-slate-100">

                  {[

                    { label: "Photo", url: detailStudent.personalDetails?.photo as string | undefined },

                    { label: "Aadhaar Card", url: detailStudent.personalDetails?.aadhaarUrl as string | undefined },

                    { label: "SSLC / 10th Certificate", url: detailStudent.academicDetails?.sslc?.certificateUrl as string | undefined },

                    { label: "HSC / 12th Certificate", url: detailStudent.academicDetails?.plustwo?.certificateUrl as string | undefined },

                    { label: "UG Certificate", url: detailStudent.academicDetails?.ug?.certificateUrl as string | undefined },

                    { label: "PG Certificate", url: detailStudent.academicDetails?.pg?.certificateUrl as string | undefined },

                  ].map(({ label, url }) => (

                    <div key={label} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/50 transition-colors">

                      <div className="flex items-center gap-3 min-w-0">

                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${url ? 'bg-emerald-500' : 'bg-slate-300'}`} />

                        <span className="text-sm font-medium text-slate-700 truncate">{label}</span>

                      </div>

                      {url ? (

                        <div className="flex items-center gap-1.5 flex-shrink-0">

                          <button onClick={() => openBase64(url)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-md hover:bg-sky-100 transition-colors">

                            <Eye className="w-3 h-3" /> View

                          </button>

                          <button onClick={() => downloadDocument(url, `${detailStudent.studentId || detailStudent.id}-${label.replace(/\s+/g, '-').toLowerCase()}`)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">

                            <Download className="w-3 h-3" /> Download

                          </button>

                        </div>

                      ) : (

                        <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><AlertTriangle className="w-3 h-3" /> Not uploaded</span>

                      )}

                    </div>

                  ))}

                </div>

              </div>



              {/* ── Academic Background ── */}

              {(detailStudent.academicDetails?.sslc?.institution || detailStudent.academicDetails?.plustwo?.institution || detailStudent.academicDetails?.ug?.institution || detailStudent.academicDetails?.pg?.institution) && (

                <div className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">

                  <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-white border-b border-slate-200 p-3">

                    <div className="flex items-center gap-3">

                      <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">

                        <BookOpen className="w-4 h-4 text-white" />

                      </div>

                      <div>

                        <h3 className="text-sm font-bold text-slate-900">Academic Background</h3>

                        <p className="text-xs text-slate-500">Previous education records</p>

                      </div>

                    </div>

                  </div>

                  <div className="overflow-x-auto">

                    <table className="w-full">

                        <thead>

                          <tr className="bg-slate-50 border-b border-slate-100">

                            <th className="px-3 py-2.5 text-left text-[9px] font-medium uppercase tracking-wider text-slate-500">Qualification</th>

                            <th className="px-3 py-2.5 text-left text-[9px] font-medium uppercase tracking-wider text-slate-500">Institution</th>

                            <th className="px-3 py-2.5 text-left text-[9px] font-medium uppercase tracking-wider text-slate-500">Board / Univ.</th>

                            <th className="px-3 py-2.5 text-left text-[9px] font-medium uppercase tracking-wider text-slate-500">Year</th>

                            <th className="px-3 py-2.5 text-right text-[9px] font-medium uppercase tracking-wider text-slate-500">%</th>

                          </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-100">

                          {detailStudent.academicDetails?.sslc?.institution && (

                            <tr className="hover:bg-slate-50/50 transition-colors">

                              <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">SSLC / 10th</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.sslc.institution}</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.sslc.board || "—"}</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.sslc.year || "—"}</td>

                              <td className="px-3 py-2.5 text-sm font-semibold text-slate-800 text-right">{detailStudent.academicDetails.sslc.percentage || "—"}%</td>

                            </tr>

                          )}

                          {detailStudent.academicDetails?.plustwo?.institution && (

                            <tr className="hover:bg-slate-50/50 transition-colors">

                              <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">HSC / 12th</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.plustwo.institution}</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.plustwo.board || detailStudent.academicDetails.plustwo.stream || "—"}</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.plustwo.year || "—"}</td>

                              <td className="px-3 py-2.5 text-sm font-semibold text-slate-800 text-right">{detailStudent.academicDetails.plustwo.percentage || "—"}%</td>

                            </tr>

                          )}

                          {detailStudent.academicDetails?.ug?.institution && (

                            <tr className="hover:bg-slate-50/50 transition-colors">

                              <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">UG Degree</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.ug.institution}</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.ug.degree || detailStudent.academicDetails.ug.board || "—"}</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.ug.year || "—"}</td>

                              <td className="px-3 py-2.5 text-sm font-semibold text-slate-800 text-right">{detailStudent.academicDetails.ug.percentage || "—"}%</td>

                            </tr>

                          )}

                          {detailStudent.academicDetails?.pg?.institution && (

                            <tr className="hover:bg-slate-50/50 transition-colors">

                              <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">PG Degree</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.pg.institution}</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.pg.degree || detailStudent.academicDetails.pg.board || "—"}</td>

                              <td className="px-3 py-2.5 text-sm text-slate-600">{detailStudent.academicDetails.pg.year || "—"}</td>

                              <td className="px-3 py-2.5 text-sm font-semibold text-slate-800 text-right">{detailStudent.academicDetails.pg.percentage || "—"}%</td>

                            </tr>

                          )}

                        </tbody>

                      </table>

                    </div>

                  </div>

              )}



              {/* ── Personal & Family ── */}

              <div className="bg-white border border-rose-200 rounded-2xl shadow-sm overflow-hidden">

                <div className="bg-gradient-to-r from-rose-50 via-pink-50/50 to-white border-b border-slate-200 p-3">

                  <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">

                      <User className="w-4 h-4 text-white" />

                    </div>

                    <div>

                      <h3 className="text-sm font-bold text-slate-900">Personal & Family Details</h3>

                      <p className="text-xs text-slate-500">Identity & parent info</p>

                    </div>

                  </div>

                </div>

                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">

                  {[/* eslint-disable @typescript-eslint/no-unsafe-assignment */

                    { label: "Full Name", value: `${detailStudent.firstName || ""} ${detailStudent.lastName || ""}` },

                    { label: "Email", value: detailStudent.email },

                    { label: "Phone", value: detailStudent.phone || "—" },

                    { label: "Date of Birth", value: (detailStudent.personalDetails?.dateOfBirth || detailStudent.personalDetails?.dob) ? (() => { const raw = detailStudent.personalDetails?.dateOfBirth || detailStudent.personalDetails?.dob || ""; if (!raw) return "—"; const [y,m,d] = raw.split("-"); return y && m && d ? `${d}-${m}-${y}` : raw; })() : "—" },

                    { label: "Gender", value: detailStudent.personalDetails?.gender || "—" },

                    { label: "Blood Group", value: detailStudent.personalDetails?.bloodGroup || "—" },

                    { label: "Father", value: detailStudent.personalDetails?.fatherName || "—" },

                    { label: "Mother", value: detailStudent.personalDetails?.motherName || "—" },

                    { label: "Aadhaar No.", value: detailStudent.personalDetails?.aadhaarNumber || "—" },

                    { label: "Employment", value: detailStudent.personalDetails?.employmentType ? `${detailStudent.personalDetails.employmentType}${detailStudent.personalDetails.yearsOfExperience && detailStudent.personalDetails.employmentType !== "Not Employed" ? ` (${detailStudent.personalDetails.yearsOfExperience} yrs)` : ""}` : "—" },

                  ].map(({ label, value }: any) => (

                    <div key={label} className="bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-100 shadow-sm p-3">

                      <p className="text-xs text-rose-700 font-semibold mb-1">{label}</p>

                      <p className="text-sm font-medium text-slate-700 leading-tight">{value}</p>

                    </div>

                  ))}

                </div>

              </div>



              {/* ── Address ── */}

              <div className="bg-white border border-emerald-200 rounded-2xl shadow-sm overflow-hidden">

                <div className="bg-gradient-to-r from-emerald-50 via-green-50/50 to-white border-b border-slate-200 p-3">

                  <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">

                      <MapPin className="w-4 h-4 text-white" />

                    </div>

                    <div>

                      <h3 className="text-sm font-bold text-slate-900">Address</h3>

                      <p className="text-xs text-slate-500">Residential details</p>

                    </div>

                  </div>

                </div>

                <div className="p-4">

                  <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 shadow-sm p-3">

                    <p className="text-sm font-medium text-slate-700">

                      {[detailStudent.personalDetails?.address, detailStudent.personalDetails?.city, detailStudent.personalDetails?.state, detailStudent.personalDetails?.pincode].filter(Boolean).join(", ") || "—"}</p>

                  </div>

                </div>

              </div>



            </div>



            {/* ── Footer ── */}

            <div className="px-4 sm:px-5 py-3 border-t border-red-100 bg-white flex items-center justify-end">

              <button onClick={() => setDetailStudent(null)} className="px-4 py-1.5 text-sm font-bold text-white gradient-bg rounded-lg hover:shadow-md transition-all">Close</button>

            </div>



          </div>

        </div>

      )}



      {/* Professional Admission Form for PDF Generation */}

      {detailStudent && (

        <div ref={printRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>

          <div style={{ width: "210mm", minHeight: "297mm", padding: "10mm 16mm", fontFamily: "'Calibri', 'Helvetica Neue', Arial, sans-serif", fontSize: "9pt", color: "#000", lineHeight: 1.3, background: "#fff", border: "3px double #000" }}>



            {/* ===== HEADER ===== */}

            <div style={{ display: "flex", alignItems: "center", borderBottom: "3px solid #8b0000", paddingBottom: "6px", marginBottom: "4px" }}>

              <img src="/emblem.png" alt="Emblem" style={{ width: "72px", height: "72px", objectFit: "contain", marginRight: "14px" }} />

              <div style={{ flex: 1, textAlign: "center" }}>

                <div style={{ fontSize: "18pt", fontWeight: "bold", color: "#8b0000", letterSpacing: "2px", lineHeight: 1.1 }}>AIOS INSTITUTE</div>

                <div style={{ fontSize: "9.5pt", fontWeight: "bold", color: "#000", letterSpacing: "1px", marginTop: "2px" }}>OF ADVANCED MANAGEMENT &amp; TECHNOLOGY PVT. LTD.</div>

                <div style={{ fontSize: "7pt", color: "#000", marginTop: "2px" }}>An ISO 9001:2015 Certified Organisation</div>

                <div style={{ fontSize: "6.5pt", color: "#444", marginTop: "1px" }}>2nd Floor, Vishnu Arcade, Maruthi Nagar Main Road, Bangalore, Karnataka, India</div>

                <div style={{ fontSize: "6.5pt", color: "#444" }}>Phone: 0481 291 9090, +91 62829 69090 | Email: institute.aios@gmail.com | www.aiosinstitute.com</div>

              </div>

            </div>



            {/* ===== FORM TITLE ===== */}

            <div style={{ textAlign: "center", marginBottom: "2px", paddingTop: "4px" }}>

              <div style={{ fontSize: "11pt", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>Admission Form</div>

              <div style={{ fontSize: "7pt", color: "#555", marginTop: "1px", letterSpacing: "1px" }}>Academic Year {detailStudent.startYear ? `${detailStudent.startYear} - ${detailStudent.endYear}` : new Date().getFullYear()}</div>

            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5pt", marginBottom: "6px", padding: "2px 2px" }}>

              <div><strong>Student No:</strong> {detailStudent.studentId || "___________"}</div>

              <div><strong>Date:</strong> {(() => { const d = new Date(); const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${String(d.getDate()).padStart(2,"0")}-${months[d.getMonth()]}-${d.getFullYear()}`; })()}</div>

            </div>



            {/* ===== SECTION 1: PHOTO + ENROLLMENT / COURSE DETAILS ===== */}

            <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "stretch" }}>

              <div style={{ width: "110px", flexShrink: 0, display: "flex", flexDirection: "column" }}>

                <div style={{ flex: 1, border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "120px" }}>

                  {detailStudent.personalDetails?.photo ? (

                    <img src={detailStudent.personalDetails.photo} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />

                  ) : (

                    <div style={{ textAlign: "center", color: "#666", fontSize: "8pt", lineHeight: 1.3 }}>

                      <div>Photo</div>

                    </div>

                  )}

                </div>

              </div>

              <div style={{ flex: 1, border: "1.5px solid #000" }}>

                <div style={{ background: "#8b0000", padding: "5px 10px" }}>

                  <span style={{ fontSize: "8pt", fontWeight: "bold", color: "#fff", letterSpacing: "0.5px" }}>1. ENROLLMENT / COURSE DETAILS</span>

                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt" }}>

                  <tbody>

                    <tr>

                      <td style={{ width: "25%", padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>University</td>

                      <td style={{ width: "25%", padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.university || "—"}</td>

                      <td style={{ width: "25%", padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Faculty</td>

                      <td style={{ width: "25%", padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.faculty || "—"}</td>

                    </tr>

                    <tr>

                      <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Course</td>

                      <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.course?.split('/')[0].trim() || "—"}</td>

                      <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Stream / Branch</td>

                      <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.stream || "—"}</td>

                    </tr>

                    <tr>

                      <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Duration</td>

                      <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.duration ? `${detailStudent.duration} Years` : "—"}</td>

                      <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Academic Year</td>

                      <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.startYear ? `${detailStudent.startYear} - ${detailStudent.endYear}` : "—"}</td>

                    </tr>

                  </tbody>

                </table>

              </div>

            </div>



            {/* ===== SECTION 2: PERSONAL & CONTACT DETAILS (6 columns: 3 label-value pairs per row) ===== */}

            <div style={{ marginBottom: "8px", border: "1.5px solid #000" }}>

              <div style={{ background: "#8b0000", padding: "5px 10px" }}>

                <span style={{ fontSize: "8pt", fontWeight: "bold", color: "#fff", letterSpacing: "0.5px" }}>2. PERSONAL &amp; CONTACT DETAILS</span>

              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>

                <tbody>

                  <tr>

                    <td style={{ width: "14%", padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Full Name</td>

                    <td colSpan={3} style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.name || `${detailStudent.firstName || ""} ${detailStudent.lastName || ""}`.trim() || "—"}</td>

                    <td style={{ width: "14%", padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Email</td>

                    <td style={{ width: "20%", padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.email || "—"}</td>

                  </tr>

                  <tr>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Date of Birth</td>

                    <td style={{ width: "19%", padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{(() => { const raw = detailStudent.personalDetails?.dateOfBirth || detailStudent.personalDetails?.dob || ""; if (!raw) return "—"; const [y,m,d] = raw.split("-"); return y && m && d ? `${d}-${m}-${y}` : raw; })()}</td>

                    <td style={{ width: "14%", padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Gender</td>

                    <td style={{ width: "19%", padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.personalDetails?.gender || "—"}</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Blood Group</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.personalDetails?.bloodGroup || "—"}</td>

                  </tr>

                  <tr>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Father&apos;s Name</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.personalDetails?.fatherName || "—"}</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Mother&apos;s Name</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.personalDetails?.motherName || "—"}</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Aadhaar No.</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.personalDetails?.aadhaarNumber || "—"}</td>

                  </tr>

                  <tr>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Phone</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.phone || "—"}</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Employment</td>

                    <td colSpan={3} style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.personalDetails?.employmentType ? `${detailStudent.personalDetails.employmentType}${detailStudent.personalDetails.yearsOfExperience && detailStudent.personalDetails.employmentType !== "Not Employed" ? ` (${detailStudent.personalDetails.yearsOfExperience} yrs)` : ""}` : "—"}</td>

                  </tr>

                  <tr>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Address</td>

                    <td colSpan={5} style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>

                      {[detailStudent.personalDetails?.address, detailStudent.personalDetails?.city, detailStudent.personalDetails?.state, detailStudent.personalDetails?.pincode].filter(Boolean).join(", ") || "—"}

                    </td>

                  </tr>

                </tbody>

              </table>

            </div>



            {/* ===== SECTION 3: ACADEMIC HISTORY ===== */}

            {(detailStudent.academicDetails?.sslc?.institution || detailStudent.academicDetails?.plustwo?.institution || detailStudent.academicDetails?.ug?.institution || detailStudent.academicDetails?.pg?.institution) && (

              <div style={{ marginBottom: "8px", border: "1.5px solid #000" }}>

                <div style={{ background: "#8b0000", padding: "5px 10px" }}>

                  <span style={{ fontSize: "8pt", fontWeight: "bold", color: "#fff", letterSpacing: "0.5px" }}>3. ACADEMIC HISTORY</span>

                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>

                  <thead>

                    <tr style={{ background: "#f7f7f7" }}>

                      <th style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", textAlign: "left", verticalAlign: "middle", width: "22%" }}>Qualification</th>

                      <th style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", textAlign: "left", verticalAlign: "middle", width: "30%" }}>Institution</th>

                      <th style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", textAlign: "left", verticalAlign: "middle", width: "20%" }}>Board / Stream</th>

                      <th style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", textAlign: "center", verticalAlign: "middle", width: "14%" }}>Year</th>

                      <th style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", textAlign: "center", verticalAlign: "middle", width: "14%" }}>Percentage</th>

                    </tr>

                  </thead>

                  <tbody>

                    {detailStudent.academicDetails?.sslc?.institution && (

                      <tr>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", verticalAlign: "middle" }}>SSLC / 10th</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.academicDetails.sslc.institution}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.academicDetails.sslc.board || "—"}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", textAlign: "center", verticalAlign: "middle" }}>{detailStudent.academicDetails.sslc.year || "—"}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", textAlign: "center", verticalAlign: "middle" }}>{detailStudent.academicDetails.sslc.percentage || "—"}</td>

                      </tr>

                    )}

                    {detailStudent.academicDetails?.plustwo?.institution && (

                      <tr>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", verticalAlign: "middle" }}>HSC / 12th</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.academicDetails.plustwo.institution}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.academicDetails.plustwo.stream || detailStudent.academicDetails.plustwo.board || "—"}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", textAlign: "center", verticalAlign: "middle" }}>{detailStudent.academicDetails.plustwo.year || "—"}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", textAlign: "center", verticalAlign: "middle" }}>{detailStudent.academicDetails.plustwo.percentage || "—"}</td>

                      </tr>

                    )}

                    {detailStudent.academicDetails?.ug?.institution && (

                      <tr>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", verticalAlign: "middle" }}>UG Degree</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.academicDetails.ug.institution}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.academicDetails.ug.degree || detailStudent.academicDetails.ug.board || "—"}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", textAlign: "center", verticalAlign: "middle" }}>{detailStudent.academicDetails.ug.year || "—"}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", textAlign: "center", verticalAlign: "middle" }}>{detailStudent.academicDetails.ug.percentage || "—"}</td>

                      </tr>

                    )}

                    {detailStudent.academicDetails?.pg?.institution && (

                      <tr>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", verticalAlign: "middle" }}>PG Degree</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.academicDetails.pg.institution}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.academicDetails.pg.degree || detailStudent.academicDetails.pg.board || "—"}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", textAlign: "center", verticalAlign: "middle" }}>{detailStudent.academicDetails.pg.year || "—"}</td>

                        <td style={{ padding: "6px 10px", border: "1px solid #bbb", textAlign: "center", verticalAlign: "middle" }}>{detailStudent.academicDetails.pg.percentage || "—"}</td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            )}



            {/* ===== DECLARATION & SIGNATURES ===== */}

            <div style={{ marginBottom: "6px", border: "1.5px solid #000" }}>

              <div style={{ background: "#8b0000", padding: "5px 10px" }}>

                <span style={{ fontSize: "8pt", fontWeight: "bold", color: "#fff", letterSpacing: "0.5px" }}>DECLARATION</span>

              </div>

              <div style={{ padding: "6px 12px" }}>

                <p style={{ fontSize: "8pt", lineHeight: 1.5, margin: 0, textAlign: "justify" }}>

                  I, <strong>{detailStudent.name || `${detailStudent.firstName || ""} ${detailStudent.lastName || ""}`.trim() || "_______________"} ({detailStudent.studentId || ""})</strong>, hereby declare that the information provided above is true and correct to the best of my knowledge. I agree to abide by the rules and regulations of the institute.

                </p>

              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px 14px", borderTop: "1px solid #ccc" }}>

                <div style={{ textAlign: "left", width: "40%" }}>

                  <div style={{ fontSize: "8pt", marginTop: "10px" }}>Date: {(() => { const d = detailStudent.enrollmentDate ? new Date(detailStudent.enrollmentDate) : (detailStudent.createdAt && typeof (detailStudent.createdAt as any).toDate === "function" ? (detailStudent.createdAt as any).toDate() : new Date()); const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${String(d.getDate()).padStart(2,"0")}-${months[d.getMonth()]}-${d.getFullYear()}`; })()}</div>

                  <div style={{ fontSize: "8pt", marginTop: "6px" }}>Place: Bengaluru</div>

                </div>

                <div style={{ textAlign: "center", width: "30%" }}>

                  <div style={{ borderTop: "1px solid #000", width: "140px", marginLeft: "auto", marginRight: "auto", marginTop: "32px" }}></div>

                  <div style={{ fontSize: "8pt", fontWeight: "bold", marginTop: "2px" }}>{detailStudent.name || `${detailStudent.firstName || ""} ${detailStudent.lastName || ""}`.trim() || ""}</div>

                  <div style={{ fontSize: "7pt", fontWeight: "bold" }}>{detailStudent.studentId || ""}</div>

                </div>

              </div>

            </div>



            {/* ===== TEAR LINE ===== */}

            <div style={{ borderTop: "2px dashed #999", marginTop: "10px", position: "relative" }}>

              <span style={{ position: "absolute", top: "-7px", left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "0 8px", fontSize: "7pt", color: "#999", letterSpacing: "1px" }}>&#9986; CUT HERE</span>

            </div>



            {/* ===== OFFICE USE ONLY ===== */}

            <div style={{ border: "1.5px solid #000", marginTop: "10px" }}>

              <div style={{ background: "#8b0000", padding: "5px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>

                <span style={{ fontSize: "8pt", fontWeight: "bold", color: "#fff", letterSpacing: "0.5px" }}>FOR OFFICE USE ONLY</span>

                <span style={{ fontSize: "7pt", color: "#ddd" }}>AIOS Institute</span>

              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>

                <tbody>

                  <tr>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle", width: "22%" }}>Student Name</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle", width: "28%" }}>{detailStudent.name || `${detailStudent.firstName || ""} ${detailStudent.lastName || ""}`.trim() || ""}</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle", width: "22%" }}>Student ID</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle", width: "28%" }}>{detailStudent.studentId || ""}</td>

                  </tr>

                  <tr>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Course</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{detailStudent.course?.split('/')[0].trim() || ""}</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Date of Admission</td>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle" }}>{(() => { const raw = detailStudent.enrollmentDate; if (!raw) return ""; const [y,m,d] = raw.split("-"); return y && m && d ? `${d}-${m}-${y}` : raw; })()}</td>

                  </tr>

                  <tr>

                    <td style={{ padding: "6px 10px", border: "1px solid #bbb", fontWeight: "bold", background: "#f7f7f7", verticalAlign: "middle" }}>Remarks</td>

                    <td colSpan={3} style={{ padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "middle", minHeight: "20px" }}>&nbsp;</td>

                  </tr>

                </tbody>

              </table>

              <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 12px 10px" }}>

                <div style={{ textAlign: "center" }}>

                  <div style={{ borderTop: "1px solid #000", width: "150px", marginTop: "22px" }}></div>

                  <div style={{ fontSize: "7.5pt", fontWeight: "bold", marginTop: "2px" }}>Authorized Signature</div>

                </div>

              </div>

            </div>



            {/* ===== FOOTER ===== */}

            <div style={{ textAlign: "center", marginTop: "10px", paddingTop: "6px", borderTop: "2px solid #8b0000" }}>

              <p style={{ fontSize: "7.5pt", margin: "1px 0", fontWeight: "bold" }}>AIOS Institute of Advanced Management &amp; Technology Pvt. Ltd.</p>

              <p style={{ fontSize: "7pt", margin: "1px 0" }}>ISO 9001:2015 Certified | Phone: 0481 291 9090 | www.aiosinstitute.com</p>

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

                    <p className="text-xs text-green-600">

                      New Total Discount: ₹{((detailStudent.discountAmount || 0) + parseFloat(discountForm.amount || "0")).toLocaleString("en-IN")}

                    </p>

                    <span className="text-slate-300">|</span>

                    <p className="text-xs text-blue-600">

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

                <p className="text-xs lg:text-xs text-slate-500 mt-0.5">{paymentsModal.student.phone} &bull; {paymentsModal.student.course?.split('/')[0].trim()}</p>

              </div>

              <button onClick={() => setPaymentsModal(null)} className="text-slate-400 hover:text-slate-700 p-1">

                <X className="w-5 h-5" />

              </button>

            </div>

            <div className="px-4 lg:px-6 py-3 lg:py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-3 gap-2 lg:gap-4 text-center flex-shrink-0">

              <div>

                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Fee</p>

                <p className="text-sm lg:text-base font-bold text-slate-800">₹{(paymentsModal.student.totalFee || 0).toLocaleString("en-IN")}</p>

              </div>

              <div>

                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Paid</p>

                <p className="text-sm lg:text-base font-bold text-blue-700">

                  ₹{(paidMap[paymentsModal.student.phone] || 0).toLocaleString("en-IN")}

                </p>

              </div>

              <div>

                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Balance</p>

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

                        </td>

                        <td className="px-4 lg:px-6 py-2 lg:py-3 text-xs text-slate-700">{p.paymentDate ? (() => { const [y,m,d] = p.paymentDate.split("-"); return `${d}-${m}-${y}`; })() : "—"}</td>

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



      {/* Address Label Modal */}

      {addressLabelStudent && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-auto">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">

              <div>

                <h2 className="text-lg font-bold text-slate-900">Print Address Label</h2>

                <p className="text-sm text-slate-500 mt-0.5">For mail envelope - {addressLabelStudent.name}</p>

              </div>

              <button onClick={() => setAddressLabelStudent(null)} className="text-slate-400 hover:text-slate-700 p-1">

                <X className="w-5 h-5" />

              </button>

            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

              <style jsx global>{`

                @media print {

                  body * {

                    visibility: hidden;

                  }

                  #address-label-print, #address-label-print * {

                    visibility: visible;

                  }

                  #address-label-print {

                    position: absolute;

                    left: 50%;

                    top: 50%;

                    transform: translate(-50%, -50%);

                    width: 960px;

                    margin: 0;

                    padding: 0;

                    border: none !important;

                    box-shadow: none !important;

                    border-radius: 0 !important;

                    background: white !important;

                  }

                  #address-label-print > div:nth-child(3) > div:nth-child(1) {

                    border: 2px solid #111111 !important;

                    borderRadius: 12px !important;

                  }

                  #address-label-print > div:nth-child(3) > div:nth-child(2) {

                    width: 6px !important;

                    background: #c0392b !important;

                    flexShrink: 0 !important;

                    alignSelf: stretch !important;

                  }

                  #address-label-print > div:nth-child(3) > div:nth-child(3) {

                    border: 2px solid #111111 !important;

                    borderRadius: 12px !important;

                  }

                  #address-label-print > div:nth-child(4) {

                    background: #f8f8f8 !important;

                    padding: 12px 30px !important;

                    borderTop: 3px solid #c0392b !important;

                    display: flex !important;

                    alignItems: center !important;

                    justifyContent: space-between !important;

                    gap: 20px !important;

                  }

                  #address-label-print > div:nth-child(4) > div:nth-child(1) > div:nth-child(1) {

                    width: 40px !important;

                    height: 40px !important;

                    background: #c0392b !important;

                    borderRadius: 8px !important;

                    display: flex !important;

                    alignItems: center !important;

                    justifyContent: center !important;

                  }

                  #address-label-print > div:nth-child(4) > div:nth-child(1) > div:nth-child(1) svg {

                    width: 24px !important;

                    height: 24px !important;

                  }

                  #address-label-print > div:nth-child(4) > div:nth-child(2) > div:nth-child(1) svg,

                  #address-label-print > div:nth-child(4) > div:nth-child(2) > div:nth-child(3) svg {

                    width: 18px !important;

                    height: 18px !important;

                  }

                  @page {

                    margin: 0;

                    size: A4 landscape;

                  }

                }

              `}</style>

              <div 
                id="address-label-print"
                className="bg-white"
                style={{ width: '960px', margin: '0 auto', border: 'none', fontFamily: '"Times New Roman", Times, serif', borderRadius: '0', overflow: 'hidden' }}
              >
                {/* Header */}
                <div style={{ background: '#ffffff', padding: '20px 30px', borderBottom: '2px solid #111111' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                      {/* Logo */}
                      <img src="/login-page.jpeg" alt="AIOS EDU" style={{ width: '400px', height: 'auto', objectFit: 'contain' }} />
                    </div>
                  </div>
                </div>

                {/* Decorative Bar */}
                <div style={{ height: '4px', background: '#111111' }}></div>

                {/* Address Row */}
                <div style={{ display: 'flex', alignItems: 'stretch', padding: '25px 30px', gap: '15px', background: '#ffffff' }}>
                  {/* Shipper Box */}
                  <div style={{ flex: 1, border: '2px solid #111111', borderRadius: '12px', padding: '15px 50px 15px 15px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '15px', right: '15px', width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22V12H15V22" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', color: '#111111', marginBottom: '2px', letterSpacing: '1px' }}>SHIPPER</div>
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#666666', marginBottom: '10px', letterSpacing: '0.5px' }}>SENDER (FROM)</div>
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '24px', fontWeight: 'bold', color: '#111111', lineHeight: '1.2', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 21H21" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 21V7L12 3L19 7V21" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 21V15H15V21" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      AIOS EDU
                    </div>
                      <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '18px', fontWeight: 'bold', color: '#111111', lineHeight: '1.2', marginBottom: '8px' }}>Institute of Advanced Management and Technology Pvt. Ltd</div>
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '15px', color: '#111111', lineHeight: '1.6', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '2px', flexShrink: 0 }}>
                        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="9" r="2.5" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div>
                        2nd Floor, Vishnu Arcade, Mauthi Nagar Main Road,
                        <div>Bengaluru - 560021</div>
                        <div>Karnataka, India</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '15px', fontWeight: 'bold', color: '#111111', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 16.92V19.92C22.0001 20.1985 21.944 20.4739 21.8348 20.7292C21.7256 20.9846 21.5653 21.214 21.3643 21.4025C21.1634 21.591 20.9265 21.7343 20.6683 21.8233C20.4102 21.9123 20.1363 21.945 19.864 21.92C16.7576 21.5856 13.7729 20.5341 11.144 18.84C8.68357 17.2735 6.58645 15.1764 5.01997 12.716C3.31994 10.0762 2.26801 7.07799 1.93997 3.96C1.91497 3.688 1.9473 3.41399 2.03628 3.1556C2.12526 2.89722 2.26874 2.66022 2.45732 2.4592C2.64591 2.25818 2.87532 2.09792 3.1307 1.98885C3.38608 1.87978 3.66148 1.82397 3.93997 1.824H6.93997C7.44498 1.81803 7.93122 2.01317 8.29225 2.36626C8.65328 2.71935 8.85978 3.20129 8.86497 3.706C8.86967 4.18703 8.87937 4.66703 8.89407 5.146C8.93212 6.14533 9.0208 7.14153 9.15997 8.132C9.17746 8.25555 9.16906 8.38152 9.13538 8.50154C9.1017 8.62155 9.04361 8.73243 8.96497 8.826C8.87497 8.934 8.77497 9.044 8.67497 9.152L7.67497 10.152C9.15203 12.7294 11.2706 14.848 13.848 16.325L14.848 15.325C14.956 15.225 15.066 15.125 15.174 15.035C15.2675 14.9564 15.3784 14.8983 15.4984 14.8646C15.6185 14.8309 15.7444 14.8225 15.868 14.84C16.8584 14.9792 17.8546 15.0679 18.854 15.106C19.3587 15.1112 19.8406 15.3177 20.1937 15.6787C20.5468 16.0398 20.7419 16.526 20.736 17.031L22 16.92Z" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      +91 74111 33333, 080-22222228
                    </div>
                  </div>

                  {/* Red Divider */}
                  <div style={{ width: '6px', background: '#c0392b', flexShrink: 0, alignSelf: 'stretch' }}></div>

                  {/* Consignee Box */}
                  <div style={{ flex: 1, border: '2px solid #111111', borderRadius: '12px', padding: '15px 50px 15px 15px', position: 'relative', background: '#ffffff' }}>
                    <div style={{ position: 'absolute', top: '15px', right: '15px', width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="9" r="2.5" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', color: '#111111', marginBottom: '2px', letterSpacing: '1px' }}>CONSIGNEE</div>
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#666666', marginBottom: '10px', letterSpacing: '0.5px' }}>RECIPIENT (TO)</div>
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '24px', fontWeight: 'bold', color: '#111111', lineHeight: '1.2', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {addressLabelStudent.name}
                    </div>
                    {addressLabelStudent.personalDetails?.address && (
                      <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '15px', color: '#111111', lineHeight: '1.6', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '2px', flexShrink: 0 }}>
                          <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="9" r="2.5" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div>
                          {addressLabelStudent.personalDetails.address}
                          <div>{addressLabelStudent.personalDetails?.city && addressLabelStudent.personalDetails.city}{addressLabelStudent.personalDetails?.city && addressLabelStudent.personalDetails?.state && <span>, </span>}{addressLabelStudent.personalDetails?.state && addressLabelStudent.personalDetails.state}{addressLabelStudent.personalDetails?.pincode && <span> - {addressLabelStudent.personalDetails.pincode}</span>}</div>
                          <div>India</div>
                        </div>
                      </div>
                    )}
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '15px', fontWeight: 'bold', color: '#111111', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 16.92V19.92C22.0001 20.1985 21.944 20.4739 21.8348 20.7292C21.7256 20.9846 21.5653 21.214 21.3643 21.4025C21.1634 21.591 20.9265 21.7343 20.6683 21.8233C20.4102 21.9123 20.1363 21.945 19.864 21.92C16.7576 21.5856 13.7729 20.5341 11.144 18.84C8.68357 17.2735 6.58645 15.1764 5.01997 12.716C3.31994 10.0762 2.26801 7.07799 1.93997 3.96C1.91497 3.688 1.9473 3.41399 2.03628 3.1556C2.12526 2.89722 2.26874 2.66022 2.45732 2.4592C2.64591 2.25818 2.87532 2.09792 3.1307 1.98885C3.38608 1.87978 3.66148 1.82397 3.93997 1.824H6.93997C7.44498 1.81803 7.93122 2.01317 8.29225 2.36626C8.65328 2.71935 8.85978 3.20129 8.86497 3.706C8.86967 4.18703 8.87937 4.66703 8.89407 5.146C8.93212 6.14533 9.0208 7.14153 9.15997 8.132C9.17746 8.25555 9.16906 8.38152 9.13538 8.50154C9.1017 8.62155 9.04361 8.73243 8.96497 8.826C8.87497 8.934 8.77497 9.044 8.67497 9.152L7.67497 10.152C9.15203 12.7294 11.2706 14.848 13.848 16.325L14.848 15.325C14.956 15.225 15.066 15.125 15.174 15.035C15.2675 14.9564 15.3784 14.8983 15.4984 14.8646C15.6185 14.8309 15.7444 14.8225 15.868 14.84C16.8584 14.9792 17.8546 15.0679 18.854 15.106C19.3587 15.1112 19.8406 15.3177 20.1937 15.6787C20.5468 16.0398 20.7419 16.526 20.736 17.031L22 16.92Z" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {addressLabelStudent.phone}
                    </div>
                  </div>
                </div>

                {/* Footer Banner */}
                <div style={{ background: '#f8f8f8', padding: '12px 30px', borderTop: '3px solid #c0392b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#c0392b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 8V12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 16H12.01" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', color: '#111111', marginBottom: '2px' }}>AIOS EDU OFFICIAL</div>
                      <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '10px', color: '#666666' }}>If undelivered, please return to AIOS EDU Official for further processing</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 21H21" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 21V7L12 3L19 7V21" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 21V15H15V21" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '10px', fontWeight: 'bold', color: '#111111' }}>OFFICIAL</span>
                    </div>
                    <div style={{ width: '1px', height: '20px', background: '#ddd' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C16.4183 22 20 18.4183 20 14C20 10 12 2 12 2C12 2 4 10 4 14C4 18.4183 7.58172 22 12 22Z" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '10px', fontWeight: 'bold', color: '#111111' }}>SECURE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">

              <button 

                onClick={() => setAddressLabelStudent(null)}

                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"

              >

                Cancel

              </button>

              <button

                onClick={() => {

                  const element = document.getElementById('address-label-print');

                  if (element) {

                    window.print();

                  }

                }}

                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"

              >

                <Printer className="w-4 h-4" />

                Print Label

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{errorModal.title}</h2>
              <button onClick={() => setErrorModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-6">{errorModal.message}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setErrorModal(null)}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                OK
              </button>
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



            {newStudentLink ? (

              /* Success UI */

              <div className="space-y-4">

                <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">

                  <div className="flex items-center gap-2 text-green-800">

                    <Check className="w-5 h-5" />

                    <h3 className="font-bold text-lg">Student Added Successfully!</h3>

                  </div>

                  <p className="text-sm text-green-700">

                    <strong>{newStudentName}</strong> has been enrolled. Share the password setup link below with the student via WhatsApp, SMS, or email.

                  </p>



                  <div className="bg-white border border-green-200 rounded-lg p-4 space-y-3">

                    <label className="block text-xs font-semibold text-green-800 uppercase tracking-wide">Password Setup Link</label>

                    <div className="flex gap-2">

                      <input

                        readOnly

                        value={newStudentLink}

                        className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono break-all"

                      />

                      <button

                        onClick={() => {

                          navigator.clipboard.writeText(newStudentLink);

                          setNewStudentCopied(true);

                          setTimeout(() => setNewStudentCopied(false), 2000);

                        }}

                        className="px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 flex-shrink-0"

                      >

                        {newStudentCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}

                        {newStudentCopied ? "Copied!" : "Copy"}

                      </button>

                    </div>

                    <p className="text-xs text-slate-500">

                      Link valid for <strong>24 hours</strong> and can only be used once.

                    </p>

                  </div>



                  <a

                    href={`https://wa.me/?text=${encodeURIComponent(

                      `Welcome to AIOS EDU! Dear ${newStudentName}, your enrollment is confirmed. Please set your portal password here: ${newStudentLink} (valid 24h). -AIOS EDU Team`

                    )}`}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"

                  >

                    <Send className="w-4 h-4" />

                    Share via WhatsApp

                  </a>

                </div>



                <div className="flex gap-3">

                  <button

                    onClick={() => {

                      setNewStudentLink(null);

                      setNewStudentName("");

                      setNewStudentCopied(false);

                    }}

                    className="flex-1 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"

                  >

                    Add Another Student

                  </button>

                  <button

                    onClick={() => {

                      setNewStudentLink(null);

                      setNewStudentName("");

                      setNewStudentCopied(false);

                      setShowForm(false);

                    }}

                    className="flex-1 py-2.5 text-sm font-bold text-white gradient-bg rounded-lg hover:shadow-lg transition-all"

                  >

                    Done

                  </button>

                </div>

              </div>

            ) : (

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
                    <select
                      value={formData.duration}
                      onChange={(e) => {
                        const dur = e.target.value;
                        const end = dur ? calcEndYear(dur, formData.startYear) : "";
                        setFormData({ ...formData, duration: dur, endYear: end });
                      }}
                      required
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                    >
                      <option value="">Select duration</option>
                      {DURATION_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
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

              <div className="grid grid-cols-4 gap-3">

                <div>

                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Fee (₹) *</label>

                  <div className="relative">

                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                    <input

                      type="text"

                      value={formData.totalFee ? parseInt(formData.totalFee).toLocaleString("en-IN") : ""}

                      onChange={(e) => {

                        const rawValue = e.target.value.replace(/[^\d]/g, "");

                        setFormData({ ...formData, totalFee: rawValue });

                      }}

                      required

                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"

                      placeholder="50,000"

                    />

                  </div>

                </div>

                <div>

                  <label className="block text-xs font-medium text-slate-700 mb-1">Discount (₹)</label>

                  <div className="relative">

                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                    <input

                      type="text"

                      value={formData.discountAmount ? parseInt(formData.discountAmount).toLocaleString("en-IN") : ""}

                      onChange={(e) => {

                        const rawValue = e.target.value.replace(/[^\d]/g, "");

                        setFormData({ ...formData, discountAmount: rawValue });

                      }}

                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"

                      placeholder="0"

                    />

                  </div>

                </div>

                <div className="flex items-end">

                  <div className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-1.5 text-center">

                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Effective Fee</p>

                    <p className="text-sm font-bold text-slate-800">

                      ₹{((parseFloat(formData.totalFee || "0") - parseFloat(formData.discountAmount || "0")).toLocaleString("en-IN"))}

                    </p>

                  </div>

                </div>

                <div>

                  <label className="block text-xs font-medium text-slate-700 mb-1">Enrollment Date</label>

                  <input

                    type="text"

                    value={formData.enrollmentDate ? (() => { const [y,m,d] = formData.enrollmentDate.split("-"); return `${d}-${m}-${y}`; })() : ""}

                    readOnly

                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700"

                  />

                </div>

                <div>

                  <label className="block text-xs font-medium text-slate-700 mb-1">Admission Center *</label>
                  <select
                    value={formData.admissionCenter}
                    onChange={(e) => setFormData({ ...formData, admissionCenter: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none bg-white"
                    required
                  >
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Kochi">Kochi</option>
                    <option value="Salem">Salem</option>
                    <option value="Hyderabad">Hyderabad</option>
                  </select>
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

          )}

          </div>

        </div>

      )}

    </div>

  );

}

