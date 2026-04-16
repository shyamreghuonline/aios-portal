"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  CreditCard,
  QrCode,
  UserCircle,
  LogOut,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/payments", label: "My Payments", icon: CreditCard },
  { href: "/student/pay", label: "Make Payment", icon: QrCode },
  { href: "/student/profile", label: "My Profile", icon: UserCircle },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "student")) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "student") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile-friendly top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-extrabold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">AIOS</h1>
              <p className="text-xs font-semibold text-slate-600">Institute of Advanced Management & Technology Pvt. Ltd.</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-red-600 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom nav (mobile-friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="max-w-4xl mx-auto flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive ? "text-red-600 font-medium" : "text-slate-500"
                }`}
              >
                <item.icon className="w-5 h-5 mb-0.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
