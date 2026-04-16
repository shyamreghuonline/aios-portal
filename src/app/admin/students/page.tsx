"use client";

import { useEffect, useState } from "react";
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
  ArrowUpDown,
  Receipt,
  GraduationCap,
  Bell,
} from "lucide-react";
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
  const [sortCol, setSortCol] = useState<"university" | "year" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [paidMap, setPaidMap] = useState<Record<string, number>>({});
  const [paymentsModal, setPaymentsModal] = useState<{ student: Student; payments: Payment[] } | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [togglingProfileId, setTogglingProfileId] = useState<string | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
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
        const phone = p.phone as string;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const phoneKey = "+91" + formData.phone.replace(/\D/g, "");
      await setDoc(doc(db, "students", phoneKey), {
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
        totalFee: parseFloat(formData.totalFee),
        enrollmentDate: formData.enrollmentDate,
        createdAt: serverTimestamp(),
      });
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
        enrollmentDate: new Date().toISOString().split("T")[0],
      });
      setShowForm(false);
      setCustomUniversity(false);
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
      s.faculty?.toLowerCase().includes(search.toLowerCase()) ||
      s.course?.toLowerCase().includes(search.toLowerCase())
  );

  const totalFee = students.reduce((sum, s) => sum + (s.totalFee || 0), 0);
  const totalPaid = Object.values(paidMap).reduce((a, b) => a + b, 0);
  const totalDue = totalFee - totalPaid;

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">Students</h1>
          <p className="text-xs font-medium text-slate-700">{students.length} students enrolled</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl gradient-bg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      {/* Stat Cards */}
      {!loading && students.length > 0 && (
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
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
              <p className="text-base font-extrabold text-green-700 leading-tight">{students.filter((s) => (s.totalFee || 0) - (paidMap[s.phone] || 0) <= 0).length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">

        {/* Search bar */}
        {!loading && students.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, course..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 ml-auto">{filtered.length} of {students.length} students</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No students yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-50 border-y-2 border-red-100 sticky top-0 z-10">
                  <th className="text-left px-5 py-3 font-bold text-red-800 text-[10px] uppercase tracking-widest">Name</th>
                  <th className="text-left px-5 py-3 font-bold text-red-800 text-[10px] uppercase tracking-widest">Phone</th>
                  <th className="text-left px-5 py-3 font-bold text-red-800 text-[10px] uppercase tracking-widest">Total Fee</th>
                  <th className="text-left px-5 py-3 font-bold text-red-800 text-[10px] uppercase tracking-widest">Due Amount</th>
                  <th className="text-left px-5 py-3 font-bold text-red-800 text-[10px] uppercase tracking-widest">Course</th>
                  <th
                    className="text-left px-5 py-3 font-bold text-red-800 text-[10px] uppercase tracking-widest cursor-pointer select-none hover:text-red-600 transition-colors"
                    onClick={() => { setSortCol("university"); setSortDir(sortCol === "university" && sortDir === "asc" ? "desc" : "asc"); }}
                  >
                    University <ArrowUpDown className="inline w-3 h-3 ml-0.5" />
                  </th>
                  <th
                    className="text-left px-5 py-3 font-bold text-red-800 text-[10px] uppercase tracking-widest cursor-pointer select-none hover:text-red-600 transition-colors"
                    onClick={() => { setSortCol("year"); setSortDir(sortCol === "year" && sortDir === "asc" ? "desc" : "asc"); }}
                  >
                    Year <ArrowUpDown className="inline w-3 h-3 ml-0.5" />
                  </th>
                  <th className="text-right px-5 py-3 font-bold text-red-800 text-[10px] uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...filtered].sort((a, b) => {
                  if (!sortCol) return 0;
                  const dir = sortDir === "asc" ? 1 : -1;
                  if (sortCol === "university") return (a.university || "").localeCompare(b.university || "") * dir;
                  if (sortCol === "year") return ((a.startYear || "").localeCompare(b.startYear || "")) * dir;
                  return 0;
                }).map((student, idx) => {
                  const initials = student.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";
                  const due = (student.totalFee || 0) - (paidMap[student.phone] || 0);
                  const photoUrl = student.personalDetails?.photo;
                  return (
                    <tr key={student.id} className={`border-b border-red-50 hover:bg-red-50/60 transition-colors ${idx % 2 !== 0 ? "bg-red-50/20" : "bg-white"}`}>
                      <td className="px-5 py-3">
                        <button onClick={() => setDetailStudent(student)} className="text-left flex items-center gap-3 group/name">
                          <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                            {photoUrl ? (
                              <img src={photoUrl} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-extrabold text-white">{initials}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs group-hover/name:text-red-700 transition-colors">{student.name}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">{student.email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-3 text-slate-800 text-xs font-mono whitespace-nowrap">{student.phone}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-800">₹{(student.totalFee || 0).toLocaleString("en-IN")}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {due <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-[11px] font-bold">✓ Cleared</span>
                        ) : (
                          <div>
                            <p className="text-xs font-bold text-red-600">₹{due.toLocaleString("en-IN")}</p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded-md">Due Amount</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 max-w-[160px]">
                        <p className="text-xs font-bold text-slate-900 leading-tight">{student.course}</p>
                        {student.stream && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-md">{student.stream}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-800 font-semibold">{student.university}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {student.startYear}{student.endYear ? ` – ${student.endYear}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header with Photo */}
            <div className="gradient-bg px-7 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30">
                  {detailStudent.personalDetails?.photo ? (
                    <img src={detailStudent.personalDetails.photo} alt={detailStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-white tracking-tight">{detailStudent.name}</h2>
                  <a href={`tel:${detailStudent.phone}`} className="text-sm text-red-100 mt-0.5 font-medium hover:text-white hover:underline block">{detailStudent.phone}</a>
                  <p className="text-xs text-red-200 mt-0.5">{detailStudent.email}</p>
                </div>
              </div>
              <button onClick={() => setDetailStudent(null)} className="text-white/60 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Enrollment Details - First */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-4 rounded-full bg-red-600" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-800">Enrollment Details</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Faculty", value: detailStudent.faculty },
                    { label: "Course", value: detailStudent.course },
                    { label: "Stream", value: detailStudent.stream || "—" },
                    { label: "Duration", value: detailStudent.duration || "—" },
                    { label: "University", value: detailStudent.university },
                    { label: "Academic Year", value: `${detailStudent.startYear}${detailStudent.endYear ? ` – ${detailStudent.endYear}` : ""}` },
                    { label: "Total Fee", value: `₹${(detailStudent.totalFee || 0).toLocaleString("en-IN")}` },
                    { label: "Enrolled On", value: detailStudent.enrollmentDate || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-red-500 mb-0.5">{label}</p>
                      <p className="text-xs font-medium text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-4 rounded-full bg-red-600" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-800">Documents</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Photo - Mandatory */}
                  {detailStudent.personalDetails?.photoUrl ? (
                    <div className="flex flex-col items-center p-3 bg-green-50 border border-green-200 rounded-lg h-20 w-28">
                      <button onClick={() => openBase64(detailStudent.personalDetails!.photoUrl!)} className="w-10 h-10 rounded bg-green-100 flex items-center justify-center hover:ring-2 ring-green-300 transition-all mb-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                      <p className="text-[9px] font-bold text-green-700 text-center leading-tight mb-2">Photo</p>
                      <button onClick={() => downloadDocument(detailStudent.personalDetails!.photoUrl!, `${detailStudent.name.replace(/\s+/g, "_")}_Photo.jpg`)} className="px-2 py-1 text-[8px] font-bold text-green-700 bg-white border border-green-300 rounded hover:bg-green-100">Download</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center p-3 bg-red-50 border border-red-300 rounded-lg h-20 w-28">
                      <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <p className="text-[9px] font-bold text-red-700 text-center leading-tight mb-1">Photo</p>
                      <span className="text-[8px] text-red-600 font-semibold">Missing</span>
                    </div>
                  )}
                  {/* Aadhaar Card - Mandatory */}
                  {detailStudent.personalDetails?.aadhaarUrl ? (
                    <div className="flex flex-col items-center p-3 bg-red-50 border border-red-200 rounded-lg h-20 w-28">
                      <button onClick={() => openBase64(detailStudent.personalDetails!.aadhaarUrl!)} className="w-10 h-10 rounded bg-red-100 flex items-center justify-center hover:ring-2 ring-red-300 transition-all mb-2">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </button>
                      <p className="text-[9px] font-bold text-red-700 text-center leading-tight mb-2">Aadhaar</p>
                      <button onClick={() => downloadDocument(detailStudent.personalDetails!.aadhaarUrl!, `${detailStudent.name.replace(/\s+/g, "_")}_Aadhaar.jpg`)} className="px-2 py-1 text-[8px] font-bold text-red-700 bg-white border border-red-300 rounded hover:bg-red-100">Download</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center p-3 bg-red-50 border border-red-300 rounded-lg h-20 w-28">
                      <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <p className="text-[9px] font-bold text-red-700 text-center leading-tight mb-1">Aadhaar</p>
                      <span className="text-[8px] text-red-600 font-semibold">Missing</span>
                    </div>
                  )}
                  {/* SSLC Certificate - Mandatory */}
                  {detailStudent.academicDetails?.sslc?.certificateUrl ? (
                    <div className="flex flex-col items-center p-3 bg-blue-50 border border-blue-200 rounded-lg h-20 w-28">
                      <button onClick={() => openBase64(detailStudent.academicDetails!.sslc!.certificateUrl!)} className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center hover:ring-2 ring-blue-300 transition-all mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                      <p className="text-[9px] font-bold text-blue-700 text-center leading-tight mb-2">SSLC</p>
                      <button onClick={() => downloadDocument(detailStudent.academicDetails!.sslc!.certificateUrl!, `${detailStudent.name.replace(/\s+/g, "_")}_SSLC.jpg`)} className="px-2 py-1 text-[8px] font-bold text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-100">Download</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center p-3 bg-red-50 border border-red-300 rounded-lg h-20 w-28">
                      <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <p className="text-[9px] font-bold text-red-700 text-center leading-tight mb-1">SSLC</p>
                      <span className="text-[8px] text-red-600 font-semibold">Missing</span>
                    </div>
                  )}
                  {/* HSC Certificate - Mandatory */}
                  {detailStudent.academicDetails?.plustwo?.certificateUrl ? (
                    <div className="flex flex-col items-center p-3 bg-blue-50 border border-blue-200 rounded-lg h-20 w-28">
                      <button onClick={() => openBase64(detailStudent.academicDetails!.plustwo!.certificateUrl!)} className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center hover:ring-2 ring-blue-300 transition-all mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                      <p className="text-[9px] font-bold text-blue-700 text-center leading-tight mb-2">HSC</p>
                      <button onClick={() => downloadDocument(detailStudent.academicDetails!.plustwo!.certificateUrl!, `${detailStudent.name.replace(/\s+/g, "_")}_HSC.jpg`)} className="px-2 py-1 text-[8px] font-bold text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-100">Download</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center p-3 bg-red-50 border border-red-300 rounded-lg h-20 w-28">
                      <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <p className="text-[9px] font-bold text-red-700 text-center leading-tight mb-1">HSC</p>
                      <span className="text-[8px] text-red-600 font-semibold">Missing</span>
                    </div>
                  )}
                  {/* UG Certificate - Optional */}
                  {detailStudent.academicDetails?.ug?.certificateUrl ? (
                    <div className="flex flex-col items-center p-3 bg-blue-50 border border-blue-200 rounded-lg h-20 w-28">
                      <button onClick={() => openBase64(detailStudent.academicDetails!.ug!.certificateUrl!)} className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center hover:ring-2 ring-blue-300 transition-all mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                      <p className="text-[9px] font-bold text-blue-700 text-center leading-tight mb-2">UG</p>
                      <button onClick={() => downloadDocument(detailStudent.academicDetails!.ug!.certificateUrl!, `${detailStudent.name.replace(/\s+/g, "_")}_UG.jpg`)} className="px-2 py-1 text-[8px] font-bold text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-100">Download</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center p-3 bg-slate-100 border border-slate-200 rounded-lg h-20 w-28 opacity-60">
                      <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <p className="text-[9px] font-bold text-slate-500 text-center leading-tight mb-1">UG</p>
                      <span className="text-[8px] text-slate-400">—</span>
                    </div>
                  )}
                  {/* PG Certificate - Optional, only show if uploaded */}
                  {detailStudent.academicDetails?.pg?.certificateUrl && (
                    <div className="flex flex-col items-center p-3 bg-blue-50 border border-blue-200 rounded-lg h-20 w-28">
                      <button onClick={() => openBase64(detailStudent.academicDetails!.pg!.certificateUrl!)} className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center hover:ring-2 ring-blue-300 transition-all mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                      <p className="text-[9px] font-bold text-blue-700 text-center leading-tight mb-2">PG</p>
                      <button onClick={() => downloadDocument(detailStudent.academicDetails!.pg!.certificateUrl!, `${detailStudent.name.replace(/\s+/g, "_")}_PG.jpg`)} className="px-2 py-1 text-[8px] font-bold text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-100">Download</button>
                    </div>
                  )}
                  {/* PhD Certificate - Optional, only show if uploaded */}
                  {detailStudent.academicDetails?.phd?.certificateUrl && (
                    <div className="flex flex-col items-center p-3 bg-blue-50 border border-blue-200 rounded-lg h-20 w-28">
                      <button onClick={() => openBase64(detailStudent.academicDetails!.phd!.certificateUrl!)} className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center hover:ring-2 ring-blue-300 transition-all mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                      <p className="text-[9px] font-bold text-blue-700 text-center leading-tight mb-2">PhD</p>
                      <button onClick={() => downloadDocument(detailStudent.academicDetails!.phd!.certificateUrl!, `${detailStudent.name.replace(/\s+/g, "_")}_PhD.jpg`)} className="px-2 py-1 text-[8px] font-bold text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-100">Download</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-4 rounded-full bg-red-600" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-800">Personal Information</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Date of Birth", value: detailStudent.personalDetails?.dob || "—" },
                    { label: "Gender", value: detailStudent.personalDetails?.gender || "—" },
                    { label: "Blood Group", value: detailStudent.personalDetails?.bloodGroup || "—" },
                    { label: "Father's Name", value: detailStudent.personalDetails?.fatherName || "—" },
                    { label: "Mother's Name", value: detailStudent.personalDetails?.motherName || "—" },
                    { label: "Guardian", value: detailStudent.personalDetails?.guardianName || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-red-500 mb-0.5">{label}</p>
                      <p className="text-xs font-medium text-slate-800 truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-4 rounded-full bg-red-600" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-800">Address & Contact</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 col-span-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-red-500 mb-0.5">Complete Address</p>
                    <p className="text-xs font-medium text-slate-800">
                      {[detailStudent.personalDetails?.address, detailStudent.personalDetails?.city, detailStudent.personalDetails?.state, detailStudent.personalDetails?.pincode].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-red-500 mb-0.5">Guardian Phone</p>
                    {detailStudent.personalDetails?.guardianPhone ? (
                      <a href={`tel:${detailStudent.personalDetails.guardianPhone}`} className="text-xs font-medium text-red-600 hover:underline">{detailStudent.personalDetails.guardianPhone}</a>
                    ) : (
                      <p className="text-xs font-medium text-slate-800">—</p>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-red-500 mb-0.5">Aadhaar Number</p>
                    <p className="text-xs font-medium text-slate-800 font-mono">{detailStudent.personalDetails?.aadhaarNumber || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Academic Background - Table Format */}
              {(detailStudent.academicDetails?.sslc?.institution || detailStudent.academicDetails?.plustwo?.institution || detailStudent.academicDetails?.ug?.institution || detailStudent.academicDetails?.pg?.institution) && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-1 h-4 rounded-full bg-red-600" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-800">Academic Background</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="px-3 py-2 text-left font-bold text-slate-700 text-[10px] uppercase">Qualification</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-700 text-[10px] uppercase">Institution</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-700 text-[10px] uppercase">Board/University</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-700 text-[10px] uppercase">Year</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-700 text-[10px] uppercase">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailStudent.academicDetails?.sslc?.institution && (
                          <tr className="border-t border-slate-100">
                            <td className="px-3 py-2 font-semibold text-slate-800">SSLC / 10th</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.sslc.institution}</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.sslc.board || "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.sslc.year || "—"}</td>
                            <td className="px-3 py-2 font-semibold text-green-600">{detailStudent.academicDetails.sslc.percentage || "—"}%</td>
                          </tr>
                        )}
                        {detailStudent.academicDetails?.plustwo?.institution && (
                          <tr className="border-t border-slate-100 bg-slate-50/50">
                            <td className="px-3 py-2 font-semibold text-slate-800">HSC / 12th</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.plustwo.institution}</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.plustwo.board || detailStudent.academicDetails.plustwo.stream || "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.plustwo.year || "—"}</td>
                            <td className="px-3 py-2 font-semibold text-green-600">{detailStudent.academicDetails.plustwo.percentage || "—"}%</td>
                          </tr>
                        )}
                        {detailStudent.academicDetails?.ug?.institution && (
                          <tr className="border-t border-slate-100">
                            <td className="px-3 py-2 font-semibold text-slate-800">UG Degree</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.ug.institution}</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.ug.degree || detailStudent.academicDetails.ug.board || "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.ug.year || "—"}</td>
                            <td className="px-3 py-2 font-semibold text-green-600">{detailStudent.academicDetails.ug.percentage || "—"}%</td>
                          </tr>
                        )}
                        {detailStudent.academicDetails?.pg?.institution && (
                          <tr className="border-t border-slate-100 bg-slate-50/50">
                            <td className="px-3 py-2 font-semibold text-slate-800">PG Degree</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.pg.institution}</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.pg.degree || detailStudent.academicDetails.pg.board || "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{detailStudent.academicDetails.pg.year || "—"}</td>
                            <td className="px-3 py-2 font-semibold text-green-600">{detailStudent.academicDetails.pg.percentage || "—"}%</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            <div className="px-7 py-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button onClick={() => setDetailStudent(null)} className="px-5 py-2 text-xs font-bold text-white gradient-bg rounded-lg hover:shadow-md transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Payments Modal */}
      {paymentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">{paymentsModal.student.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{paymentsModal.student.phone} &bull; {paymentsModal.student.course}</p>
              </div>
              <button onClick={() => setPaymentsModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">Total Fee</p>
                <p className="text-base font-bold text-slate-800">₹{(paymentsModal.student.totalFee || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">Paid</p>
                <p className="text-base font-bold text-green-700">₹{(paidMap[paymentsModal.student.phone] || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">Balance</p>
                {(() => {
                  const due = (paymentsModal.student.totalFee || 0) - (paidMap[paymentsModal.student.phone] || 0);
                  return <p className={`text-base font-bold ${due <= 0 ? "text-green-700" : "text-red-600"}`}>{due <= 0 ? "✓ Cleared" : `₹${due.toLocaleString("en-IN")}`}</p>;
                })()}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loadingPayments ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-red-600" /></div>
              ) : paymentsModal.payments.length === 0 ? (
                <div className="text-center py-10">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No payments recorded yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="gradient-bg">
                      <th className="text-left px-6 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest">Receipt</th>
                      <th className="text-left px-6 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest">Date</th>
                      <th className="text-left px-6 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest">Mode</th>
                      <th className="text-right px-6 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsModal.payments.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <Link href={`/admin/payments/${p.id}`} className="text-xs font-mono text-blue-600 hover:underline" target="_blank">{p.receiptNumber}</Link>
                          <p className="text-[10px] text-slate-400 mt-0.5">Installment {p.installmentNumber}</p>
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-700">{p.paymentDate}</td>
                        <td className="px-6 py-3 text-xs text-slate-600">{p.paymentMode}</td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-green-700">₹{(p.amountPaid || 0).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
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
                  <select
                    value={formData.faculty}
                    onChange={(e) => setFormData({ ...formData, faculty: e.target.value, course: "", stream: "", duration: "", endYear: "" })}
                    required
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                  >
                    <option value="">Select Faculty</option>
                    {getFaculties().map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Course *</label>
                  {formData.faculty && formData.faculty !== "Custom/Other" ? (
                    <select
                      value={formData.course}
                      onChange={(e) => {
                        const course = e.target.value;
                        const dur = formData.faculty && course ? getDuration(formData.faculty, course) : "";
                        const end = dur ? calcEndYear(dur, formData.startYear) : "";
                        setFormData({ ...formData, course, stream: "", duration: dur, endYear: end });
                      }}
                      required
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                    >
                      <option value="">Select Course</option>
                      {availableCourses.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
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
                  {formData.course && formData.faculty !== "Custom/Other" ? (
                    <select
                      value={formData.stream}
                      onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                      required
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none appearance-none bg-white"
                    >
                      <option value="">Select Stream</option>
                      {availableStreams.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
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

              {/* Custom/Other: Free text for course, stream, duration */}
              {formData.faculty === "Custom/Other" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Course *</label>
                    <input type="text" value={formData.course} required placeholder="Enter course"
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Stream *</label>
                    <input type="text" value={formData.stream} required placeholder="Enter stream"
                      onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Duration *</label>
                    <input type="text" value={formData.duration} required placeholder="e.g., 3 Years"
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Duration, Start Year, End Year */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={formData.duration || autoDuration}
                    readOnly
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
                  />
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

              {/* Fee & Enrollment Date */}
              <div className="grid grid-cols-2 gap-3">
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
