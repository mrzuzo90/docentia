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
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Exam, StudentGradeReport, StudentSubmission, QuestionCorrection } from '../types';
import { createSimulatedScanDataUrl } from '../services/mockData';
import { SoundService } from '../services/soundService';

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
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);

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
    SoundService.playClick();
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
    SoundService.playSuccess();
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
    SoundService.playSuccess();
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
    setTimeout(() => setSavedSuccess(false), 2400);
  };

  const currentIdx = allSubmissions.findIndex(s => s.id === submission.id);
  const prevSub = currentIdx > 0 ? allSubmissions[currentIdx - 1] : null;
  const nextSub = currentIdx >= 0 && currentIdx < allSubmissions.length - 1 ? allSubmissions[currentIdx + 1] : null;

  // Next student needing review (fluent review flow from docentiaV2)
  const nextPendingStudent = allSubmissions.find(
    s => s.id !== submission.id && (s.status === 'needs_review' || s.gradeReport?.needsManualReview)
  );

  const handleSaveAndNextPending = () => {
    handleSaveAll();
    if (nextPendingStudent && onSelectSubmission) {
      setTimeout(() => {
        onSelectSubmission(nextPendingStudent);
      }, 300);
    }
  };

  const displayedCorrections =
    activeTab === 'unclear' ? corrections.filter(c => c.needsManualReview) : corrections;

  // Bounding boxes coordinates on simulated scan sheet
  const boundingBoxes = [
    {
      id: 'block-test',
      label: 'Cuestionario Test (Preguntas 1-4)',
      top: '18%',
      height: '32%',
      isDoubtful: corrections.some(c => c.type === 'test' && c.needsManualReview)
    },
    {
      id: exam.exercises[0]?.id || 'ex-1',
      label: 'Ejercicio 1: Transcripción y Mutación',
      top: '52%',
      height: '21%',
      isDoubtful: corrections.find(c => c.questionId === exam.exercises[0]?.id)?.needsManualReview || false
    },
    {
      id: exam.exercises[1]?.id || 'ex-2',
      label: 'Ejercicio 2: Código Genético / Mancha de Tinta',
      top: '74%',
      height: '22%',
      isDoubtful: corrections.find(c => c.questionId === exam.exercises[1]?.id)?.needsManualReview || hasRemainingReviews
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#000437]/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#ffffff] text-[#4b4b4b] rounded-[12px] border-2 border-[#afafaf] shadow-2xl max-w-6xl w-full h-[95vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-[#ffffff] border-b-2 border-[#afafaf] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[#58cc02] flex items-center justify-center font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-bold text-[#4b4b4b] leading-tight">
                  {submission.studentName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf] text-[12px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                  {submission.studentIdCode || 'EXP-2026'}
                </span>
                {submission.isOnlineSubmission && (
                  <span className="px-2.5 py-0.5 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[12px] font-bold text-[#000437]">
                    🌐 ONLINE · {submission.tabSwitchCount || 0} SALIDAS
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#777777] mt-0.5">
                {exam.title} · Pliego: {submission.scanPdfName || 'Examen_Escaneado.pdf'}
              </p>
            </div>

            {allSubmissions.length > 1 && onSelectSubmission && (
              <div className="hidden md:flex items-center gap-1 pl-3 border-l-2 border-[#afafaf]/40">
                <button
                  type="button"
                  disabled={!prevSub}
                  onClick={() => {
                    SoundService.playClick();
                    if (prevSub) onSelectSubmission(prevSub);
                  }}
                  className="p-1.5 rounded-[12px] border-2 border-[#afafaf] hover:border-[#4b4b4b] disabled:opacity-30 text-[#4b4b4b]"
                  title="Alumno anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[12px] font-bold text-[#777777] px-1.5">
                  {currentIdx + 1} / {allSubmissions.length}
                </span>
                <button
                  type="button"
                  disabled={!nextSub}
                  onClick={() => {
                    SoundService.playClick();
                    if (nextSub) onSelectSubmission(nextSub);
                  }}
                  className="p-1.5 rounded-[12px] border-2 border-[#afafaf] hover:border-[#4b4b4b] disabled:opacity-30 text-[#4b4b4b]"
                  title="Siguiente alumno"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Section 0-10 Scores + Overall Score */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 bg-[#ffffff] px-3.5 py-1.5 rounded-[12px] border-2 border-[#afafaf]">
              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-[0.053em] text-[#777777] block">
                  TEST (0–10)
                </span>
                <span className="text-[15px] font-bold text-[#58cc02] tabular-nums">
                  {testScoreOutOf10.toFixed(1)}<span className="text-[12px] text-[#777777]">/10</span>
                </span>
              </div>

              <span className="text-[#afafaf]">|</span>

              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-[0.053em] text-[#777777] block">
                  EJERCICIOS (0–10)
                </span>
                <span className="text-[15px] font-bold text-[#1cb0f6] tabular-nums">
                  {exScoreOutOf10.toFixed(1)}<span className="text-[12px] text-[#777777]">/10</span>
                </span>
              </div>

              <span className="text-[#afafaf]">|</span>

              <div className="text-right pl-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b] block">
                  GLOBAL PONDERADA
                </span>
                <span className="font-feather font-extrabold text-[22px] text-[#58cc02] tabular-nums leading-none">
                  {currentFinalScore.toFixed(2)} <span className="text-[13px] text-[#777777]">/ 10</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#777777] hover:text-[#4b4b4b] rounded-[12px] border-2 border-[#afafaf]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* REVIEW ALERT BANNER IF APPLICABLE */}
        {hasRemainingReviews && (
          <div className="bg-[#d7ffb8] border-b-2 border-[#58cc02] text-[#4b4b4b] px-5 py-2.5 flex items-center justify-between gap-3 text-[14px] font-bold shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#58cc02] shrink-0" />
              <span>
                INCIDENCIA OCR DETECTADA: Hay {remainingReviewsCount} ejercicio(s) con caligrafía dudosa o tachadura que requieren validación del profesor.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'unclear' ? 'all' : 'unclear')}
              className="px-3 py-1 bg-[#ffffff] border-2 border-[#58cc02] rounded-[12px] text-[12px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b] hover:bg-[#58cc02] hover:text-white transition"
            >
              {activeTab === 'unclear' ? 'Ver Todo' : `Filtrar Incidencias (${remainingReviewsCount})`}
            </button>
          </div>
        )}

        {/* SPLIT-SCREEN WORKBENCH */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x-2 divide-[#afafaf] overflow-hidden">
          
          {/* LEFT PANE (5 COLS): OCR SCAN VIEWER WITH INTERACTIVE BOUNDING BOXES */}
          <div className="lg:col-span-5 bg-[#ffffff] flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#ffffff] border-b-2 border-[#afafaf] flex items-center justify-between text-xs text-[#777777] shrink-0">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-[#58cc02]" />
                <span className="text-[12px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
                  PLIEGO ESCANEADO + CAJAS OCR
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowLaserScan(!showLaserScan)}
                  className={`px-2 py-0.5 rounded-[12px] border-2 text-[11px] font-bold uppercase transition ${
                    showLaserScan
                      ? 'bg-[#d7ffb8] border-[#58cc02] text-[#4b4b4b]'
                      : 'bg-[#ffffff] border-[#afafaf] text-[#777777]'
                  }`}
                >
                  Láser {showLaserScan ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(Math.max(60, zoomLevel - 20))}
                  className="p-1 hover:text-[#4b4b4b] rounded-[12px] border-2 border-[#afafaf]"
                  title="Alejar"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[12px] font-bold text-[#4b4b4b] w-10 text-center tabular-nums">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(Math.min(180, zoomLevel + 20))}
                  className="p-1 hover:text-[#4b4b4b] rounded-[12px] border-2 border-[#afafaf]"
                  title="Acercar"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Scan Canvas with Bounding Boxes */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start bg-[#f9f9f9] relative">
              <div
                style={{ width: `${zoomLevel}%`, maxWidth: '640px' }}
                className="relative rounded-[12px] border-2 border-[#afafaf] bg-white transition-all duration-200"
              >
                {showLaserScan && (
                  <div className="pointer-events-none absolute left-0 right-0 h-1 bg-[#58cc02] opacity-80 duo-anim-scan-beam z-20" />
                )}

                <img
                  src={scanUrl}
                  alt={`Escaneo de ${submission.studentName}`}
                  className="w-full h-auto block rounded-[10px] select-none"
                />

                {/* Overlaid Interactive OCR Bounding Boxes */}
                {boundingBoxes.map(box => {
                  const isFocused = focusedQuestionId === box.id;
                  return (
                    <div
                      key={box.id}
                      onClick={() => {
                        SoundService.playClick();
                        setFocusedQuestionId(box.id);
                      }}
                      style={{
                        top: box.top,
                        height: box.height,
                        left: '4%',
                        width: '92%'
                      }}
                      className={`absolute rounded-[8px] border-2 cursor-pointer transition-all ${
                        isFocused
                          ? 'border-[#1cb0f6] bg-[#1cb0f6]/20 ring-4 ring-[#1cb0f6]/30 z-10'
                          : box.isDoubtful
                          ? 'border-[#ff9600] bg-[#ff9600]/15 hover:bg-[#ff9600]/25'
                          : 'border-[#58cc02] bg-[#58cc02]/10 hover:bg-[#58cc02]/20'
                      }`}
                      title={`${box.label} (Clic para inspeccionar)`}
                    >
                      <span
                        className={`absolute top-1 left-2 px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase tracking-[0.053em] shadow-xs ${
                          box.isDoubtful
                            ? 'bg-[#ff9600] text-white'
                            : 'bg-[#58cc02] text-white'
                        }`}
                      >
                        {box.isDoubtful ? '⚠ OCR DUDOSO' : '✔ OCR VERIFICADO'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANE (7 COLS): QUESTION-BY-QUESTION RUBRIC & TRIAGE */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#ffffff]">
            
            {/* Filter Sub-bar */}
            <div className="px-5 py-3 bg-[#ffffff] border-b-2 border-[#afafaf] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    SoundService.playClick();
                    setActiveTab('all');
                  }}
                  className={`duo-nav-pill py-1.5 px-3 text-[12px] ${
                    activeTab === 'all' ? 'duo-nav-pill-active' : ''
                  }`}
                >
                  Todas ({corrections.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SoundService.playClick();
                    setActiveTab('unclear');
                  }}
                  className={`duo-nav-pill py-1.5 px-3 text-[12px] ${
                    activeTab === 'unclear' ? 'duo-nav-pill-active' : ''
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-[#58cc02]" />
                  <span>Incidencias ({remainingReviewsCount})</span>
                </button>
              </div>

              <span className="text-[12px] font-bold text-[#777777] hidden sm:inline">
                Solucionario Oficial y Rúbricas
              </span>
            </div>

            {/* Scrollable Question Cards */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {displayedCorrections.map(corr => {
                const hasReview = corr.needsManualReview;
                const currentPoints =
                  corr.teacherOverrideScore !== undefined ? corr.teacherOverrideScore : corr.scoreAwarded;

                const isCardFocused = focusedQuestionId === corr.questionId || (corr.type === 'test' && focusedQuestionId === 'block-test');

                return (
                  <div
                    key={corr.questionId}
                    id={`card-${corr.questionId}`}
                    onClick={() => setFocusedQuestionId(corr.questionId)}
                    className={`rounded-[12px] border-2 p-4 space-y-3 transition ${
                      isCardFocused
                        ? 'border-[#1cb0f6] bg-[#1cb0f6]/5 ring-2 ring-[#1cb0f6]/20'
                        : hasReview
                        ? 'border-[#58cc02] bg-[#d7ffb8]/20'
                        : 'border-[#afafaf] bg-[#ffffff]'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#afafaf]/30 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-[12px] text-[11px] font-bold uppercase tracking-[0.053em] border-2 ${
                            corr.type === 'test'
                              ? 'bg-[#d7ffb8] border-[#58cc02] text-[#4b4b4b]'
                              : 'bg-[#ffffff] border-[#1cb0f6] text-[#1cb0f6]'
                          }`}
                        >
                          {corr.type === 'test' ? 'TEST' : 'EJERCICIO'}
                        </span>
                        <h3 className="text-[16px] font-bold text-[#4b4b4b]">{corr.questionTitle}</h3>
                      </div>

                      {/* Micro-Grading Controls */}
                      <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                        <span
                          className={`px-2 py-0.5 rounded-[12px] text-[11px] font-bold uppercase tracking-[0.053em] border-2 ${
                            corr.ocrConfidence === 'high'
                              ? 'bg-[#d7ffb8] border-[#58cc02] text-[#4b4b4b]'
                              : corr.ocrConfidence === 'medium'
                              ? 'bg-[#ffffff] border-[#1cb0f6] text-[#1cb0f6]'
                              : 'bg-[#ffffff] border-[#ff9600] text-[#ff9600]'
                          }`}
                        >
                          OCR: {corr.ocrConfidence.toUpperCase()}
                        </span>

                        <div className="flex items-center bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] px-2 py-1">
                          <button
                            type="button"
                            onClick={() => handleScoreOverrideChange(corr.questionId, currentPoints - 0.25)}
                            className="px-1 text-[14px] font-bold text-[#4b4b4b]"
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
                            className="w-14 text-center text-[13px] font-bold bg-[#ffffff] rounded border border-[#afafaf] py-0.5 mx-1 tabular-nums text-[#4b4b4b]"
                          />
                          <button
                            type="button"
                            onClick={() => handleScoreOverrideChange(corr.questionId, currentPoints + 0.25)}
                            className="px-1 text-[14px] font-bold text-[#4b4b4b]"
                          >
                            +
                          </button>
                          <span className="text-[12px] text-[#777777] ml-1 font-bold">
                            / {corr.maxScore.toFixed(2)}p
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Micro-Adjustment Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleScoreOverrideChange(corr.questionId, currentPoints + 0.25)}
                        className="px-2 py-1 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] hover:border-[#4b4b4b] text-[11px] font-bold"
                      >
                        +0.25 pt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScoreOverrideChange(corr.questionId, currentPoints + 0.5)}
                        className="px-2 py-1 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] hover:border-[#4b4b4b] text-[11px] font-bold"
                      >
                        +0.50 pt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScoreOverrideChange(corr.questionId, Number((corr.maxScore / 2).toFixed(2)))}
                        className="px-2 py-1 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] hover:border-[#4b4b4b] text-[11px] font-bold"
                      >
                        Mitad (50%)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveReview(corr.questionId, corr.maxScore)}
                        className="px-2.5 py-1 rounded-[12px] bg-[#58cc02] text-white text-[11px] font-bold"
                      >
                        ✔ Dar por Válido ({corr.maxScore.toFixed(2)} pts)
                      </button>
                    </div>

                    {/* MANUAL REVIEW TRIAGE ALERT BOX */}
                    {hasReview && (
                      <div className="bg-[#d7ffb8]/40 border-2 border-[#58cc02] rounded-[12px] p-3 space-y-2">
                        <div className="flex items-start gap-2 text-[13px] text-[#4b4b4b]">
                          <AlertTriangle className="h-4 w-4 text-[#58cc02] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.053em] text-[#58cc02] block">
                              CALIGRAFÍA DUDOSA O TACHADURA
                            </span>
                            <p className="font-bold mt-0.5">
                              {corr.reviewReason || 'Tachón detectado en el escaneo manuscrito.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* OCR Transcription vs Rubric Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                      <div className="p-3 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf]">
                        <span className="text-[11px] font-bold uppercase tracking-[0.053em] text-[#777777] block mb-1">
                          Texto Reconocido por OCR
                        </span>
                        <p className="font-bold text-[#4b4b4b] whitespace-pre-line">
                          {corr.ocrExtractedText || 'No se reconoció texto en este recuadro.'}
                        </p>
                      </div>

                      <div className="p-3 rounded-[12px] bg-[#d7ffb8]/30 border-2 border-[#58cc02]">
                        <span className="text-[11px] font-bold uppercase tracking-[0.053em] text-[#58cc02] block mb-1">
                          Criterio / Solucionario
                        </span>
                        <p className="font-medium text-[#4b4b4b] leading-relaxed">
                          {corr.feedback}
                        </p>
                      </div>
                    </div>

                    {/* Teacher Override Comment Input */}
                    <div>
                      <input
                        type="text"
                        placeholder="Observación personalizada del profesor para el boletín..."
                        value={corr.teacherComment || ''}
                        onChange={e => handleTeacherCommentChange(corr.questionId, e.target.value)}
                        className="w-full text-[13px] px-3 py-1.5 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] text-[#4b4b4b] focus:outline-none focus:border-[#58cc02]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall Feedback & Save Footer */}
            <div className="p-4 bg-[#ffffff] border-t-2 border-[#afafaf] space-y-3 shrink-0">
              <textarea
                rows={2}
                placeholder="Comentario global para el acta y boletín del alumno..."
                value={overallFeedback}
                onChange={e => setOverallFeedback(e.target.value)}
                className="w-full text-[13px] p-2.5 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] text-[#4b4b4b] focus:outline-none focus:border-[#58cc02]"
              />

              <div className="flex items-center justify-between">
                <div>
                  {savedSuccess && (
                    <span className="text-[13px] font-bold text-[#58cc02] flex items-center gap-1.5">
                      <Check className="h-4 w-4" />
                      ¡Calificación guardada y consolidada en el acta!
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="duo-btn-neutral py-2 px-4 text-[13px]"
                  >
                    CERRAR
                  </button>

                  {nextPendingStudent && onSelectSubmission && (
                    <button
                      type="button"
                      onClick={handleSaveAndNextPending}
                      className="duo-btn-outlined border-[#58cc02] text-[#000437] bg-[#d7ffb8] py-2 px-4 text-[13px]"
                      title="Guardar cambios y saltar al siguiente examen con caligrafía dudosa"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#58cc02]" />
                      <span>GUARDAR Y SIGUIENTE PENDIENTE</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="duo-btn-primary py-2 px-5 text-[13px]"
                  >
                    <Save className="h-4 w-4" />
                    <span>GUARDAR REVISIÓN ({currentFinalScore.toFixed(2)}/10)</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
