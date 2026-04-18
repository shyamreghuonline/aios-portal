"use client";

import { useEffect, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Payment {
  receiptNumber: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  program: string;
  totalFee: number;
  amountPaid: number;
  installmentNumber: number;
  totalInstallments: number;
  paymentDate: string;
  paymentMode: string;
  transactionRef: string;
  balanceAmount: number;
  remarks: string;
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }
  return convert(Math.floor(num));
}

export default function ReceiptPage() {
  const params = useParams();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPayment() {
      try {
        const snap = await getDoc(doc(db, "payments", params.id as string));
        if (snap.exists()) {
          setPayment(snap.data() as Payment);
        }
      } catch (err) {
        console.error("Error fetching payment:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayment();
  }, [params.id]);

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Receipt - ${payment?.receiptNumber}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
              .receipt { max-width: 700px; margin: 0 auto; border: 2px solid #a31d21; border-radius: 8px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #a31d21, #c0392b); padding: 24px; text-align: center; color: white; }
              .header h1 { font-size: 28px; margin-bottom: 4px; letter-spacing: 2px; }
              .header p { font-size: 12px; opacity: 0.9; }
              .info-bar { display: flex; justify-content: space-between; padding: 12px 24px; background: #fef2f2; border-bottom: 1px solid #fecaca; font-size: 13px; }
              .info-bar span { font-weight: 600; color: #a31d21; }
              .body { padding: 24px; }
              .section-title { font-size: 13px; font-weight: 700; color: #a31d21; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #fecaca; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
              table td:first-child { color: #888; font-weight: 600; width: 40%; }
              .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0; }
              .amount-box .amount { font-size: 28px; font-weight: 800; color: #166534; }
              .amount-box .label { font-size: 12px; color: #666; margin-top: 4px; }
              .installment-bar { background: #f8f8f8; border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 16px; }
              .installment-bar span { font-weight: 600; }
              .stamp { text-align: right; margin-top: 30px; padding-top: 16px; border-top: 1px dashed #ccc; }
              .stamp .auth { font-weight: 700; color: #a31d21; font-size: 14px; margin-top: 40px; }
              .footer { background: #1a1a1a; padding: 12px 24px; text-align: center; color: #999; font-size: 11px; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>${content}<script>window.print();window.close();<\/script></body>
        </html>
      `);
      win.document.close();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Payment not found.</p>
        <Link href="/admin/payments" className="text-sm text-red-600 hover:underline mt-2 inline-block">
          Back to Payments
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/admin/payments"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payments
        </Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:shadow transition-all"
        >
          <Printer className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      <div ref={printRef}>
        <div className="receipt bg-white rounded-xl border-2 border-red-700 overflow-hidden shadow-lg">
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, #a31d21, #c0392b)" }} className="px-8 py-6 text-center text-white">
            <h1 className="text-2xl font-bold tracking-wider mb-1">AIOS EDU</h1>
            <p className="text-xs opacity-90 tracking-wide">Institute of Advanced Management &amp; Technology Pvt. Ltd.</p>
            <p className="text-xs opacity-75 mt-1">Education Beyond Boundaries</p>
          </div>

          {/* Receipt Info Bar */}
          <div className="flex flex-wrap justify-between px-6 py-3 bg-red-50 border-b border-red-100 text-xs">
            <div>Receipt No: <span className="font-bold text-red-700">{payment.receiptNumber}</span></div>
            <div>Date: <span className="font-bold text-red-700">
              {new Date(payment.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
            </span></div>
          </div>

          <div className="px-6 py-5">
            {/* Student Info */}
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3 pb-1.5 border-b-2 border-red-100">Student Information</p>
            <table className="w-full text-sm mb-5">
              <tbody>
                <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-gray-500 font-semibold w-2/5">Name</td><td className="py-2 text-gray-900">{payment.studentName}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-gray-500 font-semibold">Email</td><td className="py-2 text-gray-900">{payment.studentEmail}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-gray-500 font-semibold">Phone</td><td className="py-2 text-gray-900">{payment.studentPhone}</td></tr>
                <tr><td className="py-2 pr-4 text-gray-500 font-semibold">Program</td><td className="py-2 text-gray-900">{payment.program}</td></tr>
              </tbody>
            </table>

            {/* Amount Box */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center mb-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Amount Received</p>
              <p className="text-3xl font-extrabold text-green-700">₹{payment.amountPaid.toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-500 mt-1">({numberToWords(payment.amountPaid)} Rupees Only)</p>
            </div>

            {/* Installment Bar */}
            <div className="flex flex-wrap justify-between bg-gray-50 rounded-lg px-4 py-3 text-xs mb-5">
              <div>Installment: <span className="font-bold">{payment.installmentNumber} of {payment.totalInstallments}</span></div>
              <div>Total Fee: <span className="font-bold">₹{(payment.totalFee || 0).toLocaleString("en-IN")}</span></div>
              <div>Balance: <span className={`font-bold ${payment.balanceAmount > 0 ? "text-red-600" : "text-green-600"}`}>₹{payment.balanceAmount.toLocaleString("en-IN")}</span></div>
            </div>

            {/* Payment Details */}
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3 pb-1.5 border-b-2 border-red-100">Payment Details</p>
            <table className="w-full text-sm mb-5">
              <tbody>
                <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-gray-500 font-semibold w-2/5">Payment Date</td><td className="py-2 text-gray-900">{new Date(payment.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-gray-500 font-semibold">Payment Mode</td><td className="py-2 text-gray-900">{payment.paymentMode}</td></tr>
                {payment.transactionRef && <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-gray-500 font-semibold">Transaction Ref</td><td className="py-2 text-gray-900 font-mono text-xs">{payment.transactionRef}</td></tr>}
                {payment.remarks && <tr><td className="py-2 pr-4 text-gray-500 font-semibold">Remarks</td><td className="py-2 text-gray-900">{payment.remarks}</td></tr>}
              </tbody>
            </table>

            {/* Signature */}
            <div className="text-right mt-8 pt-4 border-t border-dashed border-gray-300">
              <p className="text-xs text-gray-400 mb-10">Authorized Signature</p>
              <p className="text-sm font-bold text-red-700">AIOS EDU</p>
              <p className="text-xs text-gray-500">Institute of Advanced Management &amp; Technology</p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-900 px-6 py-3 text-center">
            <p className="text-xs text-gray-400">+91 74111 33333 | 080 - 2222 2228 | info@aiosedu.com | www.aiosedu.com</p>
            <p className="text-xs text-gray-500 mt-1">This is a computer-generated receipt and does not require a physical signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
