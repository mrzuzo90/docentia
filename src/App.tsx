import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Command,
  Search,
  FileText,
  ScanLine,
  BarChart3,
  UploadCloud,
  Copy,
  Plus,
  RotateCcw,
  Coins
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { DocumentUpload } from './components/DocumentUpload';
import { ExamGenerator } from './components/ExamGenerator';
import { ExamView } from './components/ExamView';
import { GradingView } from './components/GradingView';
import { GradebookView } from './components/GradebookView';
import { PricingModal } from './components/PricingModal';
import { OnlineExamPortal } from './components/OnlineExamPortal';
import { DuoMascot, DuoCompanionDock } from './components/DuoMascot';
import {
  Exam,
  ExamGenerationConfig,
  SourceDocument,
  StudentSubmission,
  ToastMessage,
  UserBillingAccount
} from './types';
import { StorageService } from './services/storageService';
import { GeminiService } from './services/geminiService';
import { ExportService } from './services/exportService';
import { BillingService } from './services/billingService';
import {
  SAMPLE_EXAM,
  SAMPLE_EXAM_PHYSICS,
  SAMPLE_STUDENT_SUBMISSIONS,
  SAMPLE_SOURCE_DOCUMENT
} from './services/mockData';

export function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'exam' | 'grading' | 'gradebook'>('upload');
  const [exams, setExams] = useState<Exam[]>(() => StorageService.getAllExams());
  const [exam, setExam] = useState<Exam>(() => StorageService.getCurrentExam());
  const [documents, setDocuments] = useState<SourceDocument[]>(
    () => exam.documents || [SAMPLE_SOURCE_DOCUMENT]
  );
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() =>
    StorageService.getSubmissions(exam.id)
  );
  const [billingAccount, setBillingAccount] = useState<UserBillingAccount>(() =>
    BillingService.getAccount()
  );
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [pricingModalTab, setPricingModalTab] = useState<'plans' | 'packs' | 'ledger'>('plans');
  const [insufficientCreditsMsg, setInsufficientCreditsMsg] = useState<string | null>(null);
  const [isOnlinePortalOpen, setIsOnlinePortalOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (title: string, description?: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      setToasts(prev => [...prev.slice(-3), { id, title, description, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4200);
    },
    []
  );

  // Keyboard shortcut Cmd+K / Ctrl+K for Command Palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSelectExam = (selected: Exam) => {
    StorageService.setCurrentExamId(selected.id);
    setExam(selected);
    setDocuments(selected.documents || []);
    setSubmissions(StorageService.getSubmissions(selected.id));
    setActiveTab('exam');
    addToast(`Convocatoria activa: ${selected.title}`, `${selected.subject} · ${selected.targetLevel}`, 'info');
  };

  const handleCreateNewExam = () => {
    setActiveTab('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addToast(
      'Diseño de Nueva Convocatoria',
      'Sube tus documentos PDF o temarios en el Paso 1 y pulsa Generar Examen en el Paso 2.',
      'info'
    );
  };

  const handleDeleteExam = (examId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedList = StorageService.deleteExam(examId);
    setExams(updatedList);
    const nextExam = updatedList[0];
    setExam(nextExam);
    setDocuments(nextExam.documents || []);
    setSubmissions(StorageService.getSubmissions(nextExam.id));
    addToast('Convocatoria eliminada', `Examen activo: ${nextExam.title}`, 'info');
  };

  const handleDocumentsChange = (newDocs: SourceDocument[]) => {
    setDocuments(newDocs);
    const updated = { ...exam, documents: newDocs };
    setExam(updated);
    StorageService.saveExam(updated);
    setExams(StorageService.getAllExams());
  };

  const handleOpenPricingModal = (tab: 'plans' | 'packs' | 'ledger' = 'plans', alertMsg: string | null = null) => {
    setPricingModalTab(tab);
    setInsufficientCreditsMsg(alertMsg);
    setIsPricingModalOpen(true);
  };

  const handleGenerateExam = async (
    config: ExamGenerationConfig,
    metadata: {
      title: string;
      subject: string;
      targetLevel: string;
      institution: string;
      durationMinutes: number;
      testPenalty: number;
      instructions: string;
    }
  ) => {
    // Verify teacher has at least 1 credit for generation
    if (!BillingService.hasEnoughCredits(1)) {
      handleOpenPricingModal(
        'packs',
        'Has agotado tus créditos disponibles. Recarga una unidad suelta desde 1,90 € (sin cuota mensual) o activa el Plan Docente Titular Pro para generar este examen y su solucionario.'
      );
      return;
    }

    const creditResult = BillingService.consumeCreditsForGeneration(metadata.title);
    setBillingAccount(creditResult.account);
    setIsGenerating(true);

    try {
      const { testQuestions, exercises } = await GeminiService.generateExamFromSource(
        documents,
        config,
        metadata
      );

      const newExam: Exam = {
        id: `exam-${Date.now()}`,
        title: metadata.title,
        subject: metadata.subject,
        targetLevel: metadata.targetLevel,
        institution: metadata.institution,
        durationMinutes: metadata.durationMinutes,
        testPenalty: metadata.testPenalty,
        instructions: metadata.instructions,
        status: 'ready',
        createdAt: new Date().toISOString(),
        documents,
        testQuestions,
        exercises,
        totalScore: 10,
        testSectionWeight: config.testSectionWeight,
        exerciseSectionWeight: config.exerciseSectionWeight
      };

      setExam(newExam);
      setSubmissions([]);
      StorageService.saveExam(newExam);
      StorageService.saveSubmissions(newExam.id, []);
      setExams(StorageService.getAllExams());
      setActiveTab('exam');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      try {
        confetti({
          particleCount: 65,
          spread: 55,
          origin: { y: 0.65 }
        });
      } catch {
        // ignore confetti errors
      }

      addToast(
        'Examen y Solucionario Generados (-1 Crédito)',
        `${testQuestions.length} preguntas test y ${exercises.length} ejercicios creados · Saldo: ${creditResult.account.creditsBalance} Cr.`,
        'success'
      );
    } catch (error) {
      console.error('Error generating exam:', error);
      const refundedAccount = BillingService.refundTransaction(1, 'Fallo en la generación del examen');
      setBillingAccount(refundedAccount);
      addToast('Error en la generación (Crédito reembolsado)', 'Revisa los documentos o tu conexión.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConsumeGradingCredits = (submissionsCount: number): boolean => {
    const required = BillingService.calculateGradingCredits(submissionsCount);
    if (!BillingService.hasEnoughCredits(required)) {
      handleOpenPricingModal(
        'packs',
        `Necesitas ${required} ${required === 1 ? 'crédito' : 'créditos'} para corregir ${submissionsCount} ${submissionsCount === 1 ? 'examen' : 'exámenes'} por OCR (1 crédito = hasta 5 alumnos). Recarga un pack sin cuota o suscríbete al Plan Titular.`
      );
      return false;
    }

    const res = BillingService.consumeCreditsForGrading(submissionsCount, exam.title);
    setBillingAccount(res.account);
    return true;
  };

  const handleUpdateExam = (updatedExam: Exam) => {
    setExam(updatedExam);
    StorageService.saveExam(updatedExam);
    setExams(StorageService.getAllExams());
  };

  const handleSubmissionsChange = (newSubmissions: StudentSubmission[]) => {
    setSubmissions(newSubmissions);
    StorageService.saveSubmissions(exam.id, newSubmissions);
  };

  const handleAddOnlineSubmission = (newSub: StudentSubmission) => {
    const updated = [newSub, ...submissions];
    setSubmissions(updated);
    StorageService.saveSubmissions(exam.id, updated);
    addToast(
      `Examen Online recibido: ${newSub.studentName}`,
      `Nota calculada: ${newSub.gradeReport?.finalScore.toFixed(2)}/10 · Incidencias: ${newSub.tabSwitchCount || 0}`,
      'success'
    );
  };

  const handleLoadDemo = () => {
    StorageService.resetToDemo();
    setExams([SAMPLE_EXAM, SAMPLE_EXAM_PHYSICS]);
    setExam(SAMPLE_EXAM);
    setDocuments([SAMPLE_SOURCE_DOCUMENT]);
    setSubmissions(SAMPLE_STUDENT_SUBMISSIONS);
    setActiveTab('exam');
    addToast(
      'Caso de Estudio Restaurado',
      'Examen de Biología 2º Bachillerato con 3 alumnos corregidos (incluye incidencia OCR en Carlos Morales).',
      'success'
    );
  };

  const pendingReviewsCount = submissions.filter(
    s => s.status === 'needs_review' || s.gradeReport?.needsManualReview
  ).length;

  // Command Palette actions
  const commandActions = [
    {
      id: 'cmd-tab-1',
      label: 'Ir a 01 / Fuentes y Generación de Examen',
      category: 'Navegación',
      icon: UploadCloud,
      run: () => setActiveTab('upload')
    },
    {
      id: 'cmd-tab-2',
      label: 'Ir a 02 / Examen, Pesos y Solucionario',
      category: 'Navegación',
      icon: FileText,
      run: () => setActiveTab('exam')
    },
    {
      id: 'cmd-tab-3',
      label: `Ir a 03 / Corrección OCR (${pendingReviewsCount} revisiones pendientes)`,
      category: 'Navegación',
      icon: ScanLine,
      run: () => setActiveTab('grading')
    },
    {
      id: 'cmd-tab-4',
      label: 'Ir a 04 / Acta de Notas y Estadísticas',
      category: 'Navegación',
      icon: BarChart3,
      run: () => setActiveTab('gradebook')
    },
    {
      id: 'cmd-wallet',
      label: `Abrir Billetera de Créditos y Suscripción (${billingAccount.creditsBalance} créditos disponibles)`,
      category: 'Facturación Docente',
      icon: Coins,
      run: () => handleOpenPricingModal('plans')
    },
    {
      id: 'cmd-copy-student',
      label: 'Copiar Modelo de Examen para el Alumno (Word / Docs)',
      category: 'Exportación Rápida',
      icon: Copy,
      run: async () => {
        await ExportService.copyRichExamToClipboard(exam, 'student');
        addToast('Examen de Alumno copiado al portapapeles', 'Formato enriquecido listo para pegar.', 'success');
      }
    },
    {
      id: 'cmd-copy-solucionario',
      label: 'Copiar Solucionario Oficial y Rúbricas',
      category: 'Exportación Rápida',
      icon: Copy,
      run: async () => {
        await ExportService.copyRichExamToClipboard(exam, 'solucionario');
        addToast('Solucionario Oficial copiado', 'Incluye clave de respuestas y pasos de resolución.', 'success');
      }
    },
    {
      id: 'cmd-new-exam',
      label: 'Crear Nueva Convocatoria de Examen',
      category: 'Archivo',
      icon: Plus,
      run: handleCreateNewExam
    },
    {
      id: 'cmd-demo',
      label: 'Restaurar Escenario de Demostración Completo',
      category: 'Sistema',
      icon: RotateCcw,
      run: handleLoadDemo
    }
  ].filter(item => item.label.toLowerCase().includes(commandQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#4b4b4b] flex flex-col font-sans">
      
      {/* Top Centered Navigation Bar (1200px max-width, Paper White) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        exams={exams}
        currentExam={exam}
        onSelectExam={handleSelectExam}
        onCreateNewExam={handleCreateNewExam}
        onDeleteExam={handleDeleteExam}
        billingAccount={billingAccount}
        onOpenPricingModal={(tab) => handleOpenPricingModal(tab || 'plans', null)}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
        onLoadDemo={handleLoadDemo}
        pendingReviewsCount={pendingReviewsCount}
        totalSubmissionsCount={submissions.length}
      />

      {/* Main Content Container (1200px max-width on pure Paper White canvas) */}
      <div className="flex-1 flex flex-col bg-[#ffffff]">
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
          
          {/* STEP 01: DOCUMENT UPLOAD & EXAM GENERATOR */}
          {activeTab === 'upload' && (
            <div className="space-y-12 animate-fadeIn">
              
              {/* Apple España Hero Section: Cathedral of white space with whispered headlines */}
              <section className="py-8 sm:py-16 text-center max-w-4xl mx-auto space-y-6">
                <div>
                  <span className="apple-badge-ember mb-4">
                    Docentia · Evaluación docente de nueva generación
                  </span>
                  <h1 className="text-[44px] sm:text-[68px] lg:text-[84px] font-bold tracking-[-0.035em] text-[#1d1d1f] leading-[1.04]">
                    Evaluación docente.<br />
                    <span className="text-[#707070]">Rediseñada al milímetro.</span>
                  </h1>
                </div>

                <p className="text-[19px] sm:text-[22px] font-normal text-[#707070] max-w-2xl mx-auto leading-relaxed tracking-[-0.015em]">
                  Diseña convocatorias desde tus propios apuntes en PDF, genera solucionarios ponderados sobre 10 puntos y corrige exámenes manuscritos con visión óptica inteligente.
                </p>

                {/* Primary Pill CTAs & Directional Links */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
                  <a
                    href="#generador-examen"
                    className="apple-pill-primary text-[17px] py-3 px-7"
                  >
                    Crear examen
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveTab('exam')}
                    className="apple-pill-ghost text-[17px] py-3 px-6"
                  >
                    Ver solucionario y pesos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('grading')}
                    className="apple-link text-[17px] py-3 px-2"
                  >
                    Corregir OCR ({submissions.length}) <span className="ml-1">›</span>
                  </button>
                </div>

                {/* Sober Barn Owl Floating Academic Companion */}
                <div className="pt-6 flex justify-center">
                  <DuoMascot variant="professor" className="w-full max-w-[280px]" />
                </div>

                {/* Subject Capsule Selector (Clean hairline capsules) */}
                <div className="pt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  {[
                    { emoji: '🧬', name: 'Biología' },
                    { emoji: '⚛️', name: 'Física y Química' },
                    { emoji: '📐', name: 'Matemáticas' },
                    { emoji: '🏛️', name: 'Historia' },
                    { emoji: '📚', name: 'Lengua y Literatura' },
                    { emoji: '🇬🇧', name: 'English Test' }
                  ].map(item => (
                    <div
                      key={item.name}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#d6d6d6] text-[13px] font-medium text-[#474747] bg-[#fafafc]"
                    >
                      <span className="text-sm leading-none" role="img" aria-label={item.name}>
                        {item.emoji}
                      </span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </section>

              <DocumentUpload
                documents={documents}
                onDocumentsChange={handleDocumentsChange}
              />

              <div id="generador-examen">
                <ExamGenerator
                  documents={documents}
                  initialMetadata={{
                    title: exam.title,
                    subject: exam.subject,
                    targetLevel: exam.targetLevel,
                    institution: exam.institution
                  }}
                  onGenerate={handleGenerateExam}
                  isGenerating={isGenerating}
                  creditsBalance={billingAccount.creditsBalance}
                  onOpenPricing={() => handleOpenPricingModal('plans', null)}
                />
              </div>
            </div>
          )}

          {/* STEP 02: EXAM & SOLUCIONARIO MATRIX */}
          {activeTab === 'exam' && (
            <ExamView
              exam={exam}
              onUpdateExam={handleUpdateExam}
              onProceedToGrading={() => setActiveTab('grading')}
              onGoToGenerator={() => setActiveTab('upload')}
              onOpenOnlinePortal={() => setIsOnlinePortalOpen(true)}
              onNotify={addToast}
            />
          )}

          {/* STEP 03: OPTICAL OCR GRADING & TRIAGE */}
          {activeTab === 'grading' && (
            <GradingView
              exam={exam}
              submissions={submissions}
              onSubmissionsChange={handleSubmissionsChange}
              onProceedToGradebook={() => setActiveTab('gradebook')}
              creditsBalance={billingAccount.creditsBalance}
              onConsumeGradingCredits={handleConsumeGradingCredits}
              onNotify={addToast}
            />
          )}

          {/* STEP 04: GRADEBOOK & PSYCHOMETRICS */}
          {activeTab === 'gradebook' && (
            <GradebookView
              exam={exam}
              submissions={submissions}
              onUpdateSubmissions={handleSubmissionsChange}
              onNotify={addToast}
            />
          )}

        </main>

        {/* Apple España Minimalist Footer Band (#f5f5f7 canvas, #d6d6d6 hairline border, #707070 text) */}
        <footer className="no-print bg-[#f5f5f7] text-[#707070] py-12 px-4 sm:px-6 mt-20 border-t border-[#d6d6d6]">
          <div className="max-w-[1200px] mx-auto space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <img src="/assets/mascot/lechuza-mark.svg" alt="Docentia" className="w-5 h-5" />
                  <span className="text-[17px] font-semibold text-[#1d1d1f]">docentia</span>
                </div>
                <p className="text-[14px] text-[#707070] leading-relaxed">
                  Plataforma avanzada de evaluación docente: solucionarios ponderados sobre 10 puntos y corrección óptica de grafía manuscrita.
                </p>
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f] text-[12px] font-medium">
                  IA Integrada · Sin cuotas ocultas
                </div>
              </div>

              <div>
                <h5 className="text-[13px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-3">
                  Flujo de Evaluación
                </h5>
                <ul className="space-y-2 text-[14px]">
                  <li>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="text-[#707070] hover:text-[#1d1d1f] transition-colors"
                    >
                      1. Subir Documentos Fuente
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('exam')}
                      className="text-[#707070] hover:text-[#1d1d1f] transition-colors"
                    >
                      2. Examen, Pesos y Solucionario
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('grading')}
                      className="text-[#707070] hover:text-[#1d1d1f] transition-colors"
                    >
                      3. Corrección OCR Manuscrita (0–10)
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('gradebook')}
                      className="text-[#707070] hover:text-[#1d1d1f] transition-colors"
                    >
                      4. Acta Oficial y Estadísticas
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-[13px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-3">
                  Exportación Rápida
                </h5>
                <ul className="space-y-2 text-[14px]">
                  <li>
                    <button
                      onClick={async () => {
                        await ExportService.copyRichExamToClipboard(exam, 'student');
                        addToast('Examen copiado', 'Listo para pegar en Word o Google Docs.', 'success');
                      }}
                      className="text-[#707070] hover:text-[#1d1d1f] transition-colors"
                    >
                      Copiar Examen del Alumno
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={async () => {
                        await ExportService.copyRichExamToClipboard(exam, 'solucionario');
                        addToast('Solucionario copiado', 'Incluye clave test y rúbricas.', 'success');
                      }}
                      className="text-[#707070] hover:text-[#1d1d1f] transition-colors"
                    >
                      Copiar Solucionario Oficial
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleLoadDemo}
                      className="text-[#707070] hover:text-[#1d1d1f] transition-colors"
                    >
                      Cargar Ejemplo de Biología
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-[13px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-3">
                  Planes y Cuenta
                </h5>
                <ul className="space-y-2 text-[14px]">
                  <li>
                    <button
                      onClick={() => handleOpenPricingModal('plans', null)}
                      className="text-[#707070] hover:text-[#1d1d1f] transition-colors"
                    >
                      Suscripción Docente Pro (12 €/mes)
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleOpenPricingModal('packs', null)}
                      className="text-[#707070] hover:text-[#1d1d1f] transition-colors"
                    >
                      Examen Suelto Prepago (1,90 €)
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setIsCommandOpen(true)}
                      className="text-[#707070] hover:text-[#1d1d1f] transition-colors"
                    >
                      Paleta de Comandos (⌘K)
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-[#d6d6d6] flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#707070]">
              <div>
                Docentia © 2026 · Todos los derechos reservados. Diseñado para la comunidad educativa.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[12px] text-[#474747]">Baremo 0–10 normalizado</span>
                <span>·</span>
                <span className="text-[12px] text-[#474747]">Trazabilidad OCR</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* COMMAND PALETTE MODAL (⌘K) — Apple Minimalist Card */}
      {isCommandOpen && (
        <div
          onClick={() => setIsCommandOpen(false)}
          className="fixed inset-0 z-50 bg-[#1d1d1f]/40 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-fadeIn"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#ffffff] text-[#1d1d1f] rounded-[24px] max-w-xl w-full overflow-hidden border border-[#d6d6d6] shadow-[0_16px_48px_rgba(0,0,0,0.12)]"
          >
            <div className="p-4 border-b border-[#d6d6d6] flex items-center space-x-3">
              <Search className="h-5 w-5 text-[#0071e3]" />
              <input
                type="text"
                autoFocus
                placeholder="Escribe una acción (copiar examen, solucionario, ocr, créditos)..."
                value={commandQuery}
                onChange={e => setCommandQuery(e.target.value)}
                className="flex-1 bg-transparent text-[16px] text-[#1d1d1f] placeholder-[#707070] focus:outline-none"
              />
              <kbd className="px-2 py-0.5 text-[11px] font-medium bg-[#f5f5f7] border border-[#d6d6d6] text-[#707070] rounded-md">
                ESC
              </kbd>
            </div>

            <div className="p-2 max-h-80 overflow-y-auto divide-y divide-[#d6d6d6]/40">
              {commandActions.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.run();
                      setIsCommandOpen(false);
                      setCommandQuery('');
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-[14px] text-left text-[14px] hover:bg-[#f5f5f7] transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4 text-[#707070] group-hover:text-[#0071e3]" />
                      <span className="font-normal text-[#1d1d1f]">
                        {action.label}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#707070]">
                      {action.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATIONS — Apple Frosted Cards */}
      <div className="no-print fixed bottom-6 right-6 z-50 space-y-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto bg-[#ffffff]/95 backdrop-blur-md text-[#1d1d1f] border border-[#d6d6d6] rounded-[20px] p-4 flex items-start justify-between gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)] animate-fadeIn"
          >
            <div className="flex items-start space-x-2.5">
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-[#0071e3] shrink-0 mt-0.5" />}
              {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-[#b64400] shrink-0 mt-0.5" />}
              {t.type === 'info' && <Info className="h-5 w-5 text-[#0071e3] shrink-0 mt-0.5" />}
              {t.type === 'error' && <AlertTriangle className="h-5 w-5 text-[#b64400] shrink-0 mt-0.5" />}
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">{t.title}</p>
                {t.description && (
                  <p className="text-[13px] text-[#707070] mt-0.5 leading-snug">{t.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-[#707070] hover:text-[#1d1d1f]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Interactive Floating Mascot Companion Dock */}
      <DuoCompanionDock
        activeTab={activeTab}
        pendingReviewsCount={pendingReviewsCount}
        creditsBalance={billingAccount.creditsBalance}
      />

      {/* Secure Online Exam Portal (Anti-Cheat & Student Direct Link) */}
      <OnlineExamPortal
        isOpen={isOnlinePortalOpen}
        onClose={() => setIsOnlinePortalOpen(false)}
        exam={exam}
        onAddSubmission={handleAddOnlineSubmission}
        onNotify={addToast}
      />

      {/* Pricing, Subscription & Credit Wallet Modal */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => {
          setIsPricingModalOpen(false);
          setInsufficientCreditsMsg(null);
        }}
        account={billingAccount}
        onAccountChange={setBillingAccount}
        insufficientCreditsMessage={insufficientCreditsMsg}
        initialTab={pricingModalTab}
        onNotify={addToast}
      />

    </div>
  );
}

export default App;
