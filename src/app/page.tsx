"use client";

import { useState, useEffect, useRef } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Phone, ShieldCheck, Loader2, ArrowRight, KeyRound, Lock, Mail, UserCog, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"admin" | "student">("student");

  // Admin state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Student state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [error, setError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaRef = useRef<HTMLDivElement>(null);

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

  // ─── STUDENT OTP ───
  async function setupRecaptcha() {
    if (!window.recaptchaVerifier && recaptchaRef.current) {
      recaptchaRef.current.innerHTML = "";
      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: "invisible",
      });
      await window.recaptchaVerifier.render();
    }
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await setupRecaptcha();
      const fullPhone = phone.startsWith("+") ? phone : "+91" + phone.replace(/\D/g, "");
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier!);
      window.confirmationResult = confirmationResult;
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send OTP";
      setError(errorMessage);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
      if (recaptchaRef.current) recaptchaRef.current.innerHTML = "";
    } finally {
      setSending(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (value && index === 5 && newOtp.every((d) => d)) verifyOTP(newOtp.join(""));
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  }

  async function verifyOTP(code: string) {
    setError("");
    setVerifying(true);
    try {
      await window.confirmationResult!.confirm(code);
    } catch {
      setError("Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  function switchTab(newTab: "admin" | "student") {
    setTab(newTab);
    setError("");
    setStep("phone");
    setOtp(["", "", "", "", "", ""]);
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
          {tab === "student" && step === "phone" && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Student Login</h2>
              <p className="text-sm text-slate-600 mb-6">Enter your mobile number to receive an OTP</p>

              <form onSubmit={handleSendOTP}>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number</label>
                <div className="flex gap-2 mb-4">
                  <div className="flex items-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                    +91
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      placeholder="XXXXX XXXXX"
                      required
                      maxLength={10}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2 mb-4">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={sending || phone.replace(/\D/g, "").length !== 10}
                  className="w-full py-2.5 text-sm text-white font-semibold rounded-lg gradient-bg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...</>
                  ) : (
                    <>Send OTP <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </>
          )}

          {tab === "student" && step === "otp" && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Verify OTP</h2>
              <p className="text-sm text-slate-600 mb-6">
                Enter the 6-digit code sent to <span className="font-medium text-slate-800">+91 {phone}</span>
              </p>

              <div className="flex gap-2 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 text-center text-lg font-bold rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                  />
                ))}
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2 mb-4">{error}</p>
              )}

              {verifying && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-600 mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </div>
              )}

              <button
                onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                className="w-full py-2 text-sm text-slate-600 hover:text-red-600 transition-colors flex items-center justify-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change number
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Powered by AIOS EDU &bull; Institute of Advanced Management &amp; Technology
        </p>
      </div>

      {/* Invisible reCAPTCHA container */}
      <div ref={recaptchaRef} id="recaptcha-container" />
    </div>
  );
}
