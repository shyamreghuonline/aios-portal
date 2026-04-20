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

export default function NewStudentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [customUniversity, setCustomUniversity] = useState(false);
  const [customFaculty, setCustomFaculty] = useState(false);
  const [customCourse, setCustomCourse] = useState(false);
  const [customStream, setCustomStream] = useState(false);
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

      const phoneKey = "+91" + phone.replace(/\D/g, "");

      await setDoc(doc(db, "students", phoneKey), {
        name,
        email,
        phone: phoneKey,
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

      // If discount exists, create a discount payment record
      const discountAmt = parseFloat(discountAmount || "0");
      if (discountAmt > 0) {
        const discountReceiptId = await generateReceiptId("discount");
        await setDoc(doc(db, "payments", discountReceiptId), {
          receiptNumber: discountReceiptId,
          amountPaid: discountAmt,
          paymentDate: enrollmentDate,
          paymentMode: "Discount",
          installmentNumber: 0,
          totalInstallments: 0,
          balanceAmount: parseFloat(totalFee) - discountAmt,
          transactionRef: "Administrative Discount",
          remarks: `Discount given to ${name}`,
          studentPhone: phoneKey,
          studentName: name,
          studentEmail: email,
          university,
          course,
          stream: stream || "",
          program: course,
          totalFee: parseFloat(totalFee),
          createdAt: serverTimestamp(),
          isDiscount: true,
        });
      }

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
              {customFaculty ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={formData.faculty}
                    onChange={(e) => setFormData({ ...formData, faculty: e.target.value, course: "", stream: "", duration: "", endYear: "" })}
                    required
                    className={inputClass}
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
                  className={inputClass}
                  required
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
              <label className={labelClass}>Course *</label>
              {customCourse ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value, stream: "", duration: "", endYear: "" })}
                    required
                    className={inputClass}
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
                  className={inputClass}
                  required
                >
                  <option value="">Select Course</option>
                  {availableCourses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__other__">Other (Type custom)</option>
                </select>
              ) : (
                <select disabled className={`${inputClass} bg-slate-50 text-slate-500`}>
                  <option>Select faculty first</option>
                </select>
              )}
            </div>
            <div>
              <label className={labelClass}>Stream / Specialization</label>
              {customStream ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.stream}
                    onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                    className={inputClass}
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
                  className={inputClass}
                >
                  <option value="">Select Stream</option>
                  {availableStreams.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="__other__">Other (Type custom)</option>
                </select>
              ) : (
                <select disabled className={`${inputClass} bg-slate-50 text-slate-500`}>
                  <option>Select course first</option>
                </select>
              )}
            </div>
            <div>
              <label className={labelClass}>Duration{customCourse ? " *" : ""}</label>
              {customCourse ? (
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                  placeholder="e.g., 3 Years"
                  className={inputClass}
                />
              ) : (
                <input
                  type="text"
                  value={formData.duration || autoDuration}
                  readOnly
                  className={`${inputClass} bg-slate-50`}
                />
              )}
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
              {customUniversity ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    required
                    className={inputClass}
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
                  className={inputClass}
                  required
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
