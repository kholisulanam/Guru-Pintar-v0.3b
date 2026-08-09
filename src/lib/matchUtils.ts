import { TeacherItem, SubjectItem, ClassItem } from '../types';

/**
 * Clean string for alphanumeric comparisons
 */
export function cleanStr(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Remove Indonesian academic titles, honorifics, and degrees to get core name
 */
export function stripTeacherTitles(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(dra|drs|dr|prof|h|hj|ir|kh|k\.h|ust|ustadz|amd|s\.pd|s\.pd\.i|m\.pd|m\.pd\.i|s\.si|m\.si|s\.t|m\.t|s\.sos|s\.sos\.i|s\.ag|m\.ag|s\.e|m\.m|lc|m\.a|s\.kom|m\.kom|s\.hum|m\.hum|s\.i\.p|s\.h|m\.h|pd\.i|pd|si|ag|sos\.i|sos)\b/gi, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get core name tokens for a teacher (removing titles/degrees and short noise words)
 */
export function getTeacherCoreTokens(name: string): string[] {
  const stripped = stripTeacherTitles(name);
  return stripped
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !['moh', 'mohammad', 'muhammad', 'ahmad', 'nur'].includes(token));
}

/**
 * Match a teacher from Excel raw text or ID against a list of teachers
 */
export function matchTeacher(rawGuru: string, teachers: TeacherItem[]): TeacherItem | null {
  if (!rawGuru || !rawGuru.trim()) return null;
  const raw = rawGuru.trim();
  const rawLower = raw.toLowerCase();
  const rawClean = cleanStr(raw);

  // 1. Exact ID or Exact Name Match (case-insensitive)
  const exact = teachers.find(
    (t) =>
      t.id.toLowerCase() === rawLower ||
      t.nama.trim().toLowerCase() === rawLower ||
      (t.nuptk && t.nuptk.trim() === raw)
  );
  if (exact) return exact;

  // 2. Cleaned Alphanumeric Exact Match
  const cleanMatch = teachers.find((t) => cleanStr(t.nama) === rawClean);
  if (cleanMatch) return cleanMatch;

  // 3. Stripped Titles Core Name Exact Match
  const rawCore = stripTeacherTitles(raw);
  if (rawCore.length > 2) {
    const coreMatch = teachers.find((t) => {
      const tCore = stripTeacherTitles(t.nama);
      return tCore.length > 2 && tCore === rawCore;
    });
    if (coreMatch) return coreMatch;
  }

  // 4. Distinctive Tokens Exact Match (e.g., "Kamilah", "Awiyani", "Arifin", "Rusdi")
  const rawDistinctiveTokens = getTeacherCoreTokens(raw);
  if (rawDistinctiveTokens.length > 0) {
    const tokenMatch = teachers.find((t) => {
      const tTokens = getTeacherCoreTokens(t.nama);
      if (tTokens.length === 0) return false;
      return (
        rawDistinctiveTokens.every((tok) => tTokens.includes(tok)) &&
        tTokens.every((tok) => rawDistinctiveTokens.includes(tok))
      );
    });
    if (tokenMatch) return tokenMatch;
  }

  return null;
}

/**
 * Match a subject / mapel from Excel raw text or ID against a list of subjects
 */
export function matchSubject(rawMapel: string, subjects: SubjectItem[]): SubjectItem | null {
  if (!rawMapel || !rawMapel.trim()) return null;
  const raw = rawMapel.trim();
  const rawLower = raw.toLowerCase();
  const rawClean = cleanStr(raw);

  // 1. Exact ID, Code, or Name Match (case-insensitive)
  const exact = subjects.find(
    (s) =>
      s.id.toLowerCase() === rawLower ||
      s.namaMapel.trim().toLowerCase() === rawLower ||
      (s.kode && s.kode.trim().toLowerCase() === rawLower)
  );
  if (exact) return exact;

  // 2. Cleaned Alphanumeric Exact Match
  const cleanMatch = subjects.find((s) => cleanStr(s.namaMapel) === rawClean);
  if (cleanMatch) return cleanMatch;

  // 3. Word-by-Word Exact Set Match
  const rawWords = rawLower.split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ');
  const wordMatch = subjects.find((s) => {
    const sWords = s.namaMapel.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ');
    return sWords === rawWords;
  });
  if (wordMatch) return wordMatch;

  // NOTE: We strictly DO NOT use loose `.includes()` here!
  // "Matematika Lanjut" will NOT match "Matematika", and "Matematika" will NOT match "Matematika Lanjut".
  return null;
}

/**
 * Match a class / kelas from Excel raw text or ID against a list of classes
 */
export function matchClass(rawKelas: string, classes: ClassItem[]): ClassItem | null {
  if (!rawKelas || !rawKelas.trim()) return null;
  const raw = rawKelas.trim();
  const rawLower = raw.toLowerCase();
  const rawClean = cleanStr(raw);

  // 1. Exact ID or Name Match
  const exact = classes.find(
    (c) => c.id.toLowerCase() === rawLower || c.namaKelas.trim().toLowerCase() === rawLower
  );
  if (exact) return exact;

  // 2. Cleaned Alphanumeric Exact Match
  const cleanMatch = classes.find((c) => cleanStr(c.namaKelas) === rawClean);
  if (cleanMatch) return cleanMatch;

  // 3. Normalized Match (e.g., "X IPA 1" vs "Kelas X IPA 1")
  const stripPrefix = (s: string) => s.toLowerCase().replace(/^(kelas|kls)\s+/i, '').replace(/[^a-z0-9]/g, '');
  const rawStripped = stripPrefix(raw);
  const normMatch = classes.find((c) => stripPrefix(c.namaKelas) === rawStripped);
  if (normMatch) return normMatch;

  return null;
}

/**
 * Converts a schedule time string or period label (e.g. "07.00 - 08.30", "08.30", "Jam Ke-1", "1") into total minutes from midnight for chronological sorting.
 */
export function parseJamKeToMinutes(jamKe: string): number {
  if (!jamKe) return 9999;
  const str = jamKe.trim();

  // 1. Look for time pattern like HH:MM or HH.MM (e.g. "07.00 - 08.30", "07:30")
  const timeMatch = str.match(/(\d{1,2})[:.](\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    return hours * 60 + minutes;
  }

  // 2. Look for single hour number if specified as HH
  const hourMatch = str.match(/^(\d{1,2})\b/);
  if (hourMatch) {
    const val = parseInt(hourMatch[1], 10);
    if (val >= 6 && val <= 18) {
      return val * 60;
    }
    return val * 60;
  }

  // 3. Fallback: extract any digits as period number
  const numMatch = str.match(/\d+/);
  if (numMatch) {
    return parseInt(numMatch[0], 10) * 60;
  }

  return 9999;
}

/**
 * Sorts an array of schedule items chronologically based on their jamKe / teaching time order.
 */
export function sortSchedulesByJam<T extends Record<string, any>>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const minA = parseJamKeToMinutes(a.jamKe || '');
    const minB = parseJamKeToMinutes(b.jamKe || '');
    if (minA !== minB) {
      return minA - minB;
    }
    return (a.jamKe || '').localeCompare(b.jamKe || '');
  });
}
