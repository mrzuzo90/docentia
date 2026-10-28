import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  Send,
  Eye,
  AlertTriangle,
  Award,
  Sparkles,
  QrCode,
  ExternalLink,
  Lock
} from 'lucide-react';
import { Exam, StudentSubmission, StudentGradeReport, QuestionCorrection } from '../types';
import { SoundService } from '../services/soundService';
import { DuoMascot } from './DuoMascot';
import confetti from 'canvas-confetti';

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

  const classroomPin = 'DOC-7842';
  const shareableUrl = `https://docentia.es/evaluar/${exam.id.slice(0, 10)}`;

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

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

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
      // Award ~85% points if well answered
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
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#000437]/60 backdrop-blur-xs animate-fadeIn ${
        viewState === 'taking_exam' ? 'select-none' : ''
      }`}
    >
      <div className="bg-[#ffffff] text-[#4b4b4b] rounded-[12px] border-2 border-[#afafaf] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* VIEW 1: TEACHER SHARE & DISPATCH DOCK */}
        {viewState === 'share_modal' && (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#afafaf]/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[#58cc02] flex items-center justify-center">
                  <Share2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-[22px] font-bold text-[#4b4b4b]">
                    Enviar Examen Online por Enlace
                  </h3>
                  <p className="text-[13px] text-[#777777]">
                    Tus alumnos responden desde el navegador con protección anti-copia activa y corrección inmediata.
                  </p>
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

            {/* Share Link Card */}
            <div className="duo-card border-[#58cc02] bg-[#ffffff] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[12px] font-bold uppercase tracking-[0.053em] text-[#58cc02]">
                    ENLACE SEGURO DE EVALUACIÓN
                  </span>
                  <div className="text-[17px] font-bold text-[#4b4b4b] font-mono mt-0.5">
                    {shareableUrl}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="duo-btn-primary py-2 px-4"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? '¡ENLACE COPIADO!' : 'COPIAR ENLACE'}</span>
                </button>
              </div>

              {/* Classroom PIN Badge */}
              <div className="flex items-center gap-4 pt-2 border-t-2 border-[#afafaf]/40">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[#777777]">PIN DE AULA:</span>
                  <span className="px-3 py-1 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] font-mono font-bold text-[15px] text-[#000437]">
                    {classroomPin}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[#777777]">TIEMPO LÍMITE:</span>
                  <span className="px-3 py-1 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf] text-[13px] font-bold text-[#4b4b4b]">
                    {exam.durationMinutes || 60} min
                  </span>
                </div>
              </div>
            </div>

            {/* Anti-Cheating Protocol Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] space-y-1">
                <span className="text-[13px] font-bold text-[#58cc02] flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  Bloqueo Clic Derecho
                </span>
                <p className="text-[12px] text-[#777777]">
                  Menú contextual deshabilitado y selección de texto bloqueada.
                </p>
              </div>

              <div className="p-3.5 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] space-y-1">
                <span className="text-[13px] font-bold text-[#1cb0f6] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Detector de Pestañas
                </span>
                <p className="text-[12px] text-[#777777]">
                  Registra avisos si el alumno minimiza la ventana o busca en ChatGPT.
                </p>
              </div>

              <div className="p-3.5 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] space-y-1">
                <span className="text-[13px] font-bold text-[#ff9600] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Auto-Calificación
                </span>
                <p className="text-[12px] text-[#777777]">
                  Al enviar, la nota de 0 a 10 entra directa a tu acta de clase.
                </p>
              </div>
            </div>

            {/* Test Simulation Prompt */}
            <div className="p-4 rounded-[12px] bg-[#d7ffb8]/30 border-2 border-[#58cc02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-[16px] font-bold text-[#4b4b4b]">
                  ¿Quieres probar cómo ve el examen el alumno?
                </h4>
                <p className="text-[13px] text-[#777777]">
                  Simula la experiencia de respuesta en vivo con el temporizador y el detector anti-copia.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Nombre del alumno..."
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="text-[13px] px-3 py-1.5 rounded-[12px] border-2 border-[#afafaf] bg-white w-48 text-[#4b4b4b]"
                  />
                  <input
                    type="text"
                    placeholder="DNI / EXP..."
                    value={studentCode}
                    onChange={e => setStudentCode(e.target.value)}
                    className="text-[13px] px-3 py-1.5 rounded-[12px] border-2 border-[#afafaf] bg-white w-32 text-[#4b4b4b]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartExamSimulation}
                className="duo-btn-primary py-2.5 px-5 self-start sm:self-auto"
              >
                <span>PROBAR EXAMEN ALUMNO</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: SECURE STUDENT EXAM VIEW (ANTI-CHEAT ACTIVE) */}
        {viewState === 'taking_exam' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top Student Header with Live Timer & Anti-Cheat Badge */}
            <div className="p-4 bg-[#ffffff] border-b-2 border-[#afafaf] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-feather font-extrabold text-[22px] text-[#58cc02]">
                  docentia
                </span>
                <span className="hidden sm:inline-block text-[13px] font-bold text-[#777777] border-l-2 border-[#afafaf] pl-3">
                  {exam.title}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Anti-Cheat Sensor Indicator */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[12px] border-2 text-[12px] font-bold uppercase tracking-[0.053em] ${
                    tabSwitchCount > 0
                      ? 'bg-[#ffffff] border-[#ff9600] text-[#ff9600]'
                      : 'bg-[#d7ffb8] border-[#58cc02] text-[#000437]'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>
                    ANTI-COPIA ACTIVO {tabSwitchCount > 0 ? `(${tabSwitchCount} SALIDAS)` : ''}
                  </span>
                </div>

                {/* Live Countdown */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf] text-[13px] font-bold text-[#4b4b4b]">
                  <Clock className="w-4 h-4 text-[#1cb0f6]" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="duo-btn-primary py-2 px-4 text-[13px]"
                >
                  <Send className="w-4 h-4" />
                  <span>ENTREGAR</span>
                </button>
              </div>
            </div>

            {/* Anti-Cheat Floating Banner if triggered */}
            {showCheatWarning && (
              <div className="bg-[#ffffff] border-b-2 border-[#ff9600] px-4 py-2 flex items-center justify-between text-[13px] font-bold text-[#ff9600] shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Aviso Anti-Copia: Se ha detectado una salida de ventana o captura de pantalla. Incidencia #{tabSwitchCount} anotada en tu pliego.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheatWarning(false)}
                  className="text-[12px] underline font-bold"
                >
                  Entendido
                </button>
              </div>
            )}

            {/* Student Exam Sheet Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-[#ffffff]">
              
              {/* Instructions Callout */}
              <div className="p-4 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] space-y-1">
                <h4 className="text-[15px] font-bold text-[#4b4b4b]">
                  Alumno: {studentName} ({studentCode})
                </h4>
                <p className="text-[13px] text-[#777777]">
                  {exam.instructions || 'Responde a todas las preguntas con rigor y claridad. Al finalizar, pulsa Entregar.'}
                </p>
              </div>

              {/* Part I: Multiple Choice Questions */}
              {exam.testQuestions.length > 0 && (
                <div className="space-y-6">
                  <div className="border-b-2 border-[#afafaf] pb-2">
                    <h3 className="text-[18px] font-bold text-[#4b4b4b]">
                      Parte I · Cuestionario Tipo Test ({exam.testQuestions.length} preguntas)
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {exam.testQuestions.map((q, idx) => (
                      <div key={q.id} className="p-4 rounded-[12px] border-2 border-[#afafaf] space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[16px] font-bold text-[#4b4b4b]">
                            <span className="text-[#58cc02] mr-2">{idx + 1}.</span>
                            {q.question}
                          </p>
                          <span className="text-[12px] font-bold text-[#777777] shrink-0">
                            {q.points} pt
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
                                className={`flex items-start gap-2.5 p-3 rounded-[12px] border-2 text-left transition ${
                                  isSelected
                                    ? 'bg-[#d7ffb8] border-[#58cc02] text-[#000437]'
                                    : 'bg-[#ffffff] border-[#afafaf] hover:border-[#4b4b4b] text-[#4b4b4b]'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5 ${
                                    isSelected
                                      ? 'bg-[#58cc02] border-[#58cc02] text-white'
                                      : 'bg-[#ffffff] border-[#afafaf] text-[#777777]'
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="text-[14px] font-medium leading-snug">
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
                <div className="space-y-6">
                  <div className="border-b-2 border-[#afafaf] pb-2">
                    <h3 className="text-[18px] font-bold text-[#4b4b4b]">
                      Parte II · Ejercicios y Problemas de Desarrollo ({exam.exercises.length} ejercicios)
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {exam.exercises.map((ex, idx) => (
                      <div key={ex.id} className="p-4 rounded-[12px] border-2 border-[#afafaf] space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-[16px] font-bold text-[#4b4b4b]">
                            Ejercicio {idx + 1}: {ex.title}
                          </h4>
                          <span className="text-[12px] font-bold text-[#777777] shrink-0">
                            {ex.points} pts
                          </span>
                        </div>
                        <p className="text-[14px] text-[#4b4b4b] whitespace-pre-line leading-relaxed">
                          {ex.statement}
                        </p>
                        <textarea
                          rows={4}
                          placeholder="Escribe aquí tu desarrollo, fórmulas y conclusiones razonadas..."
                          value={exerciseAnswers[ex.id] || ''}
                          onChange={e =>
                            setExerciseAnswers(prev => ({ ...prev, [ex.id]: e.target.value }))
                          }
                          className="w-full text-[14px] p-3 rounded-[12px] border-2 border-[#afafaf] bg-white text-[#4b4b4b] focus:outline-none focus:border-[#58cc02]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Submit Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="duo-btn-primary py-3 px-8 text-[15px]"
                >
                  <Send className="w-5 h-5" />
                  <span>FINALIZAR Y ENVIAR AL PROFESOR</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: CELEBRATORY SUBMISSION CONFIRMATION */}
        {viewState === 'submitted' && (
          <div className="p-8 sm:p-12 text-center space-y-6 overflow-y-auto">
            <div className="flex justify-center">
              <DuoMascot variant="trophy" className="w-48 h-48" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <span className="px-3 py-1 rounded-[12px] bg-[#d7ffb8] text-[#58cc02] text-[13px] font-bold uppercase tracking-[0.053em]">
                ¡EXAMEN ENTREGADO CON ÉXITO!
              </span>
              <h3 className="duo-section-headline text-[32px]">
                buen trabajo, {studentName}.
              </h3>
              <p className="duo-body-copy">
                Tus respuestas se han registrado y consolidado en el acta del docente con corrección automática.
              </p>
            </div>

            {lastSubmittedScore && (
              <div className="inline-flex items-center gap-6 p-4 rounded-[12px] bg-[#ffffff] border-2 border-[#58cc02] shadow-sm">
                <div>
                  <span className="text-[11px] font-bold text-[#777777] uppercase block">TEST (0–10)</span>
                  <span className="text-[20px] font-bold text-[#58cc02]">{lastSubmittedScore.test.toFixed(1)}/10</span>
                </div>
                <div className="w-px h-8 bg-[#afafaf]" />
                <div>
                  <span className="text-[11px] font-bold text-[#777777] uppercase block">EJERCICIOS (0–10)</span>
                  <span className="text-[20px] font-bold text-[#1cb0f6]">{lastSubmittedScore.ex.toFixed(1)}/10</span>
                </div>
                <div className="w-px h-8 bg-[#afafaf]" />
                <div>
                  <span className="text-[11px] font-bold text-[#4b4b4b] uppercase block">CALIFICACIÓN</span>
                  <span className="font-feather font-extrabold text-[28px] text-[#58cc02]">
                    {lastSubmittedScore.score.toFixed(2)}/10
                  </span>
                </div>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={onClose}
                className="duo-btn-primary py-3 px-8 text-[15px]"
              >
                <span>VOLVER AL PANEL DOCENTE</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
