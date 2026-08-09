import React from 'react';
import { User, ScheduleItem, TeacherAttendance, TeachingJournal, Assessment, SubjectItem, ClassItem } from '../../types';
import { getTodayString } from '../../lib/storage';
import { canUserAccessAssessment } from '../../lib/assessmentUtils';
import { sortSchedulesByJam, isTeacherMatch } from '../../lib/matchUtils';
import { Clock, CalendarCheck, BookOpen, FileCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface GuruDashboardProps {
  currentUser: User;
  schedules: ScheduleItem[];
  teacherAttendances: TeacherAttendance[];
  teachingJournals: TeachingJournal[];
  assessments: Assessment[];
  subjects: SubjectItem[];
  classes: ClassItem[];
  onNavigateTab: (tabId: string) => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({
  currentUser,
  schedules,
  teacherAttendances,
  teachingJournals,
  assessments,
  subjects,
  classes,
  onNavigateTab,
}) => {
  const todayStr = getTodayString();

  // Map today's day string to Indonesian day
  const daysMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayIndex = new Date().getDay();
  const currentDayName = daysMap[dayIndex];

  // Teacher's today schedule
  const todaySchedules = sortSchedulesByJam(
    schedules.filter((s) => isTeacherMatch(s.guruId, currentUser) && s.hari === currentDayName)
  );

  // Teacher's today attendance status
  const myTeacherAttendances = teacherAttendances.filter((ta) => isTeacherMatch(ta.guruId, currentUser));
  const myTodayAttendance = myTeacherAttendances.find((ta) => ta.tanggal === todayStr);

  // Teacher's today journal status (or teacher's journals if filter applies)
  const myJournals = teachingJournals.filter((tj) => isTeacherMatch(tj.guruId, currentUser));
  const myTodayJournals = myJournals.filter((tj) => tj.tanggal === todayStr);
  const displayJournalCount = myTodayJournals.length > 0 ? myTodayJournals.length : myJournals.length;

  // Teacher's active assessments (Pembuat soal atau pengampu mapel)
  const myActiveAssessments = assessments.filter(
    (a) => a.aktif && canUserAccessAssessment(a, currentUser, { schedules, subjects })
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-teal-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/15 border border-white/20 text-indigo-200 uppercase tracking-wider backdrop-blur-md">
            PORTAL GURU MAS AL-AMIEN
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 drop-shadow">
            AHLAN WA SAHLAN, {currentUser.name}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100/80 mt-1">
            NUPTK: {currentUser.nuptkOrNisn || '197805122005011002'} | Hari ini: <span className="font-bold text-amber-300">{currentDayName}, {todayStr}</span>
          </p>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Status Presensi Guru */}
        <div
          onClick={() => onNavigateTab('presensi_guru')}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 cursor-pointer hover:bg-white/15 hover:scale-[1.02] transition-all duration-200 shadow-xl flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-200/90 uppercase tracking-wider">Status Presensi Guru</span>
            <div className="flex items-center gap-2">
              {myTodayAttendance ? (
                <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Hadir ({myTodayAttendance.jamMasuk})
                </span>
              ) : (
                <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-300" /> Belum Presensi
                </span>
              )}
            </div>
          </div>
          <CalendarCheck className="w-8 h-8 text-indigo-200/50 group-hover:text-white transition" />
        </div>

        {/* Status Jurnal Mengajar */}
        <div
          onClick={() => onNavigateTab('jurnal')}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 cursor-pointer hover:bg-white/15 hover:scale-[1.02] transition-all duration-200 shadow-xl flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-200/90 uppercase tracking-wider">Jurnal Mengajar</span>
            <p className="text-sm font-bold text-white">
              {displayJournalCount} Jurnal Terisi
            </p>
          </div>
          <BookOpen className="w-8 h-8 text-indigo-200/50 group-hover:text-white transition" />
        </div>

        {/* Asesmen Aktif */}
        <div
          onClick={() => onNavigateTab('asesmen')}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 cursor-pointer hover:bg-white/15 hover:scale-[1.02] transition-all duration-200 shadow-xl flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-200/90 uppercase tracking-wider">Asesmen Aktif Anda</span>
            <p className="text-sm font-bold text-amber-300">
              {myActiveAssessments.length} Ujian Berlangsung
            </p>
          </div>
          <FileCheck className="w-8 h-8 text-indigo-200/50 group-hover:text-white transition" />
        </div>
      </div>

      {/* Jadwal Hari Ini */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-300" /> Jadwal Mengajar Hari Ini ({currentDayName})
          </h3>
          <button
            onClick={() => onNavigateTab('jadwal')}
            className="text-xs text-indigo-300 hover:text-white hover:underline font-semibold flex items-center gap-1"
          >
            Lihat Semua Jadwal <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todaySchedules.length === 0 ? (
          <p className="text-xs text-indigo-200/60 py-6 text-center italic">
            Tidak ada jadwal mengajar untuk Anda pada hari {currentDayName}.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todaySchedules.map((sch) => {
              const mapel = subjects.find((m) => m.id === sch.mapelId);
              const kelas = classes.find((c) => c.id === sch.kelasId);

              return (
                <div
                  key={sch.id}
                  className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between text-xs hover:bg-white/10 transition"
                >
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                      {sch.jamKe}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{mapel?.namaMapel}</h4>
                    <p className="text-indigo-200/70">Kelas: <span className="font-semibold text-amber-300">{kelas?.namaKelas}</span></p>
                  </div>

                  <button
                    onClick={() => onNavigateTab('jurnal')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-indigo-600/30 transition"
                  >
                    Isi Jurnal
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
