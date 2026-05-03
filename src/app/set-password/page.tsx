"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, Lock, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // Hostname detection - only allow on student subdomain
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  const isStudentDomain = hostname.startsWith("student.") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate token - only runs if on student domain
  useEffect(() => {
    // Skip if not on student domain - will show access denied instead
    if (hostname && !isStudentDomain) {
      setValidating(false);
      setLoading(false);
      return;
    }

    if (!token) {
      setError("Invalid link. Please contact your admin.");
      setValidating(false);
      setLoading(false);
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch("/api/auth/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid link");
        } else {
          setStudentName(data.name);
          setStudentId(data.studentId);
        }
      } catch {
        setError("Failed to verify link. Please try again.");
      } finally {
        setValidating(false);
        setLoading(false);
      }
    }

    validateToken();
  }, [token, hostname, isStudentDomain]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to set password");
        setSubmitting(false);
        return;
      }

      // Auto-login
      const email = `${studentId}@aiosedu.local`;
      await signInWithEmailAndPassword(auth, email, password);
      setSuccess(true);
      setTimeout(() => router.push("/student"), 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to set password";
      setError(msg);
      setSubmitting(false);
    }
  }

  // Show access denied if not on student domain (after loading is done)
  if (!loading && hostname && !isStudentDomain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-4">
              This page is only accessible via the student portal.
            </p>
            <a
              href="https://student.aiosedu.org"
              className="inline-block py-2.5 px-6 text-sm text-white font-semibold rounded-lg gradient-bg hover:shadow-lg transition-all"
            >
              Go to Student Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Verifying link...</span>
        </div>
      </div>
    );
  }

  if (error && !studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 mb-1">Link Error</h2>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <p className="text-xs text-slate-400">
            Please contact your admin to get a new password link.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-green-200 shadow-sm p-6 text-center">
          <ShieldCheck className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 mb-1">Password Set Successfully!</h2>
          <p className="text-sm text-slate-500">Redirecting to your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img src="/login-page.jpeg" alt="AIOS EDU" className="mx-auto w-[440px] h-auto object-contain mb-4" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Set Your Password</h1>
            <p className="text-sm text-slate-500 mt-1">
              Welcome, <span className="font-semibold text-slate-700">{studentName}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Enrollment ID: {studentId}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none pr-10"
                  placeholder="Create a password (min 6 chars)"
                  required
                  minLength={6}
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                placeholder="Re-enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting || validating}
              className="w-full py-2.5 text-sm font-bold text-white gradient-bg rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {submitting ? "Setting Password..." : "Set Password & Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  );
}
