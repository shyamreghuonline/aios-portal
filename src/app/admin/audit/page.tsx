"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  BarChart3,
  Building2,
  BookOpen,
  Users,
  Wallet,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Filter,
  TrendingUp,
  GraduationCap,
  MapPin,
  X,
  Loader2,
} from "lucide-react";
import { formatDateDisplay } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────
interface Student {
  id: string;
  studentId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  faculty?: string;
  course?: string;
  stream?: string;
  duration?: string;
  university?: string;
  startYear?: string;
  endYear?: string;
  totalFee?: number;
  discountAmount?: number;
  enrollmentDate?: string;
  admissionCenter?: string;
  archived?: boolean;
}

interface Payment {
  studentPhone?: string;
  studentId?: string;
  amountPaid?: number | string;
  paymentMode?: string;
  isDiscount?: boolean;
  paymentDate?: string;
  archived?: boolean;
}

interface PayItem {
  key: string; // student phone or id
  amount: number;
  date: string; // YYYY-MM-DD
}

type Period = "today" | "week" | "month" | "year" | "all" | "custom";

// ── Helpers ──────────────────────────────────────────────────────────────
const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

function periodLabel(p: Period, from: string, to: string): string {
  switch (p) {
    case "today": return "Today";
    case "week": return "This Week";
    case "month": return "This Month";
    case "year": return "This Year";
    case "all": return "All Time";
    case "custom":
      if (from && to) return `${from} → ${to}`;
      if (from) return `From ${from}`;
      if (to) return `Until ${to}`;
      return "Custom";
    default: return "";
  }
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ───────────────────────────────────────────────────────
export default function AuditPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payItems, setPayItems] = useState<PayItem[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterFaculty, setFilterFaculty] = useState<string>("");
  const [filterUniversity, setFilterUniversity] = useState<string>("");
  const [filterCenter, setFilterCenter] = useState<string>("");
  const [period, setPeriod] = useState<Period>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // expansion state
  const [openUni, setOpenUni] = useState<Record<string, boolean>>({});
  const [openCourse, setOpenCourse] = useState<Record<string, boolean>>({});

  // ── Fetch data ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [stuSnap, paySnap] = await Promise.all([
          getDocs(collection(db, "students")),
          getDocs(collection(db, "payments")),
        ]);
        const stu: Student[] = [];
        stuSnap.forEach((d: any) => {
          const data = { id: d.id, ...(d.data() as Omit<Student, "id">) };
          if (data.archived) return; // exclude soft-archived students
          stu.push(data);
        });

        const items: PayItem[] = [];
        paySnap.forEach((d: any) => {
          const p = d.data() as Payment;
          // Exclude discount vouchers and archived payments from "collected" revenue
          if (p.archived) return;
          if (p.isDiscount || (p.paymentMode || "").toLowerCase() === "discount") return;
          const key = (p.studentId || p.studentPhone || "").toString();
          if (!key) return;
          items.push({
            key,
            amount: parseFloat(String(p.amountPaid || 0)) || 0,
            date: (p.paymentDate || "").toString(),
          });
        });

        setStudents(stu);
        setPayItems(items);
      } catch (err) {
        console.error("Audit fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived: unique filter values ────────────────────────────────────
  const allYears = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.startYear && set.add(s.startYear));
    return Array.from(set).sort().reverse();
  }, [students]);
  const allFaculties = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.faculty && set.add(s.faculty));
    return Array.from(set).sort();
  }, [students]);
  const allUniversities = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.university && set.add(s.university));
    return Array.from(set).sort();
  }, [students]);

  // ── Filtered students ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (filterYear && s.startYear !== filterYear) return false;
      if (filterFaculty && s.faculty !== filterFaculty) return false;
      if (filterUniversity && s.university !== filterUniversity) return false;
      if (filterCenter && (s.admissionCenter || "Bengaluru") !== filterCenter) return false;
      if (!q) return true;
      return (
        (s.name || "").toLowerCase().includes(q) ||
        (s.studentId || "").toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.course || "").toLowerCase().includes(q) ||
        (s.university || "").toLowerCase().includes(q)
      );
    });
  }, [students, search, filterYear, filterFaculty, filterUniversity]);

  // ── Period boundaries (local timezone) ──────────────────────────────
  const periodBounds = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString("en-CA");
    const now = new Date();
    const today = fmt(now);
    const dayOfWeek = now.getDay();
    const daysSinceMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceMon);
    const monthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
    const yearStart = fmt(new Date(now.getFullYear(), 0, 1));
    return {
      today,
      weekStart: fmt(weekStart),
      monthStart,
      yearStart,
    };
  }, []);

  function inPeriod(date: string, p: Period): boolean {
    if (!date) return p === "all";
    if (p === "all") return true;
    if (p === "today") return date === periodBounds.today;
    if (p === "week") return date >= periodBounds.weekStart && date <= periodBounds.today;
    if (p === "month") return date >= periodBounds.monthStart && date <= periodBounds.today;
    if (p === "year") return date >= periodBounds.yearStart && date <= periodBounds.today;
    if (p === "custom") {
      if (customFrom && date < customFrom) return false;
      if (customTo && date > customTo) return false;
      return true;
    }
    return true;
  }

  // Map of student key → paid amount within the active period
  const paidMap = useMemo(() => {
    const m: Record<string, number> = {};
    payItems.forEach((it) => {
      if (!inPeriod(it.date, period)) return;
      m[it.key] = (m[it.key] || 0) + it.amount;
    });
    return m;
  }, [payItems, period, customFrom, customTo, periodBounds]);

  // Lifetime paid (always all-time, used for balance calc)
  const lifetimePaidMap = useMemo(() => {
    const m: Record<string, number> = {};
    payItems.forEach((it) => {
      m[it.key] = (m[it.key] || 0) + it.amount;
    });
    return m;
  }, [payItems]);

  const studentPaid = (s: Student) =>
    paidMap[s.phone || ""] || paidMap[s.studentId || ""] || 0;
  const studentLifetimePaid = (s: Student) =>
    lifetimePaidMap[s.phone || ""] || lifetimePaidMap[s.studentId || ""] || 0;
  const studentEffective = (s: Student) =>
    (s.totalFee || 0) - (s.discountAmount || 0);
  const studentBalance = (s: Student) => Math.max(studentEffective(s) - studentLifetimePaid(s), 0);

  // ── Group by University → Course ─────────────────────────────────────
  const grouped = useMemo(() => {
    const byUni: Record<
      string,
      {
        university: string;
        students: Student[];
        courses: Record<string, Student[]>;
      }
    > = {};
    filtered.forEach((s) => {
      const uni = s.university || "—";
      const course = s.course || "—";
      if (!byUni[uni]) byUni[uni] = { university: uni, students: [], courses: {} };
      byUni[uni].students.push(s);
      if (!byUni[uni].courses[course]) byUni[uni].courses[course] = [];
      byUni[uni].courses[course].push(s);
    });
    return Object.values(byUni).sort(
      (a, b) => b.students.length - a.students.length
    );
  }, [filtered]);

  // ── Admission Center breakdown ───────────────────────────────────────
  const centerBreakdown = useMemo(() => {
    const centers = ["Bengaluru", "Kochi", "Salem", "Hyderabad"];
    return centers.map((c) => {
      const list = filtered.filter((s) => (s.admissionCenter || "Bengaluru") === c);
      const revenue = list.reduce((a, s) => a + studentPaid(s), 0);
      return { center: c, count: list.length, revenue };
    });
  }, [filtered, paidMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Top metrics ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let revenue = 0;
    const courses = new Set<string>();
    filtered.forEach((s) => {
      revenue += studentPaid(s);
      if (s.course) courses.add(`${s.university}|${s.course}`);
    });
    const universities = new Set(filtered.map((s) => s.university || "—")).size;
    return {
      students: filtered.length,
      universities,
      courses: courses.size,
      revenue,
    };
  }, [filtered, paidMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Export CSV ───────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = filtered.map((s) => ({
      "Student ID": s.studentId || s.id,
      Name: s.name || "",
      Phone: s.phone || "",
      Email: s.email || "",
      Faculty: s.faculty || "",
      Course: s.course || "",
      Stream: s.stream || "",
      Duration: s.duration || "",
      University: s.university || "",
      "Start Year": s.startYear || "",
      "End Year": s.endYear || "",
      "Enrollment Date": s.enrollmentDate ? formatDateDisplay(s.enrollmentDate) : "",
      "Admission Center": s.admissionCenter || "Bengaluru",
      "Effective Fee": studentEffective(s),
      [`Paid (${periodLabel(period, customFrom, customTo)})`]: studentPaid(s),
      "Lifetime Paid": studentLifetimePaid(s),
      Balance: studentBalance(s),
    }));
    if (rows.length === 0) {
      alert("No data to export with current filters.");
      return;
    }
    const stamp = new Date().toISOString().split("T")[0];
    downloadCSV(rows, `audit-students-${stamp}.csv`);
  };

  const clearFilters = () => {
    setSearch("");
    setFilterYear("");
    setFilterFaculty("");
    setFilterUniversity("");
    setFilterCenter("");
  };

  const hasFilters = search || filterYear || filterFaculty || filterUniversity || filterCenter;

  // ── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-md">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Admission Audit</h1>
            <p className="text-xs text-slate-500">
              Drill-down by university, course and student. Live data from Firestore.
            </p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg shadow-sm hover:shadow-md hover:from-emerald-700 hover:to-emerald-800 transition-all"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Students"
          value={metrics.students.toLocaleString("en-IN")}
          icon={Users}
          gradient="from-blue-500 to-indigo-600"
          bg="from-blue-50 to-indigo-50"
        />
        <MetricCard
          label="Universities"
          value={metrics.universities.toString()}
          icon={Building2}
          gradient="from-purple-500 to-fuchsia-600"
          bg="from-purple-50 to-fuchsia-50"
        />
        <MetricCard
          label="Unique Courses"
          value={metrics.courses.toString()}
          icon={BookOpen}
          gradient="from-amber-500 to-orange-600"
          bg="from-amber-50 to-orange-50"
        />
        <MetricCard
          label={`Revenue (${periodLabel(period, customFrom, customTo)})`}
          value={inr(metrics.revenue)}
          icon={Wallet}
          gradient="from-emerald-500 to-teal-600"
          bg="from-emerald-50 to-teal-50"
        />
      </div>

      {/* Slim Revenue Period Chips */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <Wallet className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-semibold text-slate-600">Revenue period:</span>
        <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
          {([
            { key: "today", label: "Today" },
            { key: "week", label: "Week" },
            { key: "month", label: "Month" },
            { key: "year", label: "Year" },
            { key: "all", label: "All" },
            { key: "custom", label: "Custom" },
          ] as { key: Period; label: string }[]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                period === opt.key
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
          </>
        )}
      </div>

      {/* Admission Center Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-bold text-slate-800">Admissions by Center</h3>
          <span className="text-xs text-slate-400">(student counts all-time; revenue for {periodLabel(period, customFrom, customTo)})</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {centerBreakdown.map((c) => {
            const pct = metrics.students > 0 ? Math.round((c.count / metrics.students) * 100) : 0;
            return (
              <button
                key={c.center}
                onClick={() => setFilterCenter(filterCenter === c.center ? "" : c.center)}
                className={`text-left rounded-xl border p-3 transition-all ${
                  filterCenter === c.center
                    ? "border-rose-300 bg-gradient-to-br from-rose-50 to-amber-50 shadow-md"
                    : "border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-rose-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-sm flex-shrink-0">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{c.center}</p>
                      <p className="text-xs text-slate-500">{pct}% of total</p>
                    </div>
                  </div>
                  <span className="text-lg font-extrabold text-slate-900">{c.count}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Revenue</span>
                  <span className="font-bold text-emerald-700">{inr(c.revenue)}</span>
                </div>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, ID, phone, course…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
            />
          </div>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none bg-white"
          >
            <option value="">All Years</option>
            {allYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={filterFaculty}
            onChange={(e) => setFilterFaculty(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none bg-white"
          >
            <option value="">All Faculties</option>
            {allFaculties.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={filterUniversity}
            onChange={(e) => setFilterUniversity(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none bg-white"
          >
            <option value="">All Universities</option>
            {allUniversities.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <select
            value={filterCenter}
            onChange={(e) => setFilterCenter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none bg-white"
          >
            <option value="">All Centers</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Kochi">Kochi</option>
            <option value="Salem">Salem</option>
            <option value="Hyderabad">Hyderabad</option>
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* University → Course → Student drill-down */}
      <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        {grouped.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-500">
            <GraduationCap className="w-10 h-10 mb-2 text-slate-300" />
            <p className="text-sm font-medium">No students match the current filters.</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-xs font-semibold text-red-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {grouped.map((uni) => {
              const isOpen = openUni[uni.university] ?? true;
              const totalFee = uni.students.reduce(
                (a, s) => a + studentEffective(s),
                0
              );
              const totalPaid = uni.students.reduce(
                (a, s) => a + studentPaid(s),
                0
              );
              return (
                <div key={uni.university}>
                  {/* University Row */}
                  <button
                    onClick={() =>
                      setOpenUni((s) => ({ ...s, [uni.university]: !isOpen }))
                    }
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {uni.university}
                        </p>
                        <p className="text-xs text-slate-500">
                          {Object.keys(uni.courses).length} course
                          {Object.keys(uni.courses).length !== 1 ? "s" : ""} •{" "}
                          {uni.students.length} student
                          {uni.students.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                          Effective Fee
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                          {inr(totalFee)}
                        </p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                          Collected
                        </p>
                        <p className="text-sm font-bold text-emerald-700">
                          {inr(totalPaid)}
                        </p>
                      </div>
                      <span className="inline-flex items-center justify-center min-w-[40px] px-2.5 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-sm">
                        {uni.students.length}
                      </span>
                    </div>
                  </button>

                  {/* Courses */}
                  {isOpen && (
                    <div className="bg-slate-50/50">
                      {Object.entries(uni.courses)
                        .sort((a, b) => b[1].length - a[1].length)
                        .map(([course, list]) => {
                          const courseKey = `${uni.university}||${course}`;
                          const cOpen = openCourse[courseKey] ?? false;
                          const cPaid = list.reduce(
                            (a, s) => a + studentPaid(s),
                            0
                          );
                          const cFee = list.reduce(
                            (a, s) => a + studentEffective(s),
                            0
                          );
                          return (
                            <div key={courseKey}>
                              <button
                                onClick={() =>
                                  setOpenCourse((s) => ({
                                    ...s,
                                    [courseKey]: !cOpen,
                                  }))
                                }
                                className="w-full flex items-center justify-between gap-3 pl-12 pr-4 py-2.5 hover:bg-white transition-colors text-left border-t border-slate-100"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {cOpen ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  )}
                                  <BookOpen className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                  <p className="text-xs font-semibold text-slate-800 truncate">
                                    {course}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <div className="text-right hidden md:block">
                                    <p className="text-xs text-slate-500">
                                      {inr(cPaid)} / {inr(cFee)}
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-full text-xs font-bold text-amber-800 bg-amber-100">
                                    {list.length}
                                  </span>
                                </div>
                              </button>

                              {/* Students */}
                              {cOpen && (
                                <div className="overflow-x-auto bg-white border-t border-slate-100">
                                  <table className="w-full text-xs">
                                    <thead className="bg-slate-100/70 text-slate-600">
                                      <tr>
                                        <th className="text-left px-4 py-2 font-semibold">#</th>
                                        <th className="text-left px-4 py-2 font-semibold">Student ID</th>
                                        <th className="text-left px-4 py-2 font-semibold">Name</th>
                                        <th className="text-left px-4 py-2 font-semibold">Phone</th>
                                        <th className="text-left px-4 py-2 font-semibold">Year</th>
                                        <th className="text-left px-4 py-2 font-semibold">Enrolled</th>
                                        <th className="text-right px-4 py-2 font-semibold">Fee</th>
                                        <th className="text-right px-4 py-2 font-semibold">Paid</th>
                                        <th className="text-right px-4 py-2 font-semibold">Balance</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {list.map((s, idx) => {
                                        const paid = studentPaid(s);
                                        const eff = studentEffective(s);
                                        const bal = Math.max(eff - paid, 0);
                                        return (
                                          <tr
                                            key={s.id}
                                            className="hover:bg-slate-50"
                                          >
                                            <td className="px-4 py-2 text-slate-400">
                                              {idx + 1}
                                            </td>
                                            <td className="px-4 py-2">
                                              <Link
                                                href={`/admin/students?id=${s.id}`}
                                                className="font-mono text-blue-600 hover:underline"
                                              >
                                                {s.studentId || s.id}
                                              </Link>
                                            </td>
                                            <td className="px-4 py-2 font-medium text-slate-800">
                                              {s.name ||
                                                `${s.firstName || ""} ${s.lastName || ""}`.trim() ||
                                                "—"}
                                            </td>
                                            <td className="px-4 py-2 text-slate-600">
                                              {s.phone || "—"}
                                            </td>
                                            <td className="px-4 py-2 text-slate-600">
                                              {s.startYear || "—"}
                                              {s.endYear ? ` – ${s.endYear}` : ""}
                                            </td>
                                            <td className="px-4 py-2 text-slate-600">
                                              {s.enrollmentDate
                                                ? formatDateDisplay(s.enrollmentDate)
                                                : "—"}
                                            </td>
                                            <td className="px-4 py-2 text-right text-slate-700">
                                              {inr(eff)}
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold text-emerald-700">
                                              {inr(paid)}
                                            </td>
                                            <td
                                              className={`px-4 py-2 text-right font-semibold ${
                                                bal > 0
                                                  ? "text-rose-700"
                                                  : "text-slate-400"
                                              }`}
                                            >
                                              {inr(bal)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <TrendingUp className="w-3.5 h-3.5" />
        Tip: Use filters to narrow results, then export CSV for offline analysis.
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  icon: Icon,
  gradient,
  bg,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  bg: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br ${bg} p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900 truncate">
            {value}
          </p>
        </div>
        <div
          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md flex-shrink-0`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
