"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  Phone, Mail, BookOpen, IndianRupee, Building2,
  MapPin, Upload, Save, CheckCircle, XCircle, Loader2, Camera, Shield,
  ChevronDown, ChevronUp, Lock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
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
}

interface AcademicLevel {
  institution?: string;
  board?: string;
  stream?: string;
  degree?: string;
  year?: string;
  percentage?: string;
}

interface AcademicDetails {
  sslc?: AcademicLevel;
  plustwo?: AcademicLevel;
  ug?: AcademicLevel;
  pg?: AcademicLevel;
  phd?: { institution?: string; topic?: string; year?: string; status?: string };
}

// ── Helper: Read-only field (Section 1) ────────────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="cursor-not-allowed select-none" title="Managed by institute admin — not editable">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
      <p className="text-xs font-semibold text-slate-900">{value || "—"}</p>
    </div>
  );
}

// ── Helper: Editable input ──────────────────────────────────────────────────
type FieldDef = {
  key: string; label: string; type?: "select"; options?: string[];
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  span?: 1 | 2 | 3;
};

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

// ── Helper: Academic accordion block ───────────────────────────────────────
function AcademicBlock({
  title, emoji, level, onChange, fields, optional, disabled,
}: {
  title: string; emoji: string; level: AcademicLevel;
  onChange: (key: string, value: string) => void;
  fields: FieldDef[]; optional?: boolean; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const filled = fields.filter(f => (level as Record<string, string>)[f.key]).length;
  const pct = Math.round((filled / fields.length) * 100);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-2.5 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-2">
          <span>{emoji}</span>
          <p className="text-xs font-bold text-slate-900">{title}</p>
          {optional && <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">Optional</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
            pct === 100 ? "bg-green-100 text-green-700" : pct > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"
          }`}>
            {pct === 100 ? "✓ Complete" : pct > 0 ? `${pct}% filled` : "Not filled"}
          </span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
        </div>
      </button>
      {open && (
        <div className="p-4 grid grid-cols-3 gap-3">
          {fields.map(f => (
            <div key={f.key} className={f.span === 3 ? "col-span-3" : f.span === 2 ? "col-span-2" : ""}>
              <Input label={f.label} value={(level as Record<string, string>)[f.key] || ""}
                onChange={v => onChange(f.key, v)} type={f.type} options={f.options}
                inputMode={f.inputMode} disabled={disabled} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function StudentProfilePage() {
  const { user } = useAuth();
  const sd = (user?.studentData || {}) as Record<string, unknown>;
  const canEdit = sd.profileEditEnabled !== false;

  const [personal, setPersonal] = useState<PersonalDetails>({});
  const [academic, setAcademic] = useState<AcademicDetails>({});
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [savedPersonal, setSavedPersonal] = useState(false);
  const [savedAcademic, setSavedAcademic] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false);

  const photoRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.phone) return;
    getDoc(doc(db, "students", user.phone)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.personalDetails) setPersonal(d.personalDetails as PersonalDetails);
      if (d.academicDetails) setAcademic(d.academicDetails as AcademicDetails);
    });
  }, [user]);

  async function handlePhotoUpload(file: File) {
    if (!user?.phone) return;
    setUploadingPhoto(true);
    try {
      const r = storageRef(storage, `students/${user.phone}/photo`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      setPersonal(p => ({ ...p, photo: url }));
    } finally { setUploadingPhoto(false); }
  }

  async function handleAadhaarUpload(file: File) {
    if (!user?.phone) return;
    setUploadingAadhaar(true);
    try {
      const r = storageRef(storage, `students/${user.phone}/aadhaar`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      setPersonal(p => ({ ...p, aadhaarUrl: url }));
    } finally { setUploadingAadhaar(false); }
  }

  async function savePersonal() {
    if (!user?.phone) return;
    setSavingPersonal(true);
    try {
      await setDoc(doc(db, "students", user.phone), { personalDetails: personal }, { merge: true });
      setSavedPersonal(true);
      setTimeout(() => setSavedPersonal(false), 2500);
    } finally { setSavingPersonal(false); }
  }

  async function saveAcademic() {
    if (!user?.phone) return;
    setSavingAcademic(true);
    try {
      await setDoc(doc(db, "students", user.phone), { academicDetails: academic }, { merge: true });
      setSavedAcademic(true);
      setTimeout(() => setSavedAcademic(false), 2500);
    } finally { setSavingAcademic(false); }
  }

  const up = (k: keyof PersonalDetails, v: string) => setPersonal(p => ({ ...p, [k]: v }));
  const upLevel = (lvl: keyof Omit<AcademicDetails, "phd">, k: string, v: string) =>
    setAcademic(a => ({ ...a, [lvl]: { ...a[lvl], [k]: v } }));
  const upPhd = (k: string, v: string) =>
    setAcademic(a => ({ ...a, phd: { ...a.phd, [k]: v } }));

  const name = (sd.name as string) || "Student";
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  // Profile completion
  const pFields: (keyof PersonalDetails)[] = ["photo","dob","gender","bloodGroup","fatherName","motherName","aadhaarNumber","aadhaarUrl","address","city","state","pincode"];
  const personalPct = Math.round((pFields.filter(f => personal[f]).length / pFields.length) * 100);
  const sslcDone = ["institution","board","year","percentage"].filter(f => academic.sslc?.[f as keyof AcademicLevel]).length;
  const plusDone = ["institution","board","stream","year","percentage"].filter(f => academic.plustwo?.[f as keyof AcademicLevel]).length;
  const academicPct = Math.round(((sslcDone + plusDone) / 9) * 100);
  const overallPct = Math.round((100 + personalPct + academicPct) / 3);

  const sectionStatus = (pct: number) =>
    pct === 100 ? "bg-green-100 text-green-800 border-green-300"
    : pct > 0   ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-red-50 text-red-700 border-red-200";

  return (
    <div className="pb-24 space-y-3">

      {/* ══ IDENTITY CARD ══════════════════════════════════════════════════ */}
      <div className="gradient-bg rounded-xl shadow-md overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-xl border-2 border-white/40 overflow-hidden bg-white/20 flex items-center justify-center shadow-md">
                {personal.photo
                  ? <img src={personal.photo} alt="Photo" className="w-full h-full object-cover" />
                  : <span className="text-xl font-extrabold text-white">{initials}</span>}
              </div>
              {canEdit && (
                <label htmlFor="photo-upload"
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow border border-slate-200 cursor-pointer ${uploadingPhoto ? 'opacity-50' : ''}`}
                  title="Change photo">
                  {uploadingPhoto ? <Loader2 className="w-2.5 h-2.5 text-red-600 animate-spin" /> : <Camera className="w-2.5 h-2.5 text-red-600" />}
                </label>
              )}
              <input id="photo-upload" ref={photoRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
            </div>
            
            {/* Name + info */}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-extrabold text-white leading-tight truncate">{name}</p>
              <p className="text-sm font-semibold text-white/80 truncate mt-0.5">{(sd.course as string) || ""}{(sd.stream as string) ? `-${(sd.stream as string)}` : ""}</p>
              <p className="text-xs text-white/60 truncate mt-0.5">Specialization: {(sd.stream as string) || "Finance"}</p>
              <p className="text-xs text-white/60 truncate mt-0.5">University: {(sd.university as string) || ""}</p>
            </div>
            
            {/* Completion % + Verified */}
            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-extrabold text-white leading-none">{overallPct}%</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border ${
                (sd.adminVerified || sd.kycVerified)
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-amber-100 text-amber-800 border-amber-300"
              }`}>
                {(sd.adminVerified || sd.kycVerified)
                  ? <><CheckCircle className="w-3 h-3" /> Verified by Admin</>
                  : <><XCircle className="w-3 h-3" /> Not Verified</>
                }
              </span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-2 mb-3">
            <div className="h-2 rounded-full bg-white transition-all duration-700" style={{ width: `${overallPct}%` }} />
          </div>
          
          {/* Section status pills */}
          <div className="flex gap-2">
            {[
              { label: "Enrollment", pct: 100, icon: "✓" },
              { label: "Personal", pct: personalPct, icon: "👤" },
              { label: "Academic", pct: academicPct, icon: "✓" },
            ].map(({ label, pct, icon }) => (
              <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${
                pct === 100 ? "bg-white/20 text-white" : pct > 0 ? "bg-amber-300/30 text-white" : "bg-black/20 text-white/60"
              }`}>
                <span>
                  {icon}
                </span>
                <span className="font-medium">{label}</span>
                {pct < 100 && <span className="opacity-70">: {pct}%</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ SECTION 1: ENROLLMENT DETAILS ═════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-extrabold text-white">1</span>
            </span>
            <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Enrollment Details</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
            <Lock className="w-3 h-3" />
            <span>Admin Managed</span>
          </div>
        </div>

        {/* Bordered table grid — Program */}
        <div className="border-b border-slate-100">
          <div className="px-4 py-1.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 text-red-600" />
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-red-600">Program Information</p>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {[
                { label: "Faculty / Department", value: (sd.faculty as string) || "" },
                { label: "Course", value: (sd.course as string) || "" },
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
                { label: "Duration", value: (sd.duration as string) || "" },
                { label: "Academic Year", value: `${sd.startYear || ""}${sd.endYear ? ` – ${sd.endYear}` : ""}` },
                { label: "Enrollment Date", value: (sd.enrollmentDate as string) || "" },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-2.5 cursor-not-allowed select-none" title="Managed by admin">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
                  <p className="text-xs font-semibold text-slate-900">{value || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bordered table grid — University & Fee */}
        <div className="border-b border-slate-100">
          <div className="px-4 py-1.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5">
            <Building2 className="w-3 h-3 text-red-600" />
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-red-600">University &amp; Fee</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {[
              { label: "University / Affiliated Institution", value: (sd.university as string) || "", span: "col-span-2" },
              { label: "Total Course Fee", value: sd.totalFee ? `₹${(sd.totalFee as number).toLocaleString("en-IN")}` : "", span: "" },
            ].map(({ label, value, span }) => (
              <div key={label} className={`${span} px-4 py-2.5 cursor-not-allowed select-none`} title="Managed by admin">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
                <p className="text-xs font-semibold text-slate-900">{value || "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bordered table grid — Contact */}
        <div>
          <div className="px-4 py-1.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-red-600" />
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-red-600">Contact</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {[
              { label: "Registered Mobile", value: user?.phone || "", span: "" },
              { label: "Email Address", value: (sd.email as string) || "", span: "col-span-2" },
            ].map(({ label, value, span }) => (
              <div key={label} className={`${span} px-4 py-2.5 cursor-not-allowed select-none`} title="Managed by admin">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
                <p className="text-xs font-semibold text-slate-900">{value || "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Admin notice */}
        <div className="flex items-center gap-2 bg-amber-50 border-t border-amber-100 px-4 py-2">
          <Lock className="w-3 h-3 text-amber-700 flex-shrink-0" />
          <p className="text-[10px] font-semibold text-amber-800">Managed by institute. Contact admin to request changes.</p>
        </div>
      </div>

      {/* ══ SECTION 2: PERSONAL INFORMATION ═══════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-extrabold text-white">2</span>
            </span>
            <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Personal Information</p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sectionStatus(personalPct)}`}>
            {personalPct === 100 ? "✓ Complete" : personalPct > 0 ? `${personalPct}% Filled` : "Not Started"}
          </span>
        </div>

        <div className="p-4 space-y-4">
          {!canEdit && (
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
              <Lock className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
              <p className="text-xs font-semibold text-slate-700">Profile editing is currently locked by admin.</p>
            </div>
          )}

          {/* Basic */}
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-red-600 mb-3">Basic Details</p>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Date of Birth *" type="date" value={personal.dob || ""} onChange={v => up("dob", v)} disabled={!canEdit} />
              <Input label="Gender *" type="select" value={personal.gender || ""} onChange={v => up("gender", v)}
                options={["Male", "Female", "Other"]} disabled={!canEdit} />
              <Input label="Blood Group" type="select" value={personal.bloodGroup || ""} onChange={v => up("bloodGroup", v)}
                options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]} disabled={!canEdit} />
              <Input label="Father's Name *" value={personal.fatherName || ""} onChange={v => up("fatherName", v)} disabled={!canEdit} />
              <div className="col-span-2">
                <Input label="Mother's Name *" value={personal.motherName || ""} onChange={v => up("motherName", v)} disabled={!canEdit} />
              </div>
            </div>
          </div>

          {/* Aadhaar */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-red-600 mb-3 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Identity Document (Aadhaar)
            </p>
            <div className="grid grid-cols-3 gap-3 items-start">
              <div className="col-span-2">
                <Input label="Aadhaar Card Number * (12 digits)" value={personal.aadhaarNumber || ""}
                  onChange={v => up("aadhaarNumber", v.replace(/\D/g, "").slice(0, 12))}
                  placeholder="Enter 12-digit number" inputMode="numeric" disabled={!canEdit} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Aadhaar Document *</label>
                <label htmlFor="aadhaar-upload"
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded border transition-all cursor-pointer ${(!canEdit || uploadingAadhaar) ? 'opacity-50 pointer-events-none' : ''} ${
                    personal.aadhaarUrl ? "border-green-500 bg-green-50 text-green-800" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}>
                  {uploadingAadhaar ? <Loader2 className="w-3 h-3 animate-spin" /> : personal.aadhaarUrl ? <CheckCircle className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                  {uploadingAadhaar ? "Uploading…" : personal.aadhaarUrl ? "Uploaded ✓" : "Upload PDF / Image"}
                </label>
                {personal.aadhaarUrl && (
                  <a href={personal.aadhaarUrl} target="_blank" rel="noreferrer"
                    className="block text-center text-[10px] font-semibold text-green-800 underline mt-1">View Document</a>
                )}
                <input id="aadhaar-upload" ref={aadhaarRef} type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={e => e.target.files?.[0] && handleAadhaarUpload(e.target.files[0])} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-red-600 mb-3 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Permanent Address
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <Input label="House No. / Street / Village *" value={personal.address || ""} onChange={v => up("address", v)} disabled={!canEdit} />
              </div>
              <Input label="City / Town *" value={personal.city || ""} onChange={v => up("city", v)} disabled={!canEdit} />
              <Input label="State *" value={personal.state || ""} onChange={v => up("state", v)} disabled={!canEdit} />
              <Input label="PIN Code *" value={personal.pincode || ""} onChange={v => up("pincode", v.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" disabled={!canEdit} />
            </div>
          </div>

          {canEdit && (
            <button onClick={savePersonal} disabled={savingPersonal}
              className="w-full py-2.5 text-sm font-bold text-white rounded-lg gradient-bg flex items-center justify-center gap-2 disabled:opacity-60">
              {savingPersonal ? <Loader2 className="w-4 h-4 animate-spin" /> : savedPersonal ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savingPersonal ? "Saving…" : savedPersonal ? "Changes Saved Successfully" : "Save Personal Information"}
            </button>
          )}
        </div>
      </div>

      {/* ══ SECTION 3: ACADEMIC BACKGROUND ════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-extrabold text-white">3</span>
            </span>
            <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Academic Background</p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sectionStatus(academicPct)}`}>
            {academicPct === 100 ? "✓ Complete" : academicPct > 0 ? `${academicPct}% Filled` : "Not Started"}
          </span>
        </div>

        <div className="p-4 space-y-2">
          <AcademicBlock title="10th / SSLC" emoji="🏫"
            level={academic.sslc || {}} onChange={(k, v) => upLevel("sslc", k, v)} disabled={!canEdit}
            fields={[
              { key: "institution", label: "School Name", span: 3 },
              { key: "board", label: "Board of Examination", span: 2, type: "select", options: ["CBSE", "ICSE", "Kerala SSLC", "TN SSLC", "State Board", "Other"] },
              { key: "year", label: "Year of Passing", inputMode: "numeric" },
              { key: "percentage", label: "Percentage / Grade", inputMode: "decimal" },
            ]}
          />
          <AcademicBlock title="12th / Plus Two / HSC" emoji="📚"
            level={academic.plustwo || {}} onChange={(k, v) => upLevel("plustwo", k, v)} disabled={!canEdit}
            fields={[
              { key: "institution", label: "School / College Name", span: 3 },
              { key: "board", label: "Board", span: 2, type: "select", options: ["CBSE", "ICSE", "Kerala HSE", "TN HSE", "State Board", "Other"] },
              { key: "stream", label: "Stream", type: "select", options: ["Science (Bio)", "Science (Maths)", "Commerce", "Arts / Humanities", "Vocational", "Other"] },
              { key: "year", label: "Year of Passing", inputMode: "numeric" },
              { key: "percentage", label: "Percentage / Grade", inputMode: "decimal" },
            ]}
          />
          <AcademicBlock title="Undergraduate (UG)" emoji="🎓" optional
            level={academic.ug || {}} onChange={(k, v) => upLevel("ug", k, v)} disabled={!canEdit}
            fields={[
              { key: "institution", label: "College / Institution", span: 2 },
              { key: "degree", label: "Degree (e.g. B.Com, B.Sc)" },
              { key: "board", label: "University", span: 2 },
              { key: "stream", label: "Specialization" },
              { key: "year", label: "Year of Passing", inputMode: "numeric" },
              { key: "percentage", label: "Percentage / CGPA", inputMode: "decimal" },
            ]}
          />
          <AcademicBlock title="Postgraduate (PG)" emoji="🏛️" optional
            level={academic.pg || {}} onChange={(k, v) => upLevel("pg", k, v)} disabled={!canEdit}
            fields={[
              { key: "institution", label: "College / Institution", span: 2 },
              { key: "degree", label: "Degree (e.g. M.Com, MBA)" },
              { key: "board", label: "University", span: 2 },
              { key: "stream", label: "Specialization" },
              { key: "year", label: "Year of Passing", inputMode: "numeric" },
              { key: "percentage", label: "Percentage / CGPA", inputMode: "decimal" },
            ]}
          />

          {/* PhD */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 flex items-center gap-2">
              <span>🔬</span>
              <p className="text-xs font-bold text-slate-900">PhD / Doctoral Research</p>
              <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded ml-1">Optional</span>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input label="Institution / University" value={academic.phd?.institution || ""} onChange={v => upPhd("institution", v)} disabled={!canEdit} />
              </div>
              <Input label="Year of Registration" value={academic.phd?.year || ""} onChange={v => upPhd("year", v)} inputMode="numeric" disabled={!canEdit} />
              <div className="col-span-2">
                <Input label="Research Topic / Thesis Title" value={academic.phd?.topic || ""} onChange={v => upPhd("topic", v)} disabled={!canEdit} />
              </div>
              <Input label="Current Status" type="select" value={academic.phd?.status || ""} onChange={v => upPhd("status", v)}
                options={["Ongoing", "Submitted", "Awarded"]} disabled={!canEdit} />
            </div>
          </div>

          {canEdit && (
            <button onClick={saveAcademic} disabled={savingAcademic}
              className="w-full py-2.5 text-sm font-bold text-white rounded-lg gradient-bg flex items-center justify-center gap-2 disabled:opacity-60">
              {savingAcademic ? <Loader2 className="w-4 h-4 animate-spin" /> : savedAcademic ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savingAcademic ? "Saving…" : savedAcademic ? "Changes Saved Successfully" : "Save Academic Details"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
