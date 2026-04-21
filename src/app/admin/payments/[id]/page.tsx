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
  studentId?: string;
  program: string;
  university: string;
  course: string;
  stream: string;
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

function formatPaymentDate(dateString: string): string {
  // Parse YYYY-MM-DD format without timezone issues
  if (!dateString) return "—";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = monthNames[monthIndex] || month;
  
  return `${day} ${monthName} ${year}`;
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
              body { font-family: Arial, Helvetica, sans-serif; color: #333; }
              .receipt { width: 800px; margin: 0 auto; background: white; border: 2px solid #8B0000; box-sizing: border-box; }
              header { padding: 24px 32px; display: flex; justify-content: space-between; align-items: flex-start; }
              header h1 { font-size: 24px; font-weight: bold; color: #111; margin-bottom: 4px; }
              header p { font-size: 11px; color: #666; margin: 2px 0; }
              .text-right { text-align: right; }
              .text-xs { font-size: 11px; }
              .text-xl { font-size: 20px; }
              .font-bold { font-weight: bold; }
              .font-semibold { font-weight: 600; }
              .uppercase { text-transform: uppercase; }
              .tracking-wider { letter-spacing: 0.05em; }
              .bg-gray-100 { background-color: #f3f4f6; }
              .border-b { border-bottom: 1px solid #e5e7eb; }
              .px-8 { padding-left: 32px; padding-right: 32px; }
              .py-2 { padding-top: 8px; padding-bottom: 8px; }
              .py-4 { padding-top: 16px; padding-bottom: 16px; }
              .py-6 { padding-top: 24px; padding-bottom: 24px; }
              .px-4 { padding-left: 16px; padding-right: 16px; }
              .px-3 { padding-left: 12px; padding-right: 12px; }
              .py-3 { padding-top: 12px; padding-bottom: 12px; }
              .mb-6 { margin-bottom: 24px; }
              .mb-3 { margin-bottom: 12px; }
              .mb-1 { margin-bottom: 4px; }
              .mt-2 { margin-top: 8px; }
              .mt-4 { margin-top: 16px; }
              .ml-2 { margin-left: 8px; }
              .gap-8 { gap: 32px; }
              .gap-y-2 { row-gap: 8px; }
              .gap-x-8 { column-gap: 32px; }
              .flex { display: flex; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
              .col-span-2 { grid-column: span 2; }
              .justify-between { justify-content: space-between; }
              .justify-end { justify-content: flex-end; }
              .items-start { align-items: flex-start; }
              .w-64 { width: 256px; }
              .w-full { width: 100%; }
              .border-2 { border-width: 2px; }
              .border-red-800 { border-color: #8B0000; }
              .text-gray-500 { color: #000000; }
              .text-gray-600 { color: #000000; }
              .text-gray-900 { color: #000000; }
              .text-white { color: white; }
              .text-red-600 { color: #dc2626; }
              .text-green-600 { color: #16a34a; }
              .text-left { text-align: left; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .border-collapse { border-collapse: collapse; }
              .text-sm { font-size: 13px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 12px 16px; text-align: left; }
              th { background-color: #8B0000; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
              td { font-size: 13px; color: #374151; border-bottom: 1px solid #e5e7eb; }
              .h-px { height: 1px; }
              .italic { font-style: italic; }
              footer { padding: 16px 32px; }
              .rounded { border-radius: 4px; }
              .rounded-lg { border-radius: 8px; }
              .print-header { display: block; }
              .relative { position: relative; }
              .absolute { position: absolute; }
              .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
              .overflow-hidden { overflow: hidden; }
              .border-2 { border-width: 2px; }
              .border-r { border-right-width: 1px; }
              .border-t { border-top-width: 1px; }
              .border-red-100 { border-color: #fee2e2; }
              .border-red-200 { border-color: #fecaca; }
              .border-red-700 { border-color: #b91c1c; }
              .bg-red-50 { background-color: #fef2f2; }
              .pointer-events-none { pointer-events: none; }
              @media print {
                body { padding: 0; }
                .print-header { display: none !important; }
                .receipt {
                  margin-top: 150px !important;
                  position: relative !important;
                  overflow: hidden !important;
                  border: 3px solid #8B0000 !important;
                }
                .receipt::before {
                  content: '' !important;
                  position: absolute !important;
                  top: 0; left: 0; right: 0; bottom: 0 !important;
                  background: repeating-linear-gradient(45deg, #8B0000 0px, #8B0000 1px, transparent 1px, transparent 10px) !important;
                  opacity: 0.03 !important;
                  pointer-events: none !important;
                  z-index: 1 !important;
                }
                header {
                  border-top: 4px solid #8B0000 !important;
                  border-bottom: 4px solid #dc2626 !important;
                  background: linear-gradient(90deg, #fef2f2 0%, #ffffff 50%, #fef2f2 100%) !important;
                  position: relative !important;
                  z-index: 2 !important;
                  display: flex !important;
                  justify-content: flex-end !important;
                }
                header > div:last-child {
                  text-align: right !important;
                }
                footer {
                  border-top: 2px solid #dc2626 !important;
                  border-bottom: 4px solid #8B0000 !important;
                  position: relative !important;
                  z-index: 2 !important;
                }
                .print-signature {
                  display: block !important;
                }
                .print-signature > div {
                  padding-top: 32px !important;
                }
                .print-signature > div > div {
                  width: 200px !important;
                }
                .print-signature .border-b-2 {
                  border-bottom: 2px solid #1f2937 !important;
                  height: 40px !important;
                  margin-bottom: 8px !important;
                }
                .print-signature p:first-of-type {
                  font-size: 11px !important;
                  font-weight: 600 !important;
                  letter-spacing: 0.05em !important;
                  text-align: center !important;
                  text-transform: uppercase !important;
                  color: #000000 !important;
                }
                .print-signature p:last-of-type {
                  font-size: 9px !important;
                  color: #6b7280 !important;
                  text-align: center !important;
                  margin-top: 4px !important;
                }
                table {
                  border: 2px solid #8B0000 !important;
                  border-radius: 8px !important;
                  overflow: hidden !important;
                }
                th {
                  background-color: #8B0000 !important;
                  color: white !important;
                  border-right: 1px solid #b91c1c !important;
                }
                td {
                  border-right: 1px solid #fee2e2 !important;
                  background-color: #fef2f2 !important;
                }
                .bg-gray-100 {
                  background: linear-gradient(90deg, #f3f4f6 0%, #ffffff 50%, #f3f4f6 100%) !important;
                  border: 2px solid #8B0000 !important;
                  border-radius: 8px !important;
                  padding: 12px 16px !important;
                }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                /* Make all text black for readability */
                p, span, div, td, th, h1, h2, h3, h4, h5, h6 { color: #000000 !important; }
                /* Keep white text on red backgrounds */
                th, .text-white { color: #ffffff !important; }
                /* Keep red text for status */
                .text-red-600 { color: #dc2626 !important; }
                .text-green-600 { color: #16a34a !important; }
              }
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

      <div ref={printRef} className="flex justify-center">
        <div className="receipt bg-white w-[800px] border-2 border-red-800 print:mt-32" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          {/* Header - Hidden when printing for letterhead */}
          <header className="px-8 py-6 flex justify-between items-start">
            <div className="print-header">
              <h1 className="text-2xl font-bold text-gray-900">AIOS EDU</h1>
              <p className="text-xs text-gray-600 mt-1">Institute of Advanced Management &amp; Technology</p>
              <p className="text-xs text-gray-500">Education Beyond Boundaries</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Receipt No</p>
              <p className="text-xl font-bold" style={{ color: '#8B0000' }}>{payment.receiptNumber}</p>
            </div>
          </header>

          {/* Metadata Strip */}
          <div className="bg-gray-100 px-8 py-2 flex gap-8 text-sm">
            <span><span className="text-gray-500">Date:</span> <span className="font-semibold text-gray-900">{formatPaymentDate(payment.paymentDate)}</span></span>
            <span><span className="text-gray-500">Payment Mode:</span> <span className="font-semibold text-gray-900">{payment.paymentMode}</span></span>
            {payment.transactionRef && <span><span className="text-gray-500">Ref:</span> <span className="font-mono text-gray-900">{payment.transactionRef}</span></span>}
          </div>

          {/* Main Content */}
          <div className="px-8 py-6">
            {/* Bill To Section */}
            <section className="mb-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">Bill To</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <span style={{ color: '#8B0000' }} className="font-semibold">Name:</span>
                  <span className="ml-2 text-gray-900">{payment.studentName}</span>
                </div>
                <div>
                  <span style={{ color: '#8B0000' }} className="font-semibold">Enrollment ID:</span>
                  <span className="ml-2 text-gray-900">{payment.studentId || "—"}</span>
                </div>
                <div>
                  <span style={{ color: '#8B0000' }} className="font-semibold">Phone:</span>
                  <span className="ml-2 text-gray-900">{payment.studentPhone}</span>
                </div>
                <div>
                  <span style={{ color: '#8B0000' }} className="font-semibold">Email:</span>
                  <span className="ml-2 text-gray-900">{payment.studentEmail}</span>
                </div>
                <div>
                  <span style={{ color: '#8B0000' }} className="font-semibold">University:</span>
                  <span className="ml-2 text-gray-900">{payment.university || "—"}</span>
                </div>
                <div>
                  <span style={{ color: '#8B0000' }} className="font-semibold">Course:</span>
                  <span className="ml-2 text-gray-900">{(payment.course || payment.program || "").replace(/\s*\([^)]*\)/g, "")}{payment.stream ? `-${payment.stream}` : ""}</span>
                </div>
              </div>
            </section>

            {/* Financial Table */}
            <section className="mb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#8B0000' }}>
                    <th className="text-left py-3 px-4 text-white font-semibold uppercase text-xs tracking-wider">Description</th>
                    <th className="text-right py-3 px-4 text-white font-semibold uppercase text-xs tracking-wider">Installment</th>
                    <th className="text-right py-3 px-4 text-white font-semibold uppercase text-xs tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 px-4 text-gray-900">Course Fee Payment</td>
                    <td className="py-3 px-4 text-gray-700 text-right">{payment.installmentNumber} of {payment.totalInstallments}</td>
                    <td className="py-3 px-4 text-gray-900 font-semibold text-right">₹{payment.amountPaid.toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-end mt-4">
                <div className="w-64 space-y-1">
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Total Fee:</span>
                    <span className="text-gray-900 font-semibold">₹{(payment.totalFee || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Balance:</span>
                    <span className={`font-semibold ${payment.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{payment.balanceAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-2 mt-2 px-3 rounded" style={{ backgroundColor: '#8B0000' }}>
                    <span className="text-white font-semibold text-sm">Amount Received:</span>
                    <span className="text-white font-bold text-lg">₹{payment.amountPaid.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Amount in Words */}
            <section className="mb-6">
              <div className="border p-3" style={{ borderColor: '#8B0000', borderWidth: '1px' }}>
                <p className="text-xs text-gray-500 uppercase mb-1">Amount in Words:</p>
                <p className="text-sm font-semibold text-gray-800">{numberToWords(payment.amountPaid)} Rupees Only</p>
              </div>
            </section>

            {/* Remarks & Signature Row */}
            <section className="flex justify-between items-start gap-8 mb-6">
              {/* Remarks - Left Side */}
              {payment.remarks ? (
                <div className="flex-1">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Remarks</h2>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3">{payment.remarks}</p>
                </div>
              ) : (
                <div className="flex-1"></div>
              )}

              {/* Authorized Signature - Right Side, Elegant Style */}
              <div className="print-signature hidden print:block">
                <div className="pt-8">
                  <div className="w-48">
                    <div className="border-b-2 border-gray-800 h-10 mb-2"></div>
                    <p className="text-xs text-center font-semibold tracking-wide">Authorized Signature</p>
                    <p className="text-[10px] text-center text-gray-500 mt-1">AIOS EDU</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="px-8 py-4">
            <div className="w-full h-px" style={{ backgroundColor: '#8B0000' }}></div>
          </footer>
        </div>
      </div>
    </div>
  );
}
