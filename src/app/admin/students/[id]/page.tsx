"use client";

import { useEffect, useState, use } from "react";
import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  User,
  GraduationCap,
  FileText,
  BookOpen,
  MapPin,
  IndianRupee,
  Eye,
  Download,
  AlertTriangle,
  KeyRound,
  Printer,
  ArrowLeft,
  ArrowRight,
  Edit,
  Package,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Plus as PlusIcon,
  X as XIcon,
  Trash2,
  ChevronDown,
  ChevronUp,
  Receipt,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";
import { getSemesterCount, getYearCount, groupSemestersByYear } from "@/lib/semester-utils";

// Utility function to format date to dd-mm-yy
function formatDateToDDMMYY(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

// Format ISO date to readable string: 03 May 2026, 02:30 PM
function formatDateTime(isoString?: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

// Utility function to deduplicate course names with slash pattern
function deduplicateCourseName(courseName?: string): string {
  if (!courseName) return "";
  // Handle the specific case: "X / X-Y" -> "X-Y" or "X / X" -> "X"
  // Split by any slash character
  const parts = courseName.split(/\s*[\/／∕]\s*/);
  if (parts.length === 2) {
    const part1 = parts[0].trim();
    const part2 = parts[1].trim();
    // If both parts are identical, return one
    if (part1 === part2) {
      return part1;
    }
    // Extract base name (before hyphen) from each part
    const part1Base = part1.split(/[-–]/)[0].trim();
    const part2Base = part2.split(/[-–]/)[0].trim();
    // If the base names are identical, return the part with more info (part2)
    if (part1Base === part2Base) {
      return part2;
    }
  }
  return courseName;
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
  };
  admissionStatus?: "Pending" | "In Progress" | "Confirmed" | "Rejected";
  semesterResults?: Array<{
    year: number;
    status: "Pass" | "Fail" | "Not Declared";
    date?: string;
    certificateStatus?: "Not Issued" | "Issued from University" | "Sent" | "Received";
    certificateIssuedAt?: string;
    certificateSentAt?: string;
    certificateReceivedAt?: string;
    semesters?: {
      semester: number;
      status: "Pass" | "Fail" | "Not Declared";
      statusChangedAt?: string;
      certificateStatus?: "Not Issued" | "Issued from University" | "Sent" | "Received";
      certificateIssuedAt?: string;
      certificateSentAt?: string;
      certificateReceivedAt?: string;
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

type ConsignmentItem = {
  id: string;
  type: string;
  sent: boolean;
  trackingNumber?: string;
  dateSent?: string;
  status?: "In Transit" | "Delivered" | "Returned";
  deliveryPartner?: string;
  deliveredOn?: string;
};

interface Payment {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string;
  installmentNumber?: number;
  totalInstallments?: number;
  transactionRef?: string;
  balanceAmount?: number;
  createdAt?: any;
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Tracking feature states
  const [admissionStatus, setAdmissionStatus] = useState<Student["admissionStatus"]>("Pending");
  const [semesterResults, setSemesterResults] = useState<Student["semesterResults"]>([]);
  const [consignments, setConsignments] = useState<Student["consignments"]>([]);
  const [trackingNotes, setTrackingNotes] = useState<string[]>([]);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [consignmentModalOpen, setConsignmentModalOpen] = useState(false);
  const [editingConsignment, setEditingConsignment] = useState<ConsignmentItem | null>(null);
  const [consignmentForm, setConsignmentForm] = useState({
    type: "",
    sent: false,
    trackingNumber: "",
    status: "In Transit" as "In Transit" | "Delivered" | "Returned",
    deliveryPartner: "",
    deliveredOn: "",
  });
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Payments / receipts modal
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [paymentsData, setPaymentsData] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Course Results year accordion
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  // Section collapse states
  const [collapsedSections, setCollapsedSections] = useState({
    courseResults: true,
    consignmentTracking: true,
    trackingNotes: true,
    documents: true,
    academicBackground: true,
    personalFamilyDetails: true,
    address: true,
  });

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => {
      // If opening a section (was collapsed, now opening), close all others
      if (prev[section]) {
        // Close all sections first
        const allCollapsed = {
          courseResults: true,
          consignmentTracking: true,
          trackingNotes: true,
          documents: true,
          academicBackground: true,
          personalFamilyDetails: true,
          address: true,
        };
        // Then open the clicked one
        return { ...allCollapsed, [section]: false };
      }
      // If closing a section, just toggle this one
      if (section === "courseResults") setExpandedYear(null);
      return { ...prev, [section]: true };
    });
  };

  useEffect(() => {
    async function fetchStudent() {
      setLoading(true);
      try {
        const docRef = doc(db, "students", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const studentData = { id: docSnap.id, ...docSnap.data() } as Student;
          setStudent(studentData);

          // Initialize tracking states from student data
          setAdmissionStatus(studentData.admissionStatus || "Pending");
          setSemesterResults(studentData.semesterResults || []);
          setConsignments(studentData.consignments || []);
          setTrackingNotes(studentData.trackingNotes || []);
        }
      } catch (err) {
        console.error("Error fetching student:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [id]);

  async function handleResetPassword() {
    if (!student) return;
    setResettingPassword(true);
    try {
      const tokenRes = await fetch("/api/auth/create-password-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: student.phone, studentId: student.studentId || student.id }),
      });
      const tokenData = await tokenRes.json();

      if (tokenRes.ok && tokenData.link) {
        setResetLink(tokenData.link);
      } else {
        setErrorModalOpen(true);
        setErrorMessage("Failed to generate password reset link.");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setErrorModalOpen(true);
      setErrorMessage("Error generating password reset link.");
    } finally {
      setResettingPassword(false);
    }
  }

  async function openPaymentsModal() {
    if (!student) return;
    setPaymentsModalOpen(true);
    setLoadingPayments(true);
    try {
      const snap = await getDocs(query(
        collection(db, "payments"),
        orderBy("createdAt", "desc")
      ));
      const payments = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Payment))
        .filter(p => (p as unknown as Record<string, string>).studentId === student.studentId || (p as unknown as Record<string, string>).studentId === student.id);
      setPaymentsData(payments);
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setLoadingPayments(false);
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

  async function generateStudentPDF() {
    if (!printRef.current || !student) return;
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
      pdf.save(`${student.studentId}_${student.name.replace(/\s+/g, "_")}_Admission.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setGeneratingPDF(false);
    }
  }

  // Firestore update functions for tracking features
  async function updateAdmissionStatus(status: Student["admissionStatus"]) {
    if (!student) return;
    setSavingTracking(true);
    try {
      await setDoc(doc(db, "students", student.id), { admissionStatus: status }, { merge: true });
      setAdmissionStatus(status);
    } catch (err) {
      console.error("Error updating admission status:", err);
    } finally {
      setSavingTracking(false);
    }
  }

  async function updateYearResult(year: number, status: "Pass" | "Fail" | "Not Declared", certificateStatus?: "Not Issued" | "Issued from University" | "Sent" | "Received") {
    if (!student) return;
    setSavingTracking(true);
    try {
      const updatedResults = [...(semesterResults || [])];
      const existingIndex = updatedResults.findIndex(r => r.year === year);
      const date = new Date().toISOString().split("T")[0];

      // Get semesters for this year
      const yearGroup = groupSemestersByYear(getSemesterCount(student.duration)).find(g => g.year === year);
      const semestersForYear = yearGroup?.semesters || [];

      // Auto-mark semesters as passed when year is marked as passed
      const semesters = status === "Pass" 
        ? semestersForYear.map(sem => ({ semester: sem, status: "Pass" as const }))
        : (existingIndex >= 0 ? updatedResults[existingIndex].semesters : []);

      // Capture certificate timestamps
      const existingResult = existingIndex >= 0 ? updatedResults[existingIndex] : null;
      const prevCertStatus = existingResult?.certificateStatus;
      const now = new Date().toISOString();
      const certificateIssuedAt = certificateStatus === "Issued from University" && prevCertStatus !== "Issued from University"
        ? now : (existingResult?.certificateIssuedAt);
      const certificateSentAt = certificateStatus === "Sent" && prevCertStatus !== "Sent"
        ? now : (existingResult?.certificateSentAt);
      const certificateReceivedAt = certificateStatus === "Received" && prevCertStatus !== "Received"
        ? now : (existingResult?.certificateReceivedAt);

      if (existingIndex >= 0) {
        updatedResults[existingIndex] = { 
          year, 
          status, 
          date, 
          certificateStatus: certificateStatus || updatedResults[existingIndex].certificateStatus,
          certificateIssuedAt,
          certificateSentAt,
          certificateReceivedAt,
          semesters 
        };
      } else {
        updatedResults.push({ 
          year, 
          status, 
          date, 
          certificateStatus,
          certificateIssuedAt,
          certificateSentAt,
          certificateReceivedAt,
          semesters 
        });
      }

      // Auto-add consignment when certificate status is changed to "Issued from University"
      let updatedConsignments = consignments || [];
      if (certificateStatus === "Issued from University") {
        const existingConsignment = updatedConsignments.find(c => c.type === `Year ${year} Marksheet`);
        if (!existingConsignment) {
          const newConsignment: ConsignmentItem = {
            id: Date.now().toString(),
            type: `Year ${year} Marksheet`,
            sent: false,
          };
          updatedConsignments = [...updatedConsignments, newConsignment];
        }
      }

      await setDoc(doc(db, "students", student.id), {
        semesterResults: updatedResults,
        consignments: updatedConsignments,
      }, { merge: true });
      setSemesterResults(updatedResults);
      setConsignments(updatedConsignments);
    } catch (err) {
      console.error("Error updating year result:", err);
    } finally {
      setSavingTracking(false);
    }
  }

  async function updateSemesterResult(year: number, semester: number, status: "Pass" | "Fail" | "Not Declared", certificateStatus?: "Not Issued" | "Issued from University" | "Sent" | "Received") {
    if (!student) return;
    setSavingTracking(true);
    try {
      const updatedResults = [...(semesterResults || [])];
      const existingIndex = updatedResults.findIndex(r => r.year === year);
      const date = new Date().toISOString().split("T")[0];

      let semesters = existingIndex >= 0 ? [...(updatedResults[existingIndex].semesters || [])] : [];
      const semIndex = semesters.findIndex(s => s.semester === semester);
      const prevSem = semIndex >= 0 ? semesters[semIndex] : undefined;
      const prevSemCertStatus = prevSem?.certificateStatus;
      const now = new Date().toISOString();
      const semStatusChangedAt = status !== prevSem?.status ? now : prevSem?.statusChangedAt;
      const semCertIssuedAt = certificateStatus === "Issued from University" && prevSemCertStatus !== "Issued from University"
        ? now : (prevSem?.certificateIssuedAt);
      const semCertSentAt = certificateStatus === "Sent" && prevSemCertStatus !== "Sent"
        ? now : (prevSem?.certificateSentAt);
      const semCertReceivedAt = certificateStatus === "Received" && prevSemCertStatus !== "Received"
        ? now : (prevSem?.certificateReceivedAt);

      if (semIndex >= 0) {
        semesters[semIndex] = { semester, status, statusChangedAt: semStatusChangedAt, certificateStatus: certificateStatus || semesters[semIndex].certificateStatus, certificateIssuedAt: semCertIssuedAt, certificateSentAt: semCertSentAt, certificateReceivedAt: semCertReceivedAt };
      } else {
        semesters.push({ semester, status, statusChangedAt: semStatusChangedAt, certificateStatus, certificateIssuedAt: semCertIssuedAt, certificateSentAt: semCertSentAt, certificateReceivedAt: semCertReceivedAt });
      }

      // Check if all semesters for this year are passed
      const yearGroup = groupSemestersByYear(getSemesterCount(student.duration)).find(g => g.year === year);
      const totalSemestersInYear = yearGroup?.semesters.length || 0;
      const passedSemesters = semesters.filter(s => s.status === "Pass").length;
      const yearStatus = passedSemesters === totalSemestersInYear && totalSemestersInYear > 0 ? "Pass" as const : (existingIndex >= 0 ? updatedResults[existingIndex].status : "Not Declared");

      if (existingIndex >= 0) {
        updatedResults[existingIndex] = { 
          ...updatedResults[existingIndex], 
          date, 
          semesters,
          status: yearStatus
        };
      } else {
        updatedResults.push({ 
          year, 
          status: yearStatus, 
          date, 
          semesters 
        });
      }

      await setDoc(doc(db, "students", student.id), {
        semesterResults: updatedResults,
      }, { merge: true });
      setSemesterResults(updatedResults);
    } catch (err) {
      console.error("Error updating semester result:", err);
    } finally {
      setSavingTracking(false);
    }
  }

  async function addConsignment(consignmentData: Omit<ConsignmentItem, "id">) {
    if (!student) return;
    setSavingTracking(true);
    try {
      const baseConsignment: Partial<ConsignmentItem> = {
        id: Date.now().toString(),
        type: consignmentData.type,
        sent: consignmentData.sent,
      };

      if (consignmentData.deliveryPartner && consignmentData.deliveryPartner.trim()) {
        baseConsignment.deliveryPartner = consignmentData.deliveryPartner;
      }

      if (consignmentData.sent) {
        baseConsignment.dateSent = new Date().toISOString().split("T")[0];
        if (consignmentData.trackingNumber && consignmentData.trackingNumber.trim()) {
          baseConsignment.trackingNumber = consignmentData.trackingNumber;
        }
        baseConsignment.status = consignmentData.status || "In Transit";
        if (consignmentData.status === "Delivered") {
          baseConsignment.deliveredOn = new Date().toISOString().split("T")[0];
        }
      }

      // Remove undefined values before sending to Firestore
      const cleanData: Record<string, any> = {};
      Object.entries(baseConsignment).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          cleanData[key] = value;
        }
      });

      const newConsignment = cleanData as ConsignmentItem;
      const updatedConsignments = [...(consignments || []), newConsignment];

      await setDoc(doc(db, "students", student.id), { consignments: updatedConsignments }, { merge: true });
      setConsignments(updatedConsignments);
      setConsignmentModalOpen(false);
      setEditingConsignment(null);
      setConsignmentForm({ type: "", sent: false, trackingNumber: "", status: "In Transit", deliveryPartner: "", deliveredOn: "" });
    } catch (err) {
      console.error("Error adding consignment:", err);
    } finally {
      setSavingTracking(false);
    }
  }

  async function updateConsignment(consignmentData: ConsignmentItem) {
    if (!student) return;
    setSavingTracking(true);
    try {
      const updatedConsignments = (consignments || []).map(c => {
        if (c.id === consignmentData.id) {
          const updated: Partial<ConsignmentItem> = {
            id: consignmentData.id,
            type: consignmentData.type,
            sent: consignmentData.sent,
          };

          if (consignmentData.deliveryPartner && consignmentData.deliveryPartner.trim()) {
            updated.deliveryPartner = consignmentData.deliveryPartner;
          }

          if (consignmentData.sent) {
            if (consignmentData.trackingNumber && consignmentData.trackingNumber.trim()) {
              updated.trackingNumber = consignmentData.trackingNumber;
            }
            updated.status = consignmentData.status || "In Transit";
            // Set dateSent if changing from not sent to sent
            if (!c.sent && consignmentData.sent) {
              updated.dateSent = new Date().toISOString().split("T")[0];
            } else {
              updated.dateSent = c.dateSent;
            }
            // Set deliveredOn if status is Delivered and it wasn't set before
            if (consignmentData.status === "Delivered" && !c.deliveredOn) {
              updated.deliveredOn = new Date().toISOString().split("T")[0];
            } else if (consignmentData.status !== "Delivered") {
              updated.deliveredOn = undefined;
            } else {
              updated.deliveredOn = c.deliveredOn;
            }
          } else {
            // If changing from sent to not sent, clear dateSent and deliveredOn
            updated.dateSent = undefined;
            updated.deliveredOn = undefined;
            updated.trackingNumber = undefined;
            updated.status = undefined;
          }

          // Remove undefined values before sending to Firestore
          const cleanData: Record<string, any> = {};
          Object.entries(updated).forEach(([key, value]) => {
            if (value !== undefined && value !== "") {
              cleanData[key] = value;
            }
          });

          return cleanData as ConsignmentItem;
        }
        return c;
      });

      await setDoc(doc(db, "students", student.id), { consignments: updatedConsignments }, { merge: true });
      setConsignments(updatedConsignments);
      setConsignmentModalOpen(false);
      setEditingConsignment(null);
      setConsignmentForm({ type: "", sent: false, trackingNumber: "", status: "In Transit", deliveryPartner: "", deliveredOn: "" });
    } catch (err) {
      console.error("Error updating consignment:", err);
    } finally {
      setSavingTracking(false);
    }
  }

  async function deleteConsignment(id: string) {
    if (!student) return;
    setSavingTracking(true);
    try {
      const updatedConsignments = (consignments || []).filter(c => c.id !== id);

      await setDoc(doc(db, "students", student.id), { consignments: updatedConsignments }, { merge: true });
      setConsignments(updatedConsignments);
    } catch (err) {
      console.error("Error deleting consignment:", err);
    } finally {
      setSavingTracking(false);
    }
  }

  async function addTrackingNote(note: string) {
    if (!student || !note.trim()) return;
    setSavingNote(true);
    try {
      const now = new Date();
      const datePrefix = now.toLocaleDateString("en-GB").replace(/\//g, "-");
      const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
      const newNote = `${datePrefix} (${dayName}): ${note}`;
      const updatedNotes = [...(trackingNotes || []), newNote];

      await setDoc(doc(db, "students", student.id), { trackingNotes: updatedNotes }, { merge: true });
      setTrackingNotes(updatedNotes);
      setNoteText("");
      setNoteModalOpen(false);
    } catch (err) {
      console.error("Error adding tracking note:", err);
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Student not found</p>
      </div>
    );
  }

  const initials = student.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/admin/students" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </Link>
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div className="gradient-bg px-4 sm:px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white/30">
                  {student.personalDetails?.photo ? (
                    <img src={student.personalDetails.photo} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">{student.name}</h2>
                  <p className="text-xs sm:text-sm text-white/90 mt-0.5">{deduplicateCourseName(student.course)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-white/70">{student.studentId || student.id}</span>
                    <span className="text-white/30">|</span>
                    <a href={`tel:${student.phone}`} className="text-xs text-white/70 hover:text-white hover:underline">{student.phone}</a>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/admin/students/${student.id}/edit`}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm hidden sm:flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </Link>
                <button onClick={handleResetPassword} disabled={resettingPassword} className="px-3 py-1.5 text-xs font-bold text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors shadow-sm hidden sm:flex items-center gap-1.5 disabled:opacity-60">
                  {resettingPassword ? <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  Reset Password
                </button>
                <button onClick={generateStudentPDF} disabled={generatingPDF} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors shadow-sm disabled:opacity-60">
                  {generatingPDF ? <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  {generatingPDF ? "..." : "Print"}
                </button>
              </div>
            </div>
            {/* Mobile action buttons */}
            <div className="sm:hidden flex gap-2 mt-3 pt-3 border-t border-white/15">
              <Link href={`/admin/students/${student.id}/edit`} className="flex-1 py-1.5 text-xs font-bold text-white bg-purple-600 rounded-lg border border-white/20 flex items-center justify-center gap-1">
                <Edit className="w-3 h-3" />
                Edit
              </Link>
              <button onClick={handleResetPassword} disabled={resettingPassword} className="flex-1 py-1.5 text-xs font-bold text-white bg-white/15 rounded-lg border border-white/20 flex items-center justify-center gap-1 disabled:opacity-60">
                {resettingPassword ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <KeyRound className="w-3 h-3" />}
                Reset Password
              </button>
              <button onClick={generateStudentPDF} disabled={generatingPDF} className="flex-1 py-1.5 text-xs font-bold text-white bg-white/15 rounded-lg border border-white/20 disabled:opacity-50 flex items-center justify-center gap-1">
                {generatingPDF ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Printer className="w-3 h-3" />}Print
              </button>
            </div>
          </div>

          {/* Fee Summary */}
          <div className="px-4 sm:px-6 py-2.5 border-t border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                  <IndianRupee className="w-3 h-3 text-amber-600" />
                  <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">Total</span>
                  <span className="text-xs font-bold text-amber-800">₹{(student.totalFee || 0).toLocaleString("en-IN")}</span>
                </div>
                {(student.discountAmount || 0) > 0 && (
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Discount</span>
                    <span className="text-xs font-bold text-emerald-800">₹{(student.discountAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">
                  <span className="text-[10px] text-rose-700 font-semibold uppercase tracking-wider">Effective</span>
                  <span className="text-xs font-bold text-rose-800">₹{((student.totalFee || 0) - (student.discountAmount || 0)).toLocaleString("en-IN")}</span>
                </div>
              </div>
              <button onClick={openPaymentsModal} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                <Receipt className="w-3.5 h-3.5" />
                View Receipts
              </button>
            </div>
          </div>

          {/* Reset Link Banner */}
          {resetLink && (
            <div className="mx-4 sm:mx-5 mt-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <span className="text-green-600 font-bold">✓</span>
                  <p className="text-sm font-medium">Password reset link generated for {student.name}</p>
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
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={() => { setResetLink(null); setCopied(false); }}
                  className="text-xs text-slate-500 hover:text-slate-700 underline mt-3"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Enrollment Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
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
              { label: "Student ID", value: student.studentId || student.id },
              { label: "Faculty", value: student.faculty },
              { label: "Course", value: deduplicateCourseName(student.course) },
              { label: "Stream", value: student.stream || "—" },
              { label: "Duration", value: student.duration || "—" },
              { label: "University", value: student.university },
              { label: "Academic Year", value: `${student.startYear}${student.endYear ? ` – ${student.endYear}` : ""}` },
              { label: "Enrolled On", value: student.enrollmentDate ? (() => { const [y,m,d] = student.enrollmentDate.split("-"); return `${d}-${m}-${y}`; })() : "—" },
              { label: "Admission Center", value: student.admissionCenter || "Bengaluru" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 shadow-sm p-3">
                <p className="text-xs text-blue-700 font-semibold mb-1">{label}</p>
                <p className="text-sm font-medium text-slate-700 leading-tight">{value}</p>
              </div>
            ))}
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 shadow-sm p-3 flex flex-col justify-between">
              <p className="text-xs text-purple-700 font-semibold mb-1">Admission Status</p>
              <div className="flex items-center gap-2">
                <select
                  value={admissionStatus}
                  onChange={(e) => updateAdmissionStatus(e.target.value as Student["admissionStatus"])}
                  disabled={savingTracking}
                  className={`w-full px-2 py-1.5 text-xs font-medium rounded-lg border-2 outline-none transition-colors ${
                    admissionStatus === "Confirmed"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : admissionStatus === "Rejected"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : admissionStatus === "In Progress"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Rejected">Rejected</option>
                </select>
                {savingTracking && (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-red-600 rounded-full animate-spin flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Course Results */}
        {student.duration && (
          <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden mb-4 ${admissionStatus === "Confirmed" ? "border-slate-200" : "border-slate-100 opacity-75"}`}>
            <div 
              className={`bg-gradient-to-r from-cyan-50 via-teal-50/50 to-white border-b border-slate-200 p-3 transition-colors ${admissionStatus === "Confirmed" ? "cursor-pointer hover:bg-cyan-100/50" : "cursor-not-allowed"}`}
              onClick={() => admissionStatus === "Confirmed" && toggleSection('courseResults')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${admissionStatus === "Confirmed" ? "gradient-bg" : "bg-slate-300"}`}>
                    <BookOpen className={`w-4 h-4 ${admissionStatus === "Confirmed" ? "text-white" : "text-slate-500"}`} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${admissionStatus === "Confirmed" ? "text-slate-900" : "text-slate-400"}`}>Course Results</h3>
                    <p className="text-xs text-slate-400">{admissionStatus === "Confirmed" ? "Track pass/fail status by year" : "Admission must be confirmed to manage results"}</p>
                  </div>
                </div>
                {admissionStatus === "Confirmed" && (collapsedSections.courseResults ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />)}
                {admissionStatus !== "Confirmed" && <div className="px-2 py-1 text-[10px] font-medium bg-slate-100 text-slate-400 rounded-md">Locked</div>}
              </div>
            </div>
            {admissionStatus === "Confirmed" && !collapsedSections.courseResults && (
              <div className="p-4 space-y-2">
              {groupSemestersByYear(getSemesterCount(student.duration)).map((yearGroup) => {
                const yearResult = semesterResults?.find((r) => r.year === yearGroup.year);
                const status = yearResult?.status || "Not Declared";
                const certificateStatus = yearResult?.certificateStatus || "Not Issued";
                const isExpanded = expandedYear === yearGroup.year;
                return (
                  <div key={yearGroup.year} className="bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100 shadow-sm overflow-hidden">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-cyan-100/40 transition-colors"
                      onClick={() => setExpandedYear(isExpanded ? null : yearGroup.year)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${status === "Pass" ? "bg-emerald-100 text-emerald-700" : status === "Fail" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                          <span className="text-[10px] font-bold">Y{yearGroup.year}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${status === "Pass" ? "text-emerald-700" : status === "Fail" ? "text-red-700" : "text-slate-500"}`}>{status}</span>
                          {certificateStatus !== "Not Issued" && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${certificateStatus === "Received" ? "bg-emerald-100 text-emerald-700" : certificateStatus === "Sent" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{certificateStatus}</span>
                          )}
                          {yearResult?.certificateReceivedAt && (
                            <span className="text-[10px] text-slate-400">Received {new Date(yearResult.certificateReceivedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-cyan-800">Year {yearGroup.year} Details</p>
                          <div className="flex gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Status</label>
                              <select
                                value={status}
                                onChange={(e) => updateYearResult(yearGroup.year, e.target.value as "Pass" | "Fail" | "Not Declared")}
                                disabled={savingTracking}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 outline-none transition-colors ${
                                  status === "Pass"
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                    : status === "Fail"
                                    ? "bg-red-50 border-red-300 text-red-800"
                                    : "bg-slate-50 border-slate-200 text-slate-600"
                                }`}
                              >
                                <option value="Not Declared">Not Declared</option>
                                <option value="Pass">Pass</option>
                                <option value="Fail">Fail</option>
                              </select>
                            </div>
                            {status === "Pass" && (
                              <div>
                                <label className="text-[10px] text-slate-500 block mb-1">Certificate</label>
                                <select
                                  value={certificateStatus}
                                  onChange={(e) => updateYearResult(yearGroup.year, status, e.target.value as "Not Issued" | "Issued from University" | "Sent" | "Received")}
                                  disabled={savingTracking}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 outline-none transition-colors ${
                                    certificateStatus === "Received"
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                      : certificateStatus === "Sent"
                                      ? "bg-blue-50 border-blue-300 text-blue-800"
                                      : certificateStatus === "Issued from University"
                                      ? "bg-purple-50 border-purple-300 text-purple-800"
                                      : "bg-slate-50 border-slate-200 text-slate-600"
                                  }`}
                                >
                                  <option value="Not Issued">Not Issued</option>
                                  <option value="Issued from University">Issued</option>
                                  <option value="Sent">Sent</option>
                                  <option value="Received">Received</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {yearGroup.semesters.map((sem) => {
                            const semResult = yearResult?.semesters?.find(s => s.semester === sem);
                            const semStatus = semResult?.status || "Not Declared";
                            const semCertificateStatus = semResult?.certificateStatus || "Not Issued";
                            return (
                              <div key={sem} className="flex-1 min-w-[200px] bg-white rounded-lg border border-cyan-200 p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-cyan-700">Sem {sem}</span>
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-[9px] text-slate-500 block mb-1">Status</label>
                                    <select
                                      value={semStatus}
                                      onChange={(e) => updateSemesterResult(yearGroup.year, sem, e.target.value as "Pass" | "Fail" | "Not Declared", semCertificateStatus)}
                                      disabled={savingTracking}
                                      className={`w-full px-2 py-1 text-xs font-bold rounded-lg border outline-none transition-colors ${
                                        semStatus === "Pass"
                                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                          : semStatus === "Fail"
                                          ? "bg-red-50 border-red-300 text-red-800"
                                          : "bg-slate-50 border-slate-200 text-slate-600"
                                      }`}
                                    >
                                      <option value="Not Declared">Not Declared</option>
                                      <option value="Pass">Pass</option>
                                      <option value="Fail">Fail</option>
                                    </select>
                                  </div>
                                  {semStatus === "Pass" && (
                                    <div>
                                      <label className="text-[9px] text-slate-500 block mb-1">Certificate</label>
                                      <select
                                        value={semCertificateStatus}
                                        onChange={(e) => updateSemesterResult(yearGroup.year, sem, semStatus, e.target.value as "Not Issued" | "Issued from University" | "Sent" | "Received")}
                                        disabled={savingTracking}
                                        className={`w-full px-2 py-1 text-xs font-bold rounded-lg border outline-none transition-colors ${
                                          semCertificateStatus === "Received"
                                            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                            : semCertificateStatus === "Sent"
                                            ? "bg-blue-50 border-blue-300 text-blue-800"
                                            : semCertificateStatus === "Issued from University"
                                            ? "bg-purple-50 border-purple-300 text-purple-800"
                                            : "bg-slate-50 border-slate-200 text-slate-600"
                                        }`}
                                      >
                                        <option value="Not Issued">Not Issued</option>
                                        <option value="Issued from University">Issued</option>
                                        <option value="Sent">Sent</option>
                                        <option value="Received">Received</option>
                                      </select>
                                    </div>
                                  )}
                                </div>
                                {/* Semester timestamps */}
                                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                  {semResult?.statusChangedAt && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] text-slate-400 uppercase tracking-wider">Result updated</span>
                                      <span className="text-[10px] text-slate-600 font-medium">{formatDateTime(semResult.statusChangedAt)}</span>
                                    </div>
                                  )}
                                  {semResult?.certificateIssuedAt && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] text-slate-400 uppercase tracking-wider">Certificate issued</span>
                                      <span className="text-[10px] text-purple-700 font-medium">{formatDateTime(semResult.certificateIssuedAt)}</span>
                                    </div>
                                  )}
                                  {semResult?.certificateSentAt && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] text-slate-400 uppercase tracking-wider">Certificate sent</span>
                                      <span className="text-[10px] text-blue-700 font-medium">{formatDateTime(semResult.certificateSentAt)}</span>
                                    </div>
                                  )}
                                  {semResult?.certificateReceivedAt && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] text-slate-400 uppercase tracking-wider">Certificate received</span>
                                      <span className="text-[10px] text-emerald-700 font-medium">{formatDateTime(semResult.certificateReceivedAt)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Year-level timestamps */}
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                          {yearResult?.date && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Year result updated</span>
                              <span className="text-[10px] text-slate-600 font-medium">{yearResult.date}</span>
                            </div>
                          )}
                          {yearResult?.certificateIssuedAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Year certificate issued</span>
                              <span className="text-[10px] text-purple-700 font-medium">{formatDateTime(yearResult.certificateIssuedAt)}</span>
                            </div>
                          )}
                          {yearResult?.certificateSentAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Year certificate sent</span>
                              <span className="text-[10px] text-blue-700 font-medium">{formatDateTime(yearResult.certificateSentAt)}</span>
                            </div>
                          )}
                          {yearResult?.certificateReceivedAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Year certificate received</span>
                              <span className="text-[10px] text-emerald-700 font-medium">{formatDateTime(yearResult.certificateReceivedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* Consignment Tracking */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div 
            className="bg-gradient-to-r from-orange-50 via-amber-50/50 to-white border-b border-slate-200 p-3 cursor-pointer hover:bg-orange-100/50 transition-colors"
            onClick={() => toggleSection('consignmentTracking')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Consignment Tracking</h3>
                  <p className="text-xs text-slate-500">Track document deliveries</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingConsignment(null);
                    setConsignmentForm({ type: "", sent: false, trackingNumber: "", status: "In Transit", deliveryPartner: "", deliveredOn: "" });
                    setConsignmentModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Consignment
                </button>
                {collapsedSections.consignmentTracking ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
              </div>
            </div>
          </div>
          {!collapsedSections.consignmentTracking && (
            <div className="p-4">
            {consignments && consignments.length > 0 ? (
              <div className="space-y-3">
                {consignments.map((cons) => (
                  <div key={cons.id} className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{cons.type}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {[
                            cons.deliveryPartner ? <><span className="font-medium">delivery partner:</span> {cons.deliveryPartner}</> : null,
                            cons.trackingNumber ? <><span className="font-medium">Tracking:</span> {cons.trackingNumber}</> : null,
                            cons.dateSent ? <><span className="font-medium">mail send on:</span> {formatDateToDDMMYY(cons.dateSent)}</> : null,
                            cons.deliveredOn ? <><span className="font-medium">delivered on:</span> {formatDateToDDMMYY(cons.deliveredOn)}</> : null,
                          ].filter(Boolean).reduce((acc, item, index) => {
                            if (index === 0) return item;
                            return <>{acc}, {item}</>;
                          }, null as any)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cons.sent && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                            cons.status === "Delivered"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : cons.status === "Returned"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {cons.status || "In Transit"}
                          </span>
                        )}
                        {!cons.sent && (
                          <span className="px-2 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            Not Sent
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditingConsignment(cons);
                            setConsignmentForm({
                              type: cons.type,
                              sent: cons.sent,
                              trackingNumber: cons.trackingNumber || "",
                              status: cons.status || "In Transit",
                              deliveryPartner: cons.deliveryPartner || "",
                              deliveredOn: cons.deliveredOn || "",
                            });
                            setConsignmentModalOpen(true);
                          }}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmMessage("Delete this consignment?");
                            setConfirmCallback(() => () => deleteConsignment(cons.id));
                            setConfirmModalOpen(true);
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No consignments yet</p>
            )}
          </div>
          )}
        </div>

        {/* Tracking Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div 
            className="bg-gradient-to-r from-indigo-50 via-blue-50/50 to-white border-b border-slate-200 p-3 cursor-pointer hover:bg-indigo-100/50 transition-colors"
            onClick={() => toggleSection('trackingNotes')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <ClipboardList className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tracking Notes</h3>
                  <p className="text-xs text-slate-500">Internal notes and updates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Note
                </button>
                {collapsedSections.trackingNotes ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
              </div>
            </div>
          </div>
          {!collapsedSections.trackingNotes && (
            <div className="p-4">
            {trackingNotes && trackingNotes.length > 0 ? (
              <div>
                <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 shadow-sm p-3 mb-3">
                  <p className="text-[10px] text-indigo-600 font-semibold mb-1">
                    {(() => {
                      const lastNote = trackingNotes[trackingNotes.length - 1];
                      const [date] = lastNote.split(':');
                      return date;
                    })()}
                  </p>
                  <p className="text-sm text-slate-700">
                    {(() => {
                      const lastNote = trackingNotes[trackingNotes.length - 1];
                      const [, ...noteParts] = lastNote.split(':');
                      return noteParts.join(':').trim();
                    })()}
                  </p>
                </div>
                {trackingNotes.length > 1 && (
                  <button
                    onClick={() => setShowAllNotes(!showAllNotes)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    {showAllNotes ? (
                      <>Show Less <ArrowRight className="w-3 h-3 rotate-90" /></>
                    ) : (
                      <>View All Notes ({trackingNotes.length - 1} more) <ArrowRight className="w-3 h-3" /></>
                    )}
                  </button>
                )}
                {showAllNotes && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-slate-200">
                    {[...trackingNotes].reverse().slice(1).map((note, idx) => {
                      const [date, ...noteParts] = note.split(':');
                      const noteText = noteParts.join(':').trim();
                      return (
                        <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                          <p className="text-[10px] text-slate-500 font-semibold mb-1">{date}</p>
                          <p className="text-sm text-slate-700">{noteText}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No tracking notes yet</p>
            )}
          </div>
          )}
        </div>

        {/* Documents */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div 
            className="bg-gradient-to-r from-sky-50 via-blue-50/50 to-white border-b border-slate-200 p-3 cursor-pointer hover:bg-sky-100/50 transition-colors"
            onClick={() => toggleSection('documents')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Documents</h3>
                  <p className="text-xs text-slate-500">Uploaded certificates & IDs</p>
                </div>
              </div>
              {collapsedSections.documents ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
            </div>
          </div>
          {!collapsedSections.documents && (
            <div className="divide-y divide-slate-100">
            {[
              { label: "Photo", url: student.personalDetails?.photo as string | undefined },
              { label: "Aadhaar Card", url: student.personalDetails?.aadhaarUrl as string | undefined },
              { label: "SSLC / 10th Certificate", url: student.academicDetails?.sslc?.certificateUrl as string | undefined },
              { label: "HSC / 12th Certificate", url: student.academicDetails?.plustwo?.certificateUrl as string | undefined },
              { label: "UG Certificate", url: student.academicDetails?.ug?.certificateUrl as string | undefined },
              { label: "PG Certificate", url: student.academicDetails?.pg?.certificateUrl as string | undefined },
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
                    <button onClick={() => downloadDocument(url, `${student.studentId || student.id}-${label.replace(/\s+/g, '-').toLowerCase()}`)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><AlertTriangle className="w-3 h-3" /> Not uploaded</span>
                )}
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Academic Background */}
        {(student.academicDetails?.sslc?.institution || student.academicDetails?.plustwo?.institution || student.academicDetails?.ug?.institution || student.academicDetails?.pg?.institution) && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
            <div 
              className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-white border-b border-slate-200 p-3 cursor-pointer hover:bg-amber-100/50 transition-colors"
              onClick={() => toggleSection('academicBackground')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Academic Background</h3>
                    <p className="text-xs text-slate-500">Previous education records</p>
                  </div>
                </div>
                {collapsedSections.academicBackground ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
              </div>
            </div>
            {!collapsedSections.academicBackground && (
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
                  {student.academicDetails?.sslc?.institution && (
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">SSLC / 10th</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.sslc.institution}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.sslc.board || "—"}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.sslc.year || "—"}</td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-slate-800 text-right">{student.academicDetails.sslc.percentage || "—"}%</td>
                    </tr>
                  )}
                  {student.academicDetails?.plustwo?.institution && (
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">HSC / 12th</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.plustwo.institution}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.plustwo.board || student.academicDetails.plustwo.stream || "—"}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.plustwo.year || "—"}</td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-slate-800 text-right">{student.academicDetails.plustwo.percentage || "—"}%</td>
                    </tr>
                  )}
                  {student.academicDetails?.ug?.institution && (
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">UG Degree</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.ug.institution}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.ug.degree || student.academicDetails.ug.board || "—"}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.ug.year || "—"}</td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-slate-800 text-right">{student.academicDetails.ug.percentage || "—"}%</td>
                    </tr>
                  )}
                  {student.academicDetails?.pg?.institution && (
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">PG Degree</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.pg.institution}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.pg.degree || student.academicDetails.pg.board || "—"}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{student.academicDetails.pg.year || "—"}</td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-slate-800 text-right">{student.academicDetails.pg.percentage || "—"}%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* Personal & Family Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div 
            className="bg-gradient-to-r from-rose-50 via-pink-50/50 to-white border-b border-slate-200 p-3 cursor-pointer hover:bg-rose-100/50 transition-colors"
            onClick={() => toggleSection('personalFamilyDetails')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Personal & Family Details</h3>
                  <p className="text-xs text-slate-500">Identity & parent info</p>
                </div>
              </div>
              {collapsedSections.personalFamilyDetails ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
            </div>
          </div>
          {!collapsedSections.personalFamilyDetails && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Full Name", value: `${student.firstName || ""} ${student.lastName || ""}` },
              { label: "Email", value: student.email },
              { label: "Phone", value: student.phone || "—" },
              { label: "Date of Birth", value: (student.personalDetails?.dateOfBirth || student.personalDetails?.dob) ? (() => { const raw = student.personalDetails?.dateOfBirth || student.personalDetails?.dob || ""; if (!raw) return "—"; const [y,m,d] = raw.split("-"); return y && m && d ? `${d}-${m}-${y}` : raw; })() : "—" },
              { label: "Gender", value: student.personalDetails?.gender || "—" },
              { label: "Blood Group", value: student.personalDetails?.bloodGroup || "—" },
              { label: "Father", value: student.personalDetails?.fatherName || "—" },
              { label: "Mother", value: student.personalDetails?.motherName || "—" },
              { label: "Aadhaar No.", value: student.personalDetails?.aadhaarNumber || "—" },
              { label: "Employment", value: student.personalDetails?.employmentType ? `${student.personalDetails.employmentType}${student.personalDetails.yearsOfExperience && student.personalDetails.employmentType !== "Not Employed" ? ` (${student.personalDetails.yearsOfExperience} yrs)` : ""}` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-100 shadow-sm p-3">
                <p className="text-xs text-rose-700 font-semibold mb-1">{label}</p>
                <p className="text-sm font-medium text-slate-700 leading-tight">{value}</p>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div 
            className="bg-gradient-to-r from-emerald-50 via-green-50/50 to-white border-b border-slate-200 p-3 cursor-pointer hover:bg-emerald-100/50 transition-colors"
            onClick={() => toggleSection('address')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Address</h3>
                  <p className="text-xs text-slate-500">Residential details</p>
                </div>
              </div>
              {collapsedSections.address ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
            </div>
          </div>
          {!collapsedSections.address && (
            <div className="p-4">
              <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 shadow-sm p-3">
                <p className="text-sm font-medium text-slate-700">
                  {[student.personalDetails?.address, student.personalDetails?.city, student.personalDetails?.state, student.personalDetails?.pincode].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
            </div>
            )}
        </div>

        {/* Consignment Tracking */}
        {consignmentModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingConsignment ? "Edit Consignment" : "Add Consignment"}
                  </h3>
                  <button
                    onClick={() => { setConsignmentModalOpen(false); setEditingConsignment(null); setConsignmentForm({ type: "", sent: false, trackingNumber: "", status: "In Transit", deliveryPartner: "", deliveredOn: "" }); }}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Document Type <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={consignmentForm.type}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, type: e.target.value })}
                    placeholder="e.g., Year 1 Marksheet, Semester 2 Results"
                    className={`w-full px-3 py-2 text-sm rounded-lg border outline-none ${
                      consignmentForm.type.trim()
                        ? "border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        : "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    }`}
                    required
                  />
                  {!consignmentForm.type.trim() && (
                    <p className="text-[10px] text-red-500 mt-1">Document type is required</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Delivery Partner <span className="text-red-500">*</span></label>
                  {consignmentForm.deliveryPartner === "Other" || (consignmentForm.deliveryPartner && consignmentForm.deliveryPartner !== "Delhivery" && consignmentForm.deliveryPartner !== "India Post" && consignmentForm.deliveryPartner !== "Ekart" && consignmentForm.deliveryPartner !== "BlueDart" && consignmentForm.deliveryPartner !== "DTDC" && consignmentForm.deliveryPartner !== "FedEx") ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={consignmentForm.deliveryPartner === "Other" ? "" : consignmentForm.deliveryPartner}
                        onChange={(e) => setConsignmentForm({ ...consignmentForm, deliveryPartner: e.target.value })}
                        placeholder="Enter delivery partner name"
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border outline-none ${
                          consignmentForm.deliveryPartner && consignmentForm.deliveryPartner !== "Other"
                            ? "border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                            : "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setConsignmentForm({ ...consignmentForm, deliveryPartner: "" })}
                        className="px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <select
                      value={consignmentForm.deliveryPartner}
                      onChange={(e) => setConsignmentForm({ ...consignmentForm, deliveryPartner: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-lg border outline-none ${
                        consignmentForm.deliveryPartner
                          ? "border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                          : "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      }`}
                      required
                    >
                      <option value="">Select delivery partner</option>
                      <option value="Delhivery">Delhivery</option>
                      <option value="India Post">India Post</option>
                      <option value="Ekart">Ekart</option>
                      <option value="BlueDart">BlueDart</option>
                      <option value="DTDC">DTDC</option>
                      <option value="FedEx">FedEx</option>
                      <option value="Other">Other (type custom)</option>
                    </select>
                  )}
                  {!consignmentForm.deliveryPartner && (
                    <p className="text-[10px] text-red-500 mt-1">Delivery partner is required</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConsignmentForm({ ...consignmentForm, sent: !consignmentForm.sent })}
                    disabled={savingTracking}
                    className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors overflow-hidden ${
                      consignmentForm.sent ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ease-in-out ${
                        consignmentForm.sent ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-slate-700 flex-shrink-0">
                    {consignmentForm.sent ? "Sent" : "Not Sent"}
                  </span>
                </div>
                {consignmentForm.sent && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Tracking Number <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={consignmentForm.trackingNumber}
                        onChange={(e) => setConsignmentForm({ ...consignmentForm, trackingNumber: e.target.value })}
                        placeholder="Enter Delhivery tracking number"
                        className={`w-full px-3 py-2 text-sm rounded-lg border outline-none ${
                          consignmentForm.trackingNumber.trim()
                            ? "border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                            : "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        }`}
                        required
                      />
                      {!consignmentForm.trackingNumber.trim() && (
                        <p className="text-[10px] text-red-500 mt-1">Tracking number is required when sent</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Delivery Status</label>
                      <select
                        value={consignmentForm.status}
                        onChange={(e) => setConsignmentForm({ ...consignmentForm, status: e.target.value as "In Transit" | "Delivered" | "Returned" })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                      >
                        <option value="In Transit">In Transit</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Returned">Returned</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  onClick={() => { setConsignmentModalOpen(false); setEditingConsignment(null); setConsignmentForm({ type: "", sent: false, trackingNumber: "", status: "In Transit", deliveryPartner: "", deliveredOn: "" }); }}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingConsignment) {
                      updateConsignment({
                        id: editingConsignment.id,
                        type: consignmentForm.type,
                        sent: consignmentForm.sent,
                        trackingNumber: consignmentForm.sent && consignmentForm.trackingNumber.trim() ? consignmentForm.trackingNumber : undefined,
                        status: consignmentForm.sent ? consignmentForm.status : undefined,
                        dateSent: editingConsignment.dateSent,
                        deliveryPartner: consignmentForm.deliveryPartner.trim() ? consignmentForm.deliveryPartner : undefined,
                        deliveredOn: editingConsignment.deliveredOn,
                      });
                    } else {
                      addConsignment({
                        type: consignmentForm.type,
                        sent: consignmentForm.sent,
                        trackingNumber: consignmentForm.sent && consignmentForm.trackingNumber.trim() ? consignmentForm.trackingNumber : undefined,
                        status: consignmentForm.sent ? consignmentForm.status : undefined,
                        deliveryPartner: consignmentForm.deliveryPartner.trim() ? consignmentForm.deliveryPartner : undefined,
                      });
                    }
                  }}
                  disabled={!consignmentForm.type.trim() || !consignmentForm.deliveryPartner || (consignmentForm.sent && !consignmentForm.trackingNumber.trim()) || savingTracking}
                  className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-60"
                >
                  {savingTracking ? "Saving..." : editingConsignment ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Note Modal */}
        {noteModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Add Tracking Note</h3>
                  <button
                    onClick={() => { setNoteModalOpen(false); setNoteText(""); }}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter your note..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                />
              </div>
              <div className="p-4 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  onClick={() => { setNoteModalOpen(false); setNoteText(""); }}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addTrackingNote(noteText)}
                  disabled={!noteText.trim() || savingNote}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
                >
                  {savingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Confirm Action</h3>
              </div>

              <p className="text-sm text-slate-600 mb-6">
                {confirmMessage}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConfirmModalOpen(false);
                    setConfirmCallback(null);
                  }}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmCallback?.();
                    setConfirmModalOpen(false);
                    setConfirmCallback(null);
                  }}
                  className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Modal */}
        {errorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Error</h3>
              </div>

              <p className="text-sm text-slate-600 mb-6">
                {errorMessage}
              </p>

              <button
                onClick={() => setErrorModalOpen(false)}
                className="w-full py-2.5 text-sm font-medium text-white bg-slate-600 rounded-xl hover:bg-slate-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Payments / Receipts Modal */}
        {paymentsModalOpen && student && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white rounded-t-2xl">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Payment Receipts</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{student.name} · {student.phone}</p>
                </div>
                <button onClick={() => setPaymentsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-4">
                {loadingPayments ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-red-600" /></div>
                ) : paymentsData.length === 0 ? (
                  <div className="text-center py-10">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentsData.map(payment => (
                      <div key={payment.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-mono font-semibold text-slate-700">{payment.receiptNumber}</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">₹{(payment.amountPaid || 0).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Date</p>
                            <p className="font-medium">{payment.paymentDate || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Mode</p>
                            <p className="font-medium">{payment.paymentMode || "—"}</p>
                          </div>
                          {payment.installmentNumber !== undefined && (
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Installment</p>
                              <p className="font-medium">{payment.installmentNumber} / {payment.totalInstallments || "—"}</p>
                            </div>
                          )}
                          {payment.transactionRef && (
                            <div className="col-span-2 sm:col-span-1">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ref</p>
                              <p className="font-medium font-mono">{payment.transactionRef}</p>
                            </div>
                          )}
                          {payment.balanceAmount !== undefined && (
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Balance</p>
                              <p className={`font-medium ${payment.balanceAmount <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {payment.balanceAmount <= 0 ? "Cleared" : `₹${payment.balanceAmount.toLocaleString("en-IN")}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hidden PDF Template */}
        <div ref={printRef} style={{ position: "absolute", left: "-9999px", top: 0 }}></div>

      </div>
    </div>
  );
}
