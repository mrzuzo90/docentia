import React, { useState, useRef } from 'react';
import {
  Upload,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  FileText,
  Trash2,
  ArrowRight,
  ScanLine,
  Plus
} from 'lucide-react';
import { Exam, StudentSubmission, StudentGradeReport } from '../types';
import { GeminiService } from '../services/geminiService';
import { createSimulatedScanDataUrl } from '../services/mockData';
import { StudentDetailModal } from './StudentDetailModal';
import { DuoMascot } from './DuoMascot';

interface GradingViewProps {
  exam: Exam;
  submissions: StudentSubmission[];
  onSubmissionsChange: (subs: StudentSubmission[]) => void;
  onProceedToGradebook: () => void;
  creditsBalance?: number;
  onConsumeGradingCredits?: (submissionsCount: number) => boolean;
  onNotify?: (title: string, description?: string, type?: 'success' | 'info' | 'warning') => void;
}

export const GradingView: React.FC<GradingViewProps> = ({
  exam,
  submissions,
  onSubmissionsChange,
  onProceedToGradebook,
  creditsBalance = 3,
  onConsumeGradingCredits,
  onNotify
}) => {
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingName, setCurrentProcessingName] = useState('');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentTextInput, setStudentTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'needs_review' | 'graded'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    if (onConsumeGradingCredits && !onConsumeGradingCredits(files.length)) {
      e.target.value = '';
      return;
    }

    for (const file of files) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const studentName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      const newSubmission: StudentSubmission = {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        examId: exam.id,
        studentName,
        studentIdCode: `EXP-2026-${Math.floor(100 + Math.random() * 899)}`,
        submissionDate: new Date().toISOString(),
        scanPdfName: file.name,
        status: 'pending'
      };

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          newSubmission.scanImageUrl = dataUrl;
          await processGrading(newSubmission, { imageBase64: base64, mimeType: file.type });
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        await processGrading(newSubmission, { textContent: text });
      }
    }
    e.target.value = '';
  };

  const handleManualTextSubmit = async () => {
    if (!studentTextInput.trim() || !studentNameInput.trim()) return;
    if (onConsumeGradingCredits && !onConsumeGradingCredits(1)) return;

    const newSub: StudentSubmission = {
      id: `sub-manual-${Date.now()}`,
      examId: exam.id,
      studentName: studentNameInput.trim(),
      studentIdCode: `EXP-2026-${Math.floor(100 + Math.random() * 899)}`,
      submissionDate: new Date().toISOString(),
      scanPdfName: 'Transcripcion_Manual.txt',
      status: 'pending'
    };

    setShowTextInput(false);
    setStudentNameInput('');
    setStudentTextInput('');

    await processGrading(newSub, { textContent: studentTextInput.trim() });
  };

  const handleSimulateNewStudent = async (type: 'clean' | 'unclear') => {
    if (onConsumeGradingCredits && !onConsumeGradingCredits(1)) return;
    const isUnclear = type === 'unclear';
    const name = isUnclear ? 'Marcos Peña Vázquez' : 'Sofía Valdés Castillo';
    const expCode = isUnclear ? 'EXP-2026-084' : 'EXP-2026-051';

    const sampleText = isUnclear
      ? `EXAMEN ENTREGADO:\nPregunta 1: C\nPregunta 2: Marqué la A y luego la taché con círculos negros, mi respuesta es la B.\nPregunta 3: C\nPregunta 4: B\nEjercicio 1: a) 5'-AUG GCU AAA UGA-3'. b) UAC, CGA, UUU. c) La mutación cambia a AUA y no se inicia.\nEjercicio 2: El código es universal... [Tinta corrida en el papel manuscrito] ... corrimiento de lectura... [ilegible]`
      : `EXAMEN ENTREGADO:\n1: C (3 puentes)\n2: B (degenerado)\n3: C (eliminación de intrones)\n4: B (AUG metionina)\nEjercicio 1: a) Hebra ARNm 5'-AUG GCU AAA UGA-3'. b) Anticodones 3'-UAC-5', 3'-CGA-5', 3'-UUU-5'. c) Al cambiar C por T, el codón pasa a AUA impidiendo que el ribosoma inicie la traducción.\nEjercicio 2: Universal: los mismos codones en todos los seres vivos, permite crear insulina humana en E. coli. Comparación: sustitución cambia un aminoácido, mientras deleción corre la pauta de lectura destruyendo la función biológica.`;

    const scanUrl = createSimulatedScanDataUrl({
      studentName: name,
      studentId: expCode,
      examTitle: exam.title,
      dateStr: new Date().toLocaleDateString('es-ES'),
      q1Choice: 'C',
      q2Choice: 'B',
      q2CrossedOut: isUnclear ? 'A' : undefined,
      q3Choice: 'C',
      q4Choice: 'B',
      ex1Lines: [
        "a) Hebra ARNm: 5'-AUG GCU AAA UGA-3'",
        "b) Anticodones: 3'-UAC-5', 3'-CGA-5', 3'-UUU-5'",
        "c) El cambio C->T transforma el codón inicial en AUA (sin inicio)."
      ],
      ex2Lines: isUnclear
        ? [
            "a) Universalidad: idénticos codones en distintas especies.",
            "b) En la deleción se desplaza la pauta... [mancha de tinta]",
            "   ... [trazo borroso e ilegible en la comparación final]"
          ]
        : [
            "a) Universalidad: permite sintetizar insulina humana en E. coli.",
            "b) Sustitución afecta a un codón; deleción provoca frameshift",
            "   alterando todos los aminoácidos posteriores del péptido."
          ],
      hasSmudgeInEx2: isUnclear
    });

    const newSub: StudentSubmission = {
      id: `sub-sim-${Date.now()}`,
      examId: exam.id,
      studentName: name,
      studentIdCode: expCode,
      submissionDate: new Date().toISOString(),
      scanPdfName: isUnclear ? 'Scan_Marcos_Pena_300dpi.pdf' : 'Scan_Sofia_Valdes_300dpi.pdf',
      scanImageUrl: scanUrl,
      status: 'pending'
    };

    await processGrading(newSub, { textContent: sampleText });
  };

  const processGrading = async (
    submission: StudentSubmission,
    input: { textContent?: string; imageBase64?: string; mimeType?: string }
  ) => {
    setIsProcessing(true);
    setCurrentProcessingName(submission.studentName);

    try {
      const report = await GeminiService.gradeStudentExam(exam, submission.studentName, input);
      report.submissionId = submission.id;

      const updatedSub: StudentSubmission = {
        ...submission,
        status: report.needsManualReview ? 'needs_review' : 'graded',
        gradeReport: report
      };

      const updatedList = [updatedSub, ...submissions.filter(s => s.id !== submission.id)];
      onSubmissionsChange(updatedList);

      if (onNotify) {
        if (report.needsManualReview) {
          onNotify(
            `Alerta OCR en examen de ${submission.studentName}`,
            'Se ha detectado un ejercicio con lectura dudosa que requiere revisión manual.',
            'warning'
          );
        } else {
          onNotify(
            `Examen de ${submission.studentName} corregido`,
            `Calificación final: ${report.finalScore.toFixed(2)} / 10`,
            'success'
          );
        }
      }
    } catch {
      const fallbackReport = GeminiService.generateSimulatedGrading(exam, submission.studentName, input);
      fallbackReport.submissionId = submission.id;
      const updatedSub: StudentSubmission = {
        ...submission,
        status: fallbackReport.needsManualReview ? 'needs_review' : 'graded',
        gradeReport: fallbackReport
      };
      onSubmissionsChange([updatedSub, ...submissions.filter(s => s.id !== submission.id)]);
    } finally {
      setIsProcessing(false);
      setCurrentProcessingName('');
    }
  };

  const handleUpdateGradeReport = (updatedReport: StudentGradeReport) => {
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

    onSubmissionsChange(updated);
    onNotify?.(
      `Calificación de ${updatedReport.studentName} actualizada`,
      `Nota definitiva registrada: ${updatedReport.finalScore.toFixed(2)} / 10`,
      'success'
    );
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSubmissionsChange(submissions.filter(s => s.id !== id));
  };

  const filteredSubmissions = submissions.filter(s => {
    if (filterMode === 'needs_review') return s.status === 'needs_review' || s.gradeReport?.needsManualReview;
    if (filterMode === 'graded') return s.status === 'graded' && !s.gradeReport?.needsManualReview;
    return true;
  });

  const needsReviewCount = submissions.filter(
    s => s.status === 'needs_review' || s.gradeReport?.needsManualReview
  ).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Duolingo Storybook Hero Section: Text Left + Floating Scanner Mascot Right */}
      <div className="py-4 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
        <div className="lg:col-span-7 space-y-4">
          <span className="inline-block text-[15px] font-bold uppercase tracking-[0.053em] text-[#1cb0f6]">
            PASO 3 · CORRECCIÓN CON RECONOCIMIENTO DE TEXTO
          </span>
          <h2 className="duo-section-headline">
            corrección inteligente de 0 a 10.
          </h2>
          <h3 className="duo-hero-headline text-[24px] sm:text-[32px]">
            Sube los exámenes resueltos de tus alumnos
          </h3>
          <p className="duo-body-copy max-w-[480px]">
            La app lee las respuestas manuscritas, evalúa de 0 a 10 cada sección comparando con el solucionario y te avisa si algún ejercicio es dudoso o merece revisión manual.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="duo-nav-pill py-2 px-4">
              <span>SALDO OCR:</span>
              <span className="text-[#58cc02]">{creditsBalance} CR. ({creditsBalance * 5} ALUMNOS)</span>
            </div>
            <div className="duo-nav-pill py-2 px-4">
              <span>CORREGIDOS:</span>
              <span className="text-[#4b4b4b]">{submissions.length}</span>
            </div>
            <div className={`duo-nav-pill py-2 px-4 ${needsReviewCount > 0 ? 'duo-nav-pill-active' : ''}`}>
              <span>REVISIÓN MANUAL:</span>
              <span className="text-[#58cc02]">{needsReviewCount}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <DuoMascot variant="scanner" />
        </div>
      </div>

      {/* Upload & Simulation Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left 8 cols: Dropzone + Quick Simulation Triggers */}
        <div className="lg:col-span-8 duo-card space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#afafaf] hover:border-[#58cc02] bg-[#ffffff] rounded-[12px] p-6 text-center cursor-pointer transition group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,.pdf,.txt"
              className="hidden"
            />
            {isProcessing ? (
              <div className="py-2 space-y-2">
                <Loader2 className="h-8 w-8 text-[#58cc02] animate-spin mx-auto" />
                <p className="text-[19px] font-bold text-[#4b4b4b]">
                  Leyendo con OCR y evaluando a {currentProcessingName}...
                </p>
                <p className="duo-body-copy">
                  Comparando respuestas con el solucionario y verificando legibilidad
                </p>
              </div>
            ) : (
              <>
                <div className="mx-auto w-12 h-12 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[#58cc02] flex items-center justify-center mb-3 transition">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="text-[19px] font-bold text-[#4b4b4b]">
                  Sube aquí los exámenes resueltos por los alumnos (Imagen, PDF o Texto)
                </h3>
                <p className="duo-body-copy mt-1">
                  1 crédito permite corregir hasta 5 exámenes de alumnos
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSimulateNewStudent('clean')}
                className="duo-btn-outlined py-2 px-3.5 text-[13px]"
              >
                <CheckCircle2 className="h-4 w-4 text-[#58cc02]" />
                <span>+ SIMULAR EXAMEN NÍTIDO (SOFÍA)</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSimulateNewStudent('unclear')}
                className="duo-nav-pill duo-nav-pill-active py-2 px-3.5 text-[13px]"
              >
                <AlertTriangle className="h-4 w-4 text-[#58cc02]" />
                <span>+ SIMULAR LETRA DUDOSA / TACHÓN (MARCOS)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowTextInput(!showTextInput)}
              className="duo-nav-pill py-2 px-3.5 text-[13px]"
            >
              <FileText className="h-4 w-4" />
              <span>PEGAR RESPUESTAS</span>
            </button>
          </div>

          {showTextInput && (
            <div className="p-4 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf] space-y-3">
              <input
                type="text"
                placeholder="Nombre y Apellidos del Alumno (ej. Alejandro Vega)"
                value={studentNameInput}
                onChange={e => setStudentNameInput(e.target.value)}
                className="w-full text-[15px] px-3.5 py-2.5 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] text-[#4b4b4b] focus:outline-none focus:border-[#58cc02]"
              />
              <textarea
                rows={4}
                placeholder="Introduce las respuestas del alumno (si incluyes 'tachón' o 'ilegible', se activará el aviso de revisión manual)..."
                value={studentTextInput}
                onChange={e => setStudentTextInput(e.target.value)}
                className="w-full text-[15px] px-3.5 py-2.5 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] text-[#4b4b4b] focus:outline-none focus:border-[#58cc02]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTextInput(false)}
                  className="duo-nav-pill py-2 px-4 text-[13px]"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={handleManualTextSubmit}
                  disabled={!studentNameInput.trim() || !studentTextInput.trim()}
                  className="duo-btn-primary py-2 px-5 text-[13px]"
                >
                  CORREGIR AHORA
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 cols: Protocol Summary & Next Step */}
        <div className="lg:col-span-4 duo-card flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#58cc02] block">
              EVALUACIÓN 0 A 10 POR SECCIÓN
            </span>
            <p className="duo-body-copy">
              Cada examen recibe una <strong className="text-[#4b4b4b]">nota del 0 al 10 en la Sección Test</strong>, una <strong className="text-[#4b4b4b]">nota del 0 al 10 en la Sección de Ejercicios</strong> y su nota final ponderada.
            </p>
            <div className="p-3.5 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf] text-[15px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#777777]">Peso Sección Test:</span>
                <span className="font-bold text-[#4b4b4b]">
                  {exam.testQuestions.reduce((a, b) => a + b.points, 0).toFixed(2)} pts
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">Peso Sección Ejercicios:</span>
                <span className="font-bold text-[#4b4b4b]">
                  {exam.exercises.reduce((a, b) => a + b.points, 0).toFixed(2)} pts
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onProceedToGradebook}
            disabled={submissions.length === 0}
            className="duo-btn-primary w-full py-3"
          >
            <span>VER ACTA DE NOTAS 0–10</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#afafaf] pb-4 pt-2">
        <div className="flex items-center gap-2.5">
          <ScanLine className="h-5 w-5 text-[#58cc02]" />
          <h3 className="text-[24px] font-bold text-[#4b4b4b]">
            Exámenes Corregidos ({submissions.length})
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterMode('all')}
            className={`duo-nav-pill py-2 px-4 text-[13px] ${
              filterMode === 'all' ? 'duo-nav-pill-active' : ''
            }`}
          >
            TODOS ({submissions.length})
          </button>
          <button
            onClick={() => setFilterMode('needs_review')}
            className={`duo-nav-pill py-2 px-4 text-[13px] ${
              filterMode === 'needs_review' ? 'duo-nav-pill-active' : ''
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-[#58cc02]" />
            <span>REVISIÓN MANUAL ({needsReviewCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('graded')}
            className={`duo-nav-pill py-2 px-4 text-[13px] ${
              filterMode === 'graded' ? 'duo-nav-pill-active' : ''
            }`}
          >
            VALIDADOS ({submissions.length - needsReviewCount})
          </button>
        </div>
      </div>

      {/* Student Dossier Cards Grid */}
      {filteredSubmissions.length === 0 ? (
        <div className="duo-card p-12 text-center">
          <FileCheck2 className="h-12 w-12 mx-auto text-[#afafaf] mb-3" />
          <p className="text-[19px] font-bold text-[#4b4b4b]">No hay exámenes en esta vista</p>
          <p className="duo-body-copy mt-1">
            Sube un archivo o pulsa los botones de simulación superior.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubmissions.map(sub => {
            const report = sub.gradeReport;
            const hasReviewAlert = sub.status === 'needs_review' || report?.needsManualReview;

            const testOut10 =
              report?.testSectionScoreOutOf10 ??
              (report && report.testSectionMax > 0
                ? (report.testSectionScore / report.testSectionMax) * 10
                : 0);
            const exOut10 =
              report?.exerciseSectionScoreOutOf10 ??
              (report && report.exerciseSectionMax > 0
                ? (report.exerciseSectionScore / report.exerciseSectionMax) * 10
                : 0);

            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubmission(sub)}
                className={`duo-card p-0 overflow-hidden cursor-pointer flex flex-col justify-between transition ${
                  hasReviewAlert
                    ? 'border-[#58cc02]'
                    : 'border-[#afafaf] hover:border-[#1cb0f6]'
                }`}
              >
                {/* Top Status Strip */}
                {hasReviewAlert ? (
                  <div className="bg-[#d7ffb8] border-b-2 border-[#58cc02] text-[#4b4b4b] px-4 py-2 flex items-center justify-between text-[13px] font-bold uppercase tracking-[0.053em]">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-[#58cc02]" />
                      <span>REVISIÓN MANUAL DOCENTE</span>
                    </span>
                    <span>AVISO OCR</span>
                  </div>
                ) : (
                  <div className="bg-[#ffffff] border-b-2 border-[#afafaf] text-[#777777] px-4 py-2 flex items-center justify-between text-[13px] font-bold uppercase tracking-[0.053em]">
                    <span>{sub.studentIdCode || 'EXP-2026'}</span>
                    <span className="text-[#58cc02]">✔ LECTURA CORRECTA</span>
                  </div>
                )}

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Student Name & Final Score */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-[22px] font-bold text-[#4b4b4b] leading-tight truncate">
                          {sub.studentName}
                        </h4>
                        <p className="text-[13px] text-[#777777] mt-0.5 truncate">
                          {sub.scanPdfName || 'Pliego_Examen.pdf'}
                        </p>
                      </div>

                      {report && (
                        <div className="text-right shrink-0">
                          <span className="font-feather font-extrabold text-[32px] text-[#58cc02] tabular-nums leading-none block">
                            {report.finalScore.toFixed(2)}
                          </span>
                          <span className="text-[13px] text-[#777777] uppercase font-bold">
                            DE 10
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Explicit 0-10 Evaluation per Section */}
                    {report && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <div className="p-3 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf]">
                          <span className="text-[13px] font-bold text-[#777777] uppercase tracking-[0.053em] block">
                            TEST (0–10)
                          </span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-[19px] font-bold text-[#58cc02] tabular-nums">
                              {testOut10.toFixed(1)}<span className="text-[13px] text-[#777777]">/10</span>
                            </span>
                            <span className="text-[13px] text-[#777777] tabular-nums">
                              ({report.testSectionScore.toFixed(1)}p)
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf]">
                          <span className="text-[13px] font-bold text-[#777777] uppercase tracking-[0.053em] block">
                            EJERCICIOS (0–10)
                          </span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-[19px] font-bold text-[#1cb0f6] tabular-nums">
                              {exOut10.toFixed(1)}<span className="text-[13px] text-[#777777]">/10</span>
                            </span>
                            <span className="text-[13px] text-[#777777] tabular-nums">
                              ({report.exerciseSectionScore.toFixed(1)}p)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Manual Review Reason Box if Flagged */}
                    {hasReviewAlert && report && (
                      <div className="p-3.5 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[15px] text-[#4b4b4b] space-y-1">
                        <span className="text-[13px] uppercase tracking-[0.053em] font-bold text-[#4b4b4b] block">
                          REQUIERE REVISIÓN MANUAL:
                        </span>
                        <p className="font-medium leading-snug">
                          {report.manualReviewReasons[0] ||
                            'Letra dudosa o tachón detectado en el examen.'}
                        </p>
                      </div>
                    )}

                    {!hasReviewAlert && report && (
                      <p className="text-[15px] text-[#777777] line-clamp-2">
                        "{report.overallFeedback}"
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 mt-4 border-t-2 border-[#afafaf]/40 flex items-center justify-between">
                    <span className="text-[14px] font-bold uppercase tracking-[0.053em] text-[#1cb0f6] flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      <span>
                        {hasReviewAlert ? 'REVISAR Y CALIFICAR' : 'VER CORRECCIÓN'}
                      </span>
                    </span>
                    <button
                      onClick={e => handleDelete(sub.id, e)}
                      title="Eliminar examen"
                      className="text-[#777777] hover:text-[#4b4b4b] p-1.5 rounded-[12px] transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Split-Screen Optical Inspection Workbench Modal */}
      {selectedSubmission && (
        <StudentDetailModal
          exam={exam}
          submission={selectedSubmission}
          allSubmissions={submissions}
          onSelectSubmission={sub => setSelectedSubmission(sub)}
          onClose={() => setSelectedSubmission(null)}
          onSaveReport={handleUpdateGradeReport}
        />
      )}

    </div>
  );
};
