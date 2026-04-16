"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { QrCode, Upload, CheckCircle, Loader2, IndianRupee } from "lucide-react";

export default function MakePaymentPage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    // In a real implementation, this would upload to Firebase Storage
    setTimeout(() => {
      setUploading(false);
      setSubmitted(true);
    }, 1500);
  }

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Make Payment</h1>
      <p className="text-sm text-gray-500 mb-6">Scan QR code and submit payment proof</p>

      {submitted ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Payment Submitted!</h2>
          <p className="text-sm text-gray-500 mb-4">
            Your payment proof has been submitted. Our team will verify and send you a receipt within 24 hours.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setAmount("");
            }}
            className="text-sm text-red-600 hover:underline"
          >
            Submit Another Payment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* QR Code Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Scan to Pay</h3>
            <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-3 border-2 border-dashed border-gray-300">
              <div className="text-center">
                <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">QR Code will be<br />configured by admin</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">UPI: <span className="font-medium text-gray-700">aiosedu@upi</span></p>
            <p className="text-xs text-gray-500 mt-1">Account: <span className="font-medium text-gray-700">AIOS EDU - HDFC Bank</span></p>
          </div>

          {/* Upload Payment Proof */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Submit Payment Proof</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Screenshot</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-red-300 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Tap to upload screenshot</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</p>
                <input type="file" accept="image/*" className="hidden" />
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !amount}
              className="w-full py-2.5 text-sm text-white font-semibold rounded-lg gradient-bg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Submit Payment Proof</>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
