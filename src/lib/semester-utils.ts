// Utility functions for semester calculations

/**
 * Calculates the number of semesters from a duration string
 * Examples:
 * - "3 Years (6 Semesters)" → 6
 * - "4 Years (8 Semesters)" → 8
 * - "2 Years (4 Semesters)" → 4
 * - "1 Year (2 Semesters)" → 2
 * - "6 Months" → 1
 * - "2 Years" → 4 (default 2 semesters per year)
 */
export function getSemesterCount(duration: string): number {
  if (!duration) return 0;

  // Try to extract semester count from parentheses
  const semesterMatch = duration.match(/(\d+)\s*Semesters?/i);
  if (semesterMatch) {
    return parseInt(semesterMatch[1], 10);
  }

  // If no explicit semester count, calculate from years (default 2 semesters per year)
  const yearMatch = duration.match(/(\d+)\s*Years?/i);
  if (yearMatch) {
    const years = parseInt(yearMatch[1], 10);
    return years * 2;
  }

  // For 6 Months courses, treat as 1 semester
  if (duration.toLowerCase().includes("month")) {
    return 1;
  }

  return 0;
}

/**
 * Calculates the number of years from a duration string
 * Examples:
 * - "3 Years (6 Semesters)" → 3
 * - "4 Years (8 Semesters)" → 4
 * - "2 Years (4 Semesters)" → 2
 * - "1 Year (2 Semesters)" → 1
 * - "6 Months" → 1 (treat as 1 year)
 */
export function getYearCount(duration: string): number {
  if (!duration) return 0;

  // Try to extract year count from duration string
  const yearMatch = duration.match(/(\d+)\s*Years?/i);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }

  // For 6 Months courses, treat as 1 year
  if (duration.toLowerCase().includes("month")) {
    return 1;
  }

  return 0;
}

/**
 * Groups semesters by year
 * Returns an array of year objects with their semesters
 * Example: 6 semesters → [{ year: 1, semesters: [1, 2] }, { year: 2, semesters: [3, 4] }, { year: 3, semesters: [5, 6] }]
 */
export function groupSemestersByYear(semesterCount: number): Array<{ year: number; semesters: number[] }> {
  const years: Array<{ year: number; semesters: number[] }> = [];
  const semestersPerYear = 2; // Assuming 2 semesters per year

  for (let i = 0; i < semesterCount; i += semestersPerYear) {
    const year = Math.floor(i / semestersPerYear) + 1;
    const semesters: number[] = [];
    for (let j = 0; j < semestersPerYear && i + j < semesterCount; j++) {
      semesters.push(i + j + 1);
    }
    years.push({ year, semesters });
  }

  return years;
}
