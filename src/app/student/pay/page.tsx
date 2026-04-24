"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PayRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/student/payments"); }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-sm text-slate-500">Redirecting to Payments...</p>
    </div>
  );
}
