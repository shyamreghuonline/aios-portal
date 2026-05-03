"use client";

import { useEffect, useState, useRef } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft, Save, Loader2, Upload, CheckCircle, X, AlertTriangle,
  User, GraduationCap, FileText, Building2, MapPin, Phone, Mail,
  Calendar, ShieldCheck, Briefcase, Users, Edit
} from "lucide-react";
import Link from "next/link";

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

interface Student {
  id: string;
  name: string;
  phone: string;
  email: string;
  studentId: string;
  course: string;
  university: string;
  totalFee: number;
  discountAmount: number;
  personalDetails?: PersonalDetails;
  academicDetails?: AcademicDetails;
}

export default function StudentEditPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false);
  const [uploadingCert, setUploadingCert] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);

  const [personal, setPersonal] = useState<PersonalDetails>({});
  const [academic, setAcademic] = useState<AcademicDetails>({});

  useEffect(() => {
    async function fetchStudent() {
      const pathParts = window.location.pathname.split("/");
      const studentId = pathParts[pathParts.length - 2];
      
      if (!studentId) {
        setError("Student ID not found");
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "students", studentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Student;
          setStudent(data);
          setPersonal(data.personalDetails || {});
          setAcademic(data.academicDetails || {});
        } else {
          setError("Student not found");
        }
      } catch (err) {
        console.error("Error fetching student:", err);
        setError("Failed to fetch student data");
      } finally {
        setLoading(false);
      }
    }

    fetchStudent();
  }, []);

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
    try {
      setUploadingPhoto(true);
      setUploadError(null);
      const base64 = await uploadToBase64(file);
      setPersonal({ ...personal, photo: base64 });
    } catch (err) {
      console.error("Photo upload error:", err);
      setUploadError("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleAadhaarUpload(file: File) {
    try {
      setUploadingAadhaar(true);
      setUploadError(null);
      const base64 = await uploadToBase64(file);
      setPersonal({ ...personal, aadhaarUrl: base64 });
    } catch (err) {
      console.error("Aadhaar upload error:", err);
      setUploadError("Failed to upload Aadhaar");
    } finally {
      setUploadingAadhaar(false);
    }
  }

  async function handleCertUpload(level: string, file: File) {
    try {
      setUploadingCert({ ...uploadingCert, [level]: true });
      setUploadError(null);
      const base64 = await uploadToBase64(file);
      
      if (level === "phd") {
        setAcademic({
          ...academic,
          phd: { ...academic.phd, certificateUrl: base64 }
        });
      } else {
        setAcademic({
          ...academic,
          [level]: { ...academic[level as keyof AcademicDetails], certificateUrl: base64 }
        });
      }
    } catch (err) {
      console.error("Certificate upload error:", err);
      setUploadError("Failed to upload certificate");
    } finally {
      setUploadingCert({ ...uploadingCert, [level]: false });
    }
  }

  async function handleSave() {
    if (!student) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updateData = {
        personalDetails: personal,
        academicDetails: academic,
      };

      await updateDoc(doc(db, "students", student.id), updateData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving student:", err);
      setError("Failed to save student data");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-slate-600">Loading student data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Error</h3>
          </div>
          <p className="text-slate-600 mb-4">{error}</p>
          <Link
            href={`/admin/students/${student?.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link href={`/admin/students/${student?.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Student Details
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div className="gradient-bg px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center border-2 border-white/30">
                <Edit className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Edit Student Profile</h2>
                <p className="text-xs text-white/80">{student?.studentId || student?.id}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {success && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-800 font-medium">Student data saved successfully</span>
              </div>
            )}

            {uploadError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800 font-medium">{uploadError}</span>
                <button onClick={() => setUploadError(null)} className="ml-auto">
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            )}

            {/* Basic Information - Read Only */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-red-600" />
                Basic Information (Read Only)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-slate-500 mb-1">Name</p>
                  <p className="font-semibold text-slate-900">{student?.name}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Phone</p>
                  <p className="font-semibold text-slate-900">{student?.phone}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Email</p>
                  <p className="font-semibold text-slate-900">{student?.email}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Student ID</p>
                  <p className="font-semibold text-slate-900">{student?.studentId}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Course</p>
                  <p className="font-semibold text-slate-900">{student?.course}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">University</p>
                  <p className="font-semibold text-slate-900">{student?.university}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Total Fee</p>
                  <p className="font-semibold text-slate-900">₹{student?.totalFee}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Discount</p>
                  <p className="font-semibold text-slate-900">₹{student?.discountAmount || 0}</p>
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-600" />
                Personal Details
              </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Photo</label>
                <div className="flex items-center gap-3">
                  {personal.photo && (
                    <img src={personal.photo} alt="Student" className="w-20 h-20 rounded-lg object-cover border border-slate-200" />
                  )}
                  <label htmlFor="photo-upload" className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer">
                    {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                  </label>
                  <input id="photo-upload" type="file" accept="image/*" ref={photoRef} className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={personal.dob || ""}
                  onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gender</label>
                <select
                  value={personal.gender || ""}
                  onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Blood Group</label>
                <select
                  value={personal.bloodGroup || ""}
                  onChange={(e) => setPersonal({ ...personal, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Father's Name</label>
                <input
                  type="text"
                  value={personal.fatherName || ""}
                  onChange={(e) => setPersonal({ ...personal, fatherName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mother's Name</label>
                <input
                  type="text"
                  value={personal.motherName || ""}
                  onChange={(e) => setPersonal({ ...personal, motherName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Guardian Name</label>
                <input
                  type="text"
                  value={personal.guardianName || ""}
                  onChange={(e) => setPersonal({ ...personal, guardianName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address</label>
                <textarea
                  value={personal.address || ""}
                  onChange={(e) => setPersonal({ ...personal, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={personal.city || ""}
                  onChange={(e) => setPersonal({ ...personal, city: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
                <input
                  type="text"
                  value={personal.state || ""}
                  onChange={(e) => setPersonal({ ...personal, state: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pincode</label>
                <input
                  type="text"
                  value={personal.pincode || ""}
                  onChange={(e) => setPersonal({ ...personal, pincode: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Aadhaar Number</label>
                <input
                  type="text"
                  value={personal.aadhaarNumber || ""}
                  onChange={(e) => setPersonal({ ...personal, aadhaarNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Aadhaar Document</label>
                <div className="flex items-center gap-3">
                  {personal.aadhaarUrl && (
                    <span className="text-xs text-green-600 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Aadhaar uploaded
                    </span>
                  )}
                  <label htmlFor="aadhaar-upload" className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer">
                    {uploadingAadhaar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploadingAadhaar ? "Uploading..." : "Upload Aadhaar"}
                  </label>
                  <input id="aadhaar-upload" type="file" accept="image/*,application/pdf" ref={aadhaarRef} className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleAadhaarUpload(e.target.files[0])} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Employment Type</label>
                <select
                  value={personal.employmentType || ""}
                  onChange={(e) => setPersonal({ ...personal, employmentType: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                >
                  <option value="">Select</option>
                  <option value="Employed">Employed</option>
                  <option value="Self-Employed">Self-Employed</option>
                  <option value="Unemployed">Unemployed</option>
                  <option value="Student">Student</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Years of Experience</label>
                <input
                  type="text"
                  value={personal.yearsOfExperience || ""}
                  onChange={(e) => setPersonal({ ...personal, yearsOfExperience: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-red-600" />
              Academic Details
            </h3>
            
            {/* SSLC */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <h4 className="text-xs font-semibold text-slate-900 mb-3">SSLC / 10th</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institution</label>
                  <input
                    type="text"
                    value={academic.sslc?.institution || ""}
                    onChange={(e) => setAcademic({ ...academic, sslc: { ...academic.sslc, institution: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Board</label>
                  <input
                    type="text"
                    value={academic.sslc?.board || ""}
                    onChange={(e) => setAcademic({ ...academic, sslc: { ...academic.sslc, board: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Year</label>
                  <input
                    type="text"
                    value={academic.sslc?.year || ""}
                    onChange={(e) => setAcademic({ ...academic, sslc: { ...academic.sslc, year: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Percentage</label>
                  <input
                    type="text"
                    value={academic.sslc?.percentage || ""}
                    onChange={(e) => setAcademic({ ...academic, sslc: { ...academic.sslc, percentage: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Certificate</label>
                  <div className="flex items-center gap-3">
                    {academic.sslc?.certificateUrl && (
                      <span className="text-xs text-green-600 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Certificate uploaded
                      </span>
                    )}
                    <label htmlFor="sslc-cert-upload" className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer">
                      {uploadingCert.sslc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploadingCert.sslc ? "Uploading..." : "Upload Certificate"}
                    </label>
                    <input id="sslc-cert-upload" type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleCertUpload("sslc", e.target.files[0])} />
                  </div>
                </div>
              </div>
            </div>

            {/* Plus Two */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <h4 className="text-xs font-semibold text-slate-900 mb-3">HSC / 12th</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institution</label>
                  <input
                    type="text"
                    value={academic.plustwo?.institution || ""}
                    onChange={(e) => setAcademic({ ...academic, plustwo: { ...academic.plustwo, institution: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Board</label>
                  <input
                    type="text"
                    value={academic.plustwo?.board || ""}
                    onChange={(e) => setAcademic({ ...academic, plustwo: { ...academic.plustwo, board: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Stream</label>
                  <input
                    type="text"
                    value={academic.plustwo?.stream || ""}
                    onChange={(e) => setAcademic({ ...academic, plustwo: { ...academic.plustwo, stream: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Year</label>
                  <input
                    type="text"
                    value={academic.plustwo?.year || ""}
                    onChange={(e) => setAcademic({ ...academic, plustwo: { ...academic.plustwo, year: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Percentage</label>
                  <input
                    type="text"
                    value={academic.plustwo?.percentage || ""}
                    onChange={(e) => setAcademic({ ...academic, plustwo: { ...academic.plustwo, percentage: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Certificate</label>
                  <div className="flex items-center gap-3">
                    {academic.plustwo?.certificateUrl && (
                      <span className="text-xs text-green-600 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Certificate uploaded
                      </span>
                    )}
                    <label htmlFor="plustwo-cert-upload" className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer">
                      {uploadingCert.plustwo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploadingCert.plustwo ? "Uploading..." : "Upload Certificate"}
                    </label>
                    <input id="plustwo-cert-upload" type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleCertUpload("plustwo", e.target.files[0])} />
                  </div>
                </div>
              </div>
            </div>

            {/* UG */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <h4 className="text-xs font-semibold text-slate-900 mb-3">Under Graduate (UG)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institution</label>
                  <input
                    type="text"
                    value={academic.ug?.institution || ""}
                    onChange={(e) => setAcademic({ ...academic, ug: { ...academic.ug, institution: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Degree</label>
                  <input
                    type="text"
                    value={academic.ug?.degree || ""}
                    onChange={(e) => setAcademic({ ...academic, ug: { ...academic.ug, degree: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Year</label>
                  <input
                    type="text"
                    value={academic.ug?.year || ""}
                    onChange={(e) => setAcademic({ ...academic, ug: { ...academic.ug, year: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Percentage</label>
                  <input
                    type="text"
                    value={academic.ug?.percentage || ""}
                    onChange={(e) => setAcademic({ ...academic, ug: { ...academic.ug, percentage: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Certificate</label>
                  <div className="flex items-center gap-3">
                    {academic.ug?.certificateUrl && (
                      <span className="text-xs text-green-600 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Certificate uploaded
                      </span>
                    )}
                    <label htmlFor="ug-cert-upload" className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer">
                      {uploadingCert.ug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploadingCert.ug ? "Uploading..." : "Upload Certificate"}
                    </label>
                    <input id="ug-cert-upload" type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleCertUpload("ug", e.target.files[0])} />
                  </div>
                </div>
              </div>
            </div>

            {/* PG */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <h4 className="text-xs font-semibold text-slate-900 mb-3">Post Graduate (PG)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institution</label>
                  <input
                    type="text"
                    value={academic.pg?.institution || ""}
                    onChange={(e) => setAcademic({ ...academic, pg: { ...academic.pg, institution: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Degree</label>
                  <input
                    type="text"
                    value={academic.pg?.degree || ""}
                    onChange={(e) => setAcademic({ ...academic, pg: { ...academic.pg, degree: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Year</label>
                  <input
                    type="text"
                    value={academic.pg?.year || ""}
                    onChange={(e) => setAcademic({ ...academic, pg: { ...academic.pg, year: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Percentage</label>
                  <input
                    type="text"
                    value={academic.pg?.percentage || ""}
                    onChange={(e) => setAcademic({ ...academic, pg: { ...academic.pg, percentage: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Certificate</label>
                  <div className="flex items-center gap-3">
                    {academic.pg?.certificateUrl && (
                      <span className="text-xs text-green-600 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Certificate uploaded
                      </span>
                    )}
                    <label htmlFor="pg-cert-upload" className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer">
                      {uploadingCert.pg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploadingCert.pg ? "Uploading..." : "Upload Certificate"}
                    </label>
                    <input id="pg-cert-upload" type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleCertUpload("pg", e.target.files[0])} />
                  </div>
                </div>
              </div>
            </div>

            {/* PhD */}
            <div>
              <h4 className="text-xs font-semibold text-slate-900 mb-3">PhD / Other</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institution</label>
                  <input
                    type="text"
                    value={academic.phd?.institution || ""}
                    onChange={(e) => setAcademic({ ...academic, phd: { ...academic.phd, institution: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Topic</label>
                  <input
                    type="text"
                    value={academic.phd?.topic || ""}
                    onChange={(e) => setAcademic({ ...academic, phd: { ...academic.phd, topic: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Year</label>
                  <input
                    type="text"
                    value={academic.phd?.year || ""}
                    onChange={(e) => setAcademic({ ...academic, phd: { ...academic.phd, year: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                  <input
                    type="text"
                    value={academic.phd?.status || ""}
                    onChange={(e) => setAcademic({ ...academic, phd: { ...academic.phd, status: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Certificate</label>
                  <div className="flex items-center gap-3">
                    {academic.phd?.certificateUrl && (
                      <span className="text-xs text-green-600 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Certificate uploaded
                      </span>
                    )}
                    <label htmlFor="phd-cert-upload" className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer">
                      {uploadingCert.phd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploadingCert.phd ? "Uploading..." : "Upload Certificate"}
                    </label>
                    <input id="phd-cert-upload" type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleCertUpload("phd", e.target.files[0])} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              href={`/admin/students/${student?.id}`}
              className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
