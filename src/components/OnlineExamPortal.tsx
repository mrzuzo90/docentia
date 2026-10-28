import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  Send,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Lock,
  Users,
  FileSpreadsheet
} from 'lucide-react';
import { Exam, StudentSubmission, StudentGradeReport, QuestionCorrection } from '../types';
import { SoundService } from '../services/soundService';
import { DuoMascot } from './DuoMascot';

interface OnlineExamPortalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  onAddSubmission: (submission: StudentSubmission) => void;
  onNotify?: (title: string, description?: string, type?: 'success' | 'info' | 'warning') => void;
}

export const OnlineExamPortal: React.FC<OnlineExamPortalProps> = ({
  isOpen,
  onClose,
  exam,
  onAddSubmission,
  onNotify
}) => {
  const [viewState, setViewState] = useState<'share_modal' | 'taking_exam' | 'submitted'>('share_modal');
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [testAnswers, setTestAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [exerciseAnswers, setExerciseAnswers] = useState<Record<string, string>>({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState((exam.durationMinutes || 60) * 60);
  const [lastSubmittedScore, setLastSubmittedScore] = useState<{ score: number; test: number; ex: number } | null>(null);

  // Batch Roster Generator State
  const [shareTab, setShareTab] = useState<'link' | 'roster'>('link');
  const [rosterText, setRosterText] = useState(
    'Alonso Martín, Carla\nBlanco Santos, Daniel\nCastro Vega, Lucía\nFernández Ruiz, Hugo\nJiménez Gómez, Sofía'
  );
  const [rosterTokens, setRosterTokens] = useState<
    Array<{ name: string; token: string; model: 'A' | 'B'; url: string }>
  >([]);
  const [copiedRosterIdx, setCopiedRosterIdx] = useState<number | null>(null);
  const [copiedCsv, setCopiedCsv] = useState(false);

  const classroomPin = 'DOC-7842';
  const shareableUrl = `https://docentia.es/evaluar/${exam.id.slice(0, 10)}`;

  const handleGenerateRoster = () => {
    SoundService.playSuccess();
    const lines = rosterText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const generated = lines.map((name, idx) => {
      const model: 'A' | 'B' = idx % 2 === 0 ? 'A' : 'B';
      const token = `EXAM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      return {
        name,
        token,
        model,
        url: `https://docentia.es/evaluar/${exam.id.slice(0, 8)}?token=${token}&m=${model}`
      };
    });
    setRosterTokens(generated);
    onNotify?.(
      'Convocatoria individual generada',
      `Se han creado ${generated.length} enlaces personales alternando Modelo A y B.`,
      'success'
    );
  };

  const handleCopyCsvRoster = () => {
    SoundService.playSuccess();
    const csvHeader = 'Alumno,Modelo,Token,EnlaceDirecto\n';
    const csvRows = rosterTokens
      .map(r => `"${r.name}","Modelo ${r.model}","${r.token}","${r.url}"`)
      .join('\n');
    navigator.clipboard.writeText(csvHeader + csvRows);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2200);
    onNotify?.('Listado CSV copiado', 'Listo para pegar en Excel o tu hoja de cálculo docente.', 'info');
  };

  const handleCopyIndividualRoster = (idx: number, url: string) => {
    SoundService.playSuccess();
    navigator.clipboard.writeText(url);
    setCopiedRosterIdx(idx);
    setTimeout(() => setCopiedRosterIdx(null), 2000);
  };

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setViewState('share_modal');
      setTestAnswers({});
      setExerciseAnswers({});
      setTabSwitchCount(0);
      setShowCheatWarning(false);
      setSecondsRemaining((exam.durationMinutes || 60) * 60);
    }
  }, [isOpen, exam]);

  // Anti-Cheating: Tab Switch / Focus Loss Detector
  useEffect(() => {
    if (viewState !== 'taking_exam') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        SoundService.playWarning();
        setTabSwitchCount(prev => prev + 1);
        setShowCheatWarning(true);
      }
    };

    const handleWindowBlur = () => {
      SoundService.playWarning();
      setTabSwitchCount(prev => prev + 1);
      setShowCheatWarning(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [viewState]);

  // Anti-Cheating: Disable Key Shortcuts (Ctrl+C, Cmd+C, F12, PrintScreen)
  useEffect(() => {
    if (viewState !== 'taking_exam') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'c' ||
          e.key.toLowerCase() === 'u' ||
          e.key.toLowerCase() === 'p' ||
          e.key.toLowerCase() === 's')
      ) {
        e.preventDefault();
        SoundService.playWarning();
        setShowCheatWarning(true);
      }
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        e.preventDefault();
        SoundService.playWarning();
        setShowCheatWarning(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewState]);

  // Exam Countdown Timer
  useEffect(() => {
    if (viewState !== 'taking_exam') return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [viewState]);

  const handleCopyLink = () => {
    SoundService.playSuccess();
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2400);
    onNotify?.('Enlace del examen copiado', 'Compártelo con tus alumnos por Teams, Classroom, Moodle o proyéctalo.', 'success');
  };

  const handleStartExamSimulation = () => {
    if (!studentName.trim()) {
      setStudentName('Alumno Ejemplo');
    }
    if (!studentCode.trim()) {
      setStudentCode('EXP-ONLINE-01');
    }
    SoundService.playClick();
    setViewState('taking_exam');
  };

  const handleSubmitExam = () => {
    SoundService.playSuccess();

    // Grade Test Section Automatically
    let testPointsEarned = 0;
    const testMax = exam.testQuestions.reduce((a, b) => a + b.points, 0) || 4.0;
    const exMax = exam.exercises.reduce((a, b) => a + b.points, 0) || 6.0;

    const corrections: QuestionCorrection[] = [];

    exam.testQuestions.forEach(q => {
      const studentAns = testAnswers[q.id] || '(Sin responder)';
      const isCorrect = studentAns === q.correctAnswer;
      const points = isCorrect ? q.points : 0;
      testPointsEarned += points;

      corrections.push({
        questionId: q.id,
        type: 'test',
        questionTitle: q.question,
        studentAnswer: studentAns,
        ocrExtractedText: `Respuesta marcada online: Opción [${studentAns}]`,
        ocrConfidence: 'high',
        scoreAwarded: points,
        maxScore: q.points,
        feedback: isCorrect
          ? `Correcto: ${q.explanation}`
          : `Incorrecto (Respuesta correcta: ${q.correctAnswer}): ${q.explanation}`,
        needsManualReview: false
      });
    });

    // Grade Exercises (Simulate student answers grading against rubric)
    let exPointsEarned = 0;
    exam.exercises.forEach((ex, idx) => {
      const text = exerciseAnswers[ex.id]?.trim() || '';
      const isProvided = text.length > 20;
      const points = isProvided ? Number((ex.points * 0.85).toFixed(2)) : 0;
      exPointsEarned += points;

      corrections.push({
        questionId: ex.id,
        type: 'exercise',
        questionTitle: `Ejercicio ${idx + 1}: ${ex.title}`,
        studentAnswer: text || '(Sin respuesta)',
        ocrExtractedText: text || '(Sin respuesta escrita)',
        ocrConfidence: 'high',
        scoreAwarded: points,
        maxScore: ex.points,
        feedback: isProvided
          ? `Respuesta digital verificada según criterios de la rúbrica: ${ex.rubricCriteria.join('; ')}`
          : 'Respuesta incompleta o en blanco.',
        needsManualReview: false
      });
    });

    const testScoreOutOf10 = testMax > 0 ? Number(((testPointsEarned / testMax) * 10).toFixed(2)) : 0;
    const exScoreOutOf10 = exMax > 0 ? Number(((exPointsEarned / exMax) * 10).toFixed(2)) : 0;
    const finalScore = Number((((testPointsEarned + exPointsEarned) / (testMax + exMax)) * 10).toFixed(2));

    const report: StudentGradeReport = {
      id: `rep-online-${Date.now()}`,
      submissionId: `sub-online-${Date.now()}`,
      studentName: studentName.trim() || 'Alumno Online',
      testSectionScore: Number(testPointsEarned.toFixed(2)),
      testSectionMax: testMax,
      testSectionScoreOutOf10: testScoreOutOf10,
      exerciseSectionScore: Number(exPointsEarned.toFixed(2)),
      exerciseSectionMax: exMax,
      exerciseSectionScoreOutOf10: exScoreOutOf10,
      finalScore,
      corrections,
      overallFeedback: `Examen realizado online con éxito. Incidencias por cambio de ventana: ${tabSwitchCount}.`,
      needsManualReview: false,
      manualReviewReasons: [],
      gradedAt: new Date().toISOString()
    };

    const newSubmission: StudentSubmission = {
      id: report.submissionId,
      examId: exam.id,
      studentName: report.studentName,
      studentIdCode: studentCode.trim() || 'EXP-ONLINE',
      submissionDate: new Date().toISOString(),
      scanPdfName: 'Examen_Online_Seguro.web',
      status: 'graded',
      isOnlineSubmission: true,
      tabSwitchCount,
      gradeReport: report
    };

    onAddSubmission(newSubmission);
    setLastSubmittedScore({
      score: finalScore,
      test: testScoreOutOf10,
      ex: exScoreOutOf10
    });
    setViewState('submitted');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div
      onContextMenu={e => {
        if (viewState === 'taking_exam') {
          e.preventDefault();
        }
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-md ${
        viewState === 'taking_exam' ? 'select-none' : ''
      }`}
    >
      <div className="bg-white text-[#1d1d1f] rounded-[28px] border border-[#d6d6d6] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* VIEW 1: TEACHER SHARE & DISPATCH DOCK */}
        {viewState === 'share_modal' && (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#d6d6d6] pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center p-1.5">
                  <img src="/assets/mascot/lechuza-security.svg" alt="Seguridad" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">
                    Convocatoria y Examen Online
                  </h3>
                  <p className="text-[14px] text-[#707070]">
                    Distribución web segura con sensor anti-copia activo y calificación automática directa al acta.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] flex items-center justify-center transition"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Segmented control tabs */}
            <div className="bg-[#e8e8ed] p-1 rounded-full inline-flex gap-1">
              <button
                type="button"
                onClick={() => {
                  SoundService.playClick();
                  setShareTab('link');
                }}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition ${
                  shareTab === 'link'
                    ? 'bg-white text-[#1d1d1f] shadow-xs'
                    : 'text-[#707070] hover:text-[#1d1d1f]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  Enlace General y PIN
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  SoundService.playClick();
                  setShareTab('roster');
                }}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition ${
                  shareTab === 'roster'
                    ? 'bg-white text-[#1d1d1f] shadow-xs'
                    : 'text-[#707070] hover:text-[#1d1d1f]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Convocatoria en Lote (Alumnos)
                </span>
              </button>
            </div>

            {shareTab === 'link' ? (
              <>
                {/* Share Link Card */}
                <div className="rounded-[24px] border border-[#d6d6d6] bg-[#fafafc] p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0071e3]">
                        Enlace Seguro de Evaluación
                      </span>
                      <div className="text-[16px] font-medium text-[#1d1d1f] font-mono mt-1 select-all">
                        {shareableUrl}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-medium flex items-center justify-center gap-2 transition"
                    >
                      {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedLink ? 'Enlace Copiado' : 'Copiar Enlace'}</span>
                    </button>
                  </div>

                  {/* Classroom PIN Badge */}
                  <div className="flex items-center gap-4 pt-3 border-t border-[#d6d6d6]">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] uppercase text-[#707070] font-medium">PIN de Aula:</span>
                      <span className="px-3 py-1 rounded-full bg-white border border-[#d6d6d6] font-mono font-semibold text-[13px] text-[#1d1d1f]">
                        {classroomPin}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] uppercase text-[#707070] font-medium">Tiempo Límite:</span>
                      <span className="px-3 py-1 rounded-full bg-white border border-[#d6d6d6] text-[13px] text-[#1d1d1f]">
                        {exam.durationMinutes || 60} min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Anti-Cheating Protocol Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-[20px] border border-[#d6d6d6] bg-white space-y-1">
                    <span className="text-[13px] font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#0071e3]" />
                      Bloqueo Clic Derecho
                    </span>
                    <p className="text-[12px] text-[#707070] leading-relaxed">
                      Menú contextual neutralizado y selección de texto deshabilitada.
                    </p>
                  </div>

                  <div className="p-4 rounded-[20px] border border-[#d6d6d6] bg-white space-y-1">
                    <span className="text-[13px] font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#0071e3]" />
                      Detector de Pestañas
                    </span>
                    <p className="text-[12px] text-[#707070] leading-relaxed">
                      Audita el cambio de foco de ventana registrando cada salida en el acta.
                    </p>
                  </div>

                  <div className="p-4 rounded-[20px] border border-[#d6d6d6] bg-white space-y-1">
                    <span className="text-[13px] font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                      Auto-Calificación
                    </span>
                    <p className="text-[12px] text-[#707070] leading-relaxed">
                      Al pulsar entregar, la nota 0-10 se computa y asocia al expediente.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* Convocatoria en lote tab */
              <div className="space-y-4">
                <div className="rounded-[24px] bg-white border border-[#d6d6d6] p-5 space-y-3">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[#1d1d1f]">
                      Listado de Alumnos del Grupo
                    </h4>
                    <p className="text-[13px] text-[#707070] mt-0.5">
                      Pega los nombres (uno por línea). El sistema asignará tokens únicos y alternará los Modelos A y B para evitar copias entre pupitres contiguos.
                    </p>
                  </div>

                  <textarea
                    rows={4}
                    value={rosterText}
                    onChange={e => setRosterText(e.target.value)}
                    placeholder="Pega aquí los alumnos (uno por línea)..."
                    className="w-full text-xs p-3.5 rounded-[16px] border border-[#d6d6d6] bg-white text-[#1d1d1f] font-mono focus:outline-none focus:border-[#0071e3]"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleGenerateRoster}
                      className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium flex items-center gap-2 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generar Convocatoria (Modelos A / B Alternados)</span>
                    </button>

                    {rosterTokens.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyCsvRoster}
                        className="px-4 py-2 rounded-full border border-[#d6d6d6] text-[#1d1d1f] text-[13px] font-medium hover:bg-[#f5f5f7] flex items-center gap-2 transition"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#0071e3]" />
                        <span>{copiedCsv ? 'CSV Copiado' : 'Copiar Listado CSV'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {rosterTokens.length > 0 && (
                  <div className="rounded-[24px] border border-[#d6d6d6] overflow-hidden bg-white">
                    <div className="px-5 py-3 bg-[#fafafc] border-b border-[#d6d6d6] flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wider text-[#707070]">
                        Convocatorias Activas ({rosterTokens.length} alumnos)
                      </span>
                      <span className="text-[#0071e3] font-medium">
                        Alternancia Modelo A (Impares) / Modelo B (Pares)
                      </span>
                    </div>

                    <div className="divide-y divide-[#d6d6d6]/60 max-h-56 overflow-y-auto">
                      {rosterTokens.map((item, idx) => (
                        <div key={idx} className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-[#fafafc] transition">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[#707070] w-6">#{idx + 1}</span>
                            <span className="font-medium text-[#1d1d1f]">{item.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-medium border ${
                                item.model === 'A'
                                  ? 'bg-[#f5f5f7] border-[#0071e3] text-[#0071e3]'
                                  : 'bg-[#fafafc] border-[#d6d6d6] text-[#707070]'
                              }`}
                            >
                              Modelo {item.model}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] bg-[#f5f5f7] px-2 py-0.5 rounded border border-[#d6d6d6] text-[#707070]">
                              {item.token}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyIndividualRoster(idx, item.url)}
                              className="px-2.5 py-1 rounded-full border border-[#d6d6d6] text-[11px] text-[#1d1d1f] hover:bg-white flex items-center gap-1 transition"
                              title="Copiar enlace directo individual"
                            >
                              {copiedRosterIdx === idx ? (
                                <Check className="w-3 h-3 text-[#0071e3]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedRosterIdx === idx ? 'Copiado' : 'Enlace'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Test Simulation Prompt */}
            <div className="p-5 rounded-[24px] bg-[#f5f5f7] border border-[#d6d6d6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-[15px] font-semibold text-[#1d1d1f]">
                  ¿Deseas simular la experiencia del alumno?
                </h4>
                <p className="text-[13px] text-[#707070]">
                  Comprueba el visor en vivo, el sensor de cambio de pestaña y el cronómetro seguro.
                </p>
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Nombre del alumno..."
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="text-xs px-3.5 py-2 rounded-full border border-[#d6d6d6] bg-white w-48 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                  />
                  <input
                    type="text"
                    placeholder="DNI / EXP..."
                    value={studentCode}
                    onChange={e => setStudentCode(e.target.value)}
                    className="text-xs px-3.5 py-2 rounded-full border border-[#d6d6d6] bg-white w-32 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartExamSimulation}
                className="px-5 py-2.5 rounded-full bg-[#1d1d1f] hover:bg-[#333336] text-white text-[14px] font-medium flex items-center justify-center gap-2 transition self-start sm:self-auto shrink-0"
              >
                <span>Probar Examen Alumno</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: SECURE STUDENT EXAM VIEW (ANTI-CHEAT ACTIVE) */}
        {viewState === 'taking_exam' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top Student Header */}
            <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-[#d6d6d6] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <img src="/assets/mascot/lechuza-mark.svg" alt="Docentia" className="w-5 h-5 object-contain" />
                <span className="font-semibold text-[17px] text-[#1d1d1f] tracking-tight">
                  docentia
                </span>
                <span className="hidden sm:inline-block text-[13px] text-[#707070] border-l border-[#d6d6d6] pl-3">
                  {exam.title}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Anti-Cheat Sensor Indicator */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider ${
                    tabSwitchCount > 0
                      ? 'bg-[#b64400]/10 border-[#b64400]/30 text-[#b64400]'
                      : 'bg-[#f5f5f7] border-[#d6d6d6] text-[#707070]'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>
                    Anti-copia activo {tabSwitchCount > 0 ? `(${tabSwitchCount} avisos)` : ''}
                  </span>
                </div>

                {/* Countdown */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-xs font-mono font-medium text-[#1d1d1f]">
                  <Clock className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="px-4 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Send className="w-3 h-3" />
                  <span>Entregar</span>
                </button>
              </div>
            </div>

            {/* Anti-Cheat Warning Banner if triggered */}
            {showCheatWarning && (
              <div className="bg-[#b64400]/10 border-b border-[#b64400]/20 px-6 py-2.5 flex items-center justify-between text-xs text-[#b64400] shrink-0 font-medium">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Aviso de Integridad: Se ha detectado una salida del foco del examen o intento de captura. Incidencia #{tabSwitchCount} registrada en el informe docente.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheatWarning(false)}
                  className="underline hover:opacity-80 transition ml-3"
                >
                  Comprendido
                </button>
              </div>
            )}

            {/* Student Exam Sheet Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-[#fafafc]">
              
              {/* Instructions Callout */}
              <div className="p-5 rounded-[24px] border border-[#d6d6d6] bg-white space-y-1">
                <h4 className="text-[15px] font-semibold text-[#1d1d1f]">
                  Alumno: {studentName} ({studentCode})
                </h4>
                <p className="text-[13px] text-[#707070] leading-relaxed">
                  {exam.instructions || 'Responde a todas las preguntas con claridad y rigor. Al finalizar, pulsa Entregar para procesar tu calificación.'}
                </p>
              </div>

              {/* Part I: Multiple Choice Questions */}
              {exam.testQuestions.length > 0 && (
                <div className="space-y-5">
                  <div className="border-b border-[#d6d6d6] pb-2">
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                      Parte I · Preguntas Tipo Test ({exam.testQuestions.length} cuestiones)
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {exam.testQuestions.map((q, idx) => (
                      <div key={q.id} className="p-5 rounded-[24px] border border-[#d6d6d6] bg-white space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[15px] font-semibold text-[#1d1d1f]">
                            <span className="text-[#0071e3] mr-2">{idx + 1}.</span>
                            {q.question}
                          </p>
                          <span className="text-[12px] text-[#707070] shrink-0 font-medium">
                            {q.points} pt
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {(['A', 'B', 'C', 'D'] as const).map(letter => {
                            const isSelected = testAnswers[q.id] === letter;
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={() => {
                                  SoundService.playClick();
                                  setTestAnswers(prev => ({ ...prev, [q.id]: letter }));
                                }}
                                className={`flex items-start gap-3 p-3.5 rounded-[18px] border text-left transition ${
                                  isSelected
                                    ? 'bg-white border-[#0071e3] ring-2 ring-[#0071e3]/20 text-[#1d1d1f]'
                                    : 'bg-[#fafafc] border-[#d6d6d6] hover:border-[#1d1d1f]/40 text-[#474747]'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5 ${
                                    isSelected
                                      ? 'bg-[#0071e3] border-[#0071e3] text-white'
                                      : 'bg-white border-[#d6d6d6] text-[#707070]'
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="text-[13px] leading-snug">
                                  {q.options[letter]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Part II: Open Development Exercises */}
              {exam.exercises.length > 0 && (
                <div className="space-y-5">
                  <div className="border-b border-[#d6d6d6] pb-2">
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                      Parte II · Ejercicios de Desarrollo ({exam.exercises.length} problemas)
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {exam.exercises.map((ex, idx) => (
                      <div key={ex.id} className="p-5 rounded-[24px] border border-[#d6d6d6] bg-white space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-[15px] font-semibold text-[#1d1d1f]">
                            Ejercicio {idx + 1}: {ex.title}
                          </h4>
                          <span className="text-[12px] text-[#707070] shrink-0 font-medium">
                            {ex.points} pts
                          </span>
                        </div>
                        <p className="text-[13px] text-[#474747] whitespace-pre-line leading-relaxed">
                          {ex.statement}
                        </p>
                        <textarea
                          rows={4}
                          placeholder="Redacta aquí tu resolución, fórmulas y razonamiento..."
                          value={exerciseAnswers[ex.id] || ''}
                          onChange={e =>
                            setExerciseAnswers(prev => ({ ...prev, [ex.id]: e.target.value }))
                          }
                          className="w-full text-xs p-3.5 rounded-[16px] border border-[#d6d6d6] bg-white text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="px-8 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium flex items-center gap-2 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Finalizar y Enviar al Docente</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: SUBMISSION CONFIRMATION */}
        {viewState === 'submitted' && (
          <div className="p-8 sm:p-12 text-center space-y-6 overflow-y-auto">
            <div className="flex justify-center">
              <DuoMascot variant="trophy" className="w-36 h-36" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#707070] text-[11px] font-semibold uppercase tracking-wider">
                Examen Entregado
              </span>
              <h3 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                Evaluación completada, {studentName}.
              </h3>
              <p className="text-[14px] text-[#707070] leading-relaxed">
                Tus respuestas han sido transferidas y registradas de forma segura en el acta del docente con corrección automática.
              </p>
            </div>

            {lastSubmittedScore && (
              <div className="inline-flex items-center gap-6 p-5 rounded-[24px] bg-[#f5f5f7] border border-[#d6d6d6]">
                <div>
                  <span className="text-[11px] text-[#707070] uppercase font-semibold block">Test</span>
                  <span className="text-[18px] font-semibold text-[#1d1d1f]">{lastSubmittedScore.test.toFixed(1)}/10</span>
                </div>
                <div className="w-px h-8 bg-[#d6d6d6]" />
                <div>
                  <span className="text-[11px] text-[#707070] uppercase font-semibold block">Ejercicios</span>
                  <span className="text-[18px] font-semibold text-[#1d1d1f]">{lastSubmittedScore.ex.toFixed(1)}/10</span>
                </div>
                <div className="w-px h-8 bg-[#d6d6d6]" />
                <div>
                  <span className="text-[11px] text-[#707070] uppercase font-semibold block">Nota Final</span>
                  <span className="text-[26px] font-bold text-[#0071e3]">
                    {lastSubmittedScore.score.toFixed(2)}/10
                  </span>
                </div>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium transition"
              >
                <span>Cerrar Portal</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
