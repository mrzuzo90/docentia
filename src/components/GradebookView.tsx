import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Award,
  Search,
  Eye,
  XCircle
} from 'lucide-react';
import { Exam, StudentSubmission, StudentGradeReport } from '../types';
import { ExportService } from '../services/exportService';
import { StudentDetailModal } from './StudentDetailModal';
import { DuoMascot } from './DuoMascot';

interface GradebookViewProps {
  exam: Exam;
  submissions: StudentSubmission[];
  onUpdateSubmissions: (subs: StudentSubmission[]) => void;
  onNotify?: (title: string, description?: string, type?: 'success' | 'info') => void;
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  exam,
  submissions,
  onUpdateSubmissions,
  onNotify
}) => {
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReview, setFilterReview] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);

  // Extract all valid grade reports
  const reports: StudentGradeReport[] = submissions
    .filter((s): s is StudentSubmission & { gradeReport: StudentGradeReport } => !!s.gradeReport)
    .map(s => s.gradeReport);

  const totalStudents = reports.length;
  const passedStudents = reports.filter(r => r.finalScore >= 5.0).length;
  const passRate = totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0;

  const averageScore =
    totalStudents > 0
      ? reports.reduce((acc, r) => acc + r.finalScore, 0) / totalStudents
      : 0;

  const maxScore = totalStudents > 0 ? Math.max(...reports.map(r => r.finalScore)) : 0;
  const minScore = totalStudents > 0 ? Math.min(...reports.map(r => r.finalScore)) : 0;
  const pendingReviews = reports.filter(r => r.needsManualReview).length;

  // Average 0-10 per section
  const avgTestOut10 =
    totalStudents > 0 && exam.testSectionWeight > 0
      ? (reports.reduce((acc, r) => acc + r.testSectionScore, 0) /
          totalStudents /
          exam.testSectionWeight) *
        10
      : 0;

  const avgExOut10 =
    totalStudents > 0 && exam.exerciseSectionWeight > 0
      ? (reports.reduce((acc, r) => acc + r.exerciseSectionScore, 0) /
          totalStudents /
          exam.exerciseSectionWeight) *
        10
      : 0;

  // Qualitative buckets
  const buckets = [
    {
      label: 'Sobresaliente (9–10)',
      count: reports.filter(r => r.finalScore >= 9.0).length,
      color: 'bg-[#1d1d1f]'
    },
    {
      label: 'Notable (7–8.9)',
      count: reports.filter(r => r.finalScore >= 7.0 && r.finalScore < 9.0).length,
      color: 'bg-[#0071e3]'
    },
    {
      label: 'Aprobado / Bien (5–6.9)',
      count: reports.filter(r => r.finalScore >= 5.0 && r.finalScore < 7.0).length,
      color: 'bg-[#707070]'
    },
    {
      label: 'Suspenso (0–4.9)',
      count: reports.filter(r => r.finalScore < 5.0).length,
      color: 'bg-[#d6d6d6]'
    }
  ];

  // Item Psychometric Stats
  const itemStats = [
    ...exam.testQuestions.map((q, idx) => {
      const qScores = reports.map(r => {
        const c = r.corrections.find(item => item.questionId === q.id);
        return c?.teacherOverrideScore !== undefined ? c.teacherOverrideScore : c?.scoreAwarded || 0;
      });
      const avgEarned = qScores.length > 0 ? qScores.reduce((a, b) => a + b, 0) / qScores.length : 0;
      const pct = q.points > 0 ? Math.round((avgEarned / q.points) * 100) : 0;
      return {
        id: q.id,
        label: `Test ${idx + 1}`,
        max: q.points,
        avgEarned,
        pct
      };
    }),
    ...exam.exercises.map((ex, idx) => {
      const exScores = reports.map(r => {
        const c = r.corrections.find(item => item.questionId === ex.id);
        return c?.teacherOverrideScore !== undefined ? c.teacherOverrideScore : c?.scoreAwarded || 0;
      });
      const avgEarned = exScores.length > 0 ? exScores.reduce((a, b) => a + b, 0) / exScores.length : 0;
      const pct = ex.points > 0 ? Math.round((avgEarned / ex.points) * 100) : 0;
      return {
        id: ex.id,
        label: `Ejercicio ${idx + 1}`,
        max: ex.points,
        avgEarned,
        pct
      };
    })
  ];

  const handleDownloadCsv = () => {
    ExportService.downloadGradebookCSV(exam, reports);
    onNotify?.('Acta descargada', 'Archivo CSV listo para importar en Excel o Séneca.', 'success');
  };

  const handleCopyCsv = async () => {
    await ExportService.copyGradebookCSV(exam, reports);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2200);
    onNotify?.('Acta copiada', 'Pégala directamente en una hoja de cálculo con Ctrl+V.', 'success');
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
    onNotify?.(
      `Calificación de ${updatedReport.studentName} actualizada`,
      `Nueva nota final: ${updatedReport.finalScore.toFixed(2)}/10`,
      'success'
    );
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReview = filterReview ? r.needsManualReview : true;
    return matchesSearch && matchesReview;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Apple España Hero Section: Sober typography + Lechuza Academic */}
      <div className="py-6 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
        <div className="lg:col-span-7 space-y-4">
          <span className="apple-badge-ember">
            Paso 4 · Acta de calificaciones y estadísticas
          </span>
          <h2 className="text-[36px] sm:text-[48px] font-bold tracking-tight text-[#1d1d1f] leading-[1.08]">
            {exam.title}
          </h2>
          <p className="text-[17px] text-[#707070] max-w-xl leading-relaxed">
            Consulta el rendimiento por bloque de 0 a 10, la nota final ponderada y exporta el acta en formato CSV compatible con hojas de cálculo y plataformas de gestión docente.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyCsv}
              className="apple-pill-ghost text-[14px] py-2 px-5"
            >
              {copiedCsv ? <Check className="h-4 w-4 text-[#0071e3]" /> : <Copy className="h-4 w-4 text-[#707070]" />}
              <span>{copiedCsv ? '¡Copiado!' : 'Copiar para Excel'}</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              disabled={totalStudents === 0}
              className="apple-pill-primary text-[14px] py-2 px-5"
            >
              <Download className="h-4 w-4" />
              <span>Descargar acta (.csv)</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <DuoMascot variant="trophy" className="max-w-[280px]" />
        </div>
      </div>

      {/* 4 KPI Cards (Apple 24px radius, clean hairlines) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-[#ffffff] border border-[#d6d6d6] rounded-[24px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
              Nota media del grupo
            </span>
            <TrendingUp className="h-4 w-4 text-[#0071e3]" />
          </div>
          <div className="my-3">
            <span className="text-[36px] font-bold text-[#1d1d1f] tabular-nums tracking-tight">
              {averageScore.toFixed(2)}
            </span>
            <span className="text-[14px] text-[#707070] ml-1">/ 10</span>
          </div>
          <div className="text-[12px] text-[#707070] flex justify-between border-t border-[#d6d6d6]/60 pt-2.5">
            <span>Test: <strong className="text-[#1d1d1f]">{avgTestOut10.toFixed(1)}/10</strong></span>
            <span>Ejerc.: <strong className="text-[#1d1d1f]">{avgExOut10.toFixed(1)}/10</strong></span>
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#d6d6d6] rounded-[24px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
              Tasa de aprobados
            </span>
            <CheckCircle2 className="h-4 w-4 text-[#0071e3]" />
          </div>
          <div className="my-3">
            <span className="text-[36px] font-bold text-[#1d1d1f] tabular-nums tracking-tight">
              {passRate.toFixed(0)}%
            </span>
          </div>
          <div className="text-[12px] text-[#707070] border-t border-[#d6d6d6]/60 pt-2.5">
            {passedStudents} aprobados de {totalStudents} alumnos
          </div>
        </div>

        <div
          className={`bg-[#ffffff] border rounded-[24px] p-6 flex flex-col justify-between ${
            pendingReviews > 0 ? 'border-[#b64400]/40 bg-[#b64400]/5' : 'border-[#d6d6d6]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
              Revisión manual docente
            </span>
            <AlertTriangle className="h-4 w-4 text-[#b64400]" />
          </div>
          <div className="my-3">
            <span className="text-[36px] font-bold text-[#1d1d1f] tabular-nums tracking-tight">
              {pendingReviews}
            </span>
            <span className="text-[13px] text-[#707070] ml-1.5">examen(es)</span>
          </div>
          <div className="text-[12px] text-[#707070] border-t border-[#d6d6d6]/60 pt-2.5">
            {pendingReviews > 0 ? 'Pendientes de confirmar' : 'Todos verificados'}
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#d6d6d6] rounded-[24px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
              Rango de notas
            </span>
            <Award className="h-4 w-4 text-[#707070]" />
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-[36px] font-bold text-[#1d1d1f] tabular-nums tracking-tight">
              {maxScore.toFixed(1)}
            </span>
            <span className="text-[11px] text-[#707070]">máx</span>
            <span className="text-[#d6d6d6]">/</span>
            <span className="text-[24px] font-bold text-[#707070] tabular-nums">
              {minScore.toFixed(1)}
            </span>
            <span className="text-[11px] text-[#707070]">mín</span>
          </div>
          <div className="text-[12px] text-[#707070] border-t border-[#d6d6d6]/60 pt-2.5">
            Escala normalizada de 0 a 10
          </div>
        </div>

      </div>

      {/* Psychometric Breakdown & Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left 5 cols: Qualitative Grade Distribution */}
        <div className="lg:col-span-5 bg-[#ffffff] border border-[#d6d6d6] rounded-[28px] p-7 space-y-4">
          <span className="text-[14px] font-semibold text-[#1d1d1f] block">
            Distribución cualitativa de calificaciones
          </span>
          <div className="space-y-3">
            {buckets.map((b, i) => {
              const pct = totalStudents > 0 ? Math.round((b.count / totalStudents) * 100) : 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[13px] text-[#1d1d1f]">
                    <span>{b.label}</span>
                    <span className="text-[#707070]">
                      {b.count} al. ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
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
        <div className="lg:col-span-7 bg-[#ffffff] border border-[#d6d6d6] rounded-[28px] p-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#1d1d1f]">
              Tasa de acierto por pregunta y ejercicio
            </span>
            <span className="text-[12px] text-[#707070]">
              Media / Puntos máximos
            </span>
          </div>

          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
            {itemStats.map(item => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#1d1d1f] truncate pr-4">{item.label}</span>
                  <span className="font-medium text-[#1d1d1f] shrink-0 tabular-nums">
                    {item.avgEarned.toFixed(2)} / {item.max.toFixed(2)} pts ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.pct}%` }}
                    className={`h-full transition-all duration-500 ${
                      item.pct >= 60 ? 'bg-[#0071e3]' : 'bg-[#707070]'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Official Gradebook Table */}
      <div className="bg-[#ffffff] border border-[#d6d6d6] rounded-[28px] overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-5 bg-[#ffffff] border-b border-[#d6d6d6] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 text-[#707070] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar alumno..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-[14px] pl-10 pr-3.5 py-2 rounded-[14px] border border-[#d6d6d6] bg-[#fafafc] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
            />
          </div>

          <label className="flex items-center gap-2 text-[13px] text-[#474747] cursor-pointer self-start sm:self-auto">
            <input
              type="checkbox"
              checked={filterReview}
              onChange={e => setFilterReview(e.target.checked)}
              className="w-4 h-4 rounded text-[#0071e3] focus:ring-[#0071e3]"
            />
            <span>Mostrar solo con revisión pendiente ({pendingReviews})</span>
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] text-[#1d1d1f]">
            <thead className="bg-[#fafafc] text-[12px] uppercase tracking-wider text-[#707070] border-b border-[#d6d6d6]">
              <tr>
                <th className="py-3.5 px-6">Alumno</th>
                <th className="py-3.5 px-6 text-center">Test (0–10)</th>
                <th className="py-3.5 px-6 text-center">Ejercicios (0–10)</th>
                <th className="py-3.5 px-6 text-center">Nota Final (0–10)</th>
                <th className="py-3.5 px-6 text-center">Estado OCR</th>
                <th className="py-3.5 px-6 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d6d6d6]">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#707070]">
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
                      className="hover:bg-[#f5f5f7] cursor-pointer transition"
                    >
                      <td className="py-4 px-6">
                        <div className="font-medium text-[#1d1d1f] text-[15px]">{report.studentName}</div>
                        <div className="text-[12px] text-[#707070]">
                          {matchingSub?.studentIdCode || 'EXP-2026'}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center tabular-nums">
                        <span className="font-semibold text-[#1d1d1f]">{testOut10.toFixed(2)}</span>
                        <span className="text-[#707070]">/10</span>
                        <span className="block text-[11px] text-[#707070]">
                          ({report.testSectionScore.toFixed(2)} / {report.testSectionMax.toFixed(1)} pts)
                        </span>
                      </td>

                      <td className="py-4 px-6 text-center tabular-nums">
                        <span className="font-semibold text-[#0071e3]">{exOut10.toFixed(2)}</span>
                        <span className="text-[#707070]">/10</span>
                        <span className="block text-[11px] text-[#707070]">
                          ({report.exerciseSectionScore.toFixed(2)} / {report.exerciseSectionMax.toFixed(1)} pts)
                        </span>
                      </td>

                      <td className="py-4 px-6 text-center tabular-nums">
                        <span
                          className={`inline-block px-3 py-0.5 rounded-full font-bold text-[15px] ${
                            isPassing
                              ? 'bg-[#1d1d1f] text-[#ffffff]'
                              : 'bg-[#fafafc] border border-[#d6d6d6] text-[#707070]'
                          }`}
                        >
                          {report.finalScore.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-center">
                        {report.needsManualReview ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] bg-[#b64400]/10 text-[#b64400] font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Por revisar</span>
                          </span>
                        ) : isPassing ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] text-[#0071e3] font-medium bg-[#0071e3]/10">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Validado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] text-[#707070] bg-[#f5f5f7]">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Suspenso</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (matchingSub) setSelectedSubmission(matchingSub);
                          }}
                          className="apple-pill-ghost text-[12px] py-1 px-3"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver</span>
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
