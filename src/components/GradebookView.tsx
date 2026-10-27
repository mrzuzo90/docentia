import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
  Search,
  Eye
} from 'lucide-react';
import { Exam, StudentSubmission, StudentGradeReport } from '../types';
import { ExportService } from '../services/exportService';
import { StudentDetailModal } from './StudentDetailModal';
import { DuoMascot } from './DuoMascot';

interface GradebookViewProps {
  exam: Exam;
  submissions: StudentSubmission[];
  onUpdateSubmissions: (subs: StudentSubmission[]) => void;
  onNotify?: (title: string, description?: string, type?: 'success' | 'info' | 'warning') => void;
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  exam,
  submissions,
  onUpdateSubmissions,
  onNotify
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReview, setFilterReview] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [copiedCsv, setCopiedCsv] = useState(false);

  const gradedList = submissions.filter(s => s.gradeReport);
  const reports: StudentGradeReport[] = gradedList.map(s => s.gradeReport!);

  const totalStudents = reports.length;
  const averageScore =
    totalStudents > 0 ? reports.reduce((acc, r) => acc + r.finalScore, 0) / totalStudents : 0;

  const avgTestOut10 =
    totalStudents > 0
      ? reports.reduce((acc, r) => {
          const val =
            r.testSectionScoreOutOf10 ??
            (r.testSectionMax > 0 ? (r.testSectionScore / r.testSectionMax) * 10 : 0);
          return acc + val;
        }, 0) / totalStudents
      : 0;

  const avgExOut10 =
    totalStudents > 0
      ? reports.reduce((acc, r) => {
          const val =
            r.exerciseSectionScoreOutOf10 ??
            (r.exerciseSectionMax > 0 ? (r.exerciseSectionScore / r.exerciseSectionMax) * 10 : 0);
          return acc + val;
        }, 0) / totalStudents
      : 0;

  const passedStudents = reports.filter(r => r.finalScore >= 5.0).length;
  const passRate = totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0;

  const pendingReviews = reports.filter(r => r.needsManualReview).length;
  const maxScore = totalStudents > 0 ? Math.max(...reports.map(r => r.finalScore)) : 0;
  const minScore = totalStudents > 0 ? Math.min(...reports.map(r => r.finalScore)) : 0;

  const buckets = [
    {
      label: 'Sobresaliente (9.0 – 10)',
      count: reports.filter(r => r.finalScore >= 9.0).length,
      color: 'bg-[#58cc02]'
    },
    {
      label: 'Notable (7.0 – 8.9)',
      count: reports.filter(r => r.finalScore >= 7.0 && r.finalScore < 9.0).length,
      color: 'bg-[#1cb0f6]'
    },
    {
      label: 'Aprobado (5.0 – 6.9)',
      count: reports.filter(r => r.finalScore >= 5.0 && r.finalScore < 7.0).length,
      color: 'bg-[#a5ed6e]'
    },
    {
      label: 'Insuficiente (< 5.0)',
      count: reports.filter(r => r.finalScore < 5.0).length,
      color: 'bg-[#afafaf]'
    }
  ];

  const allItems = [
    ...exam.testQuestions.map((q, idx) => ({
      id: q.id,
      label: `P${idx + 1} (Test): ${q.question.slice(0, 48)}...`,
      max: q.points
    })),
    ...exam.exercises.map((ex, idx) => ({
      id: ex.id,
      label: `Ej.${idx + 1} (Desarrollo): ${ex.title.slice(0, 45)}`,
      max: ex.points
    }))
  ];

  const itemStats = allItems.map(item => {
    let sumEarned = 0;
    let count = 0;
    reports.forEach(r => {
      const found = r.corrections.find(c => c.questionId === item.id);
      if (found) {
        const earned =
          found.teacherOverrideScore !== undefined ? found.teacherOverrideScore : found.scoreAwarded;
        sumEarned += earned;
        count++;
      }
    });
    const avgEarned = count > 0 ? sumEarned / count : 0;
    const pct = item.max > 0 ? Math.min(100, Math.round((avgEarned / item.max) * 100)) : 0;
    return { ...item, avgEarned, pct };
  });

  const handleDownloadCsv = () => {
    const csvContent = ExportService.exportGradesToCSV(reports);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Acta_${exam.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify?.('Acta Oficial descargada (.CSV)', 'Compatible con Excel, Séneca, Raíces y Google Sheets.', 'success');
  };

  const handleCopyCsv = () => {
    const csvContent = ExportService.exportGradesToCSV(reports);
    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    onNotify?.('Tabla de calificaciones copiada', 'Pégala directamente en tu hoja de cálculo.', 'info');
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const handleSaveReport = (updatedReport: StudentGradeReport) => {
    const updated = submissions.map(sub => {
      if (sub.id === updatedReport.submissionId) {
        return {
          ...sub,
          status: updatedReport.needsManualReview ? ('needs_review' as const) : ('graded' as const),
          gradeReport: updatedReport
        };
      }
      return sub;
    });
    onUpdateSubmissions(updated);
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReview = filterReview ? r.needsManualReview : true;
    return matchesSearch && matchesReview;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Duolingo Storybook Hero Section: Text Left + Floating Trophy Mascot Right */}
      <div className="py-4 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
        <div className="lg:col-span-7 space-y-4">
          <span className="inline-block text-[15px] font-bold uppercase tracking-[0.053em] text-[#1cb0f6]">
            PASO 4 · ACTA DE CALIFICACIONES Y ESTADÍSTICAS
          </span>
          <h2 className="duo-section-headline">
            resultados claros del 0 al 10.
          </h2>
          <h3 className="duo-hero-headline text-[24px] sm:text-[32px]">
            {exam.title}
          </h3>
          <p className="duo-body-copy max-w-[480px]">
            Consulta la nota de 0 a 10 de cada sección, la nota final ponderada y exporta el acta lista para Excel o el cuaderno del profesor.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyCsv}
              className="duo-btn-outlined py-2.5 px-4"
            >
              {copiedCsv ? <Check className="h-4 w-4 text-[#58cc02]" /> : <Copy className="h-4 w-4" />}
              <span>{copiedCsv ? '¡COPIADO!' : 'COPIAR PARA EXCEL'}</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              disabled={totalStudents === 0}
              className="duo-btn-primary py-2.5 px-5"
            >
              <Download className="h-4 w-4" />
              <span>DESCARGAR ACTA (.CSV)</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <DuoMascot variant="trophy" />
        </div>
      </div>

      {/* 4 KPI Sticker Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="duo-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
              NOTA MEDIA DEL GRUPO
            </span>
            <TrendingUp className="h-5 w-5 text-[#58cc02]" />
          </div>
          <div className="my-2">
            <span className="font-feather font-extrabold text-[40px] text-[#58cc02] tabular-nums">
              {averageScore.toFixed(2)}
            </span>
            <span className="text-[15px] font-bold text-[#777777] ml-1">/ 10</span>
          </div>
          <div className="text-[13px] font-bold text-[#777777] flex justify-between border-t-2 border-[#afafaf]/40 pt-2">
            <span>Test: <strong className="text-[#4b4b4b]">{avgTestOut10.toFixed(1)}/10</strong></span>
            <span>Ejerc.: <strong className="text-[#4b4b4b]">{avgExOut10.toFixed(1)}/10</strong></span>
          </div>
        </div>

        <div className="duo-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
              APROBADOS
            </span>
            <CheckCircle2 className="h-5 w-5 text-[#58cc02]" />
          </div>
          <div className="my-2">
            <span className="font-feather font-extrabold text-[40px] text-[#58cc02] tabular-nums">
              {passRate.toFixed(0)}%
            </span>
          </div>
          <div className="text-[13px] font-bold text-[#777777] border-t-2 border-[#afafaf]/40 pt-2">
            {passedStudents} aprobados de {totalStudents} alumnos
          </div>
        </div>

        <div
          className={`duo-card flex flex-col justify-between ${
            pendingReviews > 0 ? 'border-[#58cc02] bg-[#d7ffb8]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
              REVISIÓN MANUAL DOCENTE
            </span>
            <AlertTriangle className="h-5 w-5 text-[#58cc02]" />
          </div>
          <div className="my-2">
            <span className="font-feather font-extrabold text-[40px] text-[#4b4b4b] tabular-nums">
              {pendingReviews}
            </span>
            <span className="text-[15px] font-bold text-[#777777] ml-1.5">examen(es)</span>
          </div>
          <div className="text-[13px] font-bold text-[#777777] border-t-2 border-[#afafaf]/40 pt-2">
            {pendingReviews > 0 ? 'Pendientes de revisar' : 'Todos verificados'}
          </div>
        </div>

        <div className="duo-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
              RANGO DE NOTAS
            </span>
            <Award className="h-5 w-5 text-[#1cb0f6]" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="font-feather font-extrabold text-[40px] text-[#1cb0f6] tabular-nums">
              {maxScore.toFixed(1)}
            </span>
            <span className="text-[13px] font-bold text-[#777777]">MÁX</span>
            <span className="text-[#afafaf]">/</span>
            <span className="font-feather font-extrabold text-[28px] text-[#4b4b4b] tabular-nums">
              {minScore.toFixed(1)}
            </span>
            <span className="text-[13px] font-bold text-[#777777]">MÍN</span>
          </div>
          <div className="text-[13px] font-bold text-[#777777] border-t-2 border-[#afafaf]/40 pt-2">
            Escala 0 a 10 puntos
          </div>
        </div>

      </div>

      {/* Psychometric Breakdown & Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left 5 cols: Qualitative Grade Distribution */}
        <div className="lg:col-span-5 duo-card space-y-4">
          <span className="text-[15px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b] block">
            DISTRIBUCIÓN DE CALIFICACIONES
          </span>
          <div className="space-y-3">
            {buckets.map((b, i) => {
              const pct = totalStudents > 0 ? Math.round((b.count / totalStudents) * 100) : 0;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-[15px] font-bold text-[#4b4b4b]">
                    <span>{b.label}</span>
                    <span>
                      {b.count} al. ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full ${b.color} transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 cols: Item Difficulty & Success Rate */}
        <div className="lg:col-span-7 duo-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
              ACIERTO POR PREGUNTA Y EJERCICIO
            </span>
            <span className="text-[13px] font-bold text-[#777777]">
              MEDIA / PUNTOS MÁXIMOS
            </span>
          </div>

          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {itemStats.map(item => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between text-[15px]">
                  <span className="font-bold text-[#4b4b4b] truncate pr-4">{item.label}</span>
                  <span className="font-bold text-[#58cc02] shrink-0 tabular-nums">
                    {item.avgEarned.toFixed(2)} / {item.max.toFixed(2)} pts ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] overflow-hidden">
                  <div
                    style={{ width: `${item.pct}%` }}
                    className={`h-full transition-all duration-500 ${
                      item.pct >= 60 ? 'bg-[#58cc02]' : 'bg-[#1cb0f6]'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Official Gradebook Table */}
      <div className="duo-card p-0 overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-5 bg-[#ffffff] border-b-2 border-[#afafaf] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 text-[#777777] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar alumno por nombre..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-[15px] pl-10 pr-3.5 py-2 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] text-[#4b4b4b] focus:outline-none focus:border-[#58cc02]"
            />
          </div>

          <label className="flex items-center gap-2 text-[15px] font-bold text-[#4b4b4b] cursor-pointer self-start sm:self-auto">
            <input
              type="checkbox"
              checked={filterReview}
              onChange={e => setFilterReview(e.target.checked)}
              className="w-4 h-4 accent-[#58cc02]"
            />
            <span>Mostrar solo con revisión manual pendiente ({pendingReviews})</span>
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px] text-[#4b4b4b]">
            <thead className="bg-[#ffffff] text-[13px] uppercase tracking-[0.053em] font-bold text-[#777777] border-b-2 border-[#afafaf]">
              <tr>
                <th className="py-4 px-5">Alumno</th>
                <th className="py-4 px-5 text-center">Sección Test (0–10)</th>
                <th className="py-4 px-5 text-center">Sección Ejercicios (0–10)</th>
                <th className="py-4 px-5 text-center">Nota Final (0–10)</th>
                <th className="py-4 px-5 text-center">Estado OCR</th>
                <th className="py-4 px-5 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#afafaf]/40">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#777777]">
                    No se encontraron registros que coincidan con el filtro actual.
                  </td>
                </tr>
              ) : (
                filteredReports.map(report => {
                  const isPassing = report.finalScore >= 5.0;
                  const matchingSub = submissions.find(s => s.id === report.submissionId);
                  const testOut10 =
                    report.testSectionScoreOutOf10 ??
                    (report.testSectionMax > 0
                      ? (report.testSectionScore / report.testSectionMax) * 10
                      : 0);
                  const exOut10 =
                    report.exerciseSectionScoreOutOf10 ??
                    (report.exerciseSectionMax > 0
                      ? (report.exerciseSectionScore / report.exerciseSectionMax) * 10
                      : 0);

                  return (
                    <tr
                      key={report.id}
                      onClick={() => matchingSub && setSelectedSubmission(matchingSub)}
                      className="hover:bg-[#d7ffb8]/30 cursor-pointer transition"
                    >
                      <td className="py-4 px-5">
                        <div className="font-bold text-[#4b4b4b] text-[17px]">{report.studentName}</div>
                        <div className="text-[13px] text-[#777777]">
                          {matchingSub?.studentIdCode || 'EXP-2026'}
                        </div>
                      </td>

                      <td className="py-4 px-5 text-center tabular-nums">
                        <span className="font-bold text-[#4b4b4b] text-[17px]">{testOut10.toFixed(2)}</span>
                        <span className="text-[#777777]">/10</span>
                        <span className="block text-[13px] text-[#777777]">
                          ({report.testSectionScore.toFixed(2)} / {report.testSectionMax.toFixed(1)} pts)
                        </span>
                      </td>

                      <td className="py-4 px-5 text-center tabular-nums">
                        <span className="font-bold text-[#4b4b4b] text-[17px]">{exOut10.toFixed(2)}</span>
                        <span className="text-[#777777]">/10</span>
                        <span className="block text-[13px] text-[#777777]">
                          ({report.exerciseSectionScore.toFixed(2)} / {report.exerciseSectionMax.toFixed(1)} pts)
                        </span>
                      </td>

                      <td className="py-4 px-5 text-center tabular-nums">
                        <span
                          className={`inline-block px-3.5 py-1 rounded-[12px] font-bold text-[17px] border-2 ${
                            isPassing
                              ? 'bg-[#d7ffb8] border-[#58cc02] text-[#4b4b4b]'
                              : 'bg-[#ffffff] border-[#afafaf] text-[#777777]'
                          }`}
                        >
                          {report.finalScore.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-center">
                        {report.needsManualReview ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[12px] text-[13px] uppercase font-bold bg-[#d7ffb8] text-[#4b4b4b] border-2 border-[#58cc02]">
                            <AlertTriangle className="h-4 w-4 text-[#58cc02]" />
                            <span>REVISIÓN MANUAL</span>
                          </span>
                        ) : isPassing ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[12px] text-[13px] uppercase font-bold bg-[#ffffff] text-[#58cc02] border-2 border-[#58cc02]">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>VALIDADO</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[12px] text-[13px] uppercase font-bold bg-[#ffffff] text-[#777777] border-2 border-[#afafaf]">
                            <XCircle className="h-4 w-4" />
                            <span>SUSPENSO</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (matchingSub) setSelectedSubmission(matchingSub);
                          }}
                          className="duo-btn-outlined py-1.5 px-3 text-[13px]"
                        >
                          <Eye className="h-4 w-4" />
                          <span>VER EXAMEN</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Split-Screen Inspection Modal */}
      {selectedSubmission && (
        <StudentDetailModal
          exam={exam}
          submission={selectedSubmission}
          allSubmissions={submissions}
          onSelectSubmission={sub => setSelectedSubmission(sub)}
          onClose={() => setSelectedSubmission(null)}
          onSaveReport={handleSaveReport}
        />
      )}

    </div>
  );
};
