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
  Share2,
  BookOpen,
  X
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
  const [evidenceModalItem, setEvidenceModalItem] = useState<{
    id: string;
    title: string;
    docName?: string;
    excerpt?: string;
    isVerified?: boolean;
    isTest: boolean;
  } | null>(null);

  const handleToggleVerifySource = (id: string, isTest: boolean) => {
    SoundService.playSuccess();
    if (isTest) {
      const updated = exam.testQuestions.map(q => {
        if (q.id === id) {
          const nextVal = !q.isSourceVerified;
          return { ...q, isSourceVerified: nextVal };
        }
        return q;
      });
      onUpdateExam({ ...exam, testQuestions: updated });
      if (evidenceModalItem && evidenceModalItem.id === id) {
        setEvidenceModalItem(prev => (prev ? { ...prev, isVerified: !prev.isVerified } : null));
      }
      onNotify?.(
        'Evidencia documental verificada',
        'La pregunta queda marcada como auditada y cotejada con la fuente original.',
        'success'
      );
    } else {
      const updated = exam.exercises.map(ex => {
        if (ex.id === id) {
          const nextVal = !ex.isSourceVerified;
          return { ...ex, isSourceVerified: nextVal };
        }
        return ex;
      });
      onUpdateExam({ ...exam, exercises: updated });
      if (evidenceModalItem && evidenceModalItem.id === id) {
        setEvidenceModalItem(prev => (prev ? { ...prev, isVerified: !prev.isVerified } : null));
      }
      onNotify?.(
        'Evidencia documental verificada',
        'El ejercicio queda marcado como auditado y cotejado con la fuente original.',
        'success'
      );
    }
  };

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
      
      {/* Apple España Hero Section: Whispered typography + Sober Barn Owl */}
      <div className="no-print py-6 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
        <div className="lg:col-span-7 space-y-4">
          <span className="apple-badge-ember">
            Paso 2 · Matriz de evaluación y modelos anti-copia
          </span>
          <h2 className="text-[36px] sm:text-[48px] font-bold tracking-tight text-[#1d1d1f] leading-[1.08]">
            {displayedExam.title}
          </h2>
          <p className="text-[17px] text-[#707070] max-w-xl leading-relaxed">
            Ponderación exacta sobre 10,00 puntos, generación instantánea de <strong>Modelos A y B Anti-Copia</strong> con doble solucionario y exportación a Word, Moodle XML y hoja A4.
          </p>

          {/* Live Weight Capsule Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#d6d6d6] text-[13px] text-[#1d1d1f] bg-[#fafafc]">
              <span className="text-[#707070]">Test ({exam.testQuestions.length}):</span>
              <span className="font-semibold">{totalTestPoints.toFixed(2)} pts</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#d6d6d6] text-[13px] text-[#0071e3] bg-[#fafafc]">
              <span className="text-[#707070]">Ejercicios ({exam.exercises.length}):</span>
              <span className="font-semibold">{totalExercisePoints.toFixed(2)} pts</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1d1d1f] text-[13px] text-[#1d1d1f] bg-[#ffffff] font-medium">
              <span>Total: {totalPoints.toFixed(2)} / 10,00 pts</span>
              {totalPoints !== 10 && (
                <button
                  onClick={handleNormalizeTo10}
                  className="ml-1 px-2.5 py-0.5 rounded-full bg-[#1d1d1f] text-[#ffffff] text-[11px] font-normal hover:bg-[#384353] transition"
                >
                  Ajustar a 10
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <DuoMascot variant="exam" className="max-w-[280px]" />
        </div>
      </div>

      {/* ANTI-CHEATING MODEL A & MODEL B GENERATOR & DUAL ANSWER KEY MATRIX */}
      {exam.testQuestions.length > 0 && (
        <div className="no-print bg-[#ffffff] border border-[#d6d6d6] rounded-[24px] p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#d6d6d6]/60 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="apple-badge-ember">
                  Anti-Copia en aula
                </span>
                <h4 className="text-[17px] font-semibold text-[#1d1d1f]">
                  Generador de Modelos A y B con doble solucionario
                </h4>
              </div>
              <p className="text-[14px] text-[#707070] mt-1">
                Permuta el orden de preguntas y opciones (A, B, C, D) para filas pares e impares, recalculando la clave automáticamente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  SoundService.playClick();
                  setActiveModel('A');
                }}
                className={`px-3.5 py-1.5 rounded-full text-[13px] border transition ${
                  activeModel === 'A'
                    ? 'bg-[#1d1d1f] text-[#ffffff] border-[#1d1d1f]'
                    : 'bg-[#fafafc] text-[#707070] border-[#d6d6d6] hover:text-[#1d1d1f]'
                }`}
              >
                <span>Modelo A (Original)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  SoundService.playClick();
                  setActiveModel('B');
                }}
                className={`px-3.5 py-1.5 rounded-full text-[13px] border transition ${
                  activeModel === 'B'
                    ? 'bg-[#1d1d1f] text-[#ffffff] border-[#1d1d1f]'
                    : 'bg-[#fafafc] text-[#707070] border-[#d6d6d6] hover:text-[#1d1d1f]'
                }`}
              >
                <span>Modelo B (Barajado)</span>
              </button>
              <button
                type="button"
                onClick={handleReshuffleModelB}
                className="apple-pill-ghost text-[13px] py-1.5 px-3.5"
                title="Generar una nueva permutación aleatoria para el Modelo B"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Re-barajar B (#{modelBSeed})</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Quick Answer Key Comparison (Modelo A vs Modelo B) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Modelo A Card */}
            <div
              className={`rounded-[20px] border p-4 transition ${
                activeModel === 'A'
                  ? 'border-[#1d1d1f] bg-[#fafafc]'
                  : 'border-[#d6d6d6] bg-[#ffffff]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-[13px] font-semibold text-[#1d1d1f]">
                  Clave Modelo A (Fila Impar)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopy('student', 'A')}
                    className="apple-pill-ghost text-[12px] py-1 px-3"
                  >
                    {copiedType === 'student-A' ? '✓ Copiado' : 'Copiar A'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy('solucionario', 'A')}
                    className="apple-pill-primary text-[12px] py-1 px-3"
                  >
                    {copiedType === 'solucionario-A' ? '✓ Solución A' : 'Solución A'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {modelAExam.testQuestions.map((q, idx) => (
                  <span
                    key={q.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ffffff] border border-[#d6d6d6] text-[12px] text-[#1d1d1f]"
                  >
                    <span className="text-[#707070]">{idx + 1}:</span>
                    <span className="font-semibold text-[#0071e3]">{q.correctAnswer}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Modelo B Card */}
            <div
              className={`rounded-[20px] border p-4 transition ${
                activeModel === 'B'
                  ? 'border-[#1d1d1f] bg-[#fafafc]'
                  : 'border-[#d6d6d6] bg-[#ffffff]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-[13px] font-semibold text-[#1d1d1f]">
                  Clave Modelo B (Fila Par #{modelBSeed})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopy('student', 'B')}
                    className="apple-pill-ghost text-[12px] py-1 px-3"
                  >
                    {copiedType === 'student-B' ? '✓ Copiado' : 'Copiar B'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy('solucionario', 'B')}
                    className="apple-pill-primary text-[12px] py-1 px-3"
                  >
                    {copiedType === 'solucionario-B' ? '✓ Solución B' : 'Solución B'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {modelBExam.testQuestions.map((q, idx) => (
                  <span
                    key={q.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ffffff] border border-[#d6d6d6] text-[12px] text-[#1d1d1f]"
                  >
                    <span className="text-[#707070]">{idx + 1}:</span>
                    <span className="font-semibold text-[#0071e3]">{q.correctAnswer}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Dock: View Switcher + 1-Click Copy/Export Tools */}
      <div className="no-print bg-[#ffffff] border border-[#d6d6d6] rounded-[24px] p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Left Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#f5f5f7] p-1 rounded-full">
          <button
            onClick={() => {
              SoundService.playClick();
              setViewMode('solucionario');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] transition ${
              viewMode === 'solucionario'
                ? 'bg-[#ffffff] text-[#1d1d1f] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[#707070] hover:text-[#1d1d1f]'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-[#0071e3]" />
            <span>Solucionario ({activeModel})</span>
          </button>

          <button
            onClick={() => {
              SoundService.playClick();
              setViewMode('student');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] transition ${
              viewMode === 'student'
                ? 'bg-[#ffffff] text-[#1d1d1f] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[#707070] hover:text-[#1d1d1f]'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-[#707070]" />
            <span>Hoja de examen A4 ({activeModel})</span>
          </button>
        </div>

        {/* Right Copy & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {onGoToGenerator && (
            <button
              onClick={onGoToGenerator}
              className="apple-pill-ghost text-[13px] py-1.5 px-3.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#707070]" />
              <span>Nuevo examen</span>
            </button>
          )}

          {onOpenOnlinePortal && (
            <button
              type="button"
              onClick={() => {
                SoundService.playClick();
                onOpenOnlinePortal();
              }}
              className="apple-pill-primary text-[13px] py-1.5 px-4"
              title="Compartir enlace web seguro con los alumnos"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Enlace online alumno</span>
            </button>
          )}

          <button
            onClick={() => handleCopy('student', activeModel)}
            className="apple-pill-ghost text-[13px] py-1.5 px-3.5"
          >
            {copiedType === `student-${activeModel}` ? (
              <Check className="h-3.5 w-3.5 text-[#0071e3]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[#707070]" />
            )}
            <span>
              {copiedType === `student-${activeModel}`
                ? '¡Copiado!'
                : `Copiar examen ${activeModel}`}
            </span>
          </button>

          <button
            onClick={() => handleCopy('solucionario', activeModel)}
            className="apple-pill-ghost text-[13px] py-1.5 px-3.5"
          >
            {copiedType === `solucionario-${activeModel}` ? (
              <Check className="h-3.5 w-3.5 text-[#0071e3]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[#707070]" />
            )}
            <span>
              {copiedType === `solucionario-${activeModel}`
                ? '¡Copiado!'
                : `Copiar solución ${activeModel}`}
            </span>
          </button>

          <button
            onClick={() => handleDownloadWord(viewMode)}
            className="apple-pill-wash text-[13px] py-1.5 px-3"
            title="Descargar archivo .doc para Microsoft Word"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Word</span>
          </button>

          <button
            type="button"
            onClick={() => {
              SoundService.playClick();
              ExportService.downloadMoodleXML(displayedExam);
              onNotify?.('Descargando Banco Moodle XML', 'Archivo XML estándar listo para importar en el Banco de Preguntas de Moodle.', 'info');
            }}
            className="apple-pill-wash text-[13px] py-1.5 px-3"
            title="Descargar archivo Moodle XML estándar para el Banco de Preguntas"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Moodle XML</span>
          </button>

          <button
            onClick={() => window.print()}
            title="Imprimir en formato A4"
            className="p-2 rounded-full border border-[#d6d6d6] hover:bg-[#f5f5f7] text-[#1d1d1f] transition"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => {
              SoundService.playClick();
              onProceedToGrading();
            }}
            className="apple-pill-primary text-[13px] py-1.5 px-4"
          >
            <span>Corregir OCR</span>
            <ArrowRight className="h-3.5 w-3.5" />
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
        <div className="space-y-8">
          {/* INTERACTIVE SOLUCIONARIO & WEIGHTS MATRIX */}
          
          {/* BLOCK 1: MULTIPLE CHOICE MATRIX */}
          <div className="bg-[#ffffff] border border-[#d6d6d6] rounded-[28px] overflow-hidden">
            <div className="px-7 py-6 bg-[#ffffff] border-b border-[#d6d6d6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="apple-badge-ember">
                    Sección I
                  </span>
                  <h3 className="text-[20px] font-semibold text-[#1d1d1f]">
                    Preguntas Tipo Test ({exam.testQuestions.length})
                  </h3>
                </div>
                <p className="text-[14px] text-[#707070] mt-1">
                  Haz clic en cualquier letra para cambiar la clave oficial o ajusta los puntos de cada pregunta.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddTestQuestion}
                className="apple-pill-primary text-[13px] py-2 px-4 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Añadir pregunta test</span>
              </button>
            </div>

            <div className="divide-y divide-[#d6d6d6]">
              {exam.testQuestions.length === 0 ? (
                <div className="p-8 text-center bg-[#fafafc] m-4 rounded-[20px] border border-dashed border-[#d6d6d6]">
                  <p className="text-[15px] font-medium text-[#1d1d1f]">No hay preguntas de test en esta convocatoria</p>
                  <p className="text-[13px] text-[#707070] mt-1 mb-4">Puedes añadir preguntas manualmente o generarlas automáticamente a partir de tus apuntes con IA.</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button type="button" onClick={handleAddTestQuestion} className="apple-pill-primary text-[13px] py-1.5 px-4">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Añadir pregunta</span>
                    </button>
                    {onGoToGenerator && (
                      <button type="button" onClick={onGoToGenerator} className="apple-pill-ghost text-[13px] py-1.5 px-4">
                        <span>Ir a Cargar Documentos</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                exam.testQuestions.map((q, idx) => {
                const isEditing = editingItemId === q.id;
                return (
                  <div key={q.id} className="p-6 bg-[#ffffff] space-y-4">
                    
                    {/* Question Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-[20px] font-bold text-[#1d1d1f] leading-none mt-1">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1">
                          {isEditing ? (
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={e => handleUpdateTestQuestion(q.id, { question: e.target.value })}
                              className="w-full text-[16px] font-medium p-3 rounded-[14px] border border-[#d6d6d6] bg-[#ffffff] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                            />
                          ) : (
                            <p className="text-[16px] font-medium text-[#1d1d1f] leading-snug">
                              {q.question}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Weight Stepper & Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <div className="flex items-center bg-[#fafafc] border border-[#d6d6d6] rounded-full px-3 py-1">
                          <span className="text-[12px] text-[#707070] mr-1.5">
                            Peso:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTestQuestion(q.id, {
                                points: Number(Math.max(0.1, q.points - 0.25).toFixed(2))
                              })
                            }
                            className="px-1.5 text-[14px] text-[#1d1d1f]"
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
                            className="w-14 text-center text-[13px] font-medium bg-[#ffffff] border border-[#d6d6d6] rounded-md py-0.5 mx-1 tabular-nums text-[#1d1d1f]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTestQuestion(q.id, {
                                points: Number((q.points + 0.25).toFixed(2))
                              })
                            }
                            className="px-1.5 text-[14px] text-[#1d1d1f]"
                          >
                            +
                          </button>
                          <span className="text-[11px] text-[#707070] ml-1">pts</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditingItemId(isEditing ? null : q.id)}
                          className={`p-2 rounded-full border transition ${
                            isEditing ? 'bg-[#1d1d1f] text-[#ffffff] border-[#1d1d1f]' : 'border-[#d6d6d6] text-[#707070] hover:text-[#1d1d1f]'
                          }`}
                          title="Editar texto y opciones"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleMoveTest(idx, -1)}
                            disabled={idx === 0}
                            className="text-[#707070] hover:text-[#1d1d1f] disabled:opacity-30 p-0.5"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveTest(idx, 1)}
                            disabled={idx === exam.testQuestions.length - 1}
                            className="text-[#707070] hover:text-[#1d1d1f] disabled:opacity-30 p-0.5"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTest(q.id)}
                          className="p-2 text-[#707070] hover:text-[#1d1d1f] transition"
                          title="Eliminar pregunta"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 4 Interactive Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-7">
                      {(['A', 'B', 'C', 'D'] as const).map(opt => {
                        const isCorrect = q.correctAnswer === opt;
                        return (
                          <div
                            key={opt}
                            className={`p-3 rounded-[16px] border transition flex items-start gap-3 ${
                              isCorrect
                                ? 'border-[#0071e3] bg-[#0071e3]/5 text-[#1d1d1f]'
                                : 'border-[#d6d6d6] bg-[#ffffff] text-[#474747]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdateTestQuestion(q.id, { correctAnswer: opt })}
                              title="Marcar como respuesta correcta"
                              className={`w-6 h-6 rounded-full text-[12px] font-semibold flex items-center justify-center shrink-0 border transition ${
                                isCorrect
                                  ? 'bg-[#0071e3] border-[#0071e3] text-[#ffffff]'
                                  : 'bg-[#ffffff] border-[#d6d6d6] text-[#707070] hover:border-[#1d1d1f]'
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
                                  className="w-full text-[14px] px-2.5 py-1 bg-[#ffffff] border border-[#d6d6d6] rounded-[10px] text-[#1d1d1f]"
                                />
                              ) : (
                                <span className={`text-[14px] block ${isCorrect ? 'font-medium text-[#1d1d1f]' : ''}`}>
                                  {q.options[opt]}
                                </span>
                              )}
                            </div>

                            {isCorrect && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0071e3] text-[#ffffff] shrink-0">
                                Correcta
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pedagogical Rationale */}
                    <div className="pl-7">
                      {isEditing ? (
                        <div className="space-y-1">
                          <label className="text-[12px] text-[#707070]">
                            Justificación didáctica:
                          </label>
                          <input
                            type="text"
                            value={q.explanation}
                            onChange={e => handleUpdateTestQuestion(q.id, { explanation: e.target.value })}
                            className="w-full text-[14px] px-3 py-2 bg-[#ffffff] border border-[#d6d6d6] rounded-[12px] text-[#1d1d1f]"
                          />
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 rounded-[16px] bg-[#fafafc] border border-[#d6d6d6] text-[13px] text-[#707070] flex items-baseline gap-2">
                          <span className="font-semibold text-[12px] text-[#1d1d1f] shrink-0">
                            Explicación:
                          </span>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>

                    {/* Source Evidence & Traceability Badge */}
                    <div className="pl-7 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          SoundService.playClick();
                          setEvidenceModalItem({
                            id: q.id,
                            title: `Pregunta ${idx + 1}: ${q.question.slice(0, 60)}...`,
                            docName: q.sourceDocumentName || (exam.documents[0]?.name || 'Documento base'),
                            excerpt: q.sourceExcerpt || 'Pregunta formulada y sintetizada a partir del contenido del documento curricular aportado.',
                            isVerified: q.isSourceVerified,
                            isTest: true
                          });
                        }}
                        className={`text-[12px] px-3 py-1 rounded-full border transition flex items-center gap-1.5 ${
                          q.isSourceVerified
                            ? 'bg-[#fafafc] border-[#1d1d1f] text-[#1d1d1f] font-medium'
                            : 'bg-[#ffffff] border-[#d6d6d6] text-[#707070] hover:border-[#1d1d1f]'
                        }`}
                        title="Consultar fragmento exacto del documento fuente"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#707070]" />
                        <span>Fuente: {q.sourceDocumentName ? q.sourceDocumentName.slice(0, 36) : 'Doc. Curricular'}</span>
                        {q.isSourceVerified ? (
                          <span className="text-[#0071e3] font-medium">✔ Auditada</span>
                        ) : (
                          <span className="text-[#707070]">· Cotejar</span>
                        )}
                      </button>
                    </div>

                  </div>
                );
              }))}
            </div>
          </div>

          {/* BLOCK 2: OPEN EXERCISES & RUBRICS MATRIX */}
          <div className="bg-[#ffffff] border border-[#d6d6d6] rounded-[28px] overflow-hidden">
            <div className="px-7 py-6 bg-[#ffffff] border-b border-[#d6d6d6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="apple-badge-ember">
                    Sección II
                  </span>
                  <h3 className="text-[20px] font-semibold text-[#1d1d1f]">
                    Propuestas de Ejercicios y Solucionario ({exam.exercises.length})
                  </h3>
                </div>
                <p className="text-[14px] text-[#707070] mt-1">
                  El corrector OCR comparará las respuestas manuscritas con estos criterios y pasos de resolución.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddExercise}
                className="apple-pill-primary text-[13px] py-2 px-4 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Añadir ejercicio</span>
              </button>
            </div>

            <div className="divide-y divide-[#d6d6d6]">
              {exam.exercises.length === 0 ? (
                <div className="p-8 text-center bg-[#fafafc] m-4 rounded-[20px] border border-dashed border-[#d6d6d6]">
                  <p className="text-[15px] font-medium text-[#1d1d1f]">No hay ejercicios de desarrollo en esta convocatoria</p>
                  <p className="text-[13px] text-[#707070] mt-1 mb-4">Añade problemas con su rúbrica y pasos de resolución o genéralos con IA a partir de tus apuntes.</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button type="button" onClick={handleAddExercise} className="apple-pill-primary text-[13px] py-1.5 px-4">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Añadir ejercicio</span>
                    </button>
                    {onGoToGenerator && (
                      <button type="button" onClick={onGoToGenerator} className="apple-pill-ghost text-[13px] py-1.5 px-4">
                        <span>Ir a Cargar Documentos</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                exam.exercises.map((ex, idx) => {
                const isEditing = editingItemId === ex.id;
                return (
                  <div key={ex.id} className="p-6 bg-[#ffffff] space-y-4">
                    
                    {/* Exercise Header & Weight Control */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d6d6d6]/60 pb-3">
                      <div className="flex items-baseline gap-3 flex-1">
                        <span className="text-[20px] font-bold text-[#1d1d1f]">
                          Ej. {idx + 1}
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={ex.title}
                            onChange={e => handleUpdateExercise(ex.id, { title: e.target.value })}
                            className="flex-1 text-[16px] font-medium px-3 py-1.5 border border-[#d6d6d6] rounded-[12px] bg-[#ffffff] text-[#1d1d1f]"
                          />
                        ) : (
                          <h4 className="text-[17px] font-semibold text-[#1d1d1f]">{ex.title}</h4>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <div className="flex items-center bg-[#fafafc] border border-[#d6d6d6] rounded-full px-3 py-1">
                          <span className="text-[12px] text-[#707070] mr-1.5">
                            Peso:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateExercise(ex.id, {
                                points: Number(Math.max(0.25, ex.points - 0.5).toFixed(2))
                              })
                            }
                            className="px-1.5 text-[14px] text-[#1d1d1f]"
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
                            className="w-14 text-center text-[13px] font-medium bg-[#ffffff] border border-[#d6d6d6] rounded-md py-0.5 mx-1 tabular-nums text-[#1d1d1f]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateExercise(ex.id, {
                                points: Number((ex.points + 0.5).toFixed(2))
                              })
                            }
                            className="px-1.5 text-[14px] text-[#1d1d1f]"
                          >
                            +
                          </button>
                          <span className="text-[11px] text-[#707070] ml-1">pts</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditingItemId(isEditing ? null : ex.id)}
                          className={`px-3 py-1 text-[12px] rounded-full border transition ${
                            isEditing ? 'bg-[#1d1d1f] text-[#ffffff] border-[#1d1d1f]' : 'border-[#d6d6d6] text-[#707070] hover:text-[#1d1d1f]'
                          }`}
                        >
                          <span>{isEditing ? 'Listo' : 'Editar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteExercise(ex.id)}
                          className="p-2 text-[#707070] hover:text-[#1d1d1f] transition"
                          title="Eliminar ejercicio"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Statement & Rubric Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      
                      {/* Left 6 cols: Statement & Rubric Criteria */}
                      <div className="lg:col-span-6 space-y-4">
                        <div>
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#707070] block mb-1.5">
                            Enunciado del ejercicio
                          </span>
                          {isEditing ? (
                            <textarea
                              rows={5}
                              value={ex.statement}
                              onChange={e => handleUpdateExercise(ex.id, { statement: e.target.value })}
                              className="w-full text-[14px] p-3.5 rounded-[16px] border border-[#d6d6d6] bg-[#ffffff] text-[#1d1d1f]"
                            />
                          ) : (
                            <div className="p-4 rounded-[18px] bg-[#fafafc] border border-[#d6d6d6] text-[14px] text-[#1d1d1f] whitespace-pre-line leading-relaxed">
                              {ex.statement}
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#707070] block mb-1.5">
                            Criterios de rúbrica
                          </span>
                          <div className="space-y-2">
                            {ex.rubricCriteria.map((crit, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex items-start gap-2.5 text-[14px] bg-[#ffffff] p-3 rounded-[14px] border border-[#d6d6d6]"
                              >
                                <CheckCircle2 className="h-4 w-4 text-[#0071e3] shrink-0 mt-0.5" />
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={crit}
                                    onChange={e => {
                                      const next = [...ex.rubricCriteria];
                                      next[cIdx] = e.target.value;
                                      handleUpdateExercise(ex.id, { rubricCriteria: next });
                                    }}
                                    className="flex-1 text-[14px] border-b border-[#d6d6d6] focus:outline-none text-[#1d1d1f]"
                                  />
                                ) : (
                                  <span className="text-[#1d1d1f]">{crit}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right 6 cols: Model Solution Steps (Solucionario) */}
                      <div className="lg:col-span-6 flex flex-col">
                        <span className="text-[12px] font-semibold uppercase tracking-wider text-[#0071e3] block mb-1.5">
                          Solucionario oficial de referencia OCR
                        </span>
                        {isEditing ? (
                          <textarea
                            rows={9}
                            value={ex.solutionSteps}
                            onChange={e => handleUpdateExercise(ex.id, { solutionSteps: e.target.value })}
                            className="flex-1 w-full text-[14px] p-4 rounded-[18px] border border-[#0071e3] bg-[#ffffff] text-[#1d1d1f]"
                          />
                        ) : (
                          <div className="flex-1 p-4 rounded-[18px] bg-[#fafafc] text-[#1d1d1f] text-[14px] whitespace-pre-line leading-relaxed border border-[#d6d6d6]">
                            {ex.solutionSteps}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Source Evidence & Traceability Badge */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#d6d6d6]/40">
                      <button
                        type="button"
                        onClick={() => {
                          SoundService.playClick();
                          setEvidenceModalItem({
                            id: ex.id,
                            title: `Ejercicio ${idx + 1}: ${ex.title}`,
                            docName: ex.sourceDocumentName || (exam.documents[0]?.name || 'Documento base'),
                            excerpt: ex.sourceExcerpt || 'Problema estructurado a partir de los objetivos de evaluación del documento base.',
                            isVerified: ex.isSourceVerified,
                            isTest: false
                          });
                        }}
                        className={`text-[12px] px-3 py-1 rounded-full border transition flex items-center gap-1.5 ${
                          ex.isSourceVerified
                            ? 'bg-[#fafafc] border-[#1d1d1f] text-[#1d1d1f] font-medium'
                            : 'bg-[#ffffff] border-[#d6d6d6] text-[#707070] hover:border-[#1d1d1f]'
                        }`}
                        title="Consultar fragmento exacto del documento fuente"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#707070]" />
                        <span>Fuente: {ex.sourceDocumentName ? ex.sourceDocumentName.slice(0, 36) : 'Doc. Curricular'}</span>
                        {ex.isSourceVerified ? (
                          <span className="text-[#0071e3] font-medium">✔ Auditada</span>
                        ) : (
                          <span className="text-[#707070]">· Cotejar</span>
                        )}
                      </button>
                    </div>

                  </div>
                );
              }))}
            </div>
          </div>

        </div>
      )}

      {/* MODAL MESA DE EVIDENCIAS Y TRAZABILIDAD */}
      {evidenceModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1d1f]/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#ffffff] text-[#1d1d1f] rounded-[24px] border border-[#d6d6d6] shadow-[0_16px_48px_rgba(0,0,0,0.12)] max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#d6d6d6]/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#0071e3] flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#1d1d1f]">
                    Trazabilidad de Fuente Curricular
                  </h3>
                  <p className="text-[12px] text-[#707070]">
                    Mesa de evidencias para justificar la pertinencia del contenido.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvidenceModalItem(null)}
                className="p-1.5 text-[#707070] hover:text-[#1d1d1f] rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707070] block mb-1">
                Elemento evaluado
              </span>
              <p className="text-[14px] text-[#1d1d1f] bg-[#fafafc] p-3 rounded-[14px] border border-[#d6d6d6]">
                {evidenceModalItem.title}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0071e3] block mb-1">
                Documento origen cotejado
              </span>
              <p className="text-[13px] text-[#1d1d1f]">
                📄 {evidenceModalItem.docName}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707070] block mb-1">
                Fragmento textual exacto en la fuente
              </span>
              <blockquote className="p-3.5 rounded-[14px] bg-[#fafafc] border-l-2 border-[#0071e3] text-[13px] text-[#1d1d1f] italic leading-relaxed">
                "{evidenceModalItem.excerpt}"
              </blockquote>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#d6d6d6]/60">
              <button
                type="button"
                onClick={() => handleToggleVerifySource(evidenceModalItem.id, evidenceModalItem.isTest)}
                className={`py-2 px-4 rounded-full text-[13px] font-normal flex items-center gap-2 ${
                  evidenceModalItem.isVerified
                    ? 'bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f]'
                    : 'apple-pill-primary'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#0071e3]" />
                <span>
                  {evidenceModalItem.isVerified ? '✔ Marcada como auditada' : 'Marcar como verificada'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEvidenceModalItem(null)}
                className="apple-pill-ghost text-[13px] py-1.5 px-4"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
