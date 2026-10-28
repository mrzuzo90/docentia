import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  User,
  ScanLine
} from 'lucide-react';
import { Exam, StudentSubmission, StudentGradeReport, QuestionCorrection } from '../types';
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
  const report = submission.gradeReport;
  const initialCorrections = report?.corrections || [];

  const [corrections, setCorrections] = useState<QuestionCorrection[]>(initialCorrections);
  const [overallFeedback, setOverallFeedback] = useState(report?.overallFeedback || '');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [showLaserScan, setShowLaserScan] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unclear'>('all');

  const currentIdx = allSubmissions.findIndex(s => s.id === submission.id);
  const prevSub = currentIdx > 0 ? allSubmissions[currentIdx - 1] : null;
  const nextSub = currentIdx < allSubmissions.length - 1 ? allSubmissions[currentIdx + 1] : null;

  const handleScoreOverrideChange = (qId: string, score: number) => {
    SoundService.playClick();
    const clamped = Math.max(0, parseFloat(score.toFixed(2)));
    setCorrections(prev =>
      prev.map(c => (c.questionId === qId ? { ...c, teacherOverrideScore: clamped } : c))
    );
  };

  const handleTeacherCommentChange = (qId: string, comment: string) => {
    setCorrections(prev =>
      prev.map(c => (c.questionId === qId ? { ...c, teacherComment: comment } : c))
    );
  };

  const handleResolveReview = (qId: string, fullPoints: number) => {
    SoundService.playCorrect();
    setCorrections(prev =>
      prev.map(c =>
        c.questionId === qId
          ? {
              ...c,
              needsManualReview: false,
              teacherOverrideScore: fullPoints,
              teacherComment: 'Validado tras revisión docente.'
            }
          : c
      )
    );
  };

  const currentTestSum = corrections
    .filter(c => c.type === 'test')
    .reduce((acc, c) => acc + (c.teacherOverrideScore !== undefined ? c.teacherOverrideScore : c.scoreAwarded), 0);

  const currentExSum = corrections
    .filter(c => c.type === 'exercise')
    .reduce((acc, c) => acc + (c.teacherOverrideScore !== undefined ? c.teacherOverrideScore : c.scoreAwarded), 0);

  const currentFinalScore = parseFloat(Math.min(10, currentTestSum + currentExSum).toFixed(2));

  const testScoreOutOf10 =
    exam.testSectionWeight > 0 ? (currentTestSum / exam.testSectionWeight) * 10 : 0;
  const exScoreOutOf10 =
    exam.exerciseSectionWeight > 0 ? (currentExSum / exam.exerciseSectionWeight) * 10 : 0;

  const hasRemainingReviews = corrections.some(c => c.needsManualReview);
  const remainingReviewsCount = corrections.filter(c => c.needsManualReview).length;

  const handleSaveAll = () => {
    SoundService.playSave();
    const updatedReport: StudentGradeReport = {
      id: submission.gradeReport?.id || `rep-${submission.id}`,
      submissionId: submission.id,
      studentName: submission.studentName,
      testSectionScore: currentTestSum,
      testSectionMax: exam.testSectionWeight || 4.0,
      testSectionScoreOutOf10: Number(testScoreOutOf10.toFixed(2)),
      exerciseSectionScore: currentExSum,
      exerciseSectionMax: exam.exerciseSectionWeight || 6.0,
      exerciseSectionScoreOutOf10: Number(exScoreOutOf10.toFixed(2)),
      finalScore: currentFinalScore,
      needsManualReview: hasRemainingReviews,
      manualReviewReasons: hasRemainingReviews
        ? corrections
            .filter(c => c.needsManualReview)
            .map(c => `Pregunta: ${c.questionTitle} - Requiere verificación`)
        : [],
      overallFeedback: overallFeedback.trim() || 'Evaluación revisada por el profesor.',
      corrections,
      gradedAt: submission.gradeReport?.gradedAt || new Date().toISOString(),
      reviewedByTeacherAt: new Date().toISOString()
    };

    onSaveReport(updatedReport);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2400);
  };

  const nextPendingStudent = allSubmissions.find(
    s => s.id !== submission.id && (s.status === 'needs_review' || s.gradeReport?.needsManualReview)
  );

  const handleSaveAndNextPending = () => {
    handleSaveAll();
    if (nextPendingStudent && onSelectSubmission) {
      onSelectSubmission(nextPendingStudent);
      setSavedSuccess(false);
    } else {
      onClose();
    }
  };

  const displayedCorrections =
    activeTab === 'unclear' ? corrections.filter(c => c.needsManualReview) : corrections;

  const scanUrl =
    submission.scanImageUrl ||
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850"><rect width="100%" height="100%" fill="%23ffffff"/><text x="40" y="80" font-family="sans-serif" font-size="20" fill="%231d1d1f">EXAMEN OFICIAL</text><text x="40" y="110" font-family="sans-serif" font-size="14" fill="%23707070">Alumno: ' +
      encodeURIComponent(submission.studentName) +
      '</text><line x1="40" y1="130" x2="560" y2="130" stroke="%23d6d6d6" stroke-width="1"/><text x="40" y="170" font-family="sans-serif" font-size="14" fill="%231d1d1f">Respuestas Manuscritas Registradas:</text><text x="60" y="210" font-family="sans-serif" font-size="13" fill="%23474747">1. C  |  2. B  |  3. C  |  4. B</text><text x="40" y="270" font-family="sans-serif" font-size="14" fill="%231d1d1f">Resolución Ejercicios de Desarrollo:</text><text x="60" y="310" font-family="sans-serif" font-size="13" fill="%23474747">a) Transcripción ARN: 5-AUG GCU AAA UGA-3</text><text x="60" y="340" font-family="sans-serif" font-size="13" fill="%23474747">b) Anticodones correspondientes: UAC, CGA, UUU</text><text x="60" y="380" font-family="sans-serif" font-size="13" fill="%23474747">c) Mutación puntual C a T impide el inicio de la traducción.</text><rect x="40" y="440" width="520" height="340" rx="12" fill="%23fafafc" stroke="%23d6d6d6"/></svg>';

  const boundingBoxes = [
    {
      id: 'block-test',
      label: 'Bloque Tipo Test',
      top: '21%',
      height: '11%',
      isDoubtful: corrections.filter(c => c.type === 'test').some(c => c.needsManualReview)
    },
    {
      id: exam.exercises[0]?.id || 'ex-1',
      label: 'Ejercicio 1',
      top: '35%',
      height: '16%',
      isDoubtful: corrections.find(c => c.questionId === exam.exercises[0]?.id)?.needsManualReview || false
    },
    {
      id: exam.exercises[1]?.id || 'ex-2',
      label: 'Ejercicio 2',
      top: '53%',
      height: '24%',
      isDoubtful: corrections.find(c => c.questionId === exam.exercises[1]?.id)?.needsManualReview || hasRemainingReviews
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#1d1d1f]/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#ffffff] text-[#1d1d1f] rounded-[28px] border border-[#d6d6d6] shadow-[0_24px_64px_rgba(0,0,0,0.16)] max-w-6xl w-full h-[95vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-[#ffffff] border-b border-[#d6d6d6] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#0071e3] flex items-center justify-center font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[19px] font-semibold text-[#1d1d1f] leading-tight">
                  {submission.studentName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full border border-[#d6d6d6] text-[12px] text-[#707070] bg-[#fafafc]">
                  {submission.studentIdCode || 'EXP-2026'}
                </span>
                {submission.isOnlineSubmission && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0071e3]/10 text-[12px] font-medium text-[#0071e3]">
                    Online · {submission.tabSwitchCount || 0} salidas
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#707070] mt-0.5">
                {exam.title} · Pliego: {submission.scanPdfName || 'Examen_Escaneado.pdf'}
              </p>
            </div>

            {allSubmissions.length > 1 && onSelectSubmission && (
              <div className="hidden md:flex items-center gap-1 pl-3 border-l border-[#d6d6d6]">
                <button
                  type="button"
                  disabled={!prevSub}
                  onClick={() => {
                    SoundService.playClick();
                    if (prevSub) onSelectSubmission(prevSub);
                  }}
                  className="p-1.5 rounded-full border border-[#d6d6d6] hover:border-[#1d1d1f] disabled:opacity-30 text-[#1d1d1f] transition"
                  title="Alumno anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[12px] text-[#707070] px-1.5">
                  {currentIdx + 1} / {allSubmissions.length}
                </span>
                <button
                  type="button"
                  disabled={!nextSub}
                  onClick={() => {
                    SoundService.playClick();
                    if (nextSub) onSelectSubmission(nextSub);
                  }}
                  className="p-1.5 rounded-full border border-[#d6d6d6] hover:border-[#1d1d1f] disabled:opacity-30 text-[#1d1d1f] transition"
                  title="Siguiente alumno"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Section 0-10 Scores + Overall Score */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 bg-[#fafafc] px-4 py-1.5 rounded-full border border-[#d6d6d6]">
              <div className="text-right">
                <span className="text-[11px] text-[#707070] uppercase block">
                  Test (0–10)
                </span>
                <span className="text-[14px] font-semibold text-[#1d1d1f] tabular-nums">
                  {testScoreOutOf10.toFixed(1)}<span className="text-[11px] text-[#707070]">/10</span>
                </span>
              </div>

              <span className="text-[#d6d6d6]">|</span>

              <div className="text-right">
                <span className="text-[11px] text-[#707070] uppercase block">
                  Ejercicios (0–10)
                </span>
                <span className="text-[14px] font-semibold text-[#0071e3] tabular-nums">
                  {exScoreOutOf10.toFixed(1)}<span className="text-[11px] text-[#707070]">/10</span>
                </span>
              </div>

              <span className="text-[#d6d6d6]">|</span>

              <div className="text-right pl-1">
                <span className="text-[11px] font-medium text-[#1d1d1f] block">
                  Global Ponderada
                </span>
                <span className="text-[18px] font-bold text-[#1d1d1f] tabular-nums leading-none">
                  {currentFinalScore.toFixed(2)} <span className="text-[12px] text-[#707070]">/ 10</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#707070] hover:text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* REVIEW ALERT BANNER IF APPLICABLE */}
        {hasRemainingReviews && (
          <div className="bg-[#b64400]/5 border-b border-[#b64400]/20 text-[#b64400] px-5 py-2.5 flex items-center justify-between gap-3 text-[13px] font-medium shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#b64400] shrink-0" />
              <span>
                Incidencia OCR detectada: {remainingReviewsCount} ejercicio(s) con caligrafía ambigua o tachadura pendiente de confirmación.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'unclear' ? 'all' : 'unclear')}
              className="px-3 py-1 bg-[#ffffff] border border-[#b64400]/40 rounded-full text-[12px] text-[#b64400] hover:bg-[#b64400] hover:text-white transition"
            >
              {activeTab === 'unclear' ? 'Ver todo' : `Filtrar incidencias (${remainingReviewsCount})`}
            </button>
          </div>
        )}

        {/* SPLIT-SCREEN WORKBENCH */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[#d6d6d6] overflow-hidden">
          
          {/* LEFT PANE (5 COLS): OCR SCAN VIEWER WITH INTERACTIVE BOUNDING BOXES */}
          <div className="lg:col-span-5 bg-[#ffffff] flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#fafafc] border-b border-[#d6d6d6] flex items-center justify-between text-xs text-[#707070] shrink-0">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-[#0071e3]" />
                <span className="text-[12px] font-medium text-[#1d1d1f]">
                  Pliego digitalizado + Cajas OCR
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowLaserScan(!showLaserScan)}
                  className={`px-2.5 py-0.5 rounded-full border text-[11px] transition ${
                    showLaserScan
                      ? 'bg-[#1d1d1f] text-[#ffffff] border-[#1d1d1f]'
                      : 'bg-[#ffffff] border-[#d6d6d6] text-[#707070]'
                  }`}
                >
                  Láser {showLaserScan ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(Math.max(60, zoomLevel - 20))}
                  className="p-1 hover:text-[#1d1d1f] rounded-full border border-[#d6d6d6] transition"
                  title="Alejar"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[12px] font-medium text-[#1d1d1f] w-10 text-center tabular-nums">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(Math.min(180, zoomLevel + 20))}
                  className="p-1 hover:text-[#1d1d1f] rounded-full border border-[#d6d6d6] transition"
                  title="Acercar"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Scan Canvas with Bounding Boxes */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start bg-[#f5f5f7] relative">
              <div
                style={{ width: `${zoomLevel}%`, maxWidth: '640px' }}
                className="relative rounded-[20px] border border-[#d6d6d6] bg-white transition-all duration-200 overflow-hidden shadow-sm"
              >
                {showLaserScan && (
                  <div className="pointer-events-none absolute left-0 right-0 h-0.5 bg-[#0071e3] opacity-80 duo-anim-scan-beam z-20 shadow-[0_0_8px_#0071e3]" />
                )}

                <img
                  src={scanUrl}
                  alt={`Escaneo de ${submission.studentName}`}
                  className="w-full h-auto block select-none"
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
                      className={`absolute rounded-[12px] border cursor-pointer transition-all ${
                        isFocused
                          ? 'border-[#0071e3] bg-[#0071e3]/10 ring-2 ring-[#0071e3]/30 z-10'
                          : box.isDoubtful
                          ? 'border-[#b64400] bg-[#b64400]/10 hover:bg-[#b64400]/15'
                          : 'border-[#1d1d1f] bg-[#1d1d1f]/5 hover:bg-[#1d1d1f]/10'
                      }`}
                      title={`${box.label} (Clic para inspeccionar)`}
                    >
                      <span
                        className={`absolute top-1 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-tight ${
                          box.isDoubtful
                            ? 'bg-[#b64400] text-white'
                            : 'bg-[#1d1d1f] text-white'
                        }`}
                      >
                        {box.isDoubtful ? '⚠ OCR Dudoso' : '✔ OCR Leído'}
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
            <div className="px-5 py-3 bg-[#fafafc] border-b border-[#d6d6d6] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-[#ffffff] p-1 rounded-full border border-[#d6d6d6]">
                <button
                  type="button"
                  onClick={() => {
                    SoundService.playClick();
                    setActiveTab('all');
                  }}
                  className={`px-3 py-1 rounded-full text-[12px] transition ${
                    activeTab === 'all' ? 'bg-[#1d1d1f] text-[#ffffff] font-medium' : 'text-[#707070] hover:text-[#1d1d1f]'
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
                  className={`px-3 py-1 rounded-full text-[12px] transition flex items-center gap-1.5 ${
                    activeTab === 'unclear' ? 'bg-[#b64400] text-[#ffffff] font-medium' : 'text-[#707070] hover:text-[#1d1d1f]'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>Incidencias ({remainingReviewsCount})</span>
                </button>
              </div>

              <span className="text-[12px] text-[#707070] hidden sm:inline">
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
                    className={`rounded-[20px] border p-4 space-y-3 transition ${
                      isCardFocused
                        ? 'border-[#0071e3] bg-[#0071e3]/5 ring-2 ring-[#0071e3]/20'
                        : hasReview
                        ? 'border-[#b64400]/40 bg-[#b64400]/5'
                        : 'border-[#d6d6d6] bg-[#ffffff]'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d6d6d6]/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            corr.type === 'test'
                              ? 'bg-[#fafafc] border-[#d6d6d6] text-[#1d1d1f]'
                              : 'bg-[#0071e3]/10 border-[#0071e3]/30 text-[#0071e3]'
                          }`}
                        >
                          {corr.type === 'test' ? 'Test' : 'Ejercicio'}
                        </span>
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">{corr.questionTitle}</h3>
                      </div>

                      {/* Micro-Grading Controls */}
                      <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            corr.ocrConfidence === 'high'
                              ? 'bg-[#ffffff] border-[#d6d6d6] text-[#707070]'
                              : corr.ocrConfidence === 'medium'
                              ? 'bg-[#0071e3]/10 border-[#0071e3]/20 text-[#0071e3]'
                              : 'bg-[#b64400]/10 border-[#b64400]/20 text-[#b64400]'
                          }`}
                        >
                          OCR: {corr.ocrConfidence.toUpperCase()}
                        </span>

                        <div className="flex items-center bg-[#fafafc] border border-[#d6d6d6] rounded-full px-2 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleScoreOverrideChange(corr.questionId, currentPoints - 0.25)}
                            className="px-1 text-[13px] text-[#1d1d1f]"
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
                            className="w-12 text-center text-[12px] font-medium bg-[#ffffff] rounded border border-[#d6d6d6] py-0.5 mx-1 tabular-nums text-[#1d1d1f]"
                          />
                          <button
                            type="button"
                            onClick={() => handleScoreOverrideChange(corr.questionId, currentPoints + 0.25)}
                            className="px-1 text-[13px] text-[#1d1d1f]"
                          >
                            +
                          </button>
                          <span className="text-[11px] text-[#707070] ml-1">
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
                        className="px-2.5 py-0.5 rounded-full border border-[#d6d6d6] bg-[#ffffff] hover:border-[#1d1d1f] text-[11px] text-[#1d1d1f] transition"
                      >
                        +0.25 pt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScoreOverrideChange(corr.questionId, currentPoints + 0.5)}
                        className="px-2.5 py-0.5 rounded-full border border-[#d6d6d6] bg-[#ffffff] hover:border-[#1d1d1f] text-[11px] text-[#1d1d1f] transition"
                      >
                        +0.50 pt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScoreOverrideChange(corr.questionId, Number((corr.maxScore / 2).toFixed(2)))}
                        className="px-2.5 py-0.5 rounded-full border border-[#d6d6d6] bg-[#ffffff] hover:border-[#1d1d1f] text-[11px] text-[#1d1d1f] transition"
                      >
                        Mitad (50%)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveReview(corr.questionId, corr.maxScore)}
                        className="px-3 py-0.5 rounded-full bg-[#0071e3] text-white text-[11px] font-normal transition hover:bg-[#0077ed]"
                      >
                        ✔ Dar por válido ({corr.maxScore.toFixed(2)} pts)
                      </button>
                    </div>

                    {/* Student Answer vs Solution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                      <div className="p-3 rounded-[14px] bg-[#fafafc] border border-[#d6d6d6] space-y-1">
                        <span className="text-[11px] uppercase text-[#707070] block">
                          Respuesta leída del alumno:
                        </span>
                        <p className="text-[#1d1d1f] whitespace-pre-line leading-relaxed">
                          {corr.studentAnswerRaw || 'Sin respuesta manuscrita identificada'}
                        </p>
                      </div>

                      <div className="p-3 rounded-[14px] bg-[#ffffff] border border-[#d6d6d6] space-y-1">
                        <span className="text-[11px] uppercase text-[#0071e3] block">
                          Solución oficial esperada:
                        </span>
                        <p className="text-[#1d1d1f] whitespace-pre-line leading-relaxed">
                          {corr.expectedAnswer}
                        </p>
                      </div>
                    </div>

                    {/* Feedback Reasoning */}
                    <div className="text-[12px] text-[#707070] italic">
                      Diagnóstico: {corr.feedback}
                    </div>

                    {/* Teacher Override Comment Input */}
                    <div>
                      <input
                        type="text"
                        placeholder="Observación personalizada del profesor para el boletín..."
                        value={corr.teacherComment || ''}
                        onChange={e => handleTeacherCommentChange(corr.questionId, e.target.value)}
                        className="w-full text-[13px] px-3 py-1.5 rounded-[12px] border border-[#d6d6d6] bg-[#ffffff] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall Feedback & Save Footer */}
            <div className="p-4 bg-[#ffffff] border-t border-[#d6d6d6] space-y-3 shrink-0">
              <textarea
                rows={2}
                placeholder="Comentario global para el acta y boletín del alumno..."
                value={overallFeedback}
                onChange={e => setOverallFeedback(e.target.value)}
                className="w-full text-[13px] p-2.5 rounded-[14px] border border-[#d6d6d6] bg-[#ffffff] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
              />

              <div className="flex items-center justify-between">
                <div>
                  {savedSuccess && (
                    <span className="text-[13px] font-medium text-[#0071e3] flex items-center gap-1.5">
                      <Check className="h-4 w-4" />
                      Calificación guardada y consolidada en el acta.
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="apple-pill-ghost text-[13px] py-1.5 px-4"
                  >
                    Cerrar
                  </button>

                  {nextPendingStudent && onSelectSubmission && (
                    <button
                      type="button"
                      onClick={handleSaveAndNextPending}
                      className="apple-pill-wash text-[13px] py-1.5 px-4"
                      title="Guardar cambios y saltar al siguiente examen con caligrafía dudosa"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#0071e3]" />
                      <span>Guardar y siguiente pendiente</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="apple-pill-primary text-[13px] py-1.5 px-5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Guardar revisión ({currentFinalScore.toFixed(2)}/10)</span>
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
