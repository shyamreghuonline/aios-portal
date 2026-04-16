"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LogOut,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-xl">
        <div className="px-5 py-5 border-b border-slate-700/60">
          <h1 className="text-lg font-extrabold text-white tracking-wide">AIOS EDU</h1>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Admin Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "gradient-bg text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
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

      {/* Main content */}
      <main className="flex-1 ml-64 p-6 bg-slate-50 h-screen overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
