// Date utilities — display format DD-MM-YYYY, storage format YYYY-MM-DD
export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "—";
  // Accept YYYY-MM-DD or DD-MM-YYYY and return DD-MM-YYYY
  if (dateStr.includes("T")) dateStr = dateStr.split("T")[0];
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  if (parts[0].length === 4) {
    // YYYY-MM-DD → DD-MM-YYYY
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  // Already DD-MM-YYYY
  return dateStr;
}
