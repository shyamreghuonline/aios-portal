"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LogOut,
  Loader2,
  Menu,
  X,
  Phone,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/payments/pending", label: "Pending Approvals", icon: Clock, badge: true },
  { href: "/admin/follow-ups", label: "Follow-Ups", icon: Phone },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-base font-extrabold text-white tracking-wide">AIOS EDU</h1>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Admin Portal</p>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-all"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar - Desktop: fixed, Mobile: overlay */}
      <aside className={`bg-slate-900 text-white flex flex-col fixed h-full shadow-xl z-40 transition-transform duration-300
        w-64 lg:translate-x-0 lg:block
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${mobileMenuOpen ? 'top-0' : 'top-0 lg:top-0'}
      `}>
        <div className="px-5 py-5 border-b border-slate-700/60 hidden lg:block">
          <h1 className="text-lg font-extrabold text-white tracking-wide">AIOS EDU</h1>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Admin Portal</p>
        </div>

        <div className="lg:hidden px-5 py-4 border-b border-slate-700/60">
          <h1 className="text-lg font-extrabold text-white tracking-wide">AIOS EDU</h1>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Admin Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "gradient-bg text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {item.badge && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700/60">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 w-full transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 p-4 lg:p-6 bg-slate-50 min-h-screen overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
