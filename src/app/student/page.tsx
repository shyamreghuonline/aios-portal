"use client";

import { useEffect, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, query, setDoc, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  Receipt, AlertTriangle, CheckCircle, CreditCard, Loader2,
  Upload, Save, Camera, Lock, Pencil, Printer, Download,
  GraduationCap, User, Building2, Mail, Phone, IdCard, Calendar,
  Users, MapPin, Briefcase, BookOpen, Award, ShieldCheck, FileText, ChevronRight, TrendingUp, X,
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Payment {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  installmentNumber: number;
  balanceAmount: number;
  description?: string;
}

interface PersonalDetails {
  photo?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadhaarNumber?: string;
  aadhaarUrl?: string;
  guardianName?: string;
  employmentType?: string;
  yearsOfExperience?: string;
}

interface AcademicLevel {
  institution?: string;
  board?: string;
  stream?: string;
  degree?: string;
  year?: string;
  percentage?: string;
  certificateUrl?: string;
}

interface AcademicDetails {
  sslc?: AcademicLevel;
  plustwo?: AcademicLevel;
  ug?: AcademicLevel;
  pg?: AcademicLevel;
  phd?: { institution?: string; topic?: string; year?: string; status?: string; certificateUrl?: string };
}

function Input({
  label, value, onChange, type = "text", options, inputMode, placeholder, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: "text" | "date" | "select"; options?: string[];
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string; disabled?: boolean;
}) {
  const cls = `w-full px-3 py-2.5 text-[14px] rounded-lg border outline-none font-medium transition-all ${
    disabled
      ? "bg-slate-50 border-slate-200 text-slate-700 cursor-default"
      : "border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white text-slate-900"
  }`;
  return (
    <div>
      <label className="block text-[13px] font-semibold text-slate-700 mb-2">{label}</label>
      {type === "select" ? (
        <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={cls}>
          <option value="">— Select —</option>
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          inputMode={inputMode} placeholder={placeholder} disabled={disabled} className={cls} />
      )}
    </div>
  );
}

function DocModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <p className="text-sm font-bold text-slate-800">View Document</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="p-4 flex items-center justify-center min-h-[200px]">
          {url.startsWith('data:application/pdf') ? (
            <embed src={url} type="application/pdf" className="w-full h-[70vh] rounded-lg" />
          ) : (
            <img src={url} alt="Document" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
          )}
        </div>
      </div>
    </div>
  );
}

function CertUpload({ level, url, uploading, onUpload, disabled }: {
  level: string; url?: string; uploading: boolean;
  onUpload: (f: File) => void; disabled?: boolean;
}) {
  const inputId = `cert-upload-${level.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="col-span-2">
      <label className="block text-[13px] font-semibold text-slate-700 mb-2">Upload Certificate / Marksheet</label>
      <label htmlFor={inputId}
        className={`w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold rounded-lg border-2 border-dashed transition-all cursor-pointer ${(uploading || disabled) ? 'opacity-50 pointer-events-none' : ''} ${
          url
            ? "border-green-500 bg-green-50 text-green-800"
            : "border-slate-300 bg-slate-50 text-slate-700 hover:border-red-400 hover:bg-red-50/30 hover:text-red-700"
        }`}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : url ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
        {uploading ? "Uploading…" : url ? "Certificate Uploaded ✓ — Click to Replace" : `Upload ${level} Certificate / Marksheet (PDF or Image)`}
      </label>
      {url && (
        <button onClick={() => setViewDocUrl(url)} className="text-[13px] font-medium text-green-700 underline mt-1 block hover:text-green-900">
          View uploaded certificate
        </button>
      )}
      <input id={inputId} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
    </div>
  );
}

const ACADEMIC_STEPS = [
  { key: "sslc",    label: "SSLC / 10th" },
  { key: "plustwo", label: "HSC / 12th" },
  { key: "ug",      label: "Under Graduate (UG)" },
  { key: "pg",      label: "Post Graduate (PG)" },
  { key: "phd",     label: "PhD / Other" },
] as const;

const YEAR_OPTIONS = Array.from({ length: 55 }, (_, i) => String(2035 - i));

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalFee, setTotalFee] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [studentId, setStudentId] = useState<string>("");
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [personal, setPersonal] = useState<PersonalDetails>({});
  const [academic, setAcademic] = useState<AcademicDetails>({});
  const [activeStep, setActiveStep] = useState(0);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savedPersonal, setSavedPersonal] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [savedAcademic, setSavedAcademic] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false);
  const [uploadingCert, setUploadingCert] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingKyc, setEditingKyc] = useState(false);
  const [editingAcademic, setEditingAcademic] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (authLoading || !user?.phone) return;
      
      // First try to use studentData from auth context
      const studentData = user.studentData as Record<string, unknown> | undefined;
      
      try {
        // Always fetch fresh data from Firestore
        const snap = await getDoc(doc(db, "students", user.phone));
        if (snap.exists()) {
          const d = snap.data();
          
          // Merge Firestore data with auth context data (Firestore takes precedence)
          const mergedData = { ...studentData, ...d };
          
          // Set all student data fields
          if (mergedData.totalFee) setTotalFee(mergedData.totalFee as number);
          if (mergedData.discountAmount) setDiscountAmount(mergedData.discountAmount as number);
          if (mergedData.studentId) setStudentId(mergedData.studentId as string);
          if (d.personalDetails) setPersonal(d.personalDetails as PersonalDetails);
          if (d.academicDetails) setAcademic(d.academicDetails as AcademicDetails);
          
          // Update auth context studentData with fresh data for other components
          if (user.studentData) {
            Object.assign(user.studentData, d);
          }
        } else {
          // No Firestore document - fallback to auth context data only
          if (studentData?.totalFee) setTotalFee(studentData.totalFee as number);
          if (studentData?.discountAmount) setDiscountAmount(studentData.discountAmount as number);
          if (studentData?.studentId) setStudentId(studentData.studentId as string);
        }
      } catch (err) {
        console.error("students fetch error:", err);
        // On error, fallback to auth context data
        if (studentData?.totalFee) setTotalFee(studentData.totalFee as number);
        if (studentData?.discountAmount) setDiscountAmount(studentData.discountAmount as number);
        if (studentData?.studentId) setStudentId(studentData.studentId as string);
      }

      try {
        const q = query(collection(db, "payments"), where("studentPhone", "==", user.phone), orderBy("createdAt", "desc"));
        const pSnap = await getDocs(q);
        let paid = 0;
        const list: Payment[] = [];
        pSnap.forEach(d => {
          const data = d.data();
          paid += parseFloat(data.amountPaid || "0");
          list.push({ id: d.id, ...data } as unknown as Payment);
        });
        setPayments(list);
        setTotalPaid(paid);
      } catch (err) {
        console.error("payments fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, authLoading]);

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

  async function handlePhotoUpload(file: File) {
    if (!user?.phone) return;
    setUploadingPhoto(true); setUploadError(null);
    try {
      const photoUrl = await uploadToBase64(file);
      setPersonal(p => ({ ...p, photo: photoUrl }));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const msg = raw === "FILE_TOO_LARGE" ? "Photo is too large. Please use an image under 500 KB." : "Photo upload failed. Please try again with a smaller image.";
      setUploadError(msg);
      console.error("Photo upload error:", e);
    } finally { setUploadingPhoto(false); }
  }

  async function handleAadhaarUpload(file: File) {
    if (!user?.phone) return;
    setUploadingAadhaar(true); setUploadError(null);
    try {
      const aadhaarUrl = await uploadToBase64(file);
      setPersonal(p => ({ ...p, aadhaarUrl }));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const msg = raw === "FILE_TOO_LARGE" ? "Document is too large. Please use a file under 500 KB." : "Aadhaar upload failed. Please try again with a smaller file.";
      setUploadError(msg);
      console.error("Aadhaar upload error:", e);
    } finally { setUploadingAadhaar(false); }
  }

  async function handleCertUpload(level: string, file: File) {
    if (!user?.phone) return;
    setUploadingCert(u => ({ ...u, [level]: true })); setUploadError(null);
    try {
      const url = await uploadToBase64(file);
      if (level === "phd") {
        setAcademic(a => ({ ...a, phd: { ...a.phd, certificateUrl: url } }));
      } else {
        const lvl = level as keyof Omit<AcademicDetails, "phd">;
        setAcademic(a => ({ ...a, [lvl]: { ...a[lvl], certificateUrl: url } }));
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const msg = raw === "FILE_TOO_LARGE" ? "Certificate is too large. Please use a file under 500 KB." : "Certificate upload failed. Please try again with a smaller file.";
      setUploadError(msg);
      console.error("Cert upload error:", e);
    } finally { setUploadingCert(u => ({ ...u, [level]: false })); }
  }

  async function savePersonal() {
    if (!user?.phone) return;
    const required: { key: keyof PersonalDetails; label: string }[] = [
      { key: "dob", label: "Date of Birth" },
      { key: "gender", label: "Gender" },
      { key: "bloodGroup", label: "Blood Group" },
      { key: "aadhaarNumber", label: "Aadhaar Number" },
      { key: "fatherName", label: "Father's Name" },
      { key: "motherName", label: "Mother's Name" },
      { key: "address", label: "Street / Locality" },
      { key: "city", label: "City / District" },
      { key: "state", label: "State" },
      { key: "pincode", label: "Pincode" },
      { key: "employmentType", label: "Employment Type" },
    ];
    const missing = required.filter(f => !personal[f.key]);
    if (missing.length > 0) {
      alert(`Please fill in: ${missing.map(f => f.label).join(", ")}`);
      return;
    }
    if (personal.employmentType && personal.employmentType !== "Not Employed" && !personal.yearsOfExperience) {
      alert("Please fill in: Years of Experience");
      return;
    }
    setSavingPersonal(true);
    try {
      await setDoc(doc(db, "students", user.phone), { personalDetails: personal }, { merge: true });
      setSavedPersonal(true);
      setEditingKyc(false);
      setTimeout(() => setSavedPersonal(false), 2500);
    } finally { setSavingPersonal(false); }
  }

  async function saveAcademic() {
    if (!user?.phone) return;
    setSavingAcademic(true);
    try {
      await setDoc(doc(db, "students", user.phone), { academicDetails: academic }, { merge: true });
      setSavedAcademic(true);
      setEditingAcademic(false);
      setTimeout(() => setSavedAcademic(false), 2500);
    } finally { setSavingAcademic(false); }
  }

  async function generatePDF() {
    if (!printRef.current) return;
    setGeneratingPDF(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`AIOS_${sd.studentId}_Admission.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  }

  const up = (k: keyof PersonalDetails, v: string) => setPersonal(p => ({ ...p, [k]: v }));
  const upAc = (lvl: keyof Omit<AcademicDetails, "phd">, k: string, v: string) =>
    setAcademic(a => ({ ...a, [lvl]: { ...a[lvl], [k]: v } }));
  const upPhd = (k: string, v: string) => setAcademic(a => ({ ...a, phd: { ...a.phd, [k]: v } }));

  const sd = (user?.studentData || {}) as Record<string, unknown>;
  const canEdit = sd.profileEditEnabled !== false;
  const name = (sd.name as string) || "Student";
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const effectiveFee = totalFee - discountAmount;
  const balance = totalFee - totalPaid;
  const progressPercent = effectiveFee > 0 ? Math.min(100, (totalPaid / effectiveFee) * 100) : 0;

  return (
    <div className="pb-24 lg:pb-6">

      {/* ══ TOP IDENTITY BANNER ══ */}
      <div className="gradient-bg -mx-4 -mt-6 px-6 py-4 mb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-xl border-2 border-white/40 overflow-hidden bg-white/20 flex items-center justify-center shadow-lg">
                {personal.photo
                  ? <img src={personal.photo} alt="Photo" className="w-full h-full object-cover" />
                  : <span className="text-lg font-extrabold text-white">{initials}</span>}
              </div>
              {canEdit && (
                <label htmlFor="student-photo-upload"
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow border border-slate-200 cursor-pointer ${uploadingPhoto ? 'opacity-50' : ''}`}
                  title="Change photo">
                  {uploadingPhoto ? <Loader2 className="w-2.5 h-2.5 text-red-600 animate-spin" /> : <Camera className="w-2.5 h-2.5 text-red-600" />}
                </label>
              )}
              <input id="student-photo-upload" ref={photoRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Welcome Back</p>
              <h1 className="text-lg font-extrabold text-white leading-tight">{name}</h1>
              <p className="text-xs text-white/70 mt-0.5">
                {(sd.course as string) || ""}
                {sd.stream ? ` | ${sd.stream}` : ""}
                {sd.university ? ` · ${sd.university}` : ""}
              </p>
              {studentId && (
                <p className="text-[10px] font-mono text-white/80 mt-0.5">ID: {studentId}</p>
              )}
            </div>
          </div>
          {/* Header Action Buttons */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link
              href="/student/pay"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-white/15 border border-white/30 rounded-lg hover:bg-white/25 transition-colors backdrop-blur-sm"
              title="Make Payment"
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Pay</span>
            </Link>
            <Link
              href="/student/payments"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-white/15 border border-white/30 rounded-lg hover:bg-white/25 transition-colors backdrop-blur-sm"
              title="View Receipts"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Receipts</span>
            </Link>
            {(personal.aadhaarNumber || academic.sslc?.institution) && (
              <button
                onClick={generatePDF}
                disabled={generatingPDF}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-white rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 shadow-sm"
                title="Print Admission Form"
              >
                {generatingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                <span className="hidden sm:inline">{generatingPDF ? "Generating..." : "Print Form"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upload error banner */}
      {uploadError && (
        <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-start gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-700">Upload Failed</p>
            <p className="text-red-700 mt-0.5 font-medium">{uploadError}</p>
          </div>
          <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-700 font-bold text-sm leading-none">✕</button>
        </div>
      )}

      {/* ══ PROFILE SECTIONS ══ */}
      <div className="w-full">
        <div className="space-y-4 min-w-0">

          {/* SECTION 1: Enrollment Details */}
          <section className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
            <header className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-red-50 via-rose-50 to-white">
              <span className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
                <GraduationCap className="w-5 h-5 text-white" />
              </span>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-slate-900">Enrollment Details</h2>
                <p className="text-xs text-slate-500">Your academic enrollment information</p>
              </div>
              <span className="text-xs font-semibold bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            </header>
            <div className="p-5 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
              {/* LEFT: Student Photo Card */}
              <div className="flex flex-col items-center">
                <div className="w-full aspect-[3/4] max-w-[200px] rounded-xl border-2 border-slate-200 overflow-hidden bg-gradient-to-b from-rose-50 to-white flex items-center justify-center shadow-sm">
                  {personal.photo ? (
                    <img src={personal.photo} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <Camera className="w-10 h-10 text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">No photo uploaded</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 w-full text-center">
                  <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
                  {canEdit && (
                    <button
                      onClick={() => photoRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                    >
                      {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      {uploadingPhoto ? "Uploading…" : personal.photo ? "Change Photo" : "Upload Photo"}
                    </button>
                  )}
                </div>
              </div>

              {/* RIGHT: Enrollment Fields + Notice */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
                  {[
                    { icon: User, label: "Full Name", value: (sd.name as string) || "", tint: "from-rose-50 to-white", iconColor: "text-rose-600", ring: "border-rose-100" },
                    { icon: BookOpen, label: "Course Enrolled", value: (sd.course as string) || "", tint: "from-red-50 to-white", iconColor: "text-red-600", ring: "border-red-100" },
                    { icon: Award, label: "Stream / Specialization", value: (sd.stream as string) || "", tint: "from-amber-50 to-white", iconColor: "text-amber-600", ring: "border-amber-100" },
                    { icon: Building2, label: "Faculty / Department", value: (sd.faculty as string) || "", tint: "from-purple-50 to-white", iconColor: "text-purple-600", ring: "border-purple-100" },
                    { icon: Building2, label: "University", value: (sd.university as string) || "", tint: "from-indigo-50 to-white", iconColor: "text-indigo-600", ring: "border-indigo-100" },
                    { icon: Calendar, label: "Academic Year", value: `${sd.startYear || ""}${sd.endYear ? ` – ${sd.endYear}` : ""}`, tint: "from-sky-50 to-white", iconColor: "text-sky-600", ring: "border-sky-100" },
                    { icon: Mail, label: "Contact Email", value: (sd.email as string) || "", tint: "from-teal-50 to-white", iconColor: "text-teal-600", ring: "border-teal-100" },
                    { icon: Phone, label: "Contact Number", value: user?.phone || "", tint: "from-emerald-50 to-white", iconColor: "text-emerald-600", ring: "border-emerald-100" },
                    { icon: IdCard, label: "Enrollment ID", value: (sd.studentId as string) || "—", tint: "from-slate-50 to-white", iconColor: "text-slate-700", ring: "border-slate-200" },
                  ].map(({ icon: Icon, label, value, tint, iconColor, ring }) => (
                    <div key={label} className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br ${tint} border ${ring} hover:shadow-sm transition-all`} title="Managed by admin">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-red-700 mb-0.5">{label}</p>
                        <p className="text-sm font-normal text-slate-800 truncate">{value || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Admin-Managed Notice */}
                <div className="mt-auto flex items-start gap-3 p-3.5 rounded-xl bg-white border border-blue-200 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Read-only Information
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      These enrollment details are managed by the administration office. If any of the information above is incorrect or needs to be updated, please <a href={`https://wa.me/917411133333?text=${encodeURIComponent(`Hello, I am ${name || "a student"} (Enrollment ID: ${(sd.studentId as string) || "N/A"}). I need to request a correction/update in my enrollment details on the AIOS portal. Please assist.`)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline hover:text-blue-900">contact the admin</a> for assistance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Personal Information */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <header className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-red-50 via-rose-50 to-white">
              <span className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
                <User className="w-5 h-5 text-white" />
              </span>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-slate-900">Personal Information</h2>
                <p className="text-xs text-slate-500">Personal, family, address & employment details</p>
              </div>
              {!canEdit && <Lock className="w-4 h-4 text-slate-500" />}
              {canEdit && (
                editingKyc ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingKyc(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={savePersonal} disabled={savingPersonal}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white gradient-bg rounded-lg hover:shadow-md transition-all disabled:opacity-60">
                      {savingPersonal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedPersonal ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      {savingPersonal ? "Saving…" : savedPersonal ? "Saved!" : "Save Changes"}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingKyc(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-red-200 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )
              )}
            </header>
            {/* VIEW MODE */}
            {!editingKyc ? (
              <div className="p-5">
                {/* Table 1: Basic Details - Matching Enrollment Details Style */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-blue-500 rounded-full" />
                    <User className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">Basic Details</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[
                      { icon: Calendar, label: "Date of Birth", value: personal.dob || "—", tint: "from-rose-50 to-white", iconColor: "text-rose-600", ring: "border-rose-100" },
                      { icon: User, label: "Gender", value: personal.gender || "—", tint: "from-red-50 to-white", iconColor: "text-red-600", ring: "border-red-100" },
                      { icon: Award, label: "Blood Group", value: personal.bloodGroup || "—", tint: "from-amber-50 to-white", iconColor: "text-amber-600", ring: "border-amber-100" },
                      { icon: Users, label: "Father's Name", value: personal.fatherName || "—", tint: "from-blue-50 to-white", iconColor: "text-blue-600", ring: "border-blue-100" },
                      { icon: Users, label: "Mother's Name", value: personal.motherName || "—", tint: "from-indigo-50 to-white", iconColor: "text-indigo-600", ring: "border-indigo-100" },
                      { icon: Briefcase, label: "Employment", value: personal.employmentType ? `${personal.employmentType}${personal.yearsOfExperience && personal.employmentType !== "Not Employed" ? ` (${personal.yearsOfExperience} yrs)` : ""}` : "—", tint: "from-amber-50 to-white", iconColor: "text-amber-600", ring: "border-amber-100" },
                      { icon: IdCard, label: "Aadhaar", value: personal.aadhaarNumber || "—", tint: "from-slate-50 to-white", iconColor: "text-slate-700", ring: "border-slate-200", docUrl: personal.aadhaarUrl },
                    ].map(({ icon: Icon, label, value, tint, iconColor, ring, docUrl }) => (
                      <div key={label} className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br ${tint} border ${ring} hover:shadow-sm transition-all`}>
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Icon className={`w-4 h-4 ${iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-red-700 mb-0.5">{label}</p>
                          <p className="text-sm font-normal text-slate-800 truncate">{value}</p>
                          {docUrl && (
                            <button 
                              onClick={() => setViewDocUrl(docUrl)} 
                              className="text-xs font-medium text-red-600 hover:text-red-700 underline mt-1"
                            >
                              View Document
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Table 2: Address */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-800">Address</h3>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 hover:shadow-sm transition-all">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-emerald-700 mb-0.5">Full Address</p>
                      <p className="text-sm font-normal text-slate-800">
                        {personal.address || "—"}
                        {personal.city && `, ${personal.city}`}
                        {personal.state && `, ${personal.state}`}
                        {personal.pincode && ` — ${personal.pincode}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <div className="p-5 sm:p-6 bg-slate-50/50 space-y-6">
                {/* Section 1: Basic Details - All merged */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-blue-500 rounded-full" />
                    <User className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">Basic Details</h3>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Date of Birth <span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          value={personal.dob || ""} 
                          onChange={e => up("dob", e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Gender <span className="text-red-500">*</span></label>
                        <select 
                          value={personal.gender || ""} 
                          onChange={e => up("gender", e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
                        >
                          <option value="">— Select —</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Blood Group <span className="text-red-500">*</span></label>
                        <select 
                          value={personal.bloodGroup || ""} 
                          onChange={e => up("bloodGroup", e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
                        >
                          <option value="">— Select —</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Aadhaar Number <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={personal.aadhaarNumber || ""}
                          onChange={e => up("aadhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
                          placeholder="XXXX XXXX XXXX"
                          inputMode="numeric"
                          disabled={!canEdit}
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Father&apos;s Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={personal.fatherName || ""}
                          onChange={e => up("fatherName", e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Mother&apos;s Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={personal.motherName || ""}
                          onChange={e => up("motherName", e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Employment Type <span className="text-red-500">*</span></label>
                        <select 
                          value={personal.employmentType || ""} 
                          onChange={e => { up("employmentType", e.target.value); if (e.target.value === "Not Employed") up("yearsOfExperience", ""); }}
                          disabled={!canEdit}
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
                        >
                          <option value="">— Select —</option>
                          <option value="Not Employed">Not Employed</option>
                          <option value="Government">Government</option>
                          <option value="Private">Private</option>
                          <option value="Self Employed">Self Employed</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                      {personal.employmentType && personal.employmentType !== "Not Employed" && (
                        <div>
                          <label className="block text-[13px] font-semibold text-slate-700 mb-2">Years of Experience <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={personal.yearsOfExperience || ""}
                            onChange={e => up("yearsOfExperience", e.target.value.replace(/\D/g, "").slice(0, 2))}
                            inputMode="numeric"
                            placeholder="e.g., 5"
                            disabled={!canEdit}
                            className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">Aadhaar Card <span className="text-red-500">*</span></label>
                      <div className="flex items-center gap-3">
                        <label 
                          htmlFor="student-aadhaar-upload"
                          className={`inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-lg border-2 transition-all cursor-pointer ${
                            (uploadingAadhaar || !canEdit) ? 'opacity-50 pointer-events-none' : ''
                          } ${
                            personal.aadhaarUrl 
                              ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100" 
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                          }`}
                        >
                          {uploadingAadhaar ? <Loader2 className="w-4 h-4 animate-spin" /> : personal.aadhaarUrl ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                          {uploadingAadhaar ? "Uploading…" : personal.aadhaarUrl ? "Document Uploaded" : "Upload Aadhaar"}
                        </label>
                        {personal.aadhaarUrl && (
                          <button 
                            onClick={() => setViewDocUrl(personal.aadhaarUrl!)} 
                            className="text-[13px] font-semibold text-red-600 hover:text-red-700 underline"
                          >
                            View Document
                          </button>
                        )}
                      </div>
                      <input id="student-aadhaar-upload" ref={aadhaarRef} type="file" accept="image/*,application/pdf" className="hidden"
                        onChange={e => e.target.files?.[0] && handleAadhaarUpload(e.target.files[0])} />
                    </div>
                  </div>
                </div>

                {/* Section 2: Address */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-800">Address</h3>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">Street / Locality <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        value={personal.address || ""}
                        onChange={e => up("address", e.target.value)}
                        placeholder="Enter full address"
                        disabled={!canEdit}
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">City <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={personal.city || ""}
                          onChange={e => up("city", e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">State <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={personal.state || ""}
                          onChange={e => up("state", e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Pincode <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={personal.pincode || ""}
                          onChange={e => up("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          inputMode="numeric"
                          placeholder="6-digit code"
                          disabled={!canEdit}
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Save/Cancel buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button 
                    onClick={() => setEditingKyc(false)}
                    className="px-6 py-2.5 text-[14px] font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={savePersonal} 
                    disabled={savingPersonal}
                    className="px-8 py-2.5 text-[14px] font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:shadow-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {savingPersonal ? <Loader2 className="w-4 h-4 animate-spin" /> : savedPersonal ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {savingPersonal ? "Saving…" : savedPersonal ? "Saved!" : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: Academic Background Form */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <header className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-red-50 via-rose-50 to-white">
              <span className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
                <BookOpen className="w-5 h-5 text-white" />
              </span>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-slate-900">Academic Background</h2>
                <p className="text-xs text-slate-500">Your qualifications and uploaded certificates</p>
              </div>
              {!canEdit && <Lock className="w-4 h-4 text-slate-500" />}
              {canEdit && (
                editingAcademic ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingAcademic(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={saveAcademic} disabled={savingAcademic}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white gradient-bg rounded-lg hover:shadow-md transition-all disabled:opacity-60">
                      {savingAcademic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedAcademic ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      {savingAcademic ? "Saving…" : savedAcademic ? "Saved!" : "Save Changes"}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingAcademic(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-red-200 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )
              )}
            </header>
            {/* Academic VIEW MODE */}
            {!editingAcademic ? (
              <div className="p-5 space-y-6">
                {([
                  { key: "sslc" as const, label: "SSLC / 10th", color: "rose", iconColor: "text-rose-600", ring: "border-rose-100", tint: "from-rose-50 to-white", bar: "bg-rose-500" },
                  { key: "plustwo" as const, label: "HSC / 12th", color: "amber", iconColor: "text-amber-600", ring: "border-amber-100", tint: "from-amber-50 to-white", bar: "bg-amber-500" },
                  { key: "ug" as const, label: "Under Graduate (UG)", color: "blue", iconColor: "text-blue-600", ring: "border-blue-100", tint: "from-blue-50 to-white", bar: "bg-blue-500" },
                  { key: "pg" as const, label: "Post Graduate (PG)", color: "indigo", iconColor: "text-indigo-600", ring: "border-indigo-100", tint: "from-indigo-50 to-white", bar: "bg-indigo-500" },
                ]).map(({ key: lvl, label, iconColor, ring, tint, bar }) => {
                  const d = academic[lvl];
                  if (!d?.institution) return null;
                  return (
                    <div key={lvl}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-1 h-5 ${bar} rounded-full`} />
                        <GraduationCap className={`w-4 h-4 ${iconColor}`} />
                        <h3 className="text-sm font-bold text-slate-800">{label}</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {[
                          { icon: Building2, label: "Institution", value: d.institution || "—", tint, iconColor, ring },
                          { icon: Award, label: "Board / University", value: d.board || "—", tint, iconColor, ring },
                          { icon: BookOpen, label: d.stream ? "Stream" : "Degree", value: d.stream || d.degree || "—", tint, iconColor, ring },
                          { icon: Calendar, label: "Year of Passing", value: d.year || "—", tint, iconColor, ring },
                          { icon: TrendingUp, label: "Percentage / CGPA", value: d.percentage || "—", tint, iconColor, ring },
                        ].map(({ icon: Icon, label: fLabel, value: fValue, tint: fTint, iconColor: fIconColor, ring: fRing }) => (
                          <div key={fLabel} className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br ${fTint} border ${fRing} hover:shadow-sm transition-all`}>
                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <Icon className={`w-4 h-4 ${fIconColor}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-red-700 mb-0.5">{fLabel}</p>
                              <p className="text-sm font-normal text-slate-800 truncate">{fValue}</p>
                            </div>
                          </div>
                        ))}
                        {/* Certificate Status */}
                        <div className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br ${tint} border ${ring} hover:shadow-sm transition-all`}>
                          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                            {d.certificateUrl ? <CheckCircle className={`w-4 h-4 ${iconColor}`} /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-red-700 mb-0.5">Certificate</p>
                            {d.certificateUrl ? (
                              <button onClick={() => setViewDocUrl(d.certificateUrl!)} className="text-sm font-normal text-blue-700 underline hover:text-blue-900">
                                View Certificate
                              </button>
                            ) : (
                              <p className="text-sm font-normal text-slate-400">Not Uploaded</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* PhD / Research */}
                {academic.phd?.institution && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-purple-500 rounded-full" />
                      <GraduationCap className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-bold text-slate-800">PhD / Research / Other</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {[
                        { icon: Building2, label: "Institution", value: academic.phd.institution || "—", tint: "from-purple-50 to-white", iconColor: "text-purple-600", ring: "border-purple-100" },
                        { icon: BookOpen, label: "Research Topic", value: academic.phd.topic || "—", tint: "from-purple-50 to-white", iconColor: "text-purple-600", ring: "border-purple-100" },
                        { icon: Calendar, label: "Year", value: academic.phd.year || "—", tint: "from-purple-50 to-white", iconColor: "text-purple-600", ring: "border-purple-100" },
                        { icon: ShieldCheck, label: "Status", value: academic.phd.status || "—", tint: "from-purple-50 to-white", iconColor: "text-purple-600", ring: "border-purple-100" },
                      ].map(({ icon: Icon, label, value, tint: fTint, iconColor: fIconColor, ring: fRing }) => (
                        <div key={label} className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br ${fTint} border ${fRing} hover:shadow-sm transition-all`}>
                          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Icon className={`w-4 h-4 ${fIconColor}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-red-700 mb-0.5">{label}</p>
                            <p className="text-sm font-normal text-slate-800 truncate">{value}</p>
                          </div>
                        </div>
                      ))}
                      {/* Certificate */}
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 hover:shadow-sm transition-all">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                          {academic.phd.certificateUrl ? <CheckCircle className="w-4 h-4 text-purple-600" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-red-700 mb-0.5">Certificate</p>
                          {academic.phd.certificateUrl ? (
                            <button onClick={() => setViewDocUrl(academic.phd!.certificateUrl!)} className="text-sm font-normal text-blue-700 underline hover:text-blue-900">
                              View Certificate
                            </button>
                          ) : (
                            <p className="text-sm font-normal text-slate-400">Not Uploaded</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!academic.sslc?.institution && !academic.plustwo?.institution && !academic.ug?.institution && !academic.pg?.institution && !academic.phd?.institution && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <GraduationCap className="w-10 h-10 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-500">No academic details added yet.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Academic EDIT MODE */
              <>
                <div className="flex border-b border-slate-200 overflow-x-auto">
                  {ACADEMIC_STEPS.map((step, i) => (
                    <button key={step.key} onClick={() => setActiveStep(i)}
                      className={`flex-shrink-0 px-5 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                        activeStep === i
                          ? "border-red-600 text-red-600 bg-red-50/40"
                          : "border-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                      }`}>
                      {step.label}
                    </button>
                  ))}
                </div>
                <div className="p-5 sm:p-6 bg-slate-50/50 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                  {activeStep === 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-2"><Input label="Institution Name" value={academic.sslc?.institution || ""} onChange={v => upAc("sslc", "institution", v)} disabled={!canEdit} /></div>
                      <Input label="Board / University" value={academic.sslc?.board || ""} onChange={v => upAc("sslc", "board", v)} disabled={!canEdit} />
                      <Input label="Year of Passing" type="select" value={academic.sslc?.year || ""} onChange={v => upAc("sslc", "year", v)} options={YEAR_OPTIONS} disabled={!canEdit} />
                      <Input label="Percentage / CGPA" value={academic.sslc?.percentage || ""} onChange={v => upAc("sslc", "percentage", v)} inputMode="decimal" disabled={!canEdit} />
                      <CertUpload level="SSLC / 10th" url={academic.sslc?.certificateUrl}
                        uploading={!!uploadingCert.sslc} onUpload={f => handleCertUpload("sslc", f)} disabled={!canEdit} />
                    </div>
                  )}
                  {activeStep === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-2"><Input label="Institution Name" value={academic.plustwo?.institution || ""} onChange={v => upAc("plustwo", "institution", v)} disabled={!canEdit} /></div>
                      <Input label="Board / University" value={academic.plustwo?.board || ""} onChange={v => upAc("plustwo", "board", v)} disabled={!canEdit} />
                      <Input label="Stream" type="select" value={academic.plustwo?.stream || ""} onChange={v => upAc("plustwo", "stream", v)}
                        options={["Science (Bio)", "Science (Maths)", "Commerce", "Arts / Humanities", "Vocational", "Other"]} disabled={!canEdit} />
                      <Input label="Year of Passing" type="select" value={academic.plustwo?.year || ""} onChange={v => upAc("plustwo", "year", v)} options={YEAR_OPTIONS} disabled={!canEdit} />
                      <Input label="Percentage / CGPA" value={academic.plustwo?.percentage || ""} onChange={v => upAc("plustwo", "percentage", v)} inputMode="decimal" disabled={!canEdit} />
                      <CertUpload level="HSC / 12th" url={academic.plustwo?.certificateUrl}
                        uploading={!!uploadingCert.plustwo} onUpload={f => handleCertUpload("plustwo", f)} disabled={!canEdit} />
                    </div>
                  )}
                  {activeStep === 2 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-2"><Input label="Institution Name" value={academic.ug?.institution || ""} onChange={v => upAc("ug", "institution", v)} disabled={!canEdit} /></div>
                      <Input label="Board / University" value={academic.ug?.board || ""} onChange={v => upAc("ug", "board", v)} disabled={!canEdit} />
                      <Input label="Degree (e.g. B.Com, B.Sc)" value={academic.ug?.degree || ""} onChange={v => upAc("ug", "degree", v)} disabled={!canEdit} />
                      <Input label="Year of Passing" type="select" value={academic.ug?.year || ""} onChange={v => upAc("ug", "year", v)} options={YEAR_OPTIONS} disabled={!canEdit} />
                      <Input label="Percentage / CGPA" value={academic.ug?.percentage || ""} onChange={v => upAc("ug", "percentage", v)} inputMode="decimal" disabled={!canEdit} />
                      <CertUpload level="UG Degree" url={academic.ug?.certificateUrl}
                        uploading={!!uploadingCert.ug} onUpload={f => handleCertUpload("ug", f)} disabled={!canEdit} />
                    </div>
                  )}
                  {activeStep === 3 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-2"><Input label="Institution Name" value={academic.pg?.institution || ""} onChange={v => upAc("pg", "institution", v)} disabled={!canEdit} /></div>
                      <Input label="Board / University" value={academic.pg?.board || ""} onChange={v => upAc("pg", "board", v)} disabled={!canEdit} />
                      <Input label="Degree (e.g. M.Com, MBA)" value={academic.pg?.degree || ""} onChange={v => upAc("pg", "degree", v)} disabled={!canEdit} />
                      <Input label="Year of Passing" type="select" value={academic.pg?.year || ""} onChange={v => upAc("pg", "year", v)} options={YEAR_OPTIONS} disabled={!canEdit} />
                      <Input label="Percentage / CGPA" value={academic.pg?.percentage || ""} onChange={v => upAc("pg", "percentage", v)} inputMode="decimal" disabled={!canEdit} />
                      <CertUpload level="PG Degree" url={academic.pg?.certificateUrl}
                        uploading={!!uploadingCert.pg} onUpload={f => handleCertUpload("pg", f)} disabled={!canEdit} />
                    </div>
                  )}
                  {activeStep === 4 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-2"><Input label="Institution / University" value={academic.phd?.institution || ""} onChange={v => upPhd("institution", v)} disabled={!canEdit} /></div>
                      <div className="col-span-2"><Input label="Research Topic / Thesis Title" value={academic.phd?.topic || ""} onChange={v => upPhd("topic", v)} disabled={!canEdit} /></div>
                      <Input label="Year of Registration" type="select" value={academic.phd?.year || ""} onChange={v => upPhd("year", v)} options={YEAR_OPTIONS} disabled={!canEdit} />
                      <Input label="Current Status" type="select" value={academic.phd?.status || ""} onChange={v => upPhd("status", v)}
                        options={["Ongoing", "Submitted", "Awarded"]} disabled={!canEdit} />
                      <CertUpload level="PhD / Research" url={academic.phd?.certificateUrl}
                        uploading={!!uploadingCert.phd} onUpload={f => handleCertUpload("phd", f)} disabled={!canEdit} />
                    </div>
                  )}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditingAcademic(false)}
                      className="px-4 py-2.5 text-[13px] font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={saveAcademic} disabled={savingAcademic}
                      className="flex-1 py-2.5 text-[13px] font-semibold text-white rounded-lg gradient-bg flex items-center justify-center gap-2 disabled:opacity-60">
                      {savingAcademic ? <Loader2 className="w-4 h-4 animate-spin" /> : savedAcademic ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {savingAcademic ? "Saving\u2026" : savedAcademic ? "Saved Successfully" : "Save Academic Details"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

        </div>
      </div>

      {/* Hidden Print Form for PDF Generation */}
      <div ref={printRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div style={{ backgroundColor: '#ffffff', padding: '20px 24px', width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }}>
          {/* Header with Emblem Left, Details Right */}
          <div style={{ border: '2px solid #dc2626', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', padding: '12px' }}>
              {/* Left: Emblem */}
              <div style={{ flexShrink: 0, marginRight: '16px' }}>
                <img src="/emblem.png" alt="Emblem" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
              </div>
              {/* Center: Institute Name */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#b91c1c', margin: 0, lineHeight: 1.2 }}>AIOS Institute of Advanced Management</h1>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', margin: '4px 0', lineHeight: 1.2 }}>& Technology Pvt. Ltd</h2>
                <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0' }}>An ISO 9001:2015 Certified Organisation</p>
                <p style={{ fontSize: '10px', color: '#334155', margin: '2px 0' }}>Phone: 0481 291 9090, +91 62829 69090 | Email: institute.aios@gmail.com</p>
                <p style={{ fontSize: '10px', color: '#334155', margin: '2px 0' }}>www.aiosinstitute.com | 2nd Floor, Vishnu Arcade, Maruthi Nagar Main Road, Bangalore, Karnataka, India</p>
              </div>
            </div>
          </div>

          {/* Application Title - Compact */}
          <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #dc2626', paddingBottom: '6px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
              ADMISSION FORM
            </h3>
            <p style={{ fontSize: '10px', color: '#555555', margin: '2px 0 0 0' }}>Student Admission - Academic Year 2024-2025</p>
          </div>

          {/* Photo + Enrollment Details - Side by Side Aligned */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'stretch' }}>
            {/* Photo Box - Left Side */}
            <div style={{ width: '110px', minHeight: '130px', border: '2px solid #333333', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexShrink: 0 }}>
              {personal.photo ? (
                <img src={personal.photo} alt="Student Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div>
                  <span style={{ fontSize: '8px', color: '#666666', display: 'block' }}>Affix</span>
                  <span style={{ fontSize: '8px', color: '#666666', display: 'block' }}>Recent</span>
                  <span style={{ fontSize: '8px', color: '#666666', display: 'block' }}>Photo</span>
                </div>
              )}
            </div>

            {/* Enrollment Details - Right Side */}
            <div style={{ flex: 1, border: '2px solid #dc2626', display: 'flex', flexDirection: 'column' }}>
              <div style={{ backgroundColor: '#dc2626', padding: '5px 10px', textAlign: 'center' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffffff', margin: 0, textTransform: 'uppercase' }}>Enrollment Details</h4>
              </div>
              <div style={{ padding: '6px', backgroundColor: '#fef2f2', flex: 1 }}>
                <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'separate', borderSpacing: '0 3px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '20%', padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>University</td>
                      <td style={{ width: '30%', padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{(sd.university as string) || "MG University"}</td>
                      <td style={{ width: '20%', padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Faculty</td>
                      <td style={{ width: '30%', padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{(sd.faculty as string) || "—"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Course</td>
                      <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{(sd.course as string) || "—"}</td>
                      <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Stream</td>
                      <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{(sd.stream as string) || "—"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Duration</td>
                      <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{sd.duration ? `${sd.duration} Years` : "—"}</td>
                      <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Academic Year</td>
                      <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{sd.startYear ? `${sd.startYear}-${sd.endYear}` : "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Personal Information - Same Style as Enrollment */}
          <div style={{ marginBottom: '10px', border: '1px solid #dc2626' }}>
            <div style={{ backgroundColor: '#dc2626', padding: '5px 10px', textAlign: 'center' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffffff', margin: 0, textTransform: 'uppercase' }}>Personal Information</h4>
            </div>
            <div style={{ padding: '6px', backgroundColor: '#fef2f2' }}>
              <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'separate', borderSpacing: '0 3px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '20%', padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Full Name</td>
                    <td style={{ width: '30%', padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{(sd.name as string) || "—"}</td>
                    <td style={{ width: '20%', padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Date of Birth</td>
                    <td style={{ width: '30%', padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{personal.dob || "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Gender</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{personal.gender || "—"}</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Blood Group</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{personal.bloodGroup || "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Father's Name</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{personal.fatherName || "—"}</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Mother's Name</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{personal.motherName || "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Aadhaar No</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0', fontFamily: 'monospace' }}>{personal.aadhaarNumber || "—"}</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Employment</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{personal.employmentType ? `${personal.employmentType}${personal.yearsOfExperience && personal.employmentType !== "Not Employed" ? ` (${personal.yearsOfExperience} yrs)` : ""}` : "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Contact</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{user?.phone || "—"}</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Email</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{(sd.email as string) || "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Address</td>
                    <td colSpan={3} style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>
                      {[personal.address, personal.city, personal.state, personal.pincode].filter(Boolean).join(", ") || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic Details Section */}
          {(academic.sslc?.institution || academic.plustwo?.institution || academic.ug?.institution || academic.pg?.institution) && (
            <div style={{ marginBottom: '16px', border: '1px solid #dc2626' }}>
              <div style={{ backgroundColor: '#dc2626', padding: '6px 12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>ACADEMIC DETAILS</h4>
              </div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fef2f2' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 'bold', color: '#b91c1c', border: '1px solid #fecaca', textAlign: 'left', width: '20%' }}>Qualification</th>
                    <th style={{ padding: '6px 8px', fontWeight: 'bold', color: '#b91c1c', border: '1px solid #fecaca', textAlign: 'left', width: '30%' }}>Institution / University</th>
                    <th style={{ padding: '6px 8px', fontWeight: 'bold', color: '#b91c1c', border: '1px solid #fecaca', textAlign: 'left', width: '20%' }}>Board / Stream</th>
                    <th style={{ padding: '6px 8px', fontWeight: 'bold', color: '#b91c1c', border: '1px solid #fecaca', textAlign: 'left', width: '15%' }}>Year</th>
                    <th style={{ padding: '6px 8px', fontWeight: 'bold', color: '#b91c1c', border: '1px solid #fecaca', textAlign: 'left', width: '15%' }}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {academic.sslc?.institution && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: '#334155', border: '1px solid #e2e8f0' }}>SSLC / 10th</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.sslc.institution}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.sslc.board || "—"}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.sslc.year || "—"}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.sslc.percentage || "—"}</td>
                    </tr>
                  )}
                  {academic.plustwo?.institution && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: '#334155', border: '1px solid #e2e8f0' }}>HSC / 12th</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.plustwo.institution}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.plustwo.stream || academic.plustwo.board || "—"}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.plustwo.year || "—"}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.plustwo.percentage || "—"}</td>
                    </tr>
                  )}
                  {academic.ug?.institution && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: '#334155', border: '1px solid #e2e8f0' }}>Under Graduate (UG)</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.ug.institution}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.ug.degree || academic.ug.board || "—"}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.ug.year || "—"}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.ug.percentage || "—"}</td>
                    </tr>
                  )}
                  {academic.pg?.institution && (
                    <tr>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: '#334155', border: '1px solid #e2e8f0' }}>Post Graduate (PG)</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.pg.institution}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.pg.degree || academic.pg.board || "—"}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.pg.year || "—"}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#0f172a', border: '1px solid #e2e8f0' }}>{academic.pg.percentage || "—"}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Declaration Section */}
          <div style={{ marginBottom: '16px', border: '1px solid #dc2626' }}>
            <div style={{ backgroundColor: '#dc2626', padding: '6px 12px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>DECLARATION</h4>
            </div>
            <div style={{ padding: '12px' }}>
              <p style={{ fontSize: '11px', color: '#334155', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                I hereby declare that all the information furnished above is true to the best of my knowledge and belief. 
                I understand that any false information or concealment of facts may result in the cancellation of my admission 
                and/or disciplinary action as deemed fit by the institution.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>Date: ____________________</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 16px 0' }}>Signature of Applicant</p>
                  <div style={{ width: '140px', borderBottom: '1px solid #64748b', marginLeft: 'auto' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#f3f4f6', borderTop: '2px solid #4b5563', marginTop: '12px' }}>
            <p style={{ margin: '2px 0', fontSize: '10px', color: '#1f2937', fontWeight: 600 }}>AIOS Institute of Advanced Management & Technology Pvt. Ltd.</p>
            <p style={{ margin: '2px 0', fontSize: '9px', color: '#4b5563' }}>ISO 9001:2015 Certified | Phone: 0481 291 9090 | www.aiosinstitute.com</p>
            <p style={{ margin: '2px 0', fontSize: '9px', color: '#6b7280' }}>2nd Floor, Vishnu Arcade, Maruthi Nagar Main Road, Bangalore, Karnataka, India</p>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewDocUrl && (
        <DocModal url={viewDocUrl} onClose={() => setViewDocUrl(null)} />
      )}
    </div>
  );
}
