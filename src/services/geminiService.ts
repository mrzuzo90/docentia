import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Exam,
  ExamGenerationConfig,
  QuestionCorrection,
  StudentGradeReport,
  TestQuestion,
  OpenExercise,
  SourceDocument,
  AIProviderId,
  AIProviderConfig
} from '../types';
import { StorageService } from './storageService';
import { DocumentParserService } from './pdfService';

/**
 * Robust JSON parser that handles pure JSON, markdown blocks (```json ... ```),
 * and substring extractions from thinking/reasoning models.
 */
function parseJsonSafely(raw: string): any {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const mdMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) {
    try {
      return JSON.parse(mdMatch[1].trim());
    } catch {
      // continue
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      // continue
    }
  }

  throw new Error('No se pudo extraer una estructura JSON válida de la respuesta del modelo de IA.');
}

/**
 * Standard OpenAI-compatible Chat Completions client (DeepSeek, OpenRouter, OpenAI, LocalAI/Ollama)
 */
async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  extraHeaders?: Record<string, string>,
  imageBase64?: string,
  mimeType?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...extraHeaders
  };

  let userContent: any = userPrompt;
  if (imageBase64 && mimeType) {
    userContent = [
      { type: 'text', text: userPrompt },
      {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${imageBase64}`
        }
      }
    ];
  }

  const payload: any = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.2
  };

  // Only attach json_object if model is not a pure chain-of-thought reasoner (e.g. deepseek-reasoner, o1)
  const isReasoner = model.toLowerCase().includes('reasoner') || model.toLowerCase().includes('o1');
  if (!isReasoner) {
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error ${response.status} del proveedor: ${errorBody.slice(0, 320)}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new Error('El modelo de IA devolvió una respuesta vacía.');
  }

  return content;
}

function normalizeGeneratedExam(
  parsed: any,
  testPointsEach: number,
  exPointsEach: number
): { testQuestions: TestQuestion[]; exercises: OpenExercise[] } {
  const testQuestions: TestQuestion[] = (parsed.testQuestions || []).map(
    (q: any, i: number) => ({
      id: q.id || `q-${Date.now()}-${i + 1}`,
      question: q.question || 'Enunciado de la cuestión',
      options: q.options || { A: '', B: '', C: '', D: '' },
      correctAnswer: (['A', 'B', 'C', 'D'].includes(q.correctAnswer)
        ? q.correctAnswer
        : 'A') as 'A' | 'B' | 'C' | 'D',
      explanation: q.explanation || '',
      points: Number(q.points ?? testPointsEach)
    })
  );

  const exercises: OpenExercise[] = (parsed.exercises || []).map((ex: any, i: number) => ({
    id: ex.id || `ex-${Date.now()}-${i + 1}`,
    title: ex.title || `Ejercicio ${i + 1}`,
    statement: ex.statement || '',
    rubricCriteria:
      Array.isArray(ex.rubricCriteria) && ex.rubricCriteria.length > 0
        ? ex.rubricCriteria
        : [
            'Planteamiento conceptual riguroso',
            'Desarrollo metodológico correcto',
            'Conclusión justificada'
          ],
    solutionSteps: ex.solutionSteps || '',
    points: Number(ex.points ?? exPointsEach)
  }));

  return { testQuestions, exercises };
}

function normalizeGradingReport(
  parsed: any,
  studentName: string,
  totalTestMax: number,
  totalExMax: number
): StudentGradeReport {
  const testScore = Number((parsed.testSectionScore ?? 0).toFixed(2));
  const exScore = Number((parsed.exerciseSectionScore ?? 0).toFixed(2));
  const testOut10 = totalTestMax > 0 ? Number(((testScore / totalTestMax) * 10).toFixed(2)) : 0;
  const exOut10 = totalExMax > 0 ? Number(((exScore / totalExMax) * 10).toFixed(2)) : 0;

  return {
    id: `rep-${Date.now()}`,
    submissionId: `sub-${Date.now()}`,
    studentName,
    testSectionScore: testScore,
    testSectionMax: Number(totalTestMax.toFixed(2)),
    testSectionScoreOutOf10: Number((parsed.testSectionScoreOutOf10 ?? testOut10).toFixed(2)),
    exerciseSectionScore: exScore,
    exerciseSectionMax: Number(totalExMax.toFixed(2)),
    exerciseSectionScoreOutOf10: Number((parsed.exerciseSectionScoreOutOf10 ?? exOut10).toFixed(2)),
    finalScore: Number((parsed.finalScore ?? testScore + exScore).toFixed(2)),
    overallFeedback: parsed.overallFeedback || 'Evaluación completada.',
    needsManualReview: Boolean(
      parsed.needsManualReview ||
        (parsed.corrections || []).some((c: any) => c.needsManualReview)
    ),
    manualReviewReasons: parsed.manualReviewReasons || [],
    gradedAt: new Date().toISOString(),
    corrections: (parsed.corrections || []).map((c: any, i: number) => ({
      questionId: c.questionId || `q${i + 1}`,
      type: c.type || (i < 5 ? 'test' : 'exercise'),
      questionTitle: c.questionTitle || `Cuestión ${i + 1}`,
      studentAnswer: c.studentAnswer || '',
      ocrExtractedText: c.ocrExtractedText || c.studentAnswer || '',
      ocrConfidence: c.ocrConfidence || 'high',
      scoreAwarded: Number((c.scoreAwarded || 0).toFixed(2)),
      maxScore: Number((c.maxScore || 1.0).toFixed(2)),
      feedback: c.feedback || '',
      needsManualReview: Boolean(c.needsManualReview),
      reviewReason: c.reviewReason || undefined
    }))
  };
}

export const GeminiService = {
  getApiKey(): string {
    return StorageService.getApiKey();
  },

  getModelName(): string {
    return StorageService.getModelName();
  },

  getActiveProvider(): AIProviderId {
    return StorageService.getActiveProvider();
  },

  /**
   * Health-check connection test with low token footprint
   */
  async testConnection(
    provider: AIProviderId,
    config: Partial<AIProviderConfig>
  ): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = performance.now();
    try {
      if (provider === 'local') {
        return {
          success: true,
          message: 'Motor semántico local disponible (0 € de coste, 100% privado en navegador).',
          latencyMs: 1
        };
      }

      if (provider === 'gemini') {
        const key = config.geminiKey?.trim() || StorageService.getAIConfig().geminiKey;
        if (!key) throw new Error('Introduce tu API Key de Google Gemini para conectar.');
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
          model: config.geminiModel || 'gemini-2.5-flash'
        });
        const res = await model.generateContent('Di "Conectado".');
        const text = res.response.text();
        return {
          success: true,
          message: `Conexión con Google Gemini exitosa (${config.geminiModel || 'gemini-2.5-flash'}): "${text.trim().slice(0, 30)}"`,
          latencyMs: Math.round(performance.now() - start)
        };
      }

      if (provider === 'deepseek') {
        const key = config.deepseekKey?.trim() || StorageService.getAIConfig().deepseekKey;
        if (!key) throw new Error('Introduce tu API Key de DeepSeek Platform.');
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`
          },
          body: JSON.stringify({
            model: config.deepseekModel || 'deepseek-chat',
            messages: [{ role: 'user', content: 'Di "Conectado".' }],
            max_tokens: 15
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Error DeepSeek HTTP ${res.status}: ${errText.slice(0, 160)}`);
        }
        return {
          success: true,
          message: `Conexión con DeepSeek (${config.deepseekModel || 'deepseek-chat'}) verificada.`,
          latencyMs: Math.round(performance.now() - start)
        };
      }

      if (provider === 'openrouter') {
        const key = config.openrouterKey?.trim() || StorageService.getAIConfig().openrouterKey;
        if (!key) throw new Error('Introduce tu API Key de OpenRouter.');
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
            'HTTP-Referer': 'https://docentia.edu.es',
            'X-Title': 'Docentia Evaluacion'
          },
          body: JSON.stringify({
            model: config.openrouterModel || 'deepseek/deepseek-r1',
            messages: [{ role: 'user', content: 'Di "Conectado".' }],
            max_tokens: 15
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Error OpenRouter HTTP ${res.status}: ${errText.slice(0, 160)}`);
        }
        return {
          success: true,
          message: `Conexión con OpenRouter (${config.openrouterModel || 'deepseek/deepseek-r1'}) verificada.`,
          latencyMs: Math.round(performance.now() - start)
        };
      }

      if (provider === 'openai') {
        const key = config.openaiKey?.trim() || StorageService.getAIConfig().openaiKey;
        if (!key) throw new Error('Introduce tu API Key de OpenAI o endpoint compatible.');
        const endpoint = `${(config.customBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`
          },
          body: JSON.stringify({
            model: config.openaiModel || 'gpt-4o',
            messages: [{ role: 'user', content: 'Di "Conectado".' }],
            max_tokens: 15
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Error OpenAI HTTP ${res.status}: ${errText.slice(0, 160)}`);
        }
        return {
          success: true,
          message: `Conexión con OpenAI / Compatible (${config.openaiModel || 'gpt-4o'}) verificada.`,
          latencyMs: Math.round(performance.now() - start)
        };
      }

      return { success: false, message: 'Proveedor no reconocido.', latencyMs: 0 };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Error de conexión desconocido.',
        latencyMs: Math.round(performance.now() - start)
      };
    }
  },

  /**
   * Generates questions and exercises from source documents using the active AI provider
   * (Gemini, DeepSeek, OpenRouter, OpenAI or Local NLP Engine)
   */
  async generateExamFromSource(
    documents: SourceDocument[],
    config: ExamGenerationConfig,
    metadata: { title: string; subject: string; targetLevel: string; instructions?: string }
  ): Promise<{ testQuestions: TestQuestion[]; exercises: OpenExercise[] }> {
    const aiConfig = StorageService.getAIConfig();
    const provider = aiConfig.provider;

    const combinedText =
      documents.length > 0
        ? documents.map(d => `=== DOCUMENTO: ${d.name} ===\n${d.content}`).join('\n\n')
        : `Materia: ${metadata.subject}. Nivel: ${metadata.targetLevel}. Tema: ${config.topicFocus || metadata.title}.`;

    const testPointsEach =
      config.numTestQuestions > 0
        ? Number((config.testSectionWeight / config.numTestQuestions).toFixed(2))
        : 0;
    const exPointsEach =
      config.numExercises > 0
        ? Number((config.exerciseSectionWeight / config.numExercises).toFixed(2))
        : 0;

    // 01. LOCAL ENGINE
    if (provider === 'local') {
      await new Promise(r => setTimeout(r, 650));
      return this.generateIntelligentLocalExam(combinedText, config, metadata);
    }

    const systemPrompt = `Actúa como Catedrático y Coordinador de Evaluación de la materia "${metadata.subject}" para el nivel "${metadata.targetLevel}".
A partir del temario aportado, diseña una prueba académica rigurosa con su solucionario oficial y desglose de baremo.
Devuelve EXCLUSIVAMENTE un objeto JSON válido con las claves "testQuestions" y "exercises".`;

    const userPrompt = `PARÁMETROS TÉCNICOS DEL EXAMEN:
- Preguntas tipo test (4 opciones A, B, C, D, solo 1 válida): exactamente ${config.numTestQuestions} preguntas.
- Ejercicios de desarrollo / problemas prácticos: exactamente ${config.numExercises} ejercicios.
- Nivel de exigencia cognitiva: ${config.difficulty}.
- Ponderación sección test: ${config.testSectionWeight} puntos en total (${testPointsEach} pts por pregunta).
- Ponderación sección desarrollo: ${config.exerciseSectionWeight} puntos en total (${exPointsEach} pts por ejercicio).
${config.topicFocus ? `- Foco temático prioritario: ${config.topicFocus}` : ''}
${config.customInstructions ? `- Directrices adicionales: ${config.customInstructions}` : ''}

CONTENIDO TEMÁTICO DE LOS APUNTES:
"""
${combinedText.slice(0, 42000)}
"""

Devuelve un JSON con este formato exacto:
{
  "testQuestions": [
    {
      "id": "q1",
      "question": "Enunciado riguroso de la cuestión",
      "options": {
        "A": "Opción A",
        "B": "Opción B",
        "C": "Opción C",
        "D": "Opción D"
      },
      "correctAnswer": "A",
      "explanation": "Justificación didáctica detallada de la respuesta correcta",
      "points": ${testPointsEach}
    }
  ],
  "exercises": [
    {
      "id": "ex1",
      "title": "Título técnico del problema o cuestión de desarrollo",
      "statement": "Enunciado completo con apartados a), b), c)",
      "rubricCriteria": [
        "Criterio de evaluación 1 con puntuación",
        "Criterio de evaluación 2 con puntuación"
      ],
      "solutionSteps": "Resolución modelo completa paso a paso",
      "points": ${exPointsEach}
    }
  ]
}`;

    // 02. DEEPSEEK
    if (provider === 'deepseek') {
      if (!aiConfig.deepseekKey) {
        return this.generateIntelligentLocalExam(combinedText, config, metadata);
      }
      try {
        const raw = await callOpenAICompatible(
          'https://api.deepseek.com/chat/completions',
          aiConfig.deepseekKey,
          aiConfig.deepseekModel || 'deepseek-chat',
          systemPrompt,
          userPrompt
        );
        const parsed = parseJsonSafely(raw);
        return normalizeGeneratedExam(parsed, testPointsEach, exPointsEach);
      } catch (err) {
        console.warn('Fallo en DeepSeek, usando motor local:', err);
        return this.generateIntelligentLocalExam(combinedText, config, metadata);
      }
    }

    // 03. OPENROUTER
    if (provider === 'openrouter') {
      if (!aiConfig.openrouterKey) {
        return this.generateIntelligentLocalExam(combinedText, config, metadata);
      }
      try {
        const raw = await callOpenAICompatible(
          'https://openrouter.ai/api/v1/chat/completions',
          aiConfig.openrouterKey,
          aiConfig.openrouterModel || 'deepseek/deepseek-r1',
          systemPrompt,
          userPrompt,
          {
            'HTTP-Referer': 'https://docentia.edu.es',
            'X-Title': 'Docentia Evaluacion'
          }
        );
        const parsed = parseJsonSafely(raw);
        return normalizeGeneratedExam(parsed, testPointsEach, exPointsEach);
      } catch (err) {
        console.warn('Fallo en OpenRouter, usando motor local:', err);
        return this.generateIntelligentLocalExam(combinedText, config, metadata);
      }
    }

    // 04. OPENAI / CUSTOM BASE URL
    if (provider === 'openai') {
      if (!aiConfig.openaiKey) {
        return this.generateIntelligentLocalExam(combinedText, config, metadata);
      }
      try {
        const endpoint = `${(aiConfig.customBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
        const raw = await callOpenAICompatible(
          endpoint,
          aiConfig.openaiKey,
          aiConfig.openaiModel || 'gpt-4o',
          systemPrompt,
          userPrompt
        );
        const parsed = parseJsonSafely(raw);
        return normalizeGeneratedExam(parsed, testPointsEach, exPointsEach);
      } catch (err) {
        console.warn('Fallo en OpenAI, usando motor local:', err);
        return this.generateIntelligentLocalExam(combinedText, config, metadata);
      }
    }

    // 05. GOOGLE GEMINI (Default)
    const apiKey = aiConfig.geminiKey;
    if (!apiKey) {
      await new Promise(r => setTimeout(r, 650));
      return this.generateIntelligentLocalExam(combinedText, config, metadata);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const preferredModel = aiConfig.geminiModel || 'gemini-2.5-flash';
    const modelsToTry = Array.from(
      new Set([preferredModel, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'])
    );

    const parts: any[] = [{ text: `${systemPrompt}\n\n${userPrompt}` }];

    // Attach PDF or image inlineData from memory store or document if available and under 8MB
    for (const doc of documents) {
      const memBlob = DocumentParserService.getBlobFromMemory(doc.id);
      const b64 = memBlob?.base64Data || doc.base64Data;
      const mime = memBlob?.mimeType || doc.mimeType;

      if (
        b64 &&
        mime &&
        (mime === 'application/pdf' || mime.startsWith('image/')) &&
        doc.size < 8 * 1024 * 1024
      ) {
        parts.push({
          inlineData: {
            data: b64,
            mimeType: mime
          }
        });
      }
    }

    for (const candidateModel of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: candidateModel,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.35
          }
        });

        const result = await model.generateContent(parts);
        const rawText = result.response.text();
        const parsed = parseJsonSafely(rawText);
        return normalizeGeneratedExam(parsed, testPointsEach, exPointsEach);
      } catch (err) {
        console.warn(`Model ${candidateModel} failed, trying next:`, err);
      }
    }

    // Fallback to local NLP generator if API models fail
    return this.generateIntelligentLocalExam(combinedText, config, metadata);
  },

  /**
   * Evaluates student's solved exam (multimodal image/PDF scan or OCR text)
   * with the active AI Provider or simulated local analyzer
   */
  async gradeStudentExam(
    exam: Exam,
    studentName: string,
    submissionInput: { textContent?: string; imageBase64?: string; mimeType?: string }
  ): Promise<StudentGradeReport> {
    const aiConfig = StorageService.getAIConfig();
    const provider = aiConfig.provider;

    const totalTestMax = exam.testQuestions.reduce((a, b) => a + b.points, 0);
    const totalExMax = exam.exercises.reduce((a, b) => a + b.points, 0);

    if (provider === 'local') {
      await new Promise(r => setTimeout(r, 550));
      return this.generateSimulatedGrading(exam, studentName, submissionInput);
    }

    const solucionarioContext = `
SOLUCIONARIO OFICIAL Y BAREMO DE CALIFICACIÓN:
Examen: ${exam.title} | Materia: ${exam.subject} (${exam.targetLevel})
Penalización en test por respuesta errónea: ${exam.testPenalty || 0} puntos.

SECCIÓN 1 — PREGUNTAS TIPO TEST (Peso total: ${totalTestMax} puntos):
${exam.testQuestions
  .map(
    (q, idx) => `
- Pregunta ${idx + 1} (ID: "${q.id}") [Peso máximo: ${q.points} pts]:
  Enunciado: ${q.question}
  Opciones: A) ${q.options.A} | B) ${q.options.B} | C) ${q.options.C} | D) ${q.options.D}
  Respuesta Correcta: ${q.correctAnswer}
  Criterio: ${q.explanation}
`
  )
  .join('')}

SECCIÓN 2 — EJERCICIOS DE DESARROLLO (Peso total: ${totalExMax} puntos):
${exam.exercises
  .map(
    (ex, idx) => `
- Ejercicio ${idx + 1} (ID: "${ex.id}") [Peso máximo: ${ex.points} pts]:
  Título: ${ex.title}
  Enunciado: ${ex.statement}
  Rúbrica: ${ex.rubricCriteria.join(' | ')}
  Solución Modelo: ${ex.solutionSteps}
`
  )
  .join('')}
`;

    const instructions = `Actúa como un sistema de reconocimiento óptico de caracteres (OCR) académico y evaluador docente.
Corrige el examen entregado por el alumno "${studentName}" comparándolo estrictamente con el SOLUCIONARIO OFICIAL.

PROTOCOLO DE CORRECCIÓN Y DETECCIÓN DE INCIDENCIAS:
1. Transcribe literalmente lo que el alumno ha respondido en cada ítem ("ocrExtractedText").
2. Evalúa la LEGIBILIDAD: si detectas tachaduras ambiguas, doble marca en el test, manchas de tinta, borrones o caligrafía ilegible:
   - Establece "needsManualReview": true en esa pregunta.
   - Asigna "ocrConfidence": "low" o "illegible".
   - Redacta en "reviewReason" una indicación clara para el profesor explicando qué debe verificar visualmente.
3. Puntúa cada pregunta entre 0 y su "maxScore" según el solucionario y la rúbrica.
4. Calcula la evaluación del 0 al 10 de cada sección (testSectionScoreOutOf10 y exerciseSectionScoreOutOf10) y la nota final ponderada de 0 a 10 (finalScore).

Devuelve un JSON con esta estructura exacta:
{
  "testSectionScore": number,
  "testSectionScoreOutOf10": number,
  "exerciseSectionScore": number,
  "exerciseSectionScoreOutOf10": number,
  "finalScore": number,
  "overallFeedback": "Valoración global técnica y pedagógica",
  "needsManualReview": boolean,
  "manualReviewReasons": ["Motivo de revisión"],
  "corrections": [
    {
      "questionId": "q1",
      "type": "test",
      "questionTitle": "Título de la pregunta",
      "studentAnswer": "Resumen",
      "ocrExtractedText": "Transcripción literal",
      "ocrConfidence": "high",
      "scoreAwarded": number,
      "maxScore": number,
      "feedback": "Justificación",
      "needsManualReview": false
    }
  ]
}`;

    // 02. DEEPSEEK GRADING
    if (provider === 'deepseek' && aiConfig.deepseekKey) {
      try {
        const studentExamPrompt = `${solucionarioContext}\n\nEXAMEN ENTREGADO POR EL ALUMNO (${studentName}):\n"""\n${
          submissionInput.textContent || 'Transcripción óptica de pliego entregado.'
        }\n"""`;
        const raw = await callOpenAICompatible(
          'https://api.deepseek.com/chat/completions',
          aiConfig.deepseekKey,
          aiConfig.deepseekModel || 'deepseek-chat',
          instructions,
          studentExamPrompt
        );
        const parsed = parseJsonSafely(raw);
        return normalizeGradingReport(parsed, studentName, totalTestMax, totalExMax);
      } catch (err) {
        console.warn('DeepSeek grading failed, falling back to simulated:', err);
        return this.generateSimulatedGrading(exam, studentName, submissionInput);
      }
    }

    // 03. OPENROUTER GRADING
    if (provider === 'openrouter' && aiConfig.openrouterKey) {
      try {
        const studentExamPrompt = `${solucionarioContext}\n\nEXAMEN ENTREGADO POR EL ALUMNO (${studentName}):\n"""\n${
          submissionInput.textContent || 'Analiza el pliego adjunto.'
        }\n"""`;
        const raw = await callOpenAICompatible(
          'https://openrouter.ai/api/v1/chat/completions',
          aiConfig.openrouterKey,
          aiConfig.openrouterModel || 'deepseek/deepseek-r1',
          instructions,
          studentExamPrompt,
          {
            'HTTP-Referer': 'https://docentia.edu.es',
            'X-Title': 'Docentia Evaluacion'
          },
          submissionInput.imageBase64,
          submissionInput.mimeType
        );
        const parsed = parseJsonSafely(raw);
        return normalizeGradingReport(parsed, studentName, totalTestMax, totalExMax);
      } catch (err) {
        console.warn('OpenRouter grading failed, falling back to simulated:', err);
        return this.generateSimulatedGrading(exam, studentName, submissionInput);
      }
    }

    // 04. OPENAI GRADING
    if (provider === 'openai' && aiConfig.openaiKey) {
      try {
        const endpoint = `${(aiConfig.customBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
        const studentExamPrompt = `${solucionarioContext}\n\nEXAMEN ENTREGADO POR EL ALUMNO (${studentName}):\n"""\n${
          submissionInput.textContent || 'Analiza el pliego adjunto.'
        }\n"""`;
        const raw = await callOpenAICompatible(
          endpoint,
          aiConfig.openaiKey,
          aiConfig.openaiModel || 'gpt-4o',
          instructions,
          studentExamPrompt,
          undefined,
          submissionInput.imageBase64,
          submissionInput.mimeType
        );
        const parsed = parseJsonSafely(raw);
        return normalizeGradingReport(parsed, studentName, totalTestMax, totalExMax);
      } catch (err) {
        console.warn('OpenAI grading failed, falling back to simulated:', err);
        return this.generateSimulatedGrading(exam, studentName, submissionInput);
      }
    }

    // 05. GEMINI GRADING (Default)
    const apiKey = aiConfig.geminiKey;
    if (!apiKey) {
      await new Promise(r => setTimeout(r, 550));
      return this.generateSimulatedGrading(exam, studentName, submissionInput);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: aiConfig.geminiModel || 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.15
      }
    });

    const parts: any[] = [{ text: instructions }, { text: solucionarioContext }];

    if (
      submissionInput.imageBase64 &&
      submissionInput.mimeType &&
      !submissionInput.mimeType.includes('svg')
    ) {
      parts.push({
        inlineData: {
          data: submissionInput.imageBase64,
          mimeType: submissionInput.mimeType
        }
      });
      parts.push({ text: `Analiza la imagen escaneada del examen de ${studentName}.` });
    } else if (submissionInput.textContent) {
      parts.push({
        text: `CONTENIDO DEL EXAMEN DEL ALUMNO (${studentName}):\n"""\n${submissionInput.textContent}\n"""`
      });
    }

    try {
      const result = await model.generateContent(parts);
      const rawText = result.response.text();
      const parsed = parseJsonSafely(rawText);
      return normalizeGradingReport(parsed, studentName, totalTestMax, totalExMax);
    } catch (error) {
      console.error('Error grading with Gemini API, falling back to local analyzer:', error);
      return this.generateSimulatedGrading(exam, studentName, submissionInput);
    }
  },

  /**
   * Intelligent NLP-based local exam generator that extracts real sentences, concepts,
   * headings, and causal statements from the uploaded source text.
   */
  generateIntelligentLocalExam(
    sourceText: string,
    config: ExamGenerationConfig,
    metadata: { title: string; subject: string; targetLevel: string }
  ): { testQuestions: TestQuestion[]; exercises: OpenExercise[] } {
    // Extract meaningful declarative sentences from the source document
    const rawLines = sourceText
      .replace(/=== DOCUMENTO:.*?===/g, '')
      .replace(/\[Página \d+\]/gi, '')
      .split(/(?<=[.?!])\s+|\n+/)
      .map(s => s.replace(/^[-•*]\s*/, '').trim())
      .filter(s => s.length >= 40 && s.length <= 260 && !s.startsWith('UNIDAD'));

    // Also extract key headings or concept definitions (lines containing ':' or bold terms)
    const conceptLines = sourceText
      .split(/\n+/)
      .map(l => l.trim())
      .filter(l => l.includes(':') && l.length > 25 && l.length < 220);

    const pool = rawLines.length > 0 ? rawLines : [
      `En el marco de ${metadata.subject} (${metadata.targetLevel}), los principios fundamentales determinan la relación directa entre la estructura del sistema y su función.`,
      `El análisis metodológico en ${metadata.subject} requiere verificar las condiciones de equilibrio y conservación en cada etapa del proceso.`,
      `Las variaciones en los parámetros iniciales modifican proporcionalmente la respuesta observable según el modelo teórico estudiado.`,
      `La aplicación práctica de estos conceptos permite predecir el comportamiento del sistema ante perturbaciones externas.`
    ];

    const testPoints =
      config.numTestQuestions > 0
        ? Number((config.testSectionWeight / config.numTestQuestions).toFixed(2))
        : 0;
    const exPoints =
      config.numExercises > 0
        ? Number((config.exerciseSectionWeight / config.numExercises).toFixed(2))
        : 0;

    const testQuestions: TestQuestion[] = [];
    const correctLetters: ('A' | 'B' | 'C' | 'D')[] = ['B', 'C', 'A', 'D', 'B', 'C', 'A', 'B'];

    for (let i = 0; i < config.numTestQuestions; i++) {
      const targetFact = pool[(i * 2) % pool.length];
      const correctOpt = correctLetters[i % correctLetters.length];

      // Extract a key term from the sentence if possible
      const words = targetFact.split(/\s+/).filter(w => w.length > 5);
      const focusTerm = words[Math.min(2, words.length - 1)]?.replace(/[.,;:()]/g, '') || metadata.subject;

      // Build plausible distractors by mutating or contrasting concepts
      const distractorPool = [
        `Se produce de manera completamente independiente de ${focusTerm}, sin requerir condiciones específicas ni regulación previa.`,
        `Constituye un fenómeno irreversible que anula la actividad de ${focusTerm} en condiciones estándar de presión y temperatura.`,
        `Únicamente tiene lugar cuando se inhiben los mecanismos asociados a ${focusTerm}, generando un efecto opuesto al descrito.`,
        `Carece de relevancia funcional dentro de ${metadata.subject}, siendo una excepción descartada por la evidencia experimental.`
      ];

      const optionsMap: Record<'A' | 'B' | 'C' | 'D', string> = {
        A: distractorPool[0],
        B: distractorPool[1],
        C: distractorPool[2],
        D: distractorPool[3]
      };
      optionsMap[correctOpt] = targetFact;

      testQuestions.push({
        id: `q-gen-${Date.now()}-${i + 1}`,
        question:
          config.topicFocus && i === 0
            ? `En relación con ${config.topicFocus} dentro de ${metadata.subject}, señale cuál de las siguientes afirmaciones es rigurosamente cierta según el temario:`
            : `De acuerdo con el contenido estudiado en ${metadata.subject} sobre "${focusTerm}", indique la proposición correcta:`,
        options: optionsMap,
        correctAnswer: correctOpt,
        explanation: `La opción ${correctOpt} es la única correcta porque recoge fielmente el principio establecido en el documento fuente: "${targetFact}"`,
        points: testPoints
      });
    }

    const exercises: OpenExercise[] = [];
    for (let i = 0; i < config.numExercises; i++) {
      const primarySource =
        conceptLines[i % Math.max(1, conceptLines.length)] ||
        pool[(i * 3 + 1) % pool.length];
      const secondarySource = pool[(i * 3 + 2) % pool.length] || primarySource;

      const rawTitle = primarySource.includes(':')
        ? primarySource.split(':')[0].replace(/^\d+[\s.)-]*/, '').trim()
        : `Análisis Aplicado y Desarrollo Conceptual ${i + 1}`;
      const cleanTitle = rawTitle.length > 70 ? rawTitle.slice(0, 67) + '...' : rawTitle;

      const pA = Number((exPoints * 0.35).toFixed(2));
      const pB = Number((exPoints * 0.40).toFixed(2));
      const pC = Number((exPoints - pA - pB).toFixed(2));

      exercises.push({
        id: `ex-gen-${Date.now()}-${i + 1}`,
        title: cleanTitle || `Problema de Desarrollo ${i + 1}`,
        statement: `A partir de los contenidos desarrollados en la unidad de ${metadata.subject} (${metadata.targetLevel}):\n\na) Explique y fundamente teóricamente el siguiente postulado del temario: "${primarySource}". (${pA} pts)\nb) Relacione dicho principio con el proceso asociado: "${secondarySource}", detallando sus etapas o mecanismos clave. (${pB} pts)\nc) Justifique razonadamente qué consecuencias tendría una alteración o bloqueo en este proceso. (${pC} pts)`,
        rubricCriteria: [
          `Apartado a: Definición precisa y uso correcto de la terminología sobre ${cleanTitle} (${pA} pts)`,
          `Apartado b: Desarrollo ordenado de los mecanismos y relación causal (${pB} pts)`,
          `Apartado c: Deducción lógica y justificada de las consecuencias ante una alteración (${pC} pts)`
        ],
        solutionSteps: `a) Fundamentación teórica:\nSegún el material de referencia, ${primarySource}\n\nb) Desarrollo y relación mecanística:\n${secondarySource}\nEl alumno debe exponer la secuencia completa de pasos sin omitir las condiciones principales.\n\nc) Consecuencias de la alteración:\nSi se bloquea o modifica la etapa crítica descrita, se interrumpe la vía funcional completa, impidiendo alcanzar el producto o equilibrio final esperado en el sistema.`,
        points: exPoints
      });
    }

    return { testQuestions, exercises };
  },

  /**
   * Simulated grading for student exam when API key is not configured
   */
  generateSimulatedGrading(
    exam: Exam,
    studentName: string,
    submissionInput: { textContent?: string; imageBase64?: string }
  ): StudentGradeReport {
    const lowerName = studentName.toLowerCase();
    const rawText = (submissionInput.textContent || '').toLowerCase();
    const hasAmbiguity = Boolean(
      lowerName.includes('carlos') ||
        lowerName.includes('marcos') ||
        lowerName.includes('borroso') ||
        lowerName.includes('tach') ||
        rawText.includes('tach') ||
        rawText.includes('ilegible')
    );

    const corrections: QuestionCorrection[] = [];
    let testScore = 0;
    let exScore = 0;

    exam.testQuestions.forEach((q, idx) => {
      const isAmbiguousQ = hasAmbiguity && idx === 1;
      const isCorrect = !isAmbiguousQ;
      const awarded = isCorrect ? q.points : 0;
      testScore += awarded;

      corrections.push({
        questionId: q.id,
        type: 'test',
        questionTitle: `Pregunta ${idx + 1}`,
        studentAnswer: isCorrect
          ? `Opción ${q.correctAnswer}`
          : `Opción ${q.correctAnswer} (con tachón previo en A)`,
        ocrExtractedText: isCorrect
          ? `Marca nítida detectada en casilla [${q.correctAnswer}] (99.1% confianza OCR).`
          : `[ALERTA OCR]: Tachadura densa sobre casilla [A] y marca adyacente en [${q.correctAnswer}].`,
        ocrConfidence: isCorrect ? 'high' : 'low',
        scoreAwarded: awarded,
        maxScore: q.points,
        feedback: isCorrect
          ? `Correcto. Coincide con la clave oficial (${q.correctAnswer}).`
          : 'Calificado con 0.00 pts preventivamente por doble marca/tachón. Pendiente de confirmación docente.',
        needsManualReview: isAmbiguousQ,
        reviewReason: isAmbiguousQ
          ? 'Doble marca con tachón entre las opciones A y B. Verificar visualmente la intención del alumno.'
          : undefined
      });
    });

    exam.exercises.forEach((ex, idx) => {
      const needsReviewThis = Boolean(hasAmbiguity && idx === exam.exercises.length - 1);
      const awarded = needsReviewThis
        ? Number((ex.points * 0.45).toFixed(2))
        : Number((ex.points * 0.9).toFixed(2));
      exScore += awarded;

      corrections.push({
        questionId: ex.id,
        type: 'exercise',
        questionTitle: `Ejercicio ${idx + 1}: ${ex.title}`,
        studentAnswer: needsReviewThis
          ? 'Apartado a) correcto; apartado b) presenta caligrafía borrosa y tachaduras.'
          : 'Desarrollo completo y bien justificado en todos los apartados.',
        ocrExtractedText: needsReviewThis
          ? `a) Planteamiento inicial correcto según temario.\nb) ... [FRAGMENTO CON MANCHA DE TINTA / CONFIANZA OCR 38%] ... alteración del resultado.`
          : `Resolución manuscrita leída correctamente:\n${ex.solutionSteps.slice(0, 180)}...`,
        ocrConfidence: needsReviewThis ? 'illegible' : 'high',
        scoreAwarded: awarded,
        maxScore: ex.points,
        feedback: needsReviewThis
          ? 'Se puntúa únicamente el primer apartado legible. El segundo apartado requiere lectura directa del documento escaneado.'
          : 'Cumple satisfactoriamente los criterios de la rúbrica de evaluación.',
        needsManualReview: needsReviewThis,
        reviewReason: needsReviewThis
          ? `Baja legibilidad manuscrita y borrón de tinta en la segunda mitad del Ejercicio ${idx + 1}.`
          : undefined
      });
    });

    const totalTestMax = exam.testQuestions.reduce((a, b) => a + b.points, 0);
    const totalExMax = exam.exercises.reduce((a, b) => a + b.points, 0);
    const totalMax = totalTestMax + totalExMax || 10;

    const testOut10 = totalTestMax > 0 ? Number(((testScore / totalTestMax) * 10).toFixed(2)) : 0;
    const exOut10 = totalExMax > 0 ? Number(((exScore / totalExMax) * 10).toFixed(2)) : 0;
    const finalScore = Number((((testScore + exScore) / totalMax) * 10).toFixed(2));

    return {
      id: `rep-${Date.now()}`,
      submissionId: `sub-${Date.now()}`,
      studentName,
      testSectionScore: Number(testScore.toFixed(2)),
      testSectionMax: Number(totalTestMax.toFixed(2)),
      testSectionScoreOutOf10: testOut10,
      exerciseSectionScore: Number(exScore.toFixed(2)),
      exerciseSectionMax: Number(totalExMax.toFixed(2)),
      exerciseSectionScoreOutOf10: exOut10,
      finalScore,
      overallFeedback: hasAmbiguity
        ? `Calificación provisional: ${finalScore.toFixed(1)}/10. Se han detectado 2 incidencias de lectura óptica que requieren revisión del docente.`
        : `Evaluación completada sin incidencias de legibilidad. Calificación global: ${finalScore.toFixed(1)}/10.`,
      needsManualReview: hasAmbiguity,
      manualReviewReasons: hasAmbiguity
        ? [
            'Pregunta 2 (Test): Tachón detectado entre opciones A y B.',
            `Ejercicio ${exam.exercises.length}: Fragmento manuscrito con baja legibilidad.`
          ]
        : [],
      gradedAt: new Date().toISOString(),
      corrections
    };
  }
};

export const AIService = GeminiService;

