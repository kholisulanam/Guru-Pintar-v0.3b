import { Assessment, User, ScheduleItem, TeacherItem, SubjectItem } from '../types';

/**
 * Checks if an assessment/soal is visible to a user according to the visibility rules:
 * 1. Admin
 * 2. Pembuat soal atau pengampu mapel
 * 3. Murid yang dipilih untuk melakukan ujian
 */
export function canUserAccessAssessment(
  asm: Assessment,
  currentUser: User | null | undefined,
  extra?: {
    schedules?: ScheduleItem[];
    teachers?: TeacherItem[];
    subjects?: SubjectItem[];
  }
): boolean {
  if (!currentUser) return false;

  // 1. Admin role can access all assessments
  if (currentUser.role === 'admin') {
    return true;
  }

  // 2. Pembuat soal atau pengampu mapel (Guru)
  if (currentUser.role === 'guru') {
    const userId = currentUser.id;
    const userNuptk = currentUser.nuptkOrNisn || '';
    const userName = currentUser.name || '';
    const userUsername = currentUser.username || '';

    // Check if creator
    const isCreator =
      asm.guruId === userId ||
      (userNuptk && asm.guruId === userNuptk) ||
      (userName && asm.guruId === userName) ||
      (asm.createdBy && asm.createdBy === userId) ||
      (asm.createdBy && asm.createdBy === userUsername);

    if (isCreator) return true;

    // Check if pengampu mapel (Subject Teacher) via schedule
    const schedules = extra?.schedules || [];
    const isSubjectTeacherInSchedule = schedules.some(
      (s) =>
        (s.guruId === userId || s.guruId === userNuptk || s.guruId === userUsername) &&
        s.mapelId === asm.mapelId
    );

    if (isSubjectTeacherInSchedule) return true;

    // Check if teacher profile has matching mengajarMapel
    const teachers = extra?.teachers || [];
    const teacherObj = teachers.find(
      (t) =>
        t.id === userId ||
        (userNuptk && t.nuptk === userNuptk) ||
        (userName && t.nama === userName)
    );

    if (teacherObj) {
      const subjects = extra?.subjects || [];
      const mapelObj = subjects.find((sub) => sub.id === asm.mapelId);
      if (
        teacherObj.mengajarMapel === asm.mapelId ||
        (mapelObj && teacherObj.mengajarMapel === mapelObj.namaMapel)
      ) {
        return true;
      }
    }

    return false;
  }

  // 3. Murid yang dipilih untuk melakukan ujian (Siswa)
  if (currentUser.role === 'siswa') {
    const studentId = currentUser.id;
    const studentNisn = currentUser.nuptkOrNisn || '';

    // If specific target students are set, student must be in targetSiswaIds
    if (asm.targetSiswaIds && asm.targetSiswaIds.length > 0) {
      return (
        asm.targetSiswaIds.includes(studentId) ||
        (!!studentNisn && asm.targetSiswaIds.includes(studentNisn))
      );
    }

    // Default: if targetSiswaIds is empty/undefined, visible to students in assigned class
    const studentClassId = currentUser.kelasId || '';
    return (
      asm.kelasId === studentClassId ||
      asm.kelasId === 'semua' ||
      asm.kelasId === 'all' ||
      !asm.kelasId
    );
  }

  return false;
}
