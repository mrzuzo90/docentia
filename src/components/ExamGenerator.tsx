import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  CheckSquare,
  FileEdit,
  Loader2,
  Building2,
  Clock,
  Scale
} from 'lucide-react';
import { ExamGenerationConfig, SourceDocument } from '../types';

interface ExamGeneratorProps {
  documents: SourceDocument[];
  initialMetadata?: {
    title?: string;
    subject?: string;
    targetLevel?: string;
    institution?: string;
  };
  onGenerate: (
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
  ) => Promise<void>;
  isGenerating: boolean;
  creditsBalance?: number;
  onOpenPricing?: () => void;
  onBackToDocs?: () => void;
}

export const ExamGenerator: React.FC<ExamGeneratorProps> = ({
  documents,
  initialMetadata,
  onGenerate,
  isGenerating,
  creditsBalance = 3,
  onOpenPricing
}) => {
  const [title, setTitle] = useState(initialMetadata?.title || 'Prueba Oficial de Evaluación');
  const [subject, setSubject] = useState(initialMetadata?.subject || 'Biología y Geología');
  const [targetLevel, setTargetLevel] = useState(initialMetadata?.targetLevel || '2º Bachillerato');
  const [institution, setInstitution] = useState(
    initialMetadata?.institution || 'IES Ramiro de Maeztu · Dpto. de Ciencias'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [testPenalty, setTestPenalty] = useState<number>(0.33);
  const [numTestQuestions, setNumTestQuestions] = useState<number>(4);
  const [numExercises, setNumExercises] = useState<number>(2);
  const [difficulty, setDifficulty] = useState<'fácil' | 'medio' | 'difícil' | 'avanzado'>('medio');
  const [topicFocus, setTopicFocus] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>(
    'Responde con claridad caligráfica. En la Parte I marca una única opción. En la Parte II razona todos los pasos.'
  );
  const [testSectionWeight, setTestSectionWeight] = useState<number>(4.0);
  const [exerciseSectionWeight, setExerciseSectionWeight] = useState<number>(6.0);

  useEffect(() => {
    if (initialMetadata?.title) setTitle(initialMetadata.title);
    if (initialMetadata?.subject) setSubject(initialMetadata.subject);
    if (initialMetadata?.targetLevel) setTargetLevel(initialMetadata.targetLevel);
    if (initialMetadata?.institution) setInstitution(initialMetadata.institution);
  }, [initialMetadata]);

  const totalPoints = testSectionWeight + exerciseSectionWeight;
  const testPct = totalPoints > 0 ? Math.round((testSectionWeight / totalPoints) * 100) : 50;
  const exPct = 100 - testPct;

  const handleWeightAutoBalance = (changed: 'test' | 'exercise', val: number) => {
    const clamped = Math.max(0, Math.min(10, val));
    if (changed === 'test') {
      setTestSectionWeight(clamped);
      setExerciseSectionWeight(Number((10 - clamped).toFixed(1)));
    } else {
      setExerciseSectionWeight(clamped);
      setTestSectionWeight(Number((10 - clamped).toFixed(1)));
    }
  };

  const triggerGeneration = async () => {
    if (isGenerating) return;
    const safeTestCount = numTestQuestions === 0 && numExercises === 0 ? 4 : numTestQuestions;

    await onGenerate(
      {
        numTestQuestions: safeTestCount,
        numExercises,
        difficulty,
        topicFocus: topicFocus.trim() || undefined,
        customInstructions: customInstructions.trim() || undefined,
        testSectionWeight,
        exerciseSectionWeight,
        testPenalty
      },
      {
        title: title.trim() || 'Examen Oficial',
        subject: subject.trim() || 'Asignatura',
        targetLevel: targetLevel.trim() || 'Curso Académico',
        institution: institution.trim() || 'Centro Educativo',
        durationMinutes,
        testPenalty,
        instructions: customInstructions.trim()
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerGeneration();
  };

  return (
    <div id="step-2-generator" className="duo-card p-0 overflow-hidden scroll-mt-24">
      {/* Header with Quick Generate CTA */}
      <div className="px-6 py-5 bg-[#ffffff] border-b-2 border-[#afafaf] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 text-[13px] font-bold uppercase tracking-[0.053em] bg-[#d7ffb8] text-[#4b4b4b] border-2 border-[#58cc02] rounded-[12px]">
              PASO 2
            </span>
            <h2 className="text-[24px] sm:text-[32px] font-bold text-[#4b4b4b] leading-[1.2]">
              Elige tus preguntas tipo test y ejercicios
            </h2>
          </div>
          <p className="duo-body-copy mt-1">
            Define cuántas preguntas test y propuestas de ejercicios quieres crear y el peso de cada sección.
          </p>
        </div>

        <button
          type="button"
          onClick={triggerGeneration}
          disabled={isGenerating}
          className="duo-btn-primary py-3 px-5 shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>GENERANDO...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>GENERAR EXAMEN ({numTestQuestions} TEST + {numExercises} EJERC.)</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-[#ffffff]">
        
        {/* Row 1: Institutional Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
              TÍTULO DEL EXAMEN
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full text-[15px] px-3.5 py-2.5 rounded-[12px] border-2 border-[#afafaf] focus:outline-none focus:border-[#58cc02] font-bold text-[#4b4b4b]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
              ASIGNATURA
            </label>
            <div className="relative">
              <BookOpen className="h-4 w-4 text-[#777777] absolute left-3.5 top-3" />
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                className="w-full text-[15px] pl-10 pr-3.5 py-2.5 rounded-[12px] border-2 border-[#afafaf] focus:outline-none focus:border-[#58cc02] font-bold text-[#4b4b4b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
              CURSO / NIVEL
            </label>
            <div className="relative">
              <GraduationCap className="h-4 w-4 text-[#777777] absolute left-3.5 top-3" />
              <input
                type="text"
                value={targetLevel}
                onChange={e => setTargetLevel(e.target.value)}
                required
                className="w-full text-[15px] pl-10 pr-3.5 py-2.5 rounded-[12px] border-2 border-[#afafaf] focus:outline-none focus:border-[#58cc02] font-bold text-[#4b4b4b]"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Structure & Weight Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Multiple Choice Config */}
          <div className="duo-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[#58cc02]">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[19px] font-bold text-[#4b4b4b]">
                    Sección I: Preguntas Tipo Test
                  </h3>
                  <p className="text-[15px] text-[#777777]">
                    4 opciones (A, B, C, D) con solucionario
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-feather font-extrabold text-[28px] text-[#58cc02] tabular-nums">
                  {testSectionWeight.toFixed(1)} pts
                </span>
                <span className="block text-[13px] font-bold text-[#777777]">({testPct}%)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
                  Nº PREGUNTAS TEST
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNumTestQuestions(Math.max(0, numTestQuestions - 1))}
                    className="duo-nav-pill py-2 px-3.5"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={numTestQuestions}
                    onChange={e => setNumTestQuestions(Math.max(0, Number(e.target.value)))}
                    className="w-full text-center py-2 border-2 border-[#afafaf] rounded-[12px] text-[17px] font-bold text-[#4b4b4b] bg-[#ffffff] tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setNumTestQuestions(Math.min(30, numTestQuestions + 1))}
                    className="duo-nav-pill py-2 px-3.5"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
                  PESO SECCIÓN (0–10)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={testSectionWeight}
                  onChange={e => handleWeightAutoBalance('test', Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] text-[17px] font-bold text-[#4b4b4b] tabular-nums"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[15px] text-[#777777] border-t-2 border-[#afafaf]/40">
              <span>Valor por pregunta test:</span>
              <span className="font-bold text-[#4b4b4b]">
                {numTestQuestions > 0 ? (testSectionWeight / numTestQuestions).toFixed(2) : '0.00'} puntos / pregunta
              </span>
            </div>
          </div>

          {/* Open Exercises Config */}
          <div className="duo-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-[12px] bg-[#ffffff] border-2 border-[#1cb0f6] text-[#1cb0f6]">
                  <FileEdit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[19px] font-bold text-[#4b4b4b]">
                    Sección II: Propuestas de Ejercicios
                  </h3>
                  <p className="text-[15px] text-[#777777]">
                    Problemas de desarrollo con rúbrica
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-feather font-extrabold text-[28px] text-[#1cb0f6] tabular-nums">
                  {exerciseSectionWeight.toFixed(1)} pts
                </span>
                <span className="block text-[13px] font-bold text-[#777777]">({exPct}%)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
                  Nº DE EJERCICIOS
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNumExercises(Math.max(0, numExercises - 1))}
                    className="duo-nav-pill py-2 px-3.5"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={numExercises}
                    onChange={e => setNumExercises(Math.max(0, Number(e.target.value)))}
                    className="w-full text-center py-2 border-2 border-[#afafaf] rounded-[12px] text-[17px] font-bold text-[#4b4b4b] bg-[#ffffff] tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setNumExercises(Math.min(15, numExercises + 1))}
                    className="duo-nav-pill py-2 px-3.5"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
                  PESO EJERCICIOS (0–10)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={exerciseSectionWeight}
                  onChange={e => handleWeightAutoBalance('exercise', Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] text-[17px] font-bold text-[#4b4b4b] tabular-nums"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[15px] text-[#777777] border-t-2 border-[#afafaf]/40">
              <span>Valor por ejercicio:</span>
              <span className="font-bold text-[#4b4b4b]">
                {numExercises > 0 ? (exerciseSectionWeight / numExercises).toFixed(2) : '0.00'} puntos / ejercicio
              </span>
            </div>
          </div>
        </div>

        {/* Visual Weight Bar */}
        <div className="p-4 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf] space-y-2">
          <div className="flex items-center justify-between text-[15px] font-bold text-[#4b4b4b]">
            <span className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#58cc02]" />
              <span>Distribución de nota sobre 10 puntos</span>
            </span>
            <span className="text-[#58cc02]">
              Total: {totalPoints.toFixed(2)} / 10.00 Puntos
            </span>
          </div>
          <div className="w-full h-3.5 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] overflow-hidden flex">
            <div
              style={{ width: `${testPct}%` }}
              className="bg-[#58cc02] transition-all duration-300"
              title={`Test: ${testSectionWeight} pts`}
            />
            <div
              style={{ width: `${exPct}%` }}
              className="bg-[#1cb0f6] transition-all duration-300"
              title={`Ejercicios: ${exerciseSectionWeight} pts`}
            />
          </div>
          <div className="flex justify-between text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
            <span className="text-[#4b4b4b]">■ PARTE I: TEST ({testSectionWeight.toFixed(1)} PTS — {testPct}%)</span>
            <span className="text-[#1cb0f6]">■ PARTE II: EJERCICIOS ({exerciseSectionWeight.toFixed(1)} PTS — {exPct}%)</span>
          </div>
        </div>

        {/* Row 3: Center, Duration, Penalty, Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
              CENTRO / DEPARTAMENTO
            </label>
            <div className="relative">
              <Building2 className="h-4 w-4 text-[#777777] absolute left-3.5 top-3" />
              <input
                type="text"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                className="w-full text-[15px] pl-10 pr-3.5 py-2.5 rounded-[12px] border-2 border-[#afafaf] focus:outline-none focus:border-[#58cc02] text-[#4b4b4b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
              DURACIÓN ESTIMADA
            </label>
            <div className="relative">
              <Clock className="h-4 w-4 text-[#777777] absolute left-3.5 top-3" />
              <select
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full text-[15px] pl-10 pr-3.5 py-2.5 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] focus:outline-none focus:border-[#58cc02] text-[#4b4b4b] font-bold"
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={50}>50 minutos (1 clase)</option>
                <option value={60}>60 minutos (1 hora)</option>
                <option value={90}>90 minutos (PAU / EBAU)</option>
                <option value={120}>120 minutos (2 horas)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
              PENALIZACIÓN ERROR TEST
            </label>
            <select
              value={testPenalty}
              onChange={e => setTestPenalty(Number(e.target.value))}
              className="w-full text-[15px] px-3.5 py-2.5 rounded-[12px] border-2 border-[#afafaf] bg-[#ffffff] focus:outline-none focus:border-[#58cc02] text-[#4b4b4b] font-bold"
            >
              <option value={0}>Sin penalización (0.00)</option>
              <option value={0.25}>-25% del valor (-0.25)</option>
              <option value={0.33}>-33% del valor (fórmula k-1)</option>
              <option value={0.5}>-50% del valor (-0.50)</option>
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
              DIFICULTAD
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(['fácil', 'medio', 'difícil', 'avanzado'] as const).map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={`py-2 px-1 text-[13px] font-bold uppercase rounded-[12px] border-2 transition ${
                    difficulty === diff
                      ? 'bg-[#d7ffb8] border-[#58cc02] text-[#4b4b4b]'
                      : 'bg-[#ffffff] border-[#afafaf] text-[#777777] hover:text-[#4b4b4b]'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: Focus & Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
              ÉNFASIS TEMÁTICO (OPCIONAL)
            </label>
            <input
              type="text"
              value={topicFocus}
              onChange={e => setTopicFocus(e.target.value)}
              placeholder="Ej: Priorizar problemas prácticos y definiciones clave..."
              className="w-full text-[15px] px-3.5 py-2.5 rounded-[12px] border-2 border-[#afafaf] focus:outline-none focus:border-[#58cc02] text-[#4b4b4b]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] mb-1.5">
              INSTRUCCIONES IMPRESAS PARA EL ALUMNO
            </label>
            <input
              type="text"
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              className="w-full text-[15px] px-3.5 py-2.5 rounded-[12px] border-2 border-[#afafaf] focus:outline-none focus:border-[#58cc02] text-[#4b4b4b]"
            />
          </div>
        </div>

        {/* Submit CTA */}
        <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t-2 border-[#afafaf] gap-4">
          <div className="space-y-1">
            <p className="duo-body-copy">
              Se crearán <strong className="text-[#4b4b4b]">{numTestQuestions} preguntas tipo test</strong> y{' '}
              <strong className="text-[#4b4b4b]">{numExercises} ejercicios prácticos</strong> listos para copiar y pegar.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold uppercase tracking-[0.053em]">
              <span className="px-2.5 py-1 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[#4b4b4b]">
                CONSUME 1 CRÉDITO
              </span>
              <span className="text-[#777777]">
                · SALDO: <strong className="text-[#4b4b4b]">{creditsBalance} CRÉDITOS</strong>
              </span>
              {onOpenPricing && (
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="text-[#1cb0f6] hover:underline font-bold"
                >
                  {creditsBalance === 0 ? 'RECARGAR AHORA →' : 'VER PLANES'}
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="duo-btn-primary py-3.5 px-7 w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>CREANDO EXAMEN Y SOLUCIONARIO...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>
                  {creditsBalance > 0
                    ? `CREAR EXAMEN Y SOLUCIONARIO (${numTestQuestions} TEST + ${numExercises} EJERC.)`
                    : 'SIN CRÉDITOS · ABRIR PLANES / RECARGA'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
