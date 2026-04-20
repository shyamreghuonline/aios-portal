"use client";

import { useEffect, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, query, setDoc, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  Receipt, AlertTriangle, CheckCircle, CreditCard, Loader2,
  Upload, Save, Camera, Lock, Pencil, Printer, Download,
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
  const cls = `w-full px-2.5 py-1.5 text-xs rounded border outline-none font-medium transition-all ${
    disabled
      ? "bg-slate-50 border-slate-200 text-slate-700 cursor-default"
      : "border-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-100 bg-white text-slate-900"
  }`;
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-700 mb-1">{label}</label>
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

function openBase64(dataUrl: string) {
  const win = window.open();
  if (win) {
    win.document.write(`<img src="${dataUrl}" style="max-width:100%;height:auto;" />`);
    win.document.title = "Document";
  }
}

function CertUpload({ level, url, uploading, onUpload, disabled }: {
  level: string; url?: string; uploading: boolean;
  onUpload: (f: File) => void; disabled?: boolean;
}) {
  const inputId = `cert-upload-${level.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="col-span-2">
      <label className="block text-[10px] font-bold text-slate-700 mb-1">Upload Certificate / Marksheet</label>
      <label htmlFor={inputId}
        className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg border-2 border-dashed transition-all cursor-pointer ${(uploading || disabled) ? 'opacity-50 pointer-events-none' : ''} ${
          url
            ? "border-green-500 bg-green-50 text-green-800"
            : "border-slate-300 bg-slate-50 text-slate-700 hover:border-red-400 hover:bg-red-50/30 hover:text-red-700"
        }`}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : url ? <CheckCircle className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? "Uploading…" : url ? "Certificate Uploaded ✓ — Click to Replace" : `Upload ${level} Certificate / Marksheet (PDF or Image)`}
      </label>
      {url && (
        <button onClick={() => openBase64(url)} className="text-[10px] text-green-700 underline mt-0.5 block hover:text-green-900">
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

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalFee, setTotalFee] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [studentId, setStudentId] = useState<string>("");
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
      { key: "guardianName", label: "Guardian Name" },
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
          {/* Print Button - Header */}
          {(personal.aadhaarNumber || academic.sslc?.institution) && (
            <div className="flex-shrink-0">
              <button
                onClick={generatePDF}
                disabled={generatingPDF}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 bg-white rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 shadow-sm"
                title="Print Admission Form"
              >
                {generatingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                <span className="hidden sm:inline">{generatingPDF ? "Generating..." : "Print Form"}</span>
              </button>
            </div>
          )}
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

      {/* ══ TWO-COLUMN PORTAL ══ */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── LEFT: Fee + Payments ── */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0 space-y-3">

          {/* Fee Progress */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-900">Fee Progress</p>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                balance <= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
              }`}>{balance <= 0 ? "✓ Fully Paid" : "Pending"}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
              <div className="h-2 rounded-full gradient-bg transition-all duration-700" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[11px] font-semibold text-slate-700 text-right mb-3">{Math.round(progressPercent)}% paid</p>
            <div className="grid gap-2 grid-cols-3">
              {[
                { label: "Total Fee", value: `₹${totalFee.toLocaleString("en-IN")}`, color: "text-slate-900" },
                { label: "Paid",      value: `₹${totalPaid.toLocaleString("en-IN")}`, color: "text-blue-700" },
                { label: "Balance",   value: `₹${Math.max(0, balance).toLocaleString("en-IN")}`, color: balance > 0 ? "text-red-600" : "text-green-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className={`text-[11px] lg:text-xs font-extrabold ${color}`}>{value}</p>
                  <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">Payment Summary</p>
              <Link href="/student/payments" className="text-[11px] font-bold text-red-600">View All</Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-red-600 animate-spin" /></div>
            ) : payments.length === 0 ? (
              <div className="text-center py-6">
                <AlertTriangle className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-700">No payments yet.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 px-4 py-1.5 border-b border-slate-100 bg-slate-50">
                  {["Date", "Receipt No", "Amount", "Status"].map(h => (
                    <p key={h} className="text-[9px] font-extrabold uppercase tracking-wider text-slate-600">{h}</p>
                  ))}
                </div>
                <div className="divide-y divide-slate-50">
                  {payments.slice(0, 6).map(p => (
                    <div key={p.id} className="grid grid-cols-4 px-4 py-2 items-center">
                      <p className="text-[10px] text-slate-700">{p.paymentDate}</p>
                      <Link href={`/student/payments/${p.receiptNumber}`} className="text-[10px] font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate">
                        {p.receiptNumber}
                      </Link>
                      <p className="text-[10px] font-bold text-green-700">₹{p.amountPaid.toLocaleString("en-IN")}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 w-fit">Paid</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Link href="/student/pay" className="gradient-bg rounded-xl p-3 flex flex-col items-center gap-1.5 hover:opacity-90 transition-all">
              <CreditCard className="w-5 h-5 text-white" />
              <p className="text-xs font-bold text-white">Make Payment</p>
            </Link>
            <Link href="/student/payments" className="bg-slate-800 rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-slate-700 transition-all">
              <Receipt className="w-5 h-5 text-white" />
              <p className="text-xs font-bold text-white">View Receipts</p>
            </Link>
          </div>
        </div>

        {/* ── RIGHT: Profile Sections ── */}
        <div className="flex-1 space-y-3 min-w-0">

          {/* SECTION 1: Enrollment Details */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
              <span className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-extrabold text-white">1</span>
              </span>
              <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Enrollment Details</p>
              <span className="ml-auto text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Verified by Admin
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                {[
                  { label: "Full Name",           value: (sd.name as string) || "" },
                  { label: "Course Enrolled",     value: (sd.course as string) || "" },
                  { label: "Stream / Specialization", value: (sd.stream as string) || "" },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-2.5 cursor-not-allowed select-none" title="Managed by admin">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
                    <p className="text-xs font-semibold text-slate-900">{value || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                {[
                  { label: "Faculty / Department", value: (sd.faculty as string) || "" },
                  { label: "University",           value: (sd.university as string) || "" },
                  { label: "Academic Year",        value: `${sd.startYear || ""}${sd.endYear ? ` – ${sd.endYear}` : ""}` },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-2.5 cursor-not-allowed select-none" title="Managed by admin">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
                    <p className="text-xs font-semibold text-slate-900">{value || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                {[
                  { label: "Contact Email",    value: (sd.email as string) || "" },
                  { label: "Contact Number",   value: user?.phone || "" },
                  { label: "Enrollment ID",  value: (sd.studentId as string) || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-2.5 cursor-not-allowed select-none" title="Managed by admin">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
                    <p className="text-xs font-semibold text-slate-900">{value || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: Personal Information */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
              <span className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-extrabold text-white">2</span>
              </span>
              <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Personal Information</p>
              {!canEdit && <Lock className="w-3.5 h-3.5 text-slate-600 ml-auto" />}
              {canEdit && (
                editingKyc ? (
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setEditingKyc(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={savePersonal} disabled={savingPersonal}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white gradient-bg rounded-lg hover:shadow-md transition-all disabled:opacity-60">
                      {savingPersonal ? <Loader2 className="w-3 h-3 animate-spin" /> : savedPersonal ? <CheckCircle className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                      {savingPersonal ? "Saving…" : savedPersonal ? "Saved!" : "Save"}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingKyc(true)}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    <Pencil className="w-3 h-3" /> Edit Details
                  </button>
                )
              )}
            </div>
            {/* VIEW MODE */}
            {!editingKyc ? (
              <div className="p-3 sm:p-4">
                {/* Row 1: Photo + Basic Details */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Photo Card */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden flex">
                    <div className="w-32 bg-gradient-to-b from-rose-50 to-white border-r border-slate-200 flex flex-col items-center justify-center p-3">
                      <div className="w-20 h-24 rounded-lg border-2 border-dashed border-slate-300 overflow-hidden bg-white flex items-center justify-center mb-2">
                        {personal.photo
                          ? <img src={personal.photo} alt="Photo" className="w-full h-full object-cover" />
                          : <Camera className="w-6 h-6 text-slate-400" />}
                      </div>
                      {canEdit && (
                        <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                          className="text-[10px] font-bold text-rose-600 hover:underline disabled:opacity-50">
                          {uploadingPhoto ? "Uploading…" : personal.photo ? "Change" : "Upload"}
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="px-3 py-1.5 bg-gradient-to-r from-rose-50 to-white border-b border-slate-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Student Photo</p>
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-xs font-semibold text-slate-900">{sd.name as string || "Student"}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{sd.studentId as string || "—"}</p>
                        {personal.photo && <span className="inline-block mt-2 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">✓ Uploaded</span>}
                      </div>
                    </div>
                  </div>
                  {/* Basic Details Card */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-1.5 bg-gradient-to-r from-red-50 to-white border-b border-slate-200 border-l-[3px] border-l-red-500">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Basic Details</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {[
                        { label: "Date of Birth", value: personal.dob },
                        { label: "Gender", value: personal.gender },
                        { label: "Blood Group", value: personal.bloodGroup },
                        { label: "Aadhaar Number", value: personal.aadhaarNumber },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center">
                          <span className="w-[50%] px-3 py-1 text-[10px] font-semibold text-slate-600 bg-slate-50/80">{label}</span>
                          <span className="flex-1 px-3 py-1 text-[11px] font-semibold text-slate-900">{value || "\u2014"}</span>
                        </div>
                      ))}
                      <div className="flex items-center">
                        <span className="w-[50%] px-3 py-1 text-[10px] font-semibold text-slate-600 bg-slate-50/80">Aadhaar Document</span>
                        <span className="flex-1 px-3 py-1">
                          {personal.aadhaarUrl
                            ? <button onClick={() => openBase64(personal.aadhaarUrl!)} className="text-[11px] font-semibold text-red-600 underline hover:text-red-800">View ↗</button>
                            : <span className="text-[11px] font-semibold text-slate-900">\u2014</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Row 2: Family + Address + Employment */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Family & Guardian */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-white border-b border-slate-200 border-l-[3px] border-l-blue-500">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Family &amp; Guardian</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {[
                        { label: "Father's Name", value: personal.fatherName },
                        { label: "Mother's Name", value: personal.motherName },
                        { label: "Guardian Name", value: personal.guardianName },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center">
                          <span className="w-[40%] px-3 py-1.5 text-[10px] font-semibold text-slate-600 bg-slate-50/80">{label}</span>
                          <span className="flex-1 px-3 py-1.5 text-[11px] font-semibold text-slate-900 truncate">{value || "\u2014"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Address */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-white border-b border-slate-200 border-l-[3px] border-l-emerald-500">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Address</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {[
                        { label: "Street", value: personal.address },
                        { label: "City", value: personal.city },
                        { label: "State", value: personal.state },
                        { label: "Pincode", value: personal.pincode },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center">
                          <span className="w-[35%] px-3 py-1.5 text-[10px] font-semibold text-slate-600 bg-slate-50/80">{label}</span>
                          <span className="flex-1 px-3 py-1.5 text-[11px] font-semibold text-slate-900 truncate">{value || "\u2014"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Employment */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-1.5 bg-gradient-to-r from-amber-50 to-white border-b border-slate-200 border-l-[3px] border-l-amber-500">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Employment</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="flex items-center">
                        <span className="w-[40%] px-3 py-1.5 text-[10px] font-semibold text-slate-600 bg-slate-50/80">Type</span>
                        <span className="flex-1 px-3 py-1.5 text-[11px] font-semibold text-slate-900">{personal.employmentType || "\u2014"}</span>
                      </div>
                      {personal.employmentType && personal.employmentType !== "Not Employed" && (
                        <div className="flex items-center">
                          <span className="w-[40%] px-3 py-1.5 text-[10px] font-semibold text-slate-600 bg-slate-50/80">Experience</span>
                          <span className="flex-1 px-3 py-1.5 text-[11px] font-semibold text-slate-900">{personal.yearsOfExperience || "\u2014"} yrs</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Column 1 */}
                  <div className="space-y-3">
                    {/* Photo */}
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="px-3 py-1.5 bg-gradient-to-r from-rose-50 to-white border-b border-slate-200 border-l-[3px] border-l-rose-500">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Student Photo</p>
                      </div>
                      <div className="p-3 flex flex-col items-center gap-3">
                        <div className="w-24 h-32 rounded-lg border-2 border-dashed border-slate-300 overflow-hidden bg-white flex items-center justify-center">
                          {personal.photo
                            ? <img src={personal.photo} alt="Photo" className="w-full h-full object-cover" />
                            : <Camera className="w-8 h-8 text-slate-400" />}
                        </div>
                        <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto || !canEdit}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-dashed border-slate-400 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                          {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {uploadingPhoto ? "Uploading…" : personal.photo ? "Change Photo" : "Upload Photo"}
                        </button>
                      </div>
                    </div>
                    {/* Basic Details */}
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="px-3 py-1.5 bg-gradient-to-r from-red-50 to-white border-b border-slate-200 border-l-[3px] border-l-red-500">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Basic Details</p>
                      </div>
                      <div className="p-3 space-y-2.5">
                        <div className="grid grid-cols-3 gap-2.5">
                          <Input label="Date of Birth *" type="date" value={personal.dob || ""} onChange={v => up("dob", v)} disabled={!canEdit} />
                          <Input label="Gender *" type="select" options={["Male", "Female", "Other"]} value={personal.gender || ""} onChange={v => up("gender", v)} disabled={!canEdit} />
                          <Input label="Blood Group *" type="select" options={["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]} value={personal.bloodGroup || ""} onChange={v => up("bloodGroup", v)} disabled={!canEdit} />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <Input label="Aadhaar Number (12 digits) *"
                            value={personal.aadhaarNumber || ""}
                            onChange={v => up("aadhaarNumber", v.replace(/\D/g, "").slice(0, 12))}
                            placeholder="XXXX-XXXX-XXXX" inputMode="numeric" disabled={!canEdit} />
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">Aadhaar Card *</label>
                            <label htmlFor="student-aadhaar-upload"
                              className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded border transition-all cursor-pointer ${(uploadingAadhaar || !canEdit) ? 'opacity-50 pointer-events-none' : ''} ${
                                personal.aadhaarUrl ? "border-green-500 bg-green-50 text-green-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              }`}>
                              {uploadingAadhaar ? <Loader2 className="w-3 h-3 animate-spin" /> : personal.aadhaarUrl ? <CheckCircle className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                              {uploadingAadhaar ? "Uploading…" : personal.aadhaarUrl ? "Uploaded ✓" : "Upload"}
                            </label>
                            {personal.aadhaarUrl && (
                              <button onClick={() => openBase64(personal.aadhaarUrl!)} className="text-[10px] text-green-700 underline mt-0.5 block hover:text-green-900">View</button>
                            )}
                            <input id="student-aadhaar-upload" ref={aadhaarRef} type="file" accept="image/*,application/pdf" className="hidden"
                              onChange={e => e.target.files?.[0] && handleAadhaarUpload(e.target.files[0])} />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Family & Guardian */}
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-white border-b border-slate-200 border-l-[3px] border-l-blue-500">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Family &amp; Guardian</p>
                      </div>
                      <div className="p-3 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2.5">
                          <Input label="Father's Name *" value={personal.fatherName || ""} onChange={v => up("fatherName", v)} disabled={!canEdit} />
                          <Input label="Mother's Name *" value={personal.motherName || ""} onChange={v => up("motherName", v)} disabled={!canEdit} />
                        </div>
                        <Input label="Guardian Name *" value={personal.guardianName || ""} onChange={v => up("guardianName", v)} disabled={!canEdit} />
                      </div>
                    </div>
                  </div>
                  {/* Column 2 */}
                  <div className="space-y-3">
                    {/* Address */}
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-white border-b border-slate-200 border-l-[3px] border-l-emerald-500">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Address</p>
                      </div>
                      <div className="p-3 space-y-2.5">
                        <Input label="Street / Locality *" value={personal.address || ""} onChange={v => up("address", v)} placeholder="Enter full address" disabled={!canEdit} />
                        <div className="grid grid-cols-3 gap-2.5">
                          <Input label="City / District *" value={personal.city || ""} onChange={v => up("city", v)} disabled={!canEdit} />
                          <Input label="State *" value={personal.state || ""} onChange={v => up("state", v)} disabled={!canEdit} />
                          <Input label="Pincode *" value={personal.pincode || ""} onChange={v => up("pincode", v.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit" disabled={!canEdit} />
                        </div>
                      </div>
                    </div>
                    {/* Employment */}
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="px-3 py-1.5 bg-gradient-to-r from-amber-50 to-white border-b border-slate-200 border-l-[3px] border-l-amber-500">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Employment</p>
                      </div>
                      <div className="p-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          <Input label="Employment Type *" type="select" options={["Not Employed", "Government", "Private", "Self Employed", "Others"]} value={personal.employmentType || ""} onChange={v => { up("employmentType", v); if (v === "Not Employed") up("yearsOfExperience", ""); }} disabled={!canEdit} />
                          {personal.employmentType && personal.employmentType !== "Not Employed" && (
                            <Input label="Years of Experience *" value={personal.yearsOfExperience || ""} onChange={v => up("yearsOfExperience", v.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="e.g., 5" disabled={!canEdit} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Bottom Save/Cancel buttons */}
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={() => setEditingKyc(false)}
                    className="px-4 py-2 text-xs font-bold border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={savePersonal} disabled={savingPersonal}
                    className="flex-1 py-2 text-xs font-bold text-white gradient-bg rounded-lg hover:shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {savingPersonal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedPersonal ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    {savingPersonal ? "Saving…" : savedPersonal ? "Saved!" : "Save Personal Details"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Academic Background Form */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
              <span className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-extrabold text-white">3</span>
              </span>
              <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Academic Background Form</p>
              {!canEdit && <Lock className="w-3.5 h-3.5 text-slate-600 ml-auto" />}
              {canEdit && (
                editingAcademic ? (
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setEditingAcademic(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={saveAcademic} disabled={savingAcademic}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white gradient-bg rounded-lg hover:shadow-md transition-all disabled:opacity-60">
                      {savingAcademic ? <Loader2 className="w-3 h-3 animate-spin" /> : savedAcademic ? <CheckCircle className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                      {savingAcademic ? "Saving…" : savedAcademic ? "Saved!" : "Save"}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingAcademic(true)}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    <Pencil className="w-3 h-3" /> Edit Details
                  </button>
                )
              )}
            </div>
            {/* Academic VIEW MODE */}
            {!editingAcademic ? (
              <div className="p-4 space-y-2">
                {(["sslc", "plustwo", "ug", "pg"] as const).map((lvl, i) => {
                  const d = academic[lvl];
                  if (!d || !Object.values(d).some(v => v)) return null;
                  const stepLabels = ["SSLC / 10th", "HSC / 12th", "Under Graduate (UG)", "Post Graduate (PG)"];
                  return (
                    <div key={lvl} className="border border-slate-300 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-red-50 border-b border-slate-200">
                        <p className="text-sm font-medium text-red-700">{stepLabels[i]}</p>
                        {d.certificateUrl
                          ? <button onClick={() => openBase64(d.certificateUrl!)} className="text-[10px] text-green-700 font-bold flex items-center gap-0.5 hover:text-green-900 underline">
                              <CheckCircle className="w-3 h-3" /> View Certificate
                            </button>
                          : <span className="text-[10px] text-red-500 font-bold flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Not Uploaded
                            </span>
                        }
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 p-3">
                        {[
                          { label: "Institution", value: d.institution },
                          { label: "Board", value: d.board },
                          { label: "Stream / Degree", value: d.stream || d.degree },
                          { label: "Year", value: d.year },
                          { label: "Percentage / CGPA", value: d.percentage },
                        ].filter(f => f.value).map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">{label}</p>
                            <p className="text-xs font-bold text-slate-900">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {academic.phd && Object.values(academic.phd).some(v => v) && (
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-red-50 border-b border-slate-200">
                      <p className="text-sm font-medium text-red-700">PhD / Research / Other</p>
                      {academic.phd.certificateUrl
                        ? <button onClick={() => openBase64(academic.phd!.certificateUrl!)} className="text-[10px] text-green-700 font-bold flex items-center gap-0.5 hover:text-green-900 underline">
                            <CheckCircle className="w-3 h-3" /> View Certificate
                          </button>
                        : <span className="text-[10px] text-red-500 font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Not Uploaded
                          </span>
                      }
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 p-3">
                      {[
                        { label: "Institution", value: academic.phd.institution },
                        { label: "Research Topic", value: academic.phd.topic },
                        { label: "Year", value: academic.phd.year },
                        { label: "Status", value: academic.phd.status },
                      ].filter(f => f.value).map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">{label}</p>
                          <p className="text-xs font-bold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!academic.sslc?.institution && !academic.plustwo?.institution && !academic.ug?.institution && !academic.pg?.institution && !academic.phd?.institution && (
                  <p className="text-xs font-semibold text-slate-700 text-center py-4">No academic details added yet.</p>
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
                <div className="p-4">
                  {activeStep === 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><Input label="Institution Name" value={academic.sslc?.institution || ""} onChange={v => upAc("sslc", "institution", v)} disabled={!canEdit} /></div>
                      <Input label="Board / University" value={academic.sslc?.board || ""} onChange={v => upAc("sslc", "board", v)} disabled={!canEdit} />
                      <Input label="Year of Passing" value={academic.sslc?.year || ""} onChange={v => upAc("sslc", "year", v)} inputMode="numeric" disabled={!canEdit} />
                      <Input label="Percentage / CGPA" value={academic.sslc?.percentage || ""} onChange={v => upAc("sslc", "percentage", v)} inputMode="decimal" disabled={!canEdit} />
                      <CertUpload level="SSLC / 10th" url={academic.sslc?.certificateUrl}
                        uploading={!!uploadingCert.sslc} onUpload={f => handleCertUpload("sslc", f)} disabled={!canEdit} />
                    </div>
                  )}
                  {activeStep === 1 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><Input label="Institution Name" value={academic.plustwo?.institution || ""} onChange={v => upAc("plustwo", "institution", v)} disabled={!canEdit} /></div>
                      <Input label="Board / University" value={academic.plustwo?.board || ""} onChange={v => upAc("plustwo", "board", v)} disabled={!canEdit} />
                      <Input label="Stream" type="select" value={academic.plustwo?.stream || ""} onChange={v => upAc("plustwo", "stream", v)}
                        options={["Science (Bio)", "Science (Maths)", "Commerce", "Arts / Humanities", "Vocational", "Other"]} disabled={!canEdit} />
                      <Input label="Year of Passing" value={academic.plustwo?.year || ""} onChange={v => upAc("plustwo", "year", v)} inputMode="numeric" disabled={!canEdit} />
                      <Input label="Percentage / CGPA" value={academic.plustwo?.percentage || ""} onChange={v => upAc("plustwo", "percentage", v)} inputMode="decimal" disabled={!canEdit} />
                      <CertUpload level="HSC / 12th" url={academic.plustwo?.certificateUrl}
                        uploading={!!uploadingCert.plustwo} onUpload={f => handleCertUpload("plustwo", f)} disabled={!canEdit} />
                    </div>
                  )}
                  {activeStep === 2 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><Input label="Institution Name" value={academic.ug?.institution || ""} onChange={v => upAc("ug", "institution", v)} disabled={!canEdit} /></div>
                      <Input label="Board / University" value={academic.ug?.board || ""} onChange={v => upAc("ug", "board", v)} disabled={!canEdit} />
                      <Input label="Degree (e.g. B.Com, B.Sc)" value={academic.ug?.degree || ""} onChange={v => upAc("ug", "degree", v)} disabled={!canEdit} />
                      <Input label="Year of Passing" value={academic.ug?.year || ""} onChange={v => upAc("ug", "year", v)} inputMode="numeric" disabled={!canEdit} />
                      <Input label="Percentage / CGPA" value={academic.ug?.percentage || ""} onChange={v => upAc("ug", "percentage", v)} inputMode="decimal" disabled={!canEdit} />
                      <CertUpload level="UG Degree" url={academic.ug?.certificateUrl}
                        uploading={!!uploadingCert.ug} onUpload={f => handleCertUpload("ug", f)} disabled={!canEdit} />
                    </div>
                  )}
                  {activeStep === 3 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><Input label="Institution Name" value={academic.pg?.institution || ""} onChange={v => upAc("pg", "institution", v)} disabled={!canEdit} /></div>
                      <Input label="Board / University" value={academic.pg?.board || ""} onChange={v => upAc("pg", "board", v)} disabled={!canEdit} />
                      <Input label="Degree (e.g. M.Com, MBA)" value={academic.pg?.degree || ""} onChange={v => upAc("pg", "degree", v)} disabled={!canEdit} />
                      <Input label="Year of Passing" value={academic.pg?.year || ""} onChange={v => upAc("pg", "year", v)} inputMode="numeric" disabled={!canEdit} />
                      <Input label="Percentage / CGPA" value={academic.pg?.percentage || ""} onChange={v => upAc("pg", "percentage", v)} inputMode="decimal" disabled={!canEdit} />
                      <CertUpload level="PG Degree" url={academic.pg?.certificateUrl}
                        uploading={!!uploadingCert.pg} onUpload={f => handleCertUpload("pg", f)} disabled={!canEdit} />
                    </div>
                  )}
                  {activeStep === 4 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><Input label="Institution / University" value={academic.phd?.institution || ""} onChange={v => upPhd("institution", v)} disabled={!canEdit} /></div>
                      <div className="col-span-2"><Input label="Research Topic / Thesis Title" value={academic.phd?.topic || ""} onChange={v => upPhd("topic", v)} disabled={!canEdit} /></div>
                      <Input label="Year of Registration" value={academic.phd?.year || ""} onChange={v => upPhd("year", v)} inputMode="numeric" disabled={!canEdit} />
                      <Input label="Current Status" type="select" value={academic.phd?.status || ""} onChange={v => upPhd("status", v)}
                        options={["Ongoing", "Submitted", "Awarded"]} disabled={!canEdit} />
                      <CertUpload level="PhD / Research" url={academic.phd?.certificateUrl}
                        uploading={!!uploadingCert.phd} onUpload={f => handleCertUpload("phd", f)} disabled={!canEdit} />
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setEditingAcademic(false)}
                      className="px-3 py-2 text-xs font-bold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={saveAcademic} disabled={savingAcademic}
                      className="flex-1 py-2 text-xs font-bold text-white rounded-lg gradient-bg flex items-center justify-center gap-2 disabled:opacity-60">
                      {savingAcademic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedAcademic ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      {savingAcademic ? "Saving\u2026" : savedAcademic ? "Saved Successfully" : "Save Academic Details"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

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
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Guardian</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0' }}>{personal.guardianName || "—"}</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#fee2e2', fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '2px 0 0 2px' }}>Aadhaar No</td>
                    <td style={{ padding: '4px 6px', backgroundColor: '#ffffff', fontWeight: 600, color: '#1a1a1a', border: '1px solid #d1d5db', borderLeft: 'none', borderRadius: '0 2px 2px 0', fontFamily: 'monospace' }}>{personal.aadhaarNumber || "—"}</td>
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
    </div>
  );
}
