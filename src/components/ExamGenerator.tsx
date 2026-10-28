import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Scale,
  Building2,
  Clock,
  Loader2,
  CheckSquare,
  FileEdit
} from 'lucide-react';
import { ExamGenerationConfig, SourceDocument } from '../types';

interface ExamGeneratorProps {
  documents: SourceDocument[];
  initialMetadata: {
    title: string;
    subject: string;
    targetLevel: string;
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
  ) => void;
  isGenerating: boolean;
  creditsBalance: number;
  onOpenPricing?: () => void;
}

export const ExamGenerator: React.FC<ExamGeneratorProps> = ({
  documents,
  initialMetadata,
  onGenerate,
  isGenerating,
  creditsBalance,
  onOpenPricing
}) => {
  const [title, setTitle] = useState(initialMetadata.title || 'Examen Trimestral');
  const [subject, setSubject] = useState(initialMetadata.subject || 'Biología y Geología');
  const [targetLevel, setTargetLevel] = useState(initialMetadata.targetLevel || '2º Bachillerato');
  const [institution, setInstitution] = useState(initialMetadata.institution || 'IES Severo Ochoa');
  const [durationMinutes, setDurationMinutes] = useState(50);
  const [testPenalty, setTestPenalty] = useState(0.25);
  const [topicFocus, setTopicFocus] = useState('');
  const [customInstructions, setCustomInstructions] = useState(
    'Responde en el espacio asignado. En las preguntas de desarrollo justifica los pasos.'
  );

  // Default structure: 5 Multiple Choice (4.0 pts) + 3 Open Exercises (6.0 pts) = 10.0 pts
  const [numTestQuestions, setNumTestQuestions] = useState(5);
  const [testSectionWeight, setTestSectionWeight] = useState(4.0);
  const [numExercises, setNumExercises] = useState(3);
  const [exerciseSectionWeight, setExerciseSectionWeight] = useState(6.0);
  const [difficulty, setDifficulty] = useState<'fácil' | 'medio' | 'difícil' | 'avanzado'>('medio');

  const totalPoints = testSectionWeight + exerciseSectionWeight;
  const testPct = totalPoints > 0 ? Math.round((testSectionWeight / totalPoints) * 100) : 0;
  const exPct = 100 - testPct;

  const handleWeightAutoBalance = (changed: 'test' | 'exercise', value: number) => {
    const clamped = Math.max(0, Math.min(10, Number(value)));
    if (changed === 'test') {
      setTestSectionWeight(clamped);
      setExerciseSectionWeight(Number((10 - clamped).toFixed(2)));
    } else {
      setExerciseSectionWeight(clamped);
      setTestSectionWeight(Number((10 - clamped).toFixed(2)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerGeneration();
  };

  const triggerGeneration = () => {
    if (documents.length === 0) {
      alert('Debes subir o redactar al menos un documento o temario en el Paso 1 antes de generar el examen.');
      return;
    }

    const config: ExamGenerationConfig = {
      numTestQuestions,
      testSectionWeight,
      numExercises,
      exerciseSectionWeight,
      difficulty,
      topicFocus: topicFocus.trim() || undefined
    };

    onGenerate(config, {
      title,
      subject,
      targetLevel,
      institution,
      durationMinutes,
      testPenalty,
      instructions: customInstructions
    });
  };

  return (
    <div id="step-2-generator" className="bg-[#ffffff] border border-[#d6d6d6] rounded-[28px] overflow-hidden scroll-mt-24">
      {/* Header with Quick Generate CTA */}
      <div className="px-7 py-6 bg-[#ffffff] border-b border-[#d6d6d6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="apple-badge-ember">
              Paso 2
            </span>
            <h2 className="text-[22px] sm:text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
              Estructura y baremo de evaluación
            </h2>
          </div>
          <p className="text-[15px] text-[#707070] mt-1">
            Define la ponderación entre preguntas tipo test y ejercicios con solucionario detallado.
          </p>
        </div>

        <button
          type="button"
          onClick={triggerGeneration}
          disabled={isGenerating}
          className="apple-pill-primary text-[14px] py-2.5 px-6 shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generando...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Generar ({numTestQuestions} test + {numExercises} ejerc.)</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-7 space-y-6 bg-[#ffffff]">
        
        {/* Row 1: Institutional Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
              Título de la convocatoria
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full text-[15px] px-3.5 py-2.5 rounded-[14px] border border-[#d6d6d6] focus:outline-none focus:border-[#0071e3] text-[#1d1d1f]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
              Asignatura
            </label>
            <div className="relative">
              <BookOpen className="h-4 w-4 text-[#707070] absolute left-3.5 top-3" />
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                className="w-full text-[15px] pl-10 pr-3.5 py-2.5 rounded-[14px] border border-[#d6d6d6] focus:outline-none focus:border-[#0071e3] text-[#1d1d1f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
              Curso / Nivel
            </label>
            <div className="relative">
              <GraduationCap className="h-4 w-4 text-[#707070] absolute left-3.5 top-3" />
              <input
                type="text"
                value={targetLevel}
                onChange={e => setTargetLevel(e.target.value)}
                required
                className="w-full text-[15px] pl-10 pr-3.5 py-2.5 rounded-[14px] border border-[#d6d6d6] focus:outline-none focus:border-[#0071e3] text-[#1d1d1f]"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Structure & Weight Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Multiple Choice Config */}
          <div className="p-6 rounded-[22px] bg-[#fafafc] border border-[#d6d6d6] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f]">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                    Sección I: Preguntas Tipo Test
                  </h3>
                  <p className="text-[13px] text-[#707070]">
                    4 opciones (A, B, C, D) con clave justificada
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[24px] font-bold text-[#1d1d1f] tabular-nums tracking-tight">
                  {testSectionWeight.toFixed(1)} pts
                </span>
                <span className="block text-[12px] text-[#707070]">({testPct}%)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
                  Nº preguntas test
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNumTestQuestions(Math.max(0, numTestQuestions - 1))}
                    className="w-9 h-9 rounded-full border border-[#d6d6d6] hover:border-[#1d1d1f] bg-[#ffffff] text-[#1d1d1f] flex items-center justify-center text-[15px] transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={numTestQuestions}
                    onChange={e => setNumTestQuestions(Math.max(0, Number(e.target.value)))}
                    className="w-full text-center py-1.5 border border-[#d6d6d6] rounded-[12px] text-[15px] font-medium text-[#1d1d1f] bg-[#ffffff] tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setNumTestQuestions(Math.min(30, numTestQuestions + 1))}
                    className="w-9 h-9 rounded-full border border-[#d6d6d6] hover:border-[#1d1d1f] bg-[#ffffff] text-[#1d1d1f] flex items-center justify-center text-[15px] transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
                  Peso sección (0–10)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={testSectionWeight}
                  onChange={e => handleWeightAutoBalance('test', Number(e.target.value))}
                  className="w-full px-3.5 py-1.5 bg-[#ffffff] border border-[#d6d6d6] rounded-[12px] text-[15px] font-medium text-[#1d1d1f] tabular-nums"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[13px] text-[#707070] border-t border-[#d6d6d6]/60">
              <span>Valor por pregunta:</span>
              <span className="font-medium text-[#1d1d1f]">
                {numTestQuestions > 0 ? (testSectionWeight / numTestQuestions).toFixed(2) : '0.00'} puntos
              </span>
            </div>
          </div>

          {/* Open Exercises Config */}
          <div className="p-6 rounded-[22px] bg-[#fafafc] border border-[#d6d6d6] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-[#ffffff] border border-[#d6d6d6] text-[#0071e3]">
                  <FileEdit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                    Sección II: Ejercicios Prácticos
                  </h3>
                  <p className="text-[13px] text-[#707070]">
                    Desarrollo con rúbrica y criterios
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[24px] font-bold text-[#0071e3] tabular-nums tracking-tight">
                  {exerciseSectionWeight.toFixed(1)} pts
                </span>
                <span className="block text-[12px] text-[#707070]">({exPct}%)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
                  Nº de ejercicios
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNumExercises(Math.max(0, numExercises - 1))}
                    className="w-9 h-9 rounded-full border border-[#d6d6d6] hover:border-[#1d1d1f] bg-[#ffffff] text-[#1d1d1f] flex items-center justify-center text-[15px] transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={numExercises}
                    onChange={e => setNumExercises(Math.max(0, Number(e.target.value)))}
                    className="w-full text-center py-1.5 border border-[#d6d6d6] rounded-[12px] text-[15px] font-medium text-[#1d1d1f] bg-[#ffffff] tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setNumExercises(Math.min(15, numExercises + 1))}
                    className="w-9 h-9 rounded-full border border-[#d6d6d6] hover:border-[#1d1d1f] bg-[#ffffff] text-[#1d1d1f] flex items-center justify-center text-[15px] transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
                  Peso ejercicios (0–10)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={exerciseSectionWeight}
                  onChange={e => handleWeightAutoBalance('exercise', Number(e.target.value))}
                  className="w-full px-3.5 py-1.5 bg-[#ffffff] border border-[#d6d6d6] rounded-[12px] text-[15px] font-medium text-[#1d1d1f] tabular-nums"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[13px] text-[#707070] border-t border-[#d6d6d6]/60">
              <span>Valor por ejercicio:</span>
              <span className="font-medium text-[#1d1d1f]">
                {numExercises > 0 ? (exerciseSectionWeight / numExercises).toFixed(2) : '0.00'} puntos
              </span>
            </div>
          </div>
        </div>

        {/* Visual Weight Bar (Minimalist Apple Segment) */}
        <div className="p-5 rounded-[22px] bg-[#fafafc] border border-[#d6d6d6] space-y-2.5">
          <div className="flex items-center justify-between text-[14px]">
            <span className="flex items-center gap-2 font-medium text-[#1d1d1f]">
              <Scale className="h-4 w-4 text-[#707070]" />
              <span>Distribución de nota sobre 10,00 puntos</span>
            </span>
            <span className="font-semibold text-[#1d1d1f]">
              Total: {totalPoints.toFixed(2)} / 10.00 pts
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#e8e8ed] rounded-full overflow-hidden flex">
            <div
              style={{ width: `${testPct}%` }}
              className="bg-[#1d1d1f] transition-all duration-300"
              title={`Test: ${testSectionWeight} pts`}
            />
            <div
              style={{ width: `${exPct}%` }}
              className="bg-[#0071e3] transition-all duration-300"
              title={`Ejercicios: ${exerciseSectionWeight} pts`}
            />
          </div>
          <div className="flex justify-between text-[12px] text-[#707070]">
            <span>Parte I: Test ({testSectionWeight.toFixed(1)} pts — {testPct}%)</span>
            <span className="text-[#0071e3]">Parte II: Ejercicios ({exerciseSectionWeight.toFixed(1)} pts — {exPct}%)</span>
          </div>
        </div>

        {/* Row 3: Center, Duration, Penalty, Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
              Centro / Departamento
            </label>
            <div className="relative">
              <Building2 className="h-4 w-4 text-[#707070] absolute left-3.5 top-3" />
              <input
                type="text"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                className="w-full text-[14px] pl-10 pr-3.5 py-2 rounded-[14px] border border-[#d6d6d6] focus:outline-none focus:border-[#0071e3] text-[#1d1d1f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
              Duración estimada
            </label>
            <div className="relative">
              <Clock className="h-4 w-4 text-[#707070] absolute left-3.5 top-3" />
              <select
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full text-[14px] pl-10 pr-3.5 py-2 rounded-[14px] border border-[#d6d6d6] bg-[#ffffff] focus:outline-none focus:border-[#0071e3] text-[#1d1d1f]"
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={50}>50 minutos (1 sesión)</option>
                <option value={60}>60 minutos (1 hora)</option>
                <option value={90}>90 minutos (PAU / EBAU)</option>
                <option value={120}>120 minutos (2 horas)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
              Penalización error test
            </label>
            <select
              value={testPenalty}
              onChange={e => setTestPenalty(Number(e.target.value))}
              className="w-full text-[14px] px-3.5 py-2 rounded-[14px] border border-[#d6d6d6] bg-[#ffffff] focus:outline-none focus:border-[#0071e3] text-[#1d1d1f]"
            >
              <option value={0}>Sin penalización (0.00)</option>
              <option value={0.25}>-25% del valor (-0.25)</option>
              <option value={0.33}>-33% del valor (fórmula k-1)</option>
              <option value={0.5}>-50% del valor (-0.50)</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
              Nivel de dificultad
            </label>
            <div className="grid grid-cols-4 gap-1 bg-[#f5f5f7] p-1 rounded-full">
              {(['fácil', 'medio', 'difícil', 'avanzado'] as const).map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={`py-1 text-[12px] rounded-full transition capitalize ${
                    difficulty === diff
                      ? 'bg-[#ffffff] text-[#1d1d1f] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'text-[#707070] hover:text-[#1d1d1f]'
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
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
              Énfasis temático (opcional)
            </label>
            <input
              type="text"
              value={topicFocus}
              onChange={e => setTopicFocus(e.target.value)}
              placeholder="Ej: Priorizar problemas prácticos y definiciones clave..."
              className="w-full text-[14px] px-3.5 py-2 rounded-[14px] border border-[#d6d6d6] focus:outline-none focus:border-[#0071e3] text-[#1d1d1f]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070] mb-1.5">
              Instrucciones impresas para el alumno
            </label>
            <input
              type="text"
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              className="w-full text-[14px] px-3.5 py-2 rounded-[14px] border border-[#d6d6d6] focus:outline-none focus:border-[#0071e3] text-[#1d1d1f]"
            />
          </div>
        </div>

        {/* Submit CTA */}
        <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-[#d6d6d6] gap-4">
          <div className="space-y-1">
            <p className="text-[14px] text-[#707070]">
              Se generarán <strong className="text-[#1d1d1f]">{numTestQuestions} preguntas test</strong> y{' '}
              <strong className="text-[#1d1d1f]">{numExercises} ejercicios</strong> con solucionario oficial.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#707070]">
              <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f]">
                Consume 1 crédito
              </span>
              <span>
                · Saldo: <strong className="text-[#1d1d1f]">{creditsBalance} créditos</strong>
              </span>
              {onOpenPricing && (
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="text-[#0066cc] hover:underline font-normal"
                >
                  {creditsBalance === 0 ? 'Recargar ahora ›' : 'Ver planes ›'}
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="apple-pill-primary py-3 px-8 text-[15px] w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creando examen y solucionario...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>
                  {creditsBalance > 0
                    ? `Crear examen (${numTestQuestions} test + ${numExercises} ejerc.)`
                    : 'Sin créditos · Ver recargas'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
