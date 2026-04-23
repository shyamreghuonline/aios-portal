"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck, Loader2, ArrowRight, Lock, Mail, UserCog, GraduationCap, IdCard, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"admin" | "student">("student");

  // Admin state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Student state
  const [studentId, setStudentId] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);

  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push(user.role === "admin" ? "/admin" : "/student");
    }
  }, [user, loading, router]);

  // ─── ADMIN LOGIN ───
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdminLoading(true);
    try {
      // Convert username to email format if no @ symbol
      const email = adminEmail.includes("@") ? adminEmail : `${adminEmail}@aiosedu.com`;
      await signInWithEmailAndPassword(auth, email, adminPassword);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
        setError("Invalid username or password.");
      } else {
        setError(msg);
      }
    } finally {
      setAdminLoading(false);
    }
  }

  // ─── STUDENT LOGIN ───
  async function handleStudentLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStudentLoading(true);
    try {
      const email = `${studentId.trim()}@aiosedu.local`;
      await signInWithEmailAndPassword(auth, email, studentPassword);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
        setError("Invalid Student ID or password.");
      } else if (msg.includes("too-many-requests")) {
        setError("Too many failed attempts. Please wait a few minutes.");
      } else if (msg.includes("network-request-failed")) {
        setError("Network error. Please check your connection.");
      } else {
        setError(msg);
      }
    } finally {
      setStudentLoading(false);
    }
  }

  function switchTab(newTab: "admin" | "student") {
    setTab(newTab);
    setError("");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">AIOS EDU</h1>
          <p className="text-sm text-slate-600 mt-1">Student &amp; Admin Portal</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-200 rounded-xl p-1 mb-4 border border-slate-300">
          <button
            onClick={() => switchTab("student")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              tab === "student" ? "gradient-bg text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Student
          </button>
          <button
            onClick={() => switchTab("admin")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              tab === "admin" ? "gradient-bg text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCog className="w-4 h-4" />
            Admin
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {/* ─── ADMIN TAB ─── */}
          {tab === "admin" && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Admin Login</h2>
              <p className="text-sm text-slate-600 mb-6">Sign in with your admin credentials</p>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      placeholder="aiosadmin"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full py-2.5 text-sm text-white font-semibold rounded-lg gradient-bg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adminLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Sign In</>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ─── STUDENT TAB ─── */}
          {tab === "student" && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Student Login</h2>
              <p className="text-sm text-slate-600 mb-6">Enter your Enrollment ID and password</p>

              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Enrollment ID</label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      placeholder="e.g., AIOS26AP000001"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={studentLoading}
                  className="w-full py-2.5 text-sm text-white font-semibold rounded-lg gradient-bg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {studentLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Sign In</>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Powered by AIOS EDU &bull; Institute of Advanced Management &amp; Technology
        </p>
      </div>

    </div>
  );
}
