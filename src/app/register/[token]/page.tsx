"use client";

import { useEffect, useRef, useState, use } from "react";
import {
  AlertTriangle, CheckCircle, Loader2,
  Upload, Save, Camera, Pencil,
  GraduationCap, User, Building2, Mail, Phone, IdCard, Calendar,
  Users, MapPin, Briefcase, BookOpen, Award, ShieldCheck, FileText, TrendingUp, X,
  Lock, Clock,
} from "lucide-react";

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
  label, value, onChange, type = "text", options, inputMode, placeholder, disabled, color = "red",
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: "text" | "date" | "select"; options?: string[];
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string; disabled?: boolean;
  color?: "red" | "blue" | "amber" | "emerald" | "purple" | "indigo" | "rose" | "sky";
}) {
  const colorMap = {
    red: { border: "border-red-200", focusBorder: "focus:border-red-500", focusRing: "focus:ring-red-100", label: "text-red-700" },
    blue: { border: "border-blue-200", focusBorder: "focus:border-blue-500", focusRing: "focus:ring-blue-100", label: "text-blue-700" },
    amber: { border: "border-amber-200", focusBorder: "focus:border-amber-500", focusRing: "focus:ring-amber-100", label: "text-amber-700" },
    emerald: { border: "border-emerald-200", focusBorder: "focus:border-emerald-500", focusRing: "focus:ring-emerald-100", label: "text-emerald-700" },
    purple: { border: "border-purple-200", focusBorder: "focus:border-purple-500", focusRing: "focus:ring-purple-100", label: "text-purple-700" },
    indigo: { border: "border-indigo-200", focusBorder: "focus:border-indigo-500", focusRing: "focus:ring-indigo-100", label: "text-indigo-700" },
    rose: { border: "border-rose-200", focusBorder: "focus:border-rose-500", focusRing: "focus:ring-rose-100", label: "text-rose-700" },
    sky: { border: "border-sky-200", focusBorder: "focus:border-sky-500", focusRing: "focus:ring-sky-100", label: "text-sky-700" },
  };
  const c = colorMap[color];
  const cls = `w-full px-3 py-2.5 text-[14px] rounded-lg border outline-none font-medium transition-all ${
    disabled
      ? "bg-slate-50 border-slate-200 text-slate-700 cursor-default"
      : `${c.border} ${c.focusBorder} ${c.focusRing} bg-white text-slate-900`
  }`;
  return (
    <div>
      <label className={`block text-[13px] font-semibold mb-2 ${c.label}`}>{label}</label>
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

function CertUpload({ level, url, uploading, onUpload, onView, disabled, color = "red" }: {
  level: string; url?: string; uploading: boolean;
  onUpload: (f: File) => void; onView?: (url: string) => void; disabled?: boolean;
  color?: "red" | "blue" | "amber" | "emerald" | "purple" | "indigo" | "rose" | "sky";
}) {
  const inputId = `cert-upload-${level.replace(/\s+/g, '-').toLowerCase()}`;
  const colorMap = {
    red: { label: "text-red-700", border: "border-red-300", bg: "bg-red-50/30", hoverBorder: "hover:border-red-500", hoverBg: "hover:bg-red-50", hoverText: "hover:text-red-700" },
    blue: { label: "text-blue-700", border: "border-blue-300", bg: "bg-blue-50/30", hoverBorder: "hover:border-blue-500", hoverBg: "hover:bg-blue-50", hoverText: "hover:text-blue-700" },
    amber: { label: "text-amber-700", border: "border-amber-300", bg: "bg-amber-50/30", hoverBorder: "hover:border-amber-500", hoverBg: "hover:bg-amber-50", hoverText: "hover:text-amber-700" },
    emerald: { label: "text-emerald-700", border: "border-emerald-300", bg: "bg-emerald-50/30", hoverBorder: "hover:border-emerald-500", hoverBg: "hover:bg-emerald-50", hoverText: "hover:text-emerald-700" },
    purple: { label: "text-purple-700", border: "border-purple-300", bg: "bg-purple-50/30", hoverBorder: "hover:border-purple-500", hoverBg: "hover:bg-purple-50", hoverText: "hover:text-purple-700" },
    indigo: { label: "text-indigo-700", border: "border-indigo-300", bg: "bg-indigo-50/30", hoverBorder: "hover:border-indigo-500", hoverBg: "hover:bg-indigo-50", hoverText: "hover:text-indigo-700" },
    rose: { label: "text-rose-700", border: "border-rose-300", bg: "bg-rose-50/30", hoverBorder: "hover:border-rose-500", hoverBg: "hover:bg-rose-50", hoverText: "hover:text-rose-700" },
    sky: { label: "text-sky-700", border: "border-sky-300", bg: "bg-sky-50/30", hoverBorder: "hover:border-sky-500", hoverBg: "hover:bg-sky-50", hoverText: "hover:text-sky-700" },
  };
  const c = colorMap[color];
  return (
    <div className="col-span-2">
      <label className={`block text-[13px] font-semibold mb-2 ${c.label}`}>Upload Certificate / Marksheet</label>
      <label htmlFor={inputId}
        className={`w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold rounded-lg border-2 border-dashed transition-all cursor-pointer ${(uploading || disabled) ? 'opacity-50 pointer-events-none' : ''} ${
          url
            ? "border-green-500 bg-green-50 text-green-800"
            : `${c.border} ${c.bg} text-slate-700 ${c.hoverBorder} ${c.hoverBg} ${c.hoverText}`
        }`}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : url ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
        {uploading ? "Uploading…" : url ? "Certificate Uploaded ✓ — Click to Replace" : `Upload ${level} Certificate / Marksheet (PDF or Image)`}
      </label>
      {url && (
        <button onClick={() => onView?.(url)} className="text-[13px] font-medium text-green-700 underline mt-1 block hover:text-green-900">
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

export default function RegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentData, setStudentData] = useState<Record<string, unknown>>({});
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
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);

  // Validate token and fetch student data
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid or expired link");
          setLoading(false);
          return;
        }
        if (data.type !== "details-only") {
          setError("This link is not valid for profile registration. Please use the correct link.");
          setLoading(false);
          return;
        }

        setStudentId(data.studentId);

        // Use student data returned from the API (no client-side Firestore auth)
        if (data.studentData) {
          const d = data.studentData;
          setStudentData(d);
          if (d.personalDetails) setPersonal(d.personalDetails as PersonalDetails);
          if (d.academicDetails) setAcademic(d.academicDetails as AcademicDetails);
        }
      } catch (err) {
        console.error("[RegisterPage] init error:", err);
        setError("Failed to verify link. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  // Calculate expiry countdown
  useEffect(() => {
    const interval = setInterval(async () => {
      // Simple 24h from page load indicator
      try {
        const res = await fetch("/api/auth/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          setExpiresIn("Expired");
          clearInterval(interval);
        }
      } catch {
        // ignore
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [token]);

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

  async function saveViaApi(data: { personalDetails?: unknown; academicDetails?: unknown }) {
    const res = await fetch("/api/auth/save-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, studentId, ...data, detailsFilledAt: new Date().toISOString() }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Save failed");
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!studentId) return;
    setUploadingPhoto(true); setUploadError(null);
    try {
      const photoUrl = await uploadToBase64(file);
      setPersonal(p => ({ ...p, photo: photoUrl }));
      await saveViaApi({ personalDetails: { ...personal, photo: photoUrl } });
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const msg = raw === "FILE_TOO_LARGE" ? "Photo is too large. Please use an image under 500 KB." : "Photo upload failed. Please try again with a smaller image.";
      setUploadError(msg);
    } finally { setUploadingPhoto(false); }
  }

  async function handleAadhaarUpload(file: File) {
    if (!studentId) return;
    setUploadingAadhaar(true); setUploadError(null);
    try {
      const aadhaarUrl = await uploadToBase64(file);
      setPersonal(p => ({ ...p, aadhaarUrl }));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const msg = raw === "FILE_TOO_LARGE" ? "Document is too large. Please use a file under 500 KB." : "Aadhaar upload failed. Please try again with a smaller file.";
      setUploadError(msg);
    } finally { setUploadingAadhaar(false); }
  }

  async function handleCertUpload(level: string, file: File) {
    if (!studentId) return;
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
    } finally { setUploadingCert(u => ({ ...u, [level]: false })); }
  }

  function cleanObject<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  async function savePersonal() {
    if (!studentId) return;
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
      await saveViaApi({ personalDetails: cleanObject(personal) });
      setSavedPersonal(true);
      setEditingKyc(false);
      setTimeout(() => setSavedPersonal(false), 2500);
    } catch (err) {
      console.error("[savePersonal] error:", err);
      alert("Failed to save personal details. The link may have expired.");
    } finally { setSavingPersonal(false); }
  }

  async function saveAcademic() {
    if (!studentId) return;
    setSavingAcademic(true);
    try {
      await saveViaApi({ academicDetails: cleanObject(academic) });
      setSavedAcademic(true);
      setEditingAcademic(false);
      setTimeout(() => setSavedAcademic(false), 2500);
    } catch (err) {
      console.error("[saveAcademic] error:", err);
      alert("Failed to save academic details. The link may have expired.");
    } finally { setSavingAcademic(false); }
  }

  const up = (k: keyof PersonalDetails, v: string) => setPersonal(p => ({ ...p, [k]: v }));
  const upAc = (lvl: keyof Omit<AcademicDetails, "phd">, k: string, v: string) =>
    setAcademic(a => ({ ...a, [lvl]: { ...a[lvl], [k]: v } }));
  const upPhd = (k: string, v: string) => setAcademic(a => ({ ...a, phd: { ...a.phd, [k]: v } }));

  const sd = studentData;
  const name = (sd.name as string) || "Student";
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Verifying your link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-50 p-4">
        <div className="bg-white rounded-2xl border border-red-200 shadow-xl max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Link Error</h1>
          <p className="text-sm text-slate-600">{error}</p>
          <p className="text-xs text-slate-500">Please contact your administration office for a new link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/login-page.jpeg" alt="AIOS EDU" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-red-200" />
            <span className="text-red-100 font-medium">Link valid for 24 hours</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-br from-red-50 via-white to-rose-50 rounded-xl shadow-md border border-red-100">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl border-2 border-red-200 overflow-hidden bg-white flex items-center justify-center shadow-sm">
                    {personal.photo
                      ? <img src={personal.photo} alt="Photo" className="w-full h-full object-cover" />
                      : <span className="text-lg font-bold text-red-700">{initials}</span>}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Welcome,</p>
                  <h1 className="text-xl font-bold text-slate-800 leading-tight">{name.split(' ')[0]}</h1>
                  <p className="text-sm text-red-700 font-semibold">{(sd.course as string) || "Student"}{typeof sd.stream === "string" && sd.stream.length > 0 ? ` • ${sd.stream}` : ""}</p>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-500">Profile Completion</span>
                  <span className="text-xs font-bold text-red-700">{Math.round(((personal.dob ? 1 : 0) + (personal.gender ? 1 : 0) + (personal.aadhaarNumber ? 1 : 0) + (personal.fatherName ? 1 : 0) + (personal.address ? 1 : 0) + (academic.sslc?.institution ? 1 : 0)) / 6 * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-700 to-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(((personal.dob ? 1 : 0) + (personal.gender ? 1 : 0) + (personal.aadhaarNumber ? 1 : 0) + (personal.fatherName ? 1 : 0) + (personal.address ? 1 : 0) + (academic.sslc?.institution ? 1 : 0)) / 6 * 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {((personal.dob ? 1 : 0) + (personal.gender ? 1 : 0) + (personal.aadhaarNumber ? 1 : 0) + (personal.fatherName ? 1 : 0) + (personal.address ? 1 : 0) + (academic.sslc?.institution ? 1 : 0))} of 6 sections completed
                </p>
              </div>
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

        {/* SECTION 1: Enrollment Details (Read-only) */}
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
                <button
                  onClick={() => photoRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  {uploadingPhoto ? "Uploading…" : personal.photo ? "Change Photo" : "Upload Photo"}
                </button>
                <input ref={photoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
              </div>
            </div>

            {/* RIGHT: Enrollment Fields */}
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
                  { icon: Phone, label: "Contact Number", value: (sd.phone as string) || "", tint: "from-emerald-50 to-white", iconColor: "text-emerald-600", ring: "border-emerald-100" },
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
              <div className="mt-auto flex items-start gap-3 p-3.5 rounded-xl bg-white border border-blue-200 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Read-only Information
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    These enrollment details are managed by the administration office. If any information is incorrect, please contact your admin for assistance.
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
            {editingKyc ? (
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
            )}
          </header>
          {!editingKyc ? (
            <div className="p-5">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-blue-500 rounded-full" />
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Basic Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[
                    { icon: Calendar, label: "Date of Birth", value: personal.dob ? (() => { const [y,m,d] = personal.dob.split("-"); return `${d}-${m}-${y}`; })() : "—", tint: "from-rose-50 to-white", iconColor: "text-rose-600", ring: "border-rose-100" },
                    { icon: User, label: "Gender", value: personal.gender || "—", tint: "from-red-50 to-white", iconColor: "text-red-600", ring: "border-red-100" },
                    { icon: Award, label: "Blood Group", value: personal.bloodGroup || "—", tint: "from-amber-50 to-white", iconColor: "text-amber-600", ring: "border-amber-100" },
                    { icon: Users, label: "Father's Name", value: personal.fatherName || "—", tint: "from-blue-50 to-white", iconColor: "text-blue-600", ring: "border-blue-100" },
                    { icon: Users, label: "Mother's Name", value: personal.motherName || "—", tint: "from-indigo-50 to-white", iconColor: "text-indigo-600", ring: "border-indigo-100" },
                    { icon: Briefcase, label: "Employment", value: personal.employmentType ? `${personal.employmentType}${personal.yearsOfExperience && personal.employmentType !== "Not Employed" ? ` (${personal.yearsOfExperience} yrs)` : ""}` : "—", tint: "from-amber-50 to-white", iconColor: "text-amber-600", ring: "border-amber-100" },
                    { icon: IdCard, label: "Aadhaar", value: personal.aadhaarNumber || "—", tint: "from-slate-50 to-white", iconColor: "text-slate-700", ring: "border-slate-200", docUrl: personal.aadhaarUrl },
                  ].map(({ icon: Icon, label, value, tint, iconColor, ring, docUrl }: any) => (
                    <div key={label} className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br ${tint} border ${ring} hover:shadow-sm transition-all`}>
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-red-700 mb-0.5">{label}</p>
                        <p className="text-sm font-normal text-slate-800 truncate">{value}</p>
                        {docUrl && (
                          <button onClick={() => setViewDocUrl(docUrl)} className="text-xs font-medium text-red-600 hover:text-red-700 underline mt-1">
                            View Document
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
            <div className="p-5 sm:p-6 bg-gradient-to-br from-red-50/50 to-white space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-blue-500 rounded-full" />
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-blue-800">Basic Details</h3>
                </div>
                <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-blue-700 mb-2">Date of Birth <span className="text-red-500">*</span></label>
                      <input type="date" value={personal.dob || ""} onChange={e => up("dob", e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-blue-700 mb-2">Gender <span className="text-red-500">*</span></label>
                      <select value={personal.gender || ""} onChange={e => up("gender", e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-slate-800">
                        <option value="">— Select —</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-blue-700 mb-2">Blood Group <span className="text-red-500">*</span></label>
                      <select value={personal.bloodGroup || ""} onChange={e => up("bloodGroup", e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-slate-800">
                        <option value="">— Select —</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-blue-700 mb-2">Aadhaar Number <span className="text-red-500">*</span></label>
                      <input type="text" value={personal.aadhaarNumber || ""} onChange={e => up("aadhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
                        placeholder="XXXX XXXX XXXX" inputMode="numeric"
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-blue-700 mb-2">Father&apos;s Name <span className="text-red-500">*</span></label>
                      <input type="text" value={personal.fatherName || ""} onChange={e => up("fatherName", e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-blue-700 mb-2">Mother&apos;s Name <span className="text-red-500">*</span></label>
                      <input type="text" value={personal.motherName || ""} onChange={e => up("motherName", e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-blue-700 mb-2">Employment Type <span className="text-red-500">*</span></label>
                      <select value={personal.employmentType || ""} onChange={e => { up("employmentType", e.target.value); if (e.target.value === "Not Employed") up("yearsOfExperience", ""); }}
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-slate-800">
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
                        <label className="block text-[13px] font-semibold text-blue-700 mb-2">Years of Experience <span className="text-red-500">*</span></label>
                        <input type="text" value={personal.yearsOfExperience || ""} onChange={e => up("yearsOfExperience", e.target.value.replace(/\D/g, "").slice(0, 2))}
                          inputMode="numeric" placeholder="e.g., 5"
                          className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-blue-700 mb-2">Aadhaar Card <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-3">
                      <label htmlFor="register-aadhaar-upload"
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-lg border-2 transition-all cursor-pointer ${
                          uploadingAadhaar ? 'opacity-50 pointer-events-none' : ''
                        } ${personal.aadhaarUrl ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>
                        {uploadingAadhaar ? <Loader2 className="w-4 h-4 animate-spin" /> : personal.aadhaarUrl ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                        {uploadingAadhaar ? "Uploading…" : personal.aadhaarUrl ? "Document Uploaded" : "Upload Aadhaar"}
                      </label>
                      {personal.aadhaarUrl && (
                        <button onClick={() => setViewDocUrl(personal.aadhaarUrl!)} className="text-[13px] font-semibold text-red-600 hover:text-red-700 underline">
                          View Document
                        </button>
                      )}
                    </div>
                    <input id="register-aadhaar-upload" ref={aadhaarRef} type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={e => e.target.files?.[0] && handleAadhaarUpload(e.target.files[0])} />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-emerald-800">Address</h3>
                </div>
                <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5 space-y-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-emerald-700 mb-2">Street / Locality <span className="text-red-500">*</span></label>
                    <input type="text" value={personal.address || ""} onChange={e => up("address", e.target.value)}
                      placeholder="Enter full address"
                      className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-emerald-700 mb-2">City <span className="text-red-500">*</span></label>
                      <input type="text" value={personal.city || ""} onChange={e => up("city", e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-emerald-700 mb-2">State <span className="text-red-500">*</span></label>
                      <input type="text" value={personal.state || ""} onChange={e => up("state", e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-emerald-700 mb-2">Pincode <span className="text-red-500">*</span></label>
                      <input type="text" value={personal.pincode || ""} onChange={e => up("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputMode="numeric" placeholder="6-digit code"
                        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white font-mono" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Save/Cancel */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setEditingKyc(false)}
                  className="px-6 py-2.5 text-[14px] font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button onClick={savePersonal} disabled={savingPersonal}
                  className="px-8 py-2.5 text-[14px] font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:shadow-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-60 flex items-center gap-2">
                  {savingPersonal ? <Loader2 className="w-4 h-4 animate-spin" /> : savedPersonal ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savingPersonal ? "Saving…" : savedPersonal ? "Saved!" : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: Academic Background */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <header className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-red-50 via-rose-50 to-white">
            <span className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </span>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900">Academic Background</h2>
              <p className="text-xs text-slate-500">Your qualifications and uploaded certificates</p>
            </div>
            {editingAcademic ? (
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
            )}
          </header>
          {!editingAcademic ? (
            <div className="p-5 space-y-6">
              {([
                { key: "sslc" as const, label: "SSLC / 10th", iconColor: "text-rose-600", ring: "border-rose-100", tint: "from-rose-50 to-white", bar: "bg-rose-500" },
                { key: "plustwo" as const, label: "HSC / 12th", iconColor: "text-amber-600", ring: "border-amber-100", tint: "from-amber-50 to-white", bar: "bg-amber-500" },
                { key: "ug" as const, label: "Under Graduate (UG)", iconColor: "text-blue-600", ring: "border-blue-100", tint: "from-blue-50 to-white", bar: "bg-blue-500" },
                { key: "pg" as const, label: "Post Graduate (PG)", iconColor: "text-indigo-600", ring: "border-indigo-100", tint: "from-indigo-50 to-white", bar: "bg-indigo-500" },
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
                            <p className="text-sm font-semibold text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Not Uploaded</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {academic.phd?.institution && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-purple-500 rounded-full" />
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-800">PhD / Research / Other</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[
                      { icon: Building2, label: "Institution", value: academic.phd.institution || "—" },
                      { icon: BookOpen, label: "Research Topic", value: academic.phd.topic || "—" },
                      { icon: Calendar, label: "Year", value: academic.phd.year || "—" },
                      { icon: ShieldCheck, label: "Status", value: academic.phd.status || "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 hover:shadow-sm transition-all">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Icon className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-red-700 mb-0.5">{label}</p>
                          <p className="text-sm font-normal text-slate-800 truncate">{value}</p>
                        </div>
                      </div>
                    ))}
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
                          <p className="text-sm font-semibold text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Not Uploaded</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!academic.sslc?.institution && !academic.plustwo?.institution && !academic.ug?.institution && !academic.pg?.institution && !academic.phd?.institution && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <GraduationCap className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">No academic details added yet. Click Edit to add.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex border-b border-red-200 overflow-x-auto bg-gradient-to-r from-red-50/30 to-white">
                {ACADEMIC_STEPS.map((step, i) => (
                  <button key={step.key} onClick={() => setActiveStep(i)}
                    className={`flex-shrink-0 px-5 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeStep === i
                        ? "border-red-600 text-red-600 bg-red-50"
                        : "border-transparent text-slate-700 hover:text-red-700 hover:bg-red-50/30"
                    }`}>
                    {step.label}
                  </button>
                ))}
              </div>
              <div className={activeStep === 0 ? "p-5 sm:p-6 space-y-4 bg-gradient-to-br from-amber-50/30 to-white" : activeStep === 1 ? "p-5 sm:p-6 space-y-4 bg-gradient-to-br from-blue-50/30 to-white" : activeStep === 2 ? "p-5 sm:p-6 space-y-4 bg-gradient-to-br from-purple-50/30 to-white" : activeStep === 3 ? "p-5 sm:p-6 space-y-4 bg-gradient-to-br from-indigo-50/30 to-white" : "p-5 sm:p-6 space-y-4 bg-gradient-to-br from-rose-50/30 to-white"}>
                <div className={activeStep === 0 ? "bg-white rounded-xl shadow-sm p-5 space-y-4 border border-amber-100" : activeStep === 1 ? "bg-white rounded-xl shadow-sm p-5 space-y-4 border border-blue-100" : activeStep === 2 ? "bg-white rounded-xl shadow-sm p-5 space-y-4 border border-purple-100" : activeStep === 3 ? "bg-white rounded-xl shadow-sm p-5 space-y-4 border border-indigo-100" : "bg-white rounded-xl shadow-sm p-5 space-y-4 border border-rose-100"}>
                {activeStep === 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-2"><Input label="Institution Name" value={academic.sslc?.institution || ""} onChange={v => upAc("sslc", "institution", v)} color="amber" /></div>
                    <Input label="Board / University" value={academic.sslc?.board || ""} onChange={v => upAc("sslc", "board", v)} color="amber" />
                    <Input label="Year of Passing" type="select" value={academic.sslc?.year || ""} onChange={v => upAc("sslc", "year", v)} options={YEAR_OPTIONS} color="amber" />
                    <Input label="Percentage / CGPA" value={academic.sslc?.percentage || ""} onChange={v => upAc("sslc", "percentage", v)} inputMode="decimal" color="amber" />
                    <CertUpload level="SSLC / 10th" url={academic.sslc?.certificateUrl}
                      uploading={!!uploadingCert.sslc} onUpload={f => handleCertUpload("sslc", f)} onView={setViewDocUrl} color="amber" />
                  </div>
                )}
                {activeStep === 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-2"><Input label="Institution Name" value={academic.plustwo?.institution || ""} onChange={v => upAc("plustwo", "institution", v)} color="blue" /></div>
                    <Input label="Board / University" value={academic.plustwo?.board || ""} onChange={v => upAc("plustwo", "board", v)} color="blue" />
                    <Input label="Stream" type="select" value={academic.plustwo?.stream || ""} onChange={v => upAc("plustwo", "stream", v)}
                      options={["Science (Bio)", "Science (Maths)", "Commerce", "Arts / Humanities", "Vocational", "Other"]} color="blue" />
                    <Input label="Year of Passing" type="select" value={academic.plustwo?.year || ""} onChange={v => upAc("plustwo", "year", v)} options={YEAR_OPTIONS} color="blue" />
                    <Input label="Percentage / CGPA" value={academic.plustwo?.percentage || ""} onChange={v => upAc("plustwo", "percentage", v)} inputMode="decimal" color="blue" />
                    <CertUpload level="HSC / 12th" url={academic.plustwo?.certificateUrl}
                      uploading={!!uploadingCert.plustwo} onUpload={f => handleCertUpload("plustwo", f)} onView={setViewDocUrl} color="blue" />
                  </div>
                )}
                {activeStep === 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-2"><Input label="Institution Name" value={academic.ug?.institution || ""} onChange={v => upAc("ug", "institution", v)} color="purple" /></div>
                    <Input label="Board / University" value={academic.ug?.board || ""} onChange={v => upAc("ug", "board", v)} color="purple" />
                    <Input label="Degree (e.g. B.Com, B.Sc)" value={academic.ug?.degree || ""} onChange={v => upAc("ug", "degree", v)} color="purple" />
                    <Input label="Year of Passing" type="select" value={academic.ug?.year || ""} onChange={v => upAc("ug", "year", v)} options={YEAR_OPTIONS} color="purple" />
                    <Input label="Percentage / CGPA" value={academic.ug?.percentage || ""} onChange={v => upAc("ug", "percentage", v)} inputMode="decimal" color="purple" />
                    <CertUpload level="UG Degree" url={academic.ug?.certificateUrl}
                      uploading={!!uploadingCert.ug} onUpload={f => handleCertUpload("ug", f)} onView={setViewDocUrl} color="purple" />
                  </div>
                )}
                {activeStep === 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-2"><Input label="Institution Name" value={academic.pg?.institution || ""} onChange={v => upAc("pg", "institution", v)} color="indigo" /></div>
                    <Input label="Board / University" value={academic.pg?.board || ""} onChange={v => upAc("pg", "board", v)} color="indigo" />
                    <Input label="Degree (e.g. M.Com, MBA)" value={academic.pg?.degree || ""} onChange={v => upAc("pg", "degree", v)} color="indigo" />
                    <Input label="Year of Passing" type="select" value={academic.pg?.year || ""} onChange={v => upAc("pg", "year", v)} options={YEAR_OPTIONS} color="indigo" />
                    <Input label="Percentage / CGPA" value={academic.pg?.percentage || ""} onChange={v => upAc("pg", "percentage", v)} inputMode="decimal" color="indigo" />
                    <CertUpload level="PG Degree" url={academic.pg?.certificateUrl}
                      uploading={!!uploadingCert.pg} onUpload={f => handleCertUpload("pg", f)} onView={setViewDocUrl} color="indigo" />
                  </div>
                )}
                {activeStep === 4 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-2"><Input label="Institution / University" value={academic.phd?.institution || ""} onChange={v => upPhd("institution", v)} color="rose" /></div>
                    <div className="col-span-2"><Input label="Research Topic / Thesis Title" value={academic.phd?.topic || ""} onChange={v => upPhd("topic", v)} color="rose" /></div>
                    <Input label="Year of Registration" type="select" value={academic.phd?.year || ""} onChange={v => upPhd("year", v)} options={YEAR_OPTIONS} color="rose" />
                    <Input label="Current Status" type="select" value={academic.phd?.status || ""} onChange={v => upPhd("status", v)}
                      options={["Ongoing", "Submitted", "Awarded"]} color="rose" />
                    <CertUpload level="PhD / Research" url={academic.phd?.certificateUrl}
                      uploading={!!uploadingCert.phd} onUpload={f => handleCertUpload("phd", f)} onView={setViewDocUrl} color="rose" />
                  </div>
                )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditingAcademic(false)}
                    className="px-4 py-2.5 text-[13px] font-semibold border border-red-200 text-slate-700 rounded-lg hover:bg-red-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveAcademic} disabled={savingAcademic}
                    className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:shadow-lg hover:from-red-700 hover:to-red-800 flex items-center justify-center gap-2 disabled:opacity-60">
                    {savingAcademic ? <Loader2 className="w-4 h-4 animate-spin" /> : savedAcademic ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {savingAcademic ? "Saving\u2026" : savedAcademic ? "Saved Successfully" : "Save Academic Details"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-400">AIOS Institute of Advanced Management & Technology Pvt. Ltd.</p>
          <p className="text-[10px] text-slate-300 mt-1">ISO 9001:2015 Certified | www.aiosinstitute.com</p>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewDocUrl && (
        <DocModal url={viewDocUrl} onClose={() => setViewDocUrl(null)} />
      )}
    </div>
  );
}
