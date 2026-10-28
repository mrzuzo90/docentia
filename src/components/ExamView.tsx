import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  FileText,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  Award,
  ArrowRight,
  Download,
  Scale,
  Edit3,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Type,
  Shuffle,
  Share2
} from 'lucide-react';
import { Exam, TestQuestion, OpenExercise } from '../types';
import { ExportService } from '../services/exportService';
import { GeminiService } from '../services/geminiService';
import { SoundService } from '../services/soundService';
import { DuoMascot } from './DuoMascot';

interface ExamViewProps {
  exam: Exam;
  onUpdateExam: (updated: Exam) => void;
  onProceedToGrading: () => void;
  onGoToGenerator?: () => void;
  onOpenOnlinePortal?: () => void;
  onNotify?: (title: string, description?: string, type?: 'success' | 'info' | 'warning') => void;
}

/**
 * Deterministically permutes questions and options (A, B, C, D) to create an
 * anti-cheating Modelo B while keeping the Solucionario 100% accurate.
 */
function buildModelBExam(baseExam: Exam, seed: number): Exam {
  const letters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  // Deterministic pseudo-random generator from seed
  let s = (seed * 9301 + 49297) % 233280;
  const nextRand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  // Shuffle questions order
  const questionsCopy = [...baseExam.testQuestions];
  for (let i = questionsCopy.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [questionsCopy[i], questionsCopy[j]] = [questionsCopy[j], questionsCopy[i]];
  }

  // Ensure question 0 moved if there are >= 2 questions
  if (
    questionsCopy.length >= 2 &&
    questionsCopy[0].id === baseExam.testQuestions[0].id
  ) {
    [questionsCopy[0], questionsCopy[1]] = [questionsCopy[1], questionsCopy[0]];
  }

  // Permute options A, B, C, D inside each question and remap correctAnswer
  const shuffledQuestions: TestQuestion[] = questionsCopy.map(q => {
    const entries = letters.map(letter => ({
      originalLetter: letter,
      text: q.options[letter],
      isCorrect: q.correctAnswer === letter
    }));

    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }

    const newOptions: Record<'A' | 'B' | 'C' | 'D', string> = {
      A: entries[0].text,
      B: entries[1].text,
      C: entries[2].text,
      D: entries[3].text
    };

    const newCorrectIdx = entries.findIndex(e => e.isCorrect);
    const newCorrectLetter = letters[newCorrectIdx >= 0 ? newCorrectIdx : 0];

    return {
      ...q,
      options: newOptions,
      correctAnswer: newCorrectLetter
    };
  });

  // Also reverse exercises order if there are >= 2 exercises
  const shuffledExercises =
    baseExam.exercises.length >= 2
      ? [...baseExam.exercises].reverse()
      : baseExam.exercises;

  return {
    ...baseExam,
    title: `${baseExam.title} — MODELO B (FILA PAR)`,
    testQuestions: shuffledQuestions,
    exercises: shuffledExercises
  };
}

export const ExamView: React.FC<ExamViewProps> = ({
  exam,
  onUpdateExam,
  onProceedToGrading,
  onGoToGenerator,
  onOpenOnlinePortal,
  onNotify
}) => {
  const [viewMode, setViewMode] = useState<'solucionario' | 'student'>('solucionario');
  const [activeModel, setActiveModel] = useState<'A' | 'B'>('A');
  const [modelBSeed, setModelBSeed] = useState<number>(1);
  const [paperFont, setPaperFont] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const modelAExam = useMemo(
    () => ({
      ...exam,
      title: activeModel === 'A' ? exam.title : `${exam.title} — MODELO A`
    }),
    [exam, activeModel]
  );

  const modelBExam = useMemo(() => buildModelBExam(exam, modelBSeed), [exam, modelBSeed]);

  const displayedExam = activeModel === 'B' ? modelBExam : exam;

  const totalTestPoints = exam.testQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  const totalExercisePoints = exam.exercises.reduce((sum, ex) => sum + (Number(ex.points) || 0), 0);
  const totalPoints = Number((totalTestPoints + totalExercisePoints).toFixed(2));

  const handleCopy = async (
    type: 'student' | 'solucionario' | 'aiken',
    targetModel: 'A' | 'B' = activeModel
  ) => {
    SoundService.playSuccess();
    const targetExam =
      targetModel === 'B'
        ? modelBExam
        : { ...exam, title: `${exam.title} (MODELO A)` };
    await ExportService.copyRichExamToClipboard(targetExam, type);
    const copyKey = `${type}-${targetModel}`;
    setCopiedType(copyKey);
    if (onNotify) {
      const label =
        type === 'student'
          ? `Examen Alumno (MODELO ${targetModel}) copiado`
          : type === 'solucionario'
          ? `Solucionario Oficial (MODELO ${targetModel}) copiado`
          : `Formato Moodle Aiken (MODELO ${targetModel}) copiado`;
      onNotify(label, 'Listo para pegar directamente en Word, Google Docs o tu plantilla docente.', 'success');
    }
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownloadWord = (mode: 'student' | 'solucionario') => {
    SoundService.playClick();
    ExportService.downloadWordDocument(displayedExam, mode);
    if (onNotify) {
      onNotify(
        mode === 'student'
          ? `Descargando Examen Modelo ${activeModel} (.doc)`
          : `Descargando Solucionario Modelo ${activeModel} (.doc)`,
        'Archivo compatible con Microsoft Word, LibreOffice y Google Docs.',
        'info'
      );
    }
  };

  const handleReshuffleModelB = () => {
    SoundService.playMascotBoing();
    setActiveModel('B');
    setModelBSeed(prev => prev + 1);
    onNotify?.(
      'Modelo B Anti-Copia Re-barajado (0 Créditos)',
      'Se ha permutado el orden de preguntas y las opciones A, B, C, D con su nuevo solucionario.',
      'success'
    );
  };

  const handleUpdateTestQuestion = (id: string, patch: Partial<TestQuestion>) => {
    const updatedTest = exam.testQuestions.map(q =>
      q.id === id ? { ...q, ...patch } : q
    );
    onUpdateExam({ ...exam, testQuestions: updatedTest });
  };

  const handleUpdateExercise = (id: string, patch: Partial<OpenExercise>) => {
    const updatedEx = exam.exercises.map(ex =>
      ex.id === id ? { ...ex, ...patch } : ex
    );
    onUpdateExam({ ...exam, exercises: updatedEx });
  };

  const handleNormalizeTo10 = () => {
    if (totalPoints === 0) return;
    SoundService.playSuccess();
    const factor = 10 / totalPoints;

    const updatedTest = exam.testQuestions.map(q => ({
      ...q,
      points: Number((q.points * factor).toFixed(2))
    }));

    const updatedEx = exam.exercises.map(ex => ({
      ...ex,
      points: Number((ex.points * factor).toFixed(2))
    }));

    // Fix rounding residual on last item so sum is strictly 10.00
    const newSum =
      updatedTest.reduce((a, b) => a + b.points, 0) +
      updatedEx.reduce((a, b) => a + b.points, 0);
    const diff = Number((10 - newSum).toFixed(2));
    if (diff !== 0) {
      if (updatedEx.length > 0) {
        updatedEx[updatedEx.length - 1].points = Number(
          (updatedEx[updatedEx.length - 1].points + diff).toFixed(2)
        );
      } else if (updatedTest.length > 0) {
        updatedTest[updatedTest.length - 1].points = Number(
          (updatedTest[updatedTest.length - 1].points + diff).toFixed(2)
        );
      }
    }

    onUpdateExam({ ...exam, testQuestions: updatedTest, exercises: updatedEx });
    onNotify?.('Baremo normalizado a 10.00 puntos', 'Se han reescalado proporcionalmente todos los pesos.', 'success');
  };

  const handleAddTestQuestion = () => {
    SoundService.playSuccess();
    const sourceText =
      (exam.documents || []).map(d => d.content).join('\n\n') ||
      `${exam.subject} (${exam.targetLevel}): ${exam.title}`;
    const generated = GeminiService.generateIntelligentLocalExam(
      sourceText,
      {
        numTestQuestions: exam.testQuestions.length + 1,
        numExercises: 0,
        difficulty: 'medio',
        testSectionWeight: exam.testQuestions.length + 1,
        exerciseSectionWeight: 0
      },
      { title: exam.title, subject: exam.subject, targetLevel: exam.targetLevel }
    );
    const candidate = generated.testQuestions[generated.testQuestions.length - 1];
    const newQ: TestQuestion = candidate || {
      id: `q-custom-${Date.now()}`,
      question: 'Nueva pregunta tipo test: edite el enunciado aquí...',
      options: {
        A: 'Primera opción de respuesta',
        B: 'Segunda opción de respuesta (Correcta por defecto)',
        C: 'Tercera opción distractora',
        D: 'Cuarta opción distractora'
      },
      correctAnswer: 'B',
      explanation: 'Justificación didáctica para el solucionario docente.',
      points: 1.0
    };
    setActiveModel('A');
    onUpdateExam({
      ...exam,
      testQuestions: [...exam.testQuestions, newQ]
    });
    setEditingItemId(newQ.id);
    onNotify?.('Nueva pregunta tipo test generada', 'Extraída de las fuentes documentales del examen.', 'success');
  };

  const handleAddExercise = () => {
    SoundService.playSuccess();
    const sourceText =
      (exam.documents || []).map(d => d.content).join('\n\n') ||
      `${exam.subject} (${exam.targetLevel}): ${exam.title}`;
    const generated = GeminiService.generateIntelligentLocalExam(
      sourceText,
      {
        numTestQuestions: 0,
        numExercises: exam.exercises.length + 1,
        difficulty: 'medio',
        testSectionWeight: 0,
        exerciseSectionWeight: (exam.exercises.length + 1) * 3.0
      },
      { title: exam.title, subject: exam.subject, targetLevel: exam.targetLevel }
    );
    const candidate = generated.exercises[generated.exercises.length - 1];
    const newEx: OpenExercise = candidate || {
      id: `ex-custom-${Date.now()}`,
      title: `Nuevo Problema o Cuestión de Desarrollo ${exam.exercises.length + 1}`,
      statement: 'a) Desarrolle el planteamiento teórico...\nb) Calcule y justifique razonadamente el resultado...',
      rubricCriteria: [
        'Rigor conceptual y definición correcta en el apartado a (1.0 pt)',
        'Planteamiento y resolución exacta en el apartado b (1.5 pts)'
      ],
      solutionSteps: 'Paso 1: Planteamiento de las ecuaciones o principios...\nPaso 2: Resolución y conclusión esperada.',
      points: 2.5
    };
    setActiveModel('A');
    onUpdateExam({
      ...exam,
      exercises: [...exam.exercises, newEx]
    });
    setEditingItemId(newEx.id);
    onNotify?.('Nuevo ejercicio generado', 'Añadido al solucionario con su rúbrica.', 'success');
  };

  const handleMoveTest = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= exam.testQuestions.length) return;
    const list = [...exam.testQuestions];
    const [removed] = list.splice(index, 1);
    list.splice(target, 0, removed);
    onUpdateExam({ ...exam, testQuestions: list });
  };

  const handleMoveExercise = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= exam.exercises.length) return;
    const list = [...exam.exercises];
    const [removed] = list.splice(index, 1);
    list.splice(target, 0, removed);
    onUpdateExam({ ...exam, exercises: list });
  };

  const handleDeleteTest = (id: string) => {
    onUpdateExam({
      ...exam,
      testQuestions: exam.testQuestions.filter(q => q.id !== id)
    });
  };

  const handleDeleteExercise = (id: string) => {
    onUpdateExam({
      ...exam,
      exercises: exam.exercises.filter(ex => ex.id !== id)
    });
  };

  const fontClass =
    paperFont === 'serif'
      ? 'font-serif'
      : paperFont === 'mono'
      ? 'font-mono text-[11px]'
      : 'font-sans';

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Duolingo Storybook Hero Section: Text Left + Floating Mascot Right on Pure White */}
      <div className="no-print py-4 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
        <div className="lg:col-span-7 space-y-4">
          <span className="inline-block text-[15px] font-bold uppercase tracking-[0.053em] text-[#1cb0f6]">
            PASO 2 · MATRIZ, MODELOS ANTI-COPIA Y SOLUCIONARIO
          </span>
          <h2 className="duo-section-headline">
            listo para copiar, pegar e imprimir.
          </h2>
          <h3 className="duo-hero-headline text-[24px] sm:text-[32px]">
            {displayedExam.title}
          </h3>
          <p className="duo-body-copy max-w-[480px]">
            Elige el peso de cada pregunta sobre 10 puntos, genera al instante los <strong>Modelos A y B Anti-Copia</strong> con sus solucionarios independientes, y cópialos con un clic en Word o Google Docs.
          </p>

          {/* Live Weight Sticker Pill Box */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="duo-nav-pill py-2 px-4">
              <span>TEST ({exam.testQuestions.length}):</span>
              <span className="text-[#58cc02]">{totalTestPoints.toFixed(2)} PTS</span>
            </div>
            <div className="duo-nav-pill py-2 px-4">
              <span>EJERCICIOS ({exam.exercises.length}):</span>
              <span className="text-[#1cb0f6]">{totalExercisePoints.toFixed(2)} PTS</span>
            </div>
            <div className="duo-nav-pill duo-nav-pill-active py-2 px-4">
              <span>TOTAL: {totalPoints.toFixed(2)} / 10 PTS</span>
              {totalPoints !== 10 && (
                <button
                  onClick={handleNormalizeTo10}
                  className="ml-2 px-2.5 py-0.5 rounded-[12px] bg-[#58cc02] text-[#ffffff] text-[13px] font-bold"
                >
                  AJUSTAR A 10
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <DuoMascot variant="exam" />
        </div>
      </div>

      {/* ANTI-CHEATING MODEL A & MODEL B GENERATOR & DUAL ANSWER KEY MATRIX */}
      {exam.testQuestions.length > 0 && (
        <div className="no-print duo-card border-[#58cc02] bg-[#ffffff] p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-2 border-[#afafaf]/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[#000437] text-[12px] font-bold uppercase tracking-[0.053em]">
                  SISTEMA ANTI-COPIA EN AULA · 0 CRÉDITOS IA
                </span>
                <h4 className="text-[19px] font-bold text-[#4b4b4b]">
                  Generador de Modelos A y B con Doble Solucionario
                </h4>
              </div>
              <p className="text-[15px] font-medium text-[#777777] mt-1">
                Baraja automáticamente el orden de las preguntas y las opciones (A, B, C, D) para filas pares e impares, recalculando la clave de respuestas al instante.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  SoundService.playClick();
                  setActiveModel('A');
                }}
                className={`duo-nav-pill py-2 px-4 ${
                  activeModel === 'A' ? 'duo-nav-pill-active' : ''
                }`}
              >
                <span>VIENDO: MODELO A (ORIGINAL)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  SoundService.playClick();
                  setActiveModel('B');
                }}
                className={`duo-nav-pill py-2 px-4 ${
                  activeModel === 'B' ? 'duo-nav-pill-active' : ''
                }`}
              >
                <span>VIENDO: MODELO B (BARAJADO)</span>
              </button>
              <button
                type="button"
                onClick={handleReshuffleModelB}
                className="duo-btn-outlined py-2 px-3.5"
                title="Generar una nueva permutación aleatoria para el Modelo B"
              >
                <Shuffle className="w-4 h-4" />
                <span>RE-BARAJAR B (#{modelBSeed})</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Quick Answer Key Comparison (Modelo A vs Modelo B) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Modelo A Card */}
            <div
              className={`rounded-[12px] border-2 p-4 transition ${
                activeModel === 'A'
                  ? 'border-[#58cc02] bg-[#d7ffb8]/25'
                  : 'border-[#afafaf] bg-[#ffffff]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-[15px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
                  CLAVE RÁPIDA · MODELO A (FILA IMPAR)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy('student', 'A')}
                    className="px-2.5 py-1 rounded-[12px] border-2 border-[#afafaf] hover:border-[#1cb0f6] bg-[#ffffff] text-[#1cb0f6] text-[12px] font-bold uppercase tracking-[0.053em]"
                  >
                    {copiedType === 'student-A' ? '✓ EXAMEN A COPIADO' : 'COPIAR EXAMEN A'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy('solucionario', 'A')}
                    className="px-2.5 py-1 rounded-[12px] bg-[#58cc02] text-[#ffffff] text-[12px] font-bold uppercase tracking-[0.053em]"
                  >
                    {copiedType === 'solucionario-A' ? '✓ SOLUCIONARIO A' : 'SOLUCIONARIO A'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {modelAExam.testQuestions.map((q, idx) => (
                  <span
                    key={q.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[12px] bg-[#ffffff] border-2 border-[#000437] text-[13px] font-bold text-[#000437]"
                  >
                    <span className="text-[#777777]">{idx + 1}:</span>
                    <span className="text-[#58cc02] font-black">{q.correctAnswer}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Modelo B Card */}
            <div
              className={`rounded-[12px] border-2 p-4 transition ${
                activeModel === 'B'
                  ? 'border-[#58cc02] bg-[#d7ffb8]/25'
                  : 'border-[#afafaf] bg-[#ffffff]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-[15px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
                  CLAVE RÁPIDA · MODELO B (FILA PAR #{modelBSeed})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy('student', 'B')}
                    className="px-2.5 py-1 rounded-[12px] border-2 border-[#afafaf] hover:border-[#1cb0f6] bg-[#ffffff] text-[#1cb0f6] text-[12px] font-bold uppercase tracking-[0.053em]"
                  >
                    {copiedType === 'student-B' ? '✓ EXAMEN B COPIADO' : 'COPIAR EXAMEN B'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy('solucionario', 'B')}
                    className="px-2.5 py-1 rounded-[12px] bg-[#58cc02] text-[#ffffff] text-[12px] font-bold uppercase tracking-[0.053em]"
                  >
                    {copiedType === 'solucionario-B' ? '✓ SOLUCIONARIO B' : 'SOLUCIONARIO B'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {modelBExam.testQuestions.map((q, idx) => (
                  <span
                    key={q.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[12px] bg-[#ffffff] border-2 border-[#000437] text-[13px] font-bold text-[#000437]"
                  >
                    <span className="text-[#777777]">{idx + 1}:</span>
                    <span className="text-[#1cb0f6] font-black">{q.correctAnswer}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Dock: View Switcher + 1-Click Copy/Export Tools */}
      <div className="no-print duo-card p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Left Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              SoundService.playClick();
              setViewMode('solucionario');
            }}
            className={`duo-nav-pill py-2.5 px-4 ${
              viewMode === 'solucionario' ? 'duo-nav-pill-active' : ''
            }`}
          >
            <Award className="h-4 w-4 text-[#58cc02]" />
            <span>SOLUCIONARIO Y PESOS (MODELO {activeModel})</span>
          </button>

          <button
            onClick={() => {
              SoundService.playClick();
              setViewMode('student');
            }}
            className={`duo-nav-pill py-2.5 px-4 ${
              viewMode === 'student' ? 'duo-nav-pill-active' : ''
            }`}
          >
            <FileText className="h-4 w-4 text-[#1cb0f6]" />
            <span>HOJA DE EXAMEN A4 (MODELO {activeModel})</span>
          </button>
        </div>

        {/* Right Copy & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onGoToGenerator && (
            <button
              onClick={onGoToGenerator}
              className="duo-btn-outlined py-2.5 px-3.5"
            >
              <Sparkles className="h-4 w-4" />
              <span>GENERAR DESDE FUENTES</span>
            </button>
          )}

          {onOpenOnlinePortal && (
            <button
              type="button"
              onClick={() => {
                SoundService.playClick();
                onOpenOnlinePortal();
              }}
              className="duo-btn-outlined border-[#58cc02] text-[#000437] bg-[#d7ffb8] py-2.5 px-3.5"
              title="Compartir enlace web seguro con los alumnos (anti-copia activo)"
            >
              <Share2 className="h-4 w-4 text-[#58cc02]" />
              <span>ENLACE ONLINE ALUMNO</span>
            </button>
          )}

          <button
            onClick={() => handleCopy('student', activeModel)}
            className="duo-btn-outlined py-2.5 px-3.5"
          >
            {copiedType === `student-${activeModel}` ? (
              <Check className="h-4 w-4 text-[#58cc02]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>
              {copiedType === `student-${activeModel}`
                ? '¡COPIADO!'
                : `COPIAR EXAMEN ${activeModel}`}
            </span>
          </button>

          <button
            onClick={() => handleCopy('solucionario', activeModel)}
            className="duo-btn-outlined py-2.5 px-3.5"
          >
            {copiedType === `solucionario-${activeModel}` ? (
              <Check className="h-4 w-4 text-[#58cc02]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>
              {copiedType === `solucionario-${activeModel}`
                ? '¡COPIADO!'
                : `COPIAR SOLUCIONARIO ${activeModel}`}
            </span>
          </button>

          <button
            onClick={() => handleDownloadWord(viewMode)}
            className="duo-nav-pill py-2 px-3 text-[13px]"
            title="Descargar archivo .doc para Microsoft Word"
          >
            <Download className="h-4 w-4" />
            <span>WORD ({activeModel})</span>
          </button>

          <button
            onClick={() => handleCopy('aiken', activeModel)}
            className="duo-nav-pill py-2 px-3 text-[13px]"
            title="Copiar preguntas test en formato Aiken para Moodle"
          >
            <span>{copiedType === `aiken-${activeModel}` ? '¡AIKEN!' : 'MOODLE'}</span>
          </button>

          <button
            onClick={() => window.print()}
            title="Imprimir en formato A4"
            className="duo-nav-pill py-2 px-3"
          >
            <Printer className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              SoundService.playClick();
              onProceedToGrading();
            }}
            className="duo-btn-primary py-2.5 px-5"
          >
            <span>CORREGIR EXÁMENES</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* MAIN WORKSPACE CONTENT */}
      {viewMode === 'student' ? (
        <div className="space-y-4">
          {/* Paper Typography & Layout Bar */}
          <div className="no-print flex items-center justify-between max-w-4xl mx-auto px-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              PREVISUALIZACIÓN DE PLIEGO IMPRESO DIN A4 · MODELO {activeModel}
            </span>
            <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-lg border border-[#0C0D0E]/12 text-xs">
              <Type className="h-3.5 w-3.5 text-zinc-400 mr-1" />
              <button
                onClick={() => setPaperFont('serif')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  paperFont === 'serif' ? 'bg-[#0C0D0E] text-white' : 'text-zinc-600'
                }`}
              >
                Editorial Serif
              </button>
              <button
                onClick={() => setPaperFont('sans')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  paperFont === 'sans' ? 'bg-[#0C0D0E] text-white' : 'text-zinc-600'
                }`}
              >
                Suiza Sans
              </button>
              <button
                onClick={() => setPaperFont('mono')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                  paperFont === 'mono' ? 'bg-[#0C0D0E] text-white' : 'text-zinc-600'
                }`}
              >
                Técnica Mono
              </button>
            </div>
          </div>

          {/* A4 Tactile Paper Sheet */}
          <div className={`print-only-sheet bg-white border border-[#0C0D0E]/20 shadow-2xl p-8 sm:p-14 max-w-4xl mx-auto space-y-8 text-[#0C0D0E] ${fontClass}`}>
            
            {/* Official Boxed Academic Header */}
            <div className="border-2 border-[#0C0D0E] grid grid-cols-12">
              <div className="col-span-9 p-4 border-b border-r border-[#0C0D0E]">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">
                    {displayedExam.institution || 'CENTRO EDUCATIVO • DEPARTAMENTO DIDÁCTICO'}
                  </p>
                  <span className="px-2 py-0.5 border border-[#0C0D0E] font-mono text-[10px] font-bold uppercase">
                    MODELO {activeModel}
                  </span>
                </div>
                <h1 className="font-serif italic text-2xl sm:text-3xl font-bold text-[#0C0D0E] mt-1">
                  {displayedExam.title}
                </h1>
                <p className="font-sans text-xs text-zinc-700 mt-1">
                  <strong>Asignatura:</strong> {displayedExam.subject} &nbsp;·&nbsp; <strong>Curso:</strong> {displayedExam.targetLevel} &nbsp;·&nbsp; <strong>Tiempo:</strong> {displayedExam.durationMinutes || 60} min
                </p>
              </div>
              <div className="col-span-3 p-4 border-b border-[#0C0D0E] flex flex-col items-center justify-center text-center bg-[#F6F5F0]/50">
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                  CALIFICACIÓN
                </span>
                <span className="font-mono text-xl font-bold text-[#0C0D0E] mt-2">
                  ____ / 10
                </span>
              </div>
              <div className="col-span-8 p-3 border-r border-[#0C0D0E] font-sans text-xs">
                <strong>Apellidos y Nombre:</strong> ________________________________________________
              </div>
              <div className="col-span-4 p-3 font-sans text-xs">
                <strong>DNI / Grupo:</strong> _____________________
              </div>
            </div>

            {displayedExam.instructions && (
              <div className="border-l-2 border-[#0C0D0E] pl-4 py-1 text-xs text-zinc-700 italic font-sans">
                <strong>Directrices de la prueba:</strong> {displayedExam.instructions}
                {displayedExam.testPenalty ? ` (Penalización por fallo en test: -${displayedExam.testPenalty} pts).` : ''}
              </div>
            )}

            {/* Section I: Test */}
            {displayedExam.testQuestions.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-baseline justify-between border-b-2 border-[#0C0D0E] pb-1.5">
                  <h2 className="font-sans text-xs font-extrabold uppercase tracking-[0.12em]">
                    PARTE I — CUESTIONARIO DE OPCIÓN MÚLTIPLE (MODELO {activeModel})
                  </h2>
                  <span className="font-mono text-xs font-bold">
                    [{totalTestPoints.toFixed(2)} PUNTOS]
                  </span>
                </div>

                <div className="space-y-5">
                  {displayedExam.testQuestions.map((q, idx) => (
                    <div key={q.id} className="space-y-2 break-inside-avoid">
                      <div className="flex justify-between items-baseline gap-4">
                        <p className="text-sm font-bold leading-snug">
                          <span className="font-mono mr-1.5">{idx + 1}.</span>
                          {q.question}
                        </p>
                        <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                          [{q.points.toFixed(2)} pt]
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5 text-xs">
                        {(['A', 'B', 'C', 'D'] as const).map(opt => (
                          <div key={opt} className="flex items-start space-x-2 py-0.5">
                            <span className="w-4 h-4 border border-[#0C0D0E] rounded-xs inline-flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                              {opt}
                            </span>
                            <span className="text-zinc-800">{q.options[opt]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section II: Open Exercises */}
            {exam.exercises.length > 0 && (
              <div className="space-y-6 pt-2">
                <div className="flex items-baseline justify-between border-b-2 border-[#0C0D0E] pb-1.5">
                  <h2 className="font-sans text-xs font-extrabold uppercase tracking-[0.12em]">
                    PARTE II — EJERCICIOS Y PROBLEMAS DE DESARROLLO
                  </h2>
                  <span className="font-mono text-xs font-bold">
                    [{totalExercisePoints.toFixed(2)} PUNTOS]
                  </span>
                </div>

                <div className="space-y-8">
                  {exam.exercises.map((ex, idx) => (
                    <div key={ex.id} className="space-y-3 break-inside-avoid">
                      <div className="flex justify-between items-baseline border-b border-zinc-200 pb-1">
                        <h3 className="text-sm font-bold">
                          <span className="font-mono uppercase mr-1.5">EJERCICIO {idx + 1}:</span>
                          {ex.title}
                        </h3>
                        <span className="font-mono text-xs font-bold text-[#0C0D0E] shrink-0">
                          [{ex.points.toFixed(2)} puntos]
                        </span>
                      </div>
                      <p className="text-xs text-zinc-800 whitespace-pre-line leading-relaxed">
                        {ex.statement}
                      </p>
                      <div className="h-36 border border-dashed border-zinc-300 rounded-xs p-2.5 flex items-end justify-end">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400">
                          Espacio de resolución manuscrita · Ejercicio {idx + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* INTERACTIVE SOLUCIONARIO & WEIGHTS MATRIX */
        <div className="space-y-8">
          
          {/* BLOCK 1: MULTIPLE CHOICE MATRIX */}
          <div className="duo-card p-0 overflow-hidden">
            <div className="px-6 py-5 bg-[#ffffff] border-b-2 border-[#afafaf] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 text-[13px] font-bold uppercase tracking-[0.053em] bg-[#d7ffb8] text-[#4b4b4b] border-2 border-[#58cc02] rounded-[12px]">
                    SECCIÓN I
                  </span>
                  <h3 className="text-[24px] font-bold text-[#4b4b4b]">
                    Preguntas Tipo Test ({exam.testQuestions.length})
                  </h3>
                </div>
                <p className="duo-body-copy mt-1">
                  Haz clic en cualquier letra (A, B, C, D) para cambiar la respuesta correcta o ajusta los puntos de cada pregunta.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddTestQuestion}
                className="duo-btn-primary py-2.5 px-4 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>AÑADIR PREGUNTA TEST</span>
              </button>
            </div>

            <div className="divide-y-2 divide-[#afafaf]">
              {exam.testQuestions.map((q, idx) => {
                const isEditing = editingItemId === q.id;
                return (
                  <div key={q.id} className="p-6 bg-[#ffffff] space-y-4">
                    
                    {/* Question Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="font-feather font-extrabold text-[28px] text-[#58cc02] leading-none mt-0.5">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1">
                          {isEditing ? (
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={e => handleUpdateTestQuestion(q.id, { question: e.target.value })}
                              className="w-full text-[17px] font-bold p-3 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] text-[#4b4b4b] focus:outline-none focus:border-[#58cc02]"
                            />
                          ) : (
                            <p className="text-[19px] font-bold text-[#4b4b4b] leading-[1.3]">
                              {q.question}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Weight Stepper & Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <div className="flex items-center bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] px-3 py-1.5">
                          <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mr-2">
                            PESO:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTestQuestion(q.id, {
                                points: Number(Math.max(0.1, q.points - 0.25).toFixed(2))
                              })
                            }
                            className="px-2 text-[17px] font-bold text-[#4b4b4b]"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="10"
                            value={q.points}
                            onChange={e =>
                              handleUpdateTestQuestion(q.id, { points: Math.max(0, Number(e.target.value)) })
                            }
                            className="w-16 text-center text-[15px] font-bold bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] py-0.5 mx-1 tabular-nums text-[#4b4b4b]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTestQuestion(q.id, {
                                points: Number((q.points + 0.25).toFixed(2))
                              })
                            }
                            className="px-2 text-[17px] font-bold text-[#4b4b4b]"
                          >
                            +
                          </button>
                          <span className="text-[13px] font-bold text-[#777777] ml-1">PTS</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditingItemId(isEditing ? null : q.id)}
                          className={`duo-nav-pill p-2 ${isEditing ? 'duo-nav-pill-active' : ''}`}
                          title="Editar texto y opciones"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleMoveTest(idx, -1)}
                            disabled={idx === 0}
                            className="text-[#777777] hover:text-[#4b4b4b] disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveTest(idx, 1)}
                            disabled={idx === exam.testQuestions.length - 1}
                            className="text-[#777777] hover:text-[#4b4b4b] disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTest(q.id)}
                          className="p-2 text-[#777777] hover:text-[#4b4b4b] transition"
                          title="Eliminar pregunta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* 4 Interactive Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                      {(['A', 'B', 'C', 'D'] as const).map(opt => {
                        const isCorrect = q.correctAnswer === opt;
                        return (
                          <div
                            key={opt}
                            className={`p-3 rounded-[12px] border-2 transition flex items-start gap-3 ${
                              isCorrect
                                ? 'bg-[#d7ffb8] border-[#58cc02] text-[#4b4b4b]'
                                : 'bg-[#ffffff] border-[#afafaf] text-[#777777]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdateTestQuestion(q.id, { correctAnswer: opt })}
                              title="Marcar como respuesta correcta en el solucionario"
                              className={`w-7 h-7 rounded-[12px] text-[13px] font-bold flex items-center justify-center shrink-0 border-2 transition ${
                                isCorrect
                                  ? 'bg-[#58cc02] border-[#58cc02] text-[#ffffff]'
                                  : 'bg-[#ffffff] border-[#afafaf] text-[#777777] hover:border-[#4b4b4b]'
                              }`}
                            >
                              {opt}
                            </button>

                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={q.options[opt]}
                                  onChange={e =>
                                    handleUpdateTestQuestion(q.id, {
                                      options: { ...q.options, [opt]: e.target.value }
                                    })
                                  }
                                  className="w-full text-[15px] px-2.5 py-1 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] text-[#4b4b4b]"
                                />
                              ) : (
                                <span className={`text-[15px] block ${isCorrect ? 'font-bold text-[#4b4b4b]' : ''}`}>
                                  {q.options[opt]}
                                </span>
                              )}
                            </div>

                            {isCorrect && (
                              <span className="text-[13px] font-bold uppercase tracking-[0.053em] px-2 py-0.5 rounded-[12px] bg-[#58cc02] text-[#ffffff] shrink-0">
                                CORRECTA
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pedagogical Rationale */}
                    <div className="pl-8">
                      {isEditing ? (
                        <div className="space-y-1">
                          <label className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                            Justificación didáctica del solucionario:
                          </label>
                          <input
                            type="text"
                            value={q.explanation}
                            onChange={e => handleUpdateTestQuestion(q.id, { explanation: e.target.value })}
                            className="w-full text-[15px] px-3 py-2 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] text-[#4b4b4b]"
                          />
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf] text-[15px] text-[#777777] flex items-baseline gap-2">
                          <span className="font-bold uppercase text-[13px] tracking-[0.053em] text-[#4b4b4b] shrink-0">
                            EXPLICACIÓN:
                          </span>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* BLOCK 2: OPEN EXERCISES & RUBRICS MATRIX */}
          <div className="duo-card p-0 overflow-hidden">
            <div className="px-6 py-5 bg-[#ffffff] border-b-2 border-[#afafaf] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 text-[13px] font-bold uppercase tracking-[0.053em] bg-[#ffffff] text-[#1cb0f6] border-2 border-[#1cb0f6] rounded-[12px]">
                    SECCIÓN II
                  </span>
                  <h3 className="text-[24px] font-bold text-[#4b4b4b]">
                    Propuestas de Ejercicios y Solucionario ({exam.exercises.length})
                  </h3>
                </div>
                <p className="duo-body-copy mt-1">
                  El corrector OCR comparará las respuestas de los alumnos con estos criterios y pasos de resolución.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddExercise}
                className="duo-btn-primary py-2.5 px-4 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>AÑADIR EJERCICIO</span>
              </button>
            </div>

            <div className="divide-y-2 divide-[#afafaf]">
              {exam.exercises.map((ex, idx) => {
                const isEditing = editingItemId === ex.id;
                return (
                  <div key={ex.id} className="p-6 bg-[#ffffff] space-y-4">
                    
                    {/* Exercise Header & Weight Control */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#afafaf]/40 pb-3">
                      <div className="flex items-baseline gap-3 flex-1">
                        <span className="font-feather font-extrabold text-[28px] text-[#58cc02]">
                          Ej. {idx + 1}
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={ex.title}
                            onChange={e => handleUpdateExercise(ex.id, { title: e.target.value })}
                            className="flex-1 text-[19px] font-bold px-3 py-1.5 border-2 border-[#afafaf] rounded-[12px] bg-[#ffffff] text-[#4b4b4b]"
                          />
                        ) : (
                          <h4 className="text-[19px] font-bold text-[#4b4b4b]">{ex.title}</h4>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <div className="flex items-center bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] px-3 py-1.5">
                          <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mr-2">
                            PESO:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateExercise(ex.id, {
                                points: Number(Math.max(0.25, ex.points - 0.5).toFixed(2))
                              })
                            }
                            className="px-2 text-[17px] font-bold text-[#4b4b4b]"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="10"
                            value={ex.points}
                            onChange={e =>
                              handleUpdateExercise(ex.id, { points: Math.max(0, Number(e.target.value)) })
                            }
                            className="w-16 text-center text-[15px] font-bold bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] py-0.5 mx-1 tabular-nums text-[#4b4b4b]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateExercise(ex.id, {
                                points: Number((ex.points + 0.5).toFixed(2))
                              })
                            }
                            className="px-2 text-[17px] font-bold text-[#4b4b4b]"
                          >
                            +
                          </button>
                          <span className="text-[13px] font-bold text-[#777777] ml-1">PTS</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditingItemId(isEditing ? null : ex.id)}
                          className={`duo-nav-pill py-1.5 px-3 text-[13px] ${
                            isEditing ? 'duo-nav-pill-active' : ''
                          }`}
                        >
                          <Edit3 className="h-4 w-4" />
                          <span>{isEditing ? 'LISTO' : 'EDITAR'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteExercise(ex.id)}
                          className="p-2 text-[#777777] hover:text-[#4b4b4b] transition"
                          title="Eliminar ejercicio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Statement & Rubric Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      
                      {/* Left 6 cols: Statement & Rubric Criteria */}
                      <div className="lg:col-span-6 space-y-4">
                        <div>
                          <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] block mb-1.5">
                            ENUNCIADO DEL EJERCICIO
                          </span>
                          {isEditing ? (
                            <textarea
                              rows={5}
                              value={ex.statement}
                              onChange={e => handleUpdateExercise(ex.id, { statement: e.target.value })}
                              className="w-full text-[15px] p-3.5 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] text-[#4b4b4b]"
                            />
                          ) : (
                            <div className="p-4 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf] text-[15px] text-[#4b4b4b] whitespace-pre-line leading-relaxed">
                              {ex.statement}
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] block mb-1.5">
                            CRITERIOS DE RÚBRICA
                          </span>
                          <div className="space-y-2">
                            {ex.rubricCriteria.map((crit, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex items-start gap-2.5 text-[15px] bg-[#ffffff] p-3 rounded-[12px] border-2 border-[#afafaf]"
                              >
                                <CheckCircle2 className="h-5 w-5 text-[#58cc02] shrink-0 mt-0.5" />
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={crit}
                                    onChange={e => {
                                      const next = [...ex.rubricCriteria];
                                      next[cIdx] = e.target.value;
                                      handleUpdateExercise(ex.id, { rubricCriteria: next });
                                    }}
                                    className="flex-1 text-[15px] border-b-2 border-[#afafaf] focus:outline-none text-[#4b4b4b]"
                                  />
                                ) : (
                                  <span className="text-[#4b4b4b]">{crit}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right 6 cols: Model Solution Steps (Solucionario) */}
                      <div className="lg:col-span-6 flex flex-col">
                        <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#58cc02] block mb-1.5">
                          SOLUCIONARIO OFICIAL PASO A PASO (REFERENCIA OCR)
                        </span>
                        {isEditing ? (
                          <textarea
                            rows={9}
                            value={ex.solutionSteps}
                            onChange={e => handleUpdateExercise(ex.id, { solutionSteps: e.target.value })}
                            className="flex-1 w-full text-[15px] p-4 rounded-[12px] border-2 border-[#58cc02] bg-[#d7ffb8]/40 text-[#4b4b4b]"
                          />
                        ) : (
                          <div className="flex-1 p-4 rounded-[12px] bg-[#d7ffb8] text-[#4b4b4b] text-[15px] font-medium whitespace-pre-line leading-relaxed border-2 border-[#58cc02]">
                            {ex.solutionSteps}
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
