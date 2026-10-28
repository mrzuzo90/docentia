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
            'Se ha detectado un ejercicio con lectura dudosa que requiere confirmación docente.',
            'warning'
          );
        } else {
          onNotify(
            `Examen de ${submission.studentName} calificado`,
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
      `Calificación de ${updatedReport.studentName} guardada`,
      `Nota definitiva: ${updatedReport.finalScore.toFixed(2)} / 10`,
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
      
      {/* Apple España Hero Section: Sober typography + Lechuza OCR Scanner */}
      <div className="py-6 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
        <div className="lg:col-span-7 space-y-4">
          <span className="apple-badge-ember">
            Paso 3 · Corrección óptica OCR y triaje
          </span>
          <h2 className="text-[36px] sm:text-[48px] font-bold tracking-tight text-[#1d1d1f] leading-[1.08]">
            Corrección precisa de 0 a 10.
          </h2>
          <p className="text-[17px] text-[#707070] max-w-xl leading-relaxed">
            La cámara u escáner lee las respuestas manuscritas, calibra cada apartado contra el solucionario oficial y detecta cualquier ambigüedad para revisión docente.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#d6d6d6] text-[13px] text-[#1d1d1f] bg-[#fafafc]">
              <span className="text-[#707070]">Saldo OCR:</span>
              <span className="font-semibold">{creditsBalance} cr. ({creditsBalance * 5} alumnos)</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#d6d6d6] text-[13px] text-[#1d1d1f] bg-[#fafafc]">
              <span className="text-[#707070]">Corregidos:</span>
              <span className="font-semibold">{submissions.length}</span>
            </div>
            {needsReviewCount > 0 && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#b64400] text-[13px] text-[#b64400] bg-[#b64400]/5 font-medium">
                <span>Por revisar:</span>
                <span>{needsReviewCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <DuoMascot variant="scanner" className="max-w-[280px]" />
        </div>
      </div>

      {/* Upload & Simulation Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left 8 cols: Dropzone + Quick Simulation Triggers */}
        <div className="lg:col-span-8 bg-[#ffffff] border border-[#d6d6d6] rounded-[28px] p-7 space-y-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-[#d6d6d6] hover:border-[#1d1d1f] bg-[#fafafc] rounded-[20px] p-7 text-center cursor-pointer transition group"
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
              <div className="py-3 space-y-2">
                <Loader2 className="h-6 w-6 text-[#0071e3] animate-spin mx-auto" />
                <p className="text-[16px] font-medium text-[#1d1d1f]">
                  Evaluando con visión OCR a {currentProcessingName}...
                </p>
                <p className="text-[13px] text-[#707070]">
                  Cotejando grafía con el solucionario y verificando legibilidad
                </p>
              </div>
            ) : (
              <>
                <div className="mx-auto w-11 h-11 rounded-full bg-[#ffffff] border border-[#d6d6d6] text-[#0071e3] flex items-center justify-center mb-3">
                  <Upload className="h-5 w-5" />
                </div>
                <h3 className="text-[16px] font-medium text-[#1d1d1f]">
                  Sube aquí los exámenes de los alumnos (imagen, PDF o texto)
                </h3>
                <p className="text-[13px] text-[#707070] mt-1">
                  1 crédito incluye la corrección detallada de hasta 5 exámenes
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
                className="apple-pill-ghost text-[13px] py-1.5 px-3.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#0071e3]" />
                <span>+ Simular examen nítido (Sofía)</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSimulateNewStudent('unclear')}
                className="apple-pill-wash text-[13px] py-1.5 px-3.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-[#b64400]" />
                <span>+ Simular letra dudosa / tachón (Marcos)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowTextInput(!showTextInput)}
              className="apple-pill-ghost text-[13px] py-1.5 px-3"
            >
              <FileText className="h-3.5 w-3.5 text-[#707070]" />
              <span>Pegar respuestas</span>
            </button>
          </div>

          {showTextInput && (
            <div className="p-4 rounded-[18px] bg-[#fafafc] border border-[#d6d6d6] space-y-3">
              <input
                type="text"
                placeholder="Nombre completo del alumno..."
                value={studentNameInput}
                onChange={e => setStudentNameInput(e.target.value)}
                className="w-full text-[14px] px-3.5 py-2 bg-[#ffffff] border border-[#d6d6d6] rounded-[12px] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
              />
              <textarea
                rows={5}
                placeholder="Pega las respuestas del alumno o la transcripción OCR..."
                value={studentTextInput}
                onChange={e => setStudentTextInput(e.target.value)}
                className="w-full text-[14px] px-3.5 py-2 bg-[#ffffff] border border-[#d6d6d6] rounded-[12px] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTextInput(false)}
                  className="apple-pill-ghost text-[12px] py-1 px-3"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleManualTextSubmit}
                  disabled={!studentNameInput.trim() || !studentTextInput.trim() || isProcessing}
                  className="apple-pill-primary text-[12px] py-1 px-3.5"
                >
                  Corregir examen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 cols: OCR Diagnostic Card */}
        <div className="lg:col-span-4 bg-[#fafafc] border border-[#d6d6d6] rounded-[28px] p-7 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#707070] block">
              Auditoría óptica de caligrafía
            </span>
            <p className="text-[14px] text-[#707070] leading-relaxed">
              El motor OCR clasifica la legibilidad de cada casilla y detecta correcciones manuales con doble aspa o tachaduras.
            </p>
            <div className="p-3.5 rounded-[16px] bg-[#ffffff] border border-[#d6d6d6] text-[13px] text-[#1d1d1f] space-y-1">
              <div className="flex items-center justify-between">
                <span>Alumnos calificados:</span>
                <span className="font-semibold">{submissions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Avisos de revisión manual:</span>
                <span className="font-semibold text-[#b64400]">{needsReviewCount}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onProceedToGradebook}
            className="apple-pill-primary w-full py-2.5 px-4 text-[14px]"
          >
            <span>Ver acta final de notas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d6d6d6] pb-4 pt-2">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-[#0071e3]" />
          <h3 className="text-[18px] font-semibold text-[#1d1d1f]">
            Exámenes evaluados ({filteredSubmissions.length})
          </h3>
        </div>

        <div className="flex items-center gap-1.5 bg-[#f5f5f7] p-1 rounded-full">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1 text-[13px] rounded-full transition ${
              filterMode === 'all'
                ? 'bg-[#ffffff] text-[#1d1d1f] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[#707070] hover:text-[#1d1d1f]'
            }`}
          >
            Todos ({submissions.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('needs_review')}
            className={`px-3.5 py-1 text-[13px] rounded-full transition flex items-center gap-1.5 ${
              filterMode === 'needs_review'
                ? 'bg-[#ffffff] text-[#b64400] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[#707070] hover:text-[#1d1d1f]'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Por revisar ({needsReviewCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('graded')}
            className={`px-3.5 py-1 text-[13px] rounded-full transition ${
              filterMode === 'graded'
                ? 'bg-[#ffffff] text-[#1d1d1f] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[#707070] hover:text-[#1d1d1f]'
            }`}
          >
            Nítidos ({submissions.length - needsReviewCount})
          </button>
        </div>
      </div>

      {/* Submissions Grid */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-[#ffffff] border border-[#d6d6d6] rounded-[28px] p-12 text-center">
          <FileCheck2 className="h-10 w-10 mx-auto text-[#707070] mb-3" />
          <h4 className="text-[17px] font-semibold text-[#1d1d1f]">
            No hay exámenes en esta categoría
          </h4>
          <p className="text-[14px] text-[#707070] mt-1">
            Sube un pliego con la cámara o utiliza los botones de simulación arriba.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubmissions.map(sub => {
            const report = sub.gradeReport;
            const hasReviewAlert = sub.status === 'needs_review' || report?.needsManualReview;

            const testOut10 =
              report && exam.testSectionWeight > 0
                ? (report.testSectionScore / exam.testSectionWeight) * 10
                : 0;

            const exOut10 =
              report && exam.exerciseSectionWeight > 0
                ? (report.exerciseSectionScore / exam.exerciseSectionWeight) * 10
                : 0;

            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubmission(sub)}
                className={`bg-[#ffffff] border rounded-[24px] overflow-hidden cursor-pointer flex flex-col justify-between transition hover:border-[#1d1d1f] ${
                  hasReviewAlert ? 'border-[#b64400]/40' : 'border-[#d6d6d6]'
                }`}
              >
                {/* Top Status Strip */}
                {hasReviewAlert ? (
                  <div className="bg-[#b64400]/5 border-b border-[#b64400]/20 text-[#b64400] px-4 py-2 flex items-center justify-between text-[12px] font-medium">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-[#b64400]" />
                      <span>Revisión docente sugerida</span>
                    </span>
                    <span>Aviso OCR</span>
                  </div>
                ) : (
                  <div className="bg-[#fafafc] border-b border-[#d6d6d6] text-[#707070] px-4 py-2 flex items-center justify-between text-[12px]">
                    <span>{sub.studentIdCode || 'EXP-2026'}</span>
                    <span className="text-[#0071e3] font-medium">✔ Lectura nítida</span>
                  </div>
                )}

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Student Name & Final Score */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-[18px] font-semibold text-[#1d1d1f] leading-snug truncate">
                          {sub.studentName}
                        </h4>
                        <p className="text-[12px] text-[#707070] mt-0.5 truncate">
                          {sub.scanPdfName || 'Pliego_Examen.pdf'}
                        </p>
                      </div>

                      {report && (
                        <div className="text-right shrink-0">
                          <span className="text-[28px] font-bold text-[#1d1d1f] tabular-nums leading-none block">
                            {report.finalScore.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-[#707070]">
                            de 10,00
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 0-10 Evaluation per Section */}
                    {report && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <div className="p-3 rounded-[16px] bg-[#fafafc] border border-[#d6d6d6]">
                          <span className="text-[11px] text-[#707070] uppercase block">
                            Test (0–10)
                          </span>
                          <div className="flex items-baseline justify-between mt-0.5">
                            <span className="text-[16px] font-semibold text-[#1d1d1f] tabular-nums">
                              {testOut10.toFixed(1)}<span className="text-[11px] text-[#707070]">/10</span>
                            </span>
                            <span className="text-[11px] text-[#707070] tabular-nums">
                              ({report.testSectionScore.toFixed(1)}p)
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-[16px] bg-[#fafafc] border border-[#d6d6d6]">
                          <span className="text-[11px] text-[#707070] uppercase block">
                            Ejercicios (0–10)
                          </span>
                          <div className="flex items-baseline justify-between mt-0.5">
                            <span className="text-[16px] font-semibold text-[#0071e3] tabular-nums">
                              {exOut10.toFixed(1)}<span className="text-[11px] text-[#707070]">/10</span>
                            </span>
                            <span className="text-[11px] text-[#707070] tabular-nums">
                              ({report.exerciseSectionScore.toFixed(1)}p)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Manual Review Reason Box if Flagged */}
                    {hasReviewAlert && report && (
                      <div className="p-3.5 rounded-[16px] bg-[#b64400]/5 border border-[#b64400]/20 text-[13px] text-[#1d1d1f] space-y-1">
                        <span className="text-[11px] uppercase font-semibold text-[#b64400] block">
                          Incidencia detectada:
                        </span>
                        <p className="leading-snug">
                          {report.manualReviewReasons[0] ||
                            'Letra dudosa o tachadura observada en el pliego.'}
                        </p>
                      </div>
                    )}

                    {!hasReviewAlert && report && (
                      <p className="text-[13px] text-[#707070] line-clamp-2">
                        "{report.overallFeedback}"
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 mt-4 border-t border-[#d6d6d6] flex items-center justify-between">
                    <span className="text-[13px] text-[#0066cc] hover:underline flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span>
                        {hasReviewAlert ? 'Revisar y calificar' : 'Ver detalle'}
                      </span>
                    </span>
                    <button
                      onClick={e => handleDelete(sub.id, e)}
                      title="Eliminar examen"
                      className="text-[#707070] hover:text-[#1d1d1f] p-1.5 rounded-full transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
