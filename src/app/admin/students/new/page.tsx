"use client";

import { useState, useEffect } from "react";
import { collection, doc, setDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Plus,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { getFaculties, getCourses, getStreams, getDuration } from "@/lib/courses-data";
import { useRouter } from "next/navigation";

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
    const studentId = doc.data().studentId as string | undefined;
    if (studentId && studentId.startsWith(prefix)) {
      const serialPart = studentId.slice(prefix.length); // Get last 5 digits
      const serial = parseInt(serialPart, 10);
      if (!isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  });

  // Generate next serial (5 digits with leading zeros)
  const nextSerial = String(maxSerial + 1).padStart(5, "0");
  return `${prefix}${nextSerial}`;
}

export default function NewStudentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [customUniversity, setCustomUniversity] = useState(false);
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

  // Calculate end year from duration
  function calcEndYear(duration: string, startYear: string): string {
    const match = duration.match(/(\d+)\s*Year/i);
    if (match && startYear) {
      return String(parseInt(startYear) + parseInt(match[1]));
    }
    return "";
  }

  // Update duration and end year when course changes
  useEffect(() => {
    if (autoDuration && formData.startYear) {
      const endYear = calcEndYear(autoDuration, formData.startYear);
      setFormData(prev => ({
        ...prev,
        duration: autoDuration,
        endYear: endYear
      }));
    }
  }, [autoDuration, formData.startYear]);

  const yearOptions = Array.from({ length: currentYear - 2008 + 10 }, (_, i) => 2008 + i);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const studentId = await generateStudentId();
      const { name, email, phone, faculty, course, stream, duration, university, startYear, endYear, totalFee, discountAmount, enrollmentDate } = formData;

      if (!name || !email || !phone || !faculty || !course || !university || !totalFee) {
        alert("Please fill in all required fields");
        setSaving(false);
        return;
      }

      await setDoc(doc(db, "students", phone), {
        name,
        email,
        phone,
        faculty,
        course,
        stream: stream || "",
        duration: duration || autoDuration || "",
        university,
        startYear,
        endYear,
        totalFee: parseFloat(totalFee),
        discountAmount: parseFloat(discountAmount || "0"),
        enrollmentDate,
        studentId,
        profileEditEnabled: true,
        createdAt: serverTimestamp(),
      });

      router.push("/admin/students");
    } catch (err) {
      console.error("Error adding student:", err);
      alert("Failed to add student. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none";
  const labelClass = "block text-xs font-bold text-slate-700 mb-1";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Students
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Add New Student</h1>
          <p className="text-sm text-slate-500">Enter student details to enroll</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* Personal Info */}
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center text-[10px] text-white">1</span>
            Personal Information
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
                placeholder="Enter full name"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass}
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                className={inputClass}
                placeholder="10-digit mobile number"
                required
              />
            </div>
          </div>
        </div>

        {/* Course Info */}
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center text-[10px] text-white">2</span>
            Course & Program Details
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Faculty *</label>
              <select
                value={formData.faculty}
                onChange={(e) => setFormData({ ...formData, faculty: e.target.value, course: "", stream: "" })}
                className={inputClass}
                required
              >
                <option value="">Select Faculty</option>
                {getFaculties().map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Course *</label>
              <select
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value, stream: "" })}
                className={inputClass}
                disabled={!formData.faculty}
                required
              >
                <option value="">Select Course</option>
                {availableCourses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Stream / Specialization</label>
              <select
                value={formData.stream}
                onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                className={inputClass}
                disabled={!formData.course}
              >
                <option value="">Select Stream</option>
                {availableStreams.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Duration</label>
              <input
                type="text"
                value={formData.duration || autoDuration}
                readOnly
                className={`${inputClass} bg-slate-50`}
              />
            </div>
          </div>
        </div>

        {/* Academic Info */}
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center text-[10px] text-white">3</span>
            Academic Details
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>University *</label>
              <select
                value={customUniversity ? "__custom__" : formData.university}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setCustomUniversity(true);
                    setFormData({ ...formData, university: "" });
                  } else {
                    setCustomUniversity(false);
                    setFormData({ ...formData, university: e.target.value });
                  }
                }}
                className={inputClass}
                required
              >
                <option value="">Select University</option>
                <option value="Mumbai University">Mumbai University</option>
                <option value="Delhi University">Delhi University</option>
                <option value="Bangalore University">Bangalore University</option>
                <option value="Pune University">Pune University</option>
                <option value="__custom__">+ Add Custom University</option>
              </select>
              {customUniversity && (
                <input
                  type="text"
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                  className={`${inputClass} mt-2`}
                  placeholder="Enter university name"
                  required
                />
              )}
            </div>
            <div>
              <label className={labelClass}>Start Year *</label>
              <select
                value={formData.startYear}
                onChange={(e) => setFormData({ ...formData, startYear: e.target.value })}
                className={inputClass}
                required
              >
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>End Year</label>
              <input
                type="text"
                value={formData.endYear}
                readOnly
                className={`${inputClass} bg-slate-50`}
              />
            </div>
            <div>
              <label className={labelClass}>Enrollment Date</label>
              <input
                type="date"
                value={formData.enrollmentDate}
                onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Fee Info */}
        <div className="pb-2">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center text-[10px] text-white">4</span>
            Fee Details
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Total Fee (₹) *</label>
              <input
                type="number"
                value={formData.totalFee}
                onChange={(e) => setFormData({ ...formData, totalFee: e.target.value })}
                className={inputClass}
                placeholder="Enter total fee amount"
                min="0"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Initial Discount (₹)</label>
              <input
                type="number"
                value={formData.discountAmount}
                onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                className={inputClass}
                placeholder="Enter discount amount"
                min="0"
              />
            </div>
            <div className="flex items-end">
              <div className="bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
                <p className="text-xs text-slate-500">Effective Fee</p>
                <p className="text-lg font-bold text-slate-800">
                  ₹{((parseFloat(formData.totalFee || "0") - parseFloat(formData.discountAmount || "0")).toLocaleString("en-IN"))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/admin/students"
            className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-[2] py-2.5 text-sm font-bold text-white gradient-bg rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? "Adding Student..." : "Add Student"}
          </button>
        </div>
      </form>
    </div>
  );
}
