import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Check,
  User,
  Edit3,
  Save,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  ScanLine,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Exam, StudentGradeReport, StudentSubmission, QuestionCorrection } from '../types';
import { createSimulatedScanDataUrl } from '../services/mockData';

interface StudentDetailModalProps {
  exam: Exam;
  submission: StudentSubmission;
  allSubmissions?: StudentSubmission[];
  onSelectSubmission?: (sub: StudentSubmission) => void;
  onClose: () => void;
  onSaveReport: (report: StudentGradeReport) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  exam,
  submission,
  allSubmissions = [],
  onSelectSubmission,
  onClose,
  onSaveReport
}) => {
  const initialReport = submission.gradeReport;
  if (!initialReport) return null;

  const [corrections, setCorrections] = useState<QuestionCorrection[]>(initialReport.corrections || []);
  const [overallFeedback, setOverallFeedback] = useState(initialReport.overallFeedback || '');
  const [activeTab, setActiveTab] = useState<'all' | 'unclear'>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showLaserScan, setShowLaserScan] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when switching student via prev/next buttons
  React.useEffect(() => {
    if (submission.gradeReport) {
      setCorrections(submission.gradeReport.corrections || []);
      setOverallFeedback(submission.gradeReport.overallFeedback || '');
      setActiveTab('all');
    }
  }, [submission.id]);

  // Live section & global score calculations
  const testCorrections = corrections.filter(c => c.type === 'test');
  const exCorrections = corrections.filter(c => c.type === 'exercise');

  const currentTestScore = testCorrections.reduce(
    (sum, c) => sum + (c.teacherOverrideScore !== undefined ? c.teacherOverrideScore : c.scoreAwarded),
    0
  );
  const currentExScore = exCorrections.reduce(
    (sum, c) => sum + (c.teacherOverrideScore !== undefined ? c.teacherOverrideScore : c.scoreAwarded),
    0
  );

  const testMax = initialReport.testSectionMax || exam.testQuestions.reduce((a, b) => a + b.points, 0) || 4.0;
  const exMax = initialReport.exerciseSectionMax || exam.exercises.reduce((a, b) => a + b.points, 0) || 6.0;
  const totalMax = testMax + exMax || 10.0;

  // 0 to 10 evaluation of each section (explicit requirement)
  const testScoreOutOf10 = testMax > 0 ? Number(((currentTestScore / testMax) * 10).toFixed(2)) : 0;
  const exScoreOutOf10 = exMax > 0 ? Number(((currentExScore / exMax) * 10).toFixed(2)) : 0;
  const currentFinalScore = Number((((currentTestScore + currentExScore) / totalMax) * 10).toFixed(2));

  const remainingReviewsCount = corrections.filter(c => c.needsManualReview).length;
  const hasRemainingReviews = remainingReviewsCount > 0;

  // Generate fallback visual scan if submission didn't have one
  const scanUrl =
    submission.scanImageUrl ||
    createSimulatedScanDataUrl({
      studentName: submission.studentName,
      studentId: submission.studentIdCode || 'EXP-2026-042',
      examTitle: exam.title,
      dateStr: new Date(submission.submissionDate).toLocaleDateString('es-ES'),
      q1Choice: 'C',
      q2Choice: 'B',
      q2CrossedOut: hasRemainingReviews ? 'A' : undefined,
      q3Choice: 'C',
      q4Choice: 'B',
      ex1Lines: [
        corrections.find(c => c.type === 'exercise')?.ocrExtractedText.slice(0, 62) ||
          "a) Desarrollo manuscrito según pauta del ejercicio 1...",
        "b) Verificación de secuencias y complementariedad correcta."
      ],
      ex2Lines: [
        "a) Explicación conceptual del fenómeno estudiado...",
        hasRemainingReviews
          ? "b) [Tachón y mancha de tinta en el cálculo final...]"
          : "b) Resolución completa verificada por reconocimiento óptico."
      ],
      hasSmudgeInEx2: hasRemainingReviews
    });

  const handleScoreOverrideChange = (questionId: string, val: number) => {
    setCorrections(prev =>
      prev.map(c => {
        if (c.questionId === questionId) {
          const clamped = Number(Math.max(0, Math.min(c.maxScore, val)).toFixed(2));
          return {
            ...c,
            teacherOverrideScore: clamped
          };
        }
        return c;
      })
    );
  };

  const handleTeacherCommentChange = (questionId: string, comment: string) => {
    setCorrections(prev =>
      prev.map(c => (c.questionId === questionId ? { ...c, teacherComment: comment } : c))
    );
  };

  const handleResolveReview = (questionId: string, newScore?: number) => {
    setCorrections(prev =>
      prev.map(c => {
        if (c.questionId === questionId) {
          return {
            ...c,
            teacherOverrideScore: newScore !== undefined ? newScore : c.teacherOverrideScore ?? c.scoreAwarded,
            needsManualReview: false,
            reviewResolvedByTeacher: true
          };
        }
        return c;
      })
    );
  };

  const handleSaveAll = () => {
    const updatedReport: StudentGradeReport = {
      ...initialReport,
      testSectionScore: Number(currentTestScore.toFixed(2)),
      testSectionScoreOutOf10: testScoreOutOf10,
      exerciseSectionScore: Number(currentExScore.toFixed(2)),
      exerciseSectionScoreOutOf10: exScoreOutOf10,
      finalScore: currentFinalScore,
      overallFeedback,
      corrections,
      needsManualReview: hasRemainingReviews,
      manualReviewReasons: corrections
        .filter(c => c.needsManualReview && c.reviewReason)
        .map(c => c.reviewReason as string),
      reviewedByTeacherAt: new Date().toISOString()
    };

    onSaveReport(updatedReport);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const currentIdx = allSubmissions.findIndex(s => s.id === submission.id);
  const prevSub = currentIdx > 0 ? allSubmissions[currentIdx - 1] : null;
  const nextSub = currentIdx >= 0 && currentIdx < allSubmissions.length - 1 ? allSubmissions[currentIdx + 1] : null;

  const displayedCorrections = corrections.filter(c => {
    if (activeTab === 'unclear') return c.needsManualReview;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#0C0D0E]/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#F6F5F0] rounded-2xl shadow-2xl w-full max-w-[1440px] h-[94vh] flex flex-col overflow-hidden border border-white/15">
        
        {/* TOP WORKBENCH BAR */}
        <div className="bg-[#0C0D0E] text-[#F6F5F0] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 shrink-0">
          
          {/* Student Identity & Prev/Next Switcher */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-serif italic text-xl">
              {submission.studentName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-serif italic text-xl sm:text-2xl text-white leading-none">
                  {submission.studentName}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                  {submission.studentIdCode || 'EXP-2026'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {exam.title} · Archivo: {submission.scanPdfName || 'Pliego_Escaneado.pdf'}
              </p>
            </div>

            {allSubmissions.length > 1 && onSelectSubmission && (
              <div className="hidden md:flex items-center space-x-1 pl-3 border-l border-white/10">
                <button
                  disabled={!prevSub}
                  onClick={() => prevSub && onSelectSubmission(prevSub)}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/15 disabled:opacity-25 text-zinc-300 transition"
                  title="Alumno anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[10px] font-mono text-zinc-400 px-1.5">
                  {currentIdx + 1} / {allSubmissions.length}
                </span>
                <button
                  disabled={!nextSub}
                  onClick={() => nextSub && onSelectSubmission(nextSub)}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/15 disabled:opacity-25 text-zinc-300 transition"
                  title="Siguiente alumno"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* 0-10 Section Evaluations + Weighted Final Score Telemetry */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-3 bg-white/[0.05] px-3.5 py-1.5 rounded-xl border border-white/10 font-mono">
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">
                  SECCIÓN TEST (0–10)
                </span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {testScoreOutOf10.toFixed(2)}<span className="text-zinc-500">/10</span>{' '}
                  <span className="text-[10px] text-zinc-400">({currentTestScore.toFixed(2)}p)</span>
                </span>
              </div>

              <span className="text-zinc-600">|</span>

              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">
                  SECCIÓN EJERCICIOS (0–10)
                </span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {exScoreOutOf10.toFixed(2)}<span className="text-zinc-500">/10</span>{' '}
                  <span className="text-[10px] text-zinc-400">({currentExScore.toFixed(2)}p)</span>
                </span>
              </div>

              <span className="text-zinc-600">|</span>

              <div className="text-right pl-1">
                <span className="text-[9px] uppercase tracking-wider text-[#FF4400] font-bold block">
                  NOTA GLOBAL
                </span>
                <span className="text-base font-black text-emerald-400 tabular-nums">
                  {currentFinalScore.toFixed(2)} <span className="text-xs text-zinc-400">/ 10</span>
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* GLOBAL MANUAL REVIEW ALERT STRIP */}
        {hasRemainingReviews && (
          <div className="bg-[#FF4400] text-white px-5 py-2.5 flex items-center justify-between gap-3 text-xs font-bold shrink-0">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                INCIDENCIA DE LECTURA ÓPTICA DETECTADA: Hay {remainingReviewsCount} ejercicio(s) con caligrafía dudosa, mancha de tinta o tachón que requieren validación manual del profesor.
              </span>
            </div>
            <button
              onClick={() => setActiveTab(activeTab === 'unclear' ? 'all' : 'unclear')}
              className="px-3 py-1 bg-[#0C0D0E] text-white rounded-full text-[11px] font-mono uppercase tracking-wider shrink-0 hover:bg-zinc-800 transition"
            >
              {activeTab === 'unclear' ? 'Mostrar Todo' : `Filtrar Incidencias (${remainingReviewsCount})`}
            </button>
          </div>
        )}

        {/* SPLIT-SCREEN WORKBENCH: LEFT = OPTICAL SCAN, RIGHT = RUBRIC & GRADING */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[#0C0D0E]/15 overflow-hidden">
          
          {/* LEFT PANE (5 COLS): VISUAL HANDWRITTEN SCAN VIEWER */}
          <div className="lg:col-span-5 bg-[#141619] flex flex-col min-h-0 overflow-hidden">
            {/* Scan Viewer Controls */}
            <div className="px-4 py-2.5 bg-[#0C0D0E] border-b border-white/10 flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <div className="flex items-center space-x-2">
                <ScanLine className="h-3.5 w-3.5 text-[#FF4400]" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-300 font-bold">
                  VISOR ÓPTICO DEL PLIEGO ENTREGADO
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setShowLaserScan(!showLaserScan)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition ${
                    showLaserScan
                      ? 'bg-[#FF4400]/20 text-[#FF4400] border border-[#FF4400]/40'
                      : 'bg-white/5 text-zinc-400'
                  }`}
                >
                  Láser OCR {showLaserScan ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(Math.max(60, zoomLevel - 20))}
                  className="p-1 hover:text-white rounded bg-white/5"
                  title="Alejar"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-[10px] text-zinc-300 w-10 text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(Math.min(180, zoomLevel + 20))}
                  className="p-1 hover:text-white rounded bg-white/5"
                  title="Acercar"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Scan Canvas with Laser Beam */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start bg-obsidian-grid relative">
              <div
                style={{ width: `${zoomLevel}%`, maxWidth: '680px' }}
                className="relative shadow-2xl rounded bg-white transition-all duration-200"
              >
                {showLaserScan && (
                  <div className="pointer-events-none absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#FF4400] to-transparent shadow-[0_0_12px_#FF4400] animate-scanline z-10" />
                )}
                <img
                  src={scanUrl}
                  alt={`Escaneo de ${submission.studentName}`}
                  className="w-full h-auto block rounded select-none"
                />
              </div>
            </div>
          </div>

          {/* RIGHT PANE (7 COLS): QUESTION-BY-QUESTION RUBRIC & MANUAL TRIAGE */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#F6F5F0]">
            
            {/* Filter Sub-bar */}
            <div className="px-6 py-3 bg-white border-b border-[#0C0D0E]/10 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                    activeTab === 'all'
                      ? 'bg-[#0C0D0E] text-white'
                      : 'bg-[#F6F5F0] text-zinc-600 hover:text-black'
                  }`}
                >
                  Desglose Completo ({corrections.length})
                </button>
                <button
                  onClick={() => setActiveTab('unclear')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
                    activeTab === 'unclear'
                      ? 'bg-[#FF4400] text-white'
                      : 'bg-amber-50 text-amber-900 border border-amber-300'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>Revisión Docente ({remainingReviewsCount})</span>
                </button>
              </div>

              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 hidden sm:inline">
                Comparación automática contra Solucionario Oficial
              </span>
            </div>

            {/* Scrollable Question Cards */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {displayedCorrections.map(corr => {
                const hasReview = corr.needsManualReview;
                const currentPoints =
                  corr.teacherOverrideScore !== undefined ? corr.teacherOverrideScore : corr.scoreAwarded;

                const testQ =
                  corr.type === 'test' ? exam.testQuestions.find(q => q.id === corr.questionId) : null;
                const openEx =
                  corr.type === 'exercise' ? exam.exercises.find(ex => ex.id === corr.questionId) : null;

                return (
                  <div
                    key={corr.questionId}
                    className={`rounded-xl border transition-all p-5 space-y-4 ${
                      hasReview
                        ? 'bg-white border-2 border-[#FF4400] shadow-lg'
                        : 'bg-white border-[#0C0D0E]/12 shadow-2xs'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            corr.type === 'test'
                              ? 'bg-[#0C0D0E] text-white'
                              : 'bg-indigo-950 text-indigo-100'
                          }`}
                        >
                          {corr.type === 'test' ? 'TEST' : 'DESARROLLO'}
                        </span>
                        <h3 className="text-sm font-bold text-[#0C0D0E]">{corr.questionTitle}</h3>
                      </div>

                      {/* Confidence + Score Stepper */}
                      <div className="flex items-center space-x-2.5 self-end sm:self-auto">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            corr.ocrConfidence === 'high'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : corr.ocrConfidence === 'medium'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-[#FF4400]/15 text-[#E03C00] border border-[#FF4400]/30'
                          }`}
                        >
                          OCR: {corr.ocrConfidence.toUpperCase()}
                        </span>

                        <div className="flex items-center bg-[#F6F5F0] border border-[#0C0D0E]/15 rounded-lg px-2 py-1 font-mono">
                          <button
                            type="button"
                            onClick={() => handleScoreOverrideChange(corr.questionId, currentPoints - 0.25)}
                            className="px-1.5 text-xs font-bold text-zinc-600 hover:text-black"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max={corr.maxScore}
                            value={currentPoints}
                            onChange={e =>
                              handleScoreOverrideChange(corr.questionId, parseFloat(e.target.value) || 0)
                            }
                            className="w-14 text-center text-xs font-black bg-white rounded border border-zinc-200 py-0.5 mx-1 tabular-nums text-[#0C0D0E]"
                          />
                          <button
                            type="button"
                            onClick={() => handleScoreOverrideChange(corr.questionId, currentPoints + 0.25)}
                            className="px-1.5 text-xs font-bold text-zinc-600 hover:text-black"
                          >
                            +
                          </button>
                          <span className="text-[11px] text-zinc-500 ml-1 font-bold">
                            / {corr.maxScore.toFixed(2)}p
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* MANUAL REVIEW TRIAGE BOX */}
                    {hasReview && (
                      <div className="bg-[#FFF5F0] border border-[#FF4400]/40 rounded-xl p-4 space-y-3">
                        <div className="flex items-start space-x-2.5 text-xs text-[#0C0D0E]">
                          <AlertTriangle className="h-4 w-4 text-[#FF4400] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#E03C00] block">
                              REQUIERE REVISIÓN MANUAL DEL DOCENTE
                            </span>
                            <p className="font-semibold mt-0.5">
                              {corr.reviewReason || 'Ambigüedad o tachadura detectada en el escaneo.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleResolveReview(corr.questionId, corr.maxScore)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition"
                          >
                            ✔ Dar por Válido ({corr.maxScore.toFixed(2)} pts)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveReview(corr.questionId, currentPoints)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#0C0D0E] hover:bg-zinc-800 text-white transition"
                          >
                            Confirmar Nota ({currentPoints.toFixed(2)} pts) y Marcar Revisado
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveReview(corr.questionId, 0)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 transition"
                          >
                            Anular ítem (0.00 pts)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* OCR Transcription vs Solucionario */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-[#F6F5F0] border border-[#0C0D0E]/10">
                        <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-zinc-500 block mb-1">
                          TRANSCRIPCIÓN OCR DEL ALUMNO
                        </span>
                        <p className="font-mono text-[11px] text-[#0C0D0E] whitespace-pre-line leading-relaxed">
                          {corr.ocrExtractedText || corr.studentAnswer}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-emerald-950 text-emerald-100 border border-emerald-800">
                        <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-emerald-400 block mb-1">
                          SOLUCIONARIO OFICIAL & EVALUACIÓN IA
                        </span>
                        {testQ && (
                          <p className="font-mono text-[11px] text-emerald-300 font-bold mb-1">
                            Clave oficial: Opción {testQ.correctAnswer} ({testQ.options[testQ.correctAnswer]})
                          </p>
                        )}
                        <p className="text-[11px] text-emerald-100/90 leading-relaxed">{corr.feedback}</p>
                      </div>
                    </div>

                    {/* Teacher Note Input */}
                    <div className="flex items-center space-x-2 pt-1">
                      <Edit3 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Observación manuscrita o ajuste del profesor para este ejercicio..."
                        value={corr.teacherComment || ''}
                        onChange={e => handleTeacherCommentChange(corr.questionId, e.target.value)}
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-[#FBFBF9] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0C0D0E]"
                      />
                    </div>
                  </div>
                );
              })}

              {/* Overall Pedagogical Evaluation */}
              <div className="bg-white p-4 rounded-xl border border-[#0C0D0E]/12 space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-500 block">
                  DICTAMEN PEDAGÓGICO GLOBAL DEL EXAMEN
                </label>
                <textarea
                  rows={2}
                  value={overallFeedback}
                  onChange={e => setOverallFeedback(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-zinc-200 bg-[#FBFBF9] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0C0D0E]"
                />
              </div>
            </div>

            {/* Workbench Footer */}
            <div className="px-6 py-4 bg-white border-t border-[#0C0D0E]/12 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs">
                {hasRemainingReviews ? (
                  <span className="text-[#E03C00] font-bold flex items-center space-x-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Quedan {remainingReviewsCount} incidencia(s) por validar</span>
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Pliego verificado y listo para acta oficial</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-[#0C0D0E] hover:bg-[#FF4400] transition shadow-sm"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>¡Acta Actualizada!</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Guardar Calificación ({currentFinalScore.toFixed(2)} / 10)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
