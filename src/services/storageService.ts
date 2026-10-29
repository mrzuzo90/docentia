import { Exam, StudentSubmission, AIProviderConfig, AIProviderId } from '../types';
import { SAMPLE_EXAM, SAMPLE_EXAM_PHYSICS, SAMPLE_STUDENT_SUBMISSIONS } from './mockData';

const STORAGE_KEYS = {
  EXAMS: 'eduexamen_v2_saved_exams',
  CURRENT_EXAM_ID: 'eduexamen_v2_current_id',
  SUBMISSIONS_PREFIX: 'eduexamen_v2_submissions_',
  API_KEY: 'eduexamen_gemini_key',
  MODEL_NAME: 'eduexamen_gemini_model',
  AI_CONFIG: 'docentia_ai_provider_config_v1'
};

// In-memory fallback cache so the app never fails even if localStorage quota is exceeded
let memoryExamsCache: Exam[] | null = null;
const memorySubmissionsCache = new Map<string, StudentSubmission[]>();

function sanitizeExamForStorage(exam: Exam): Exam {
  return {
    ...exam,
    documents: (exam.documents || []).map(doc => ({
      ...doc,
      // Never serialize raw base64 PDFs/images into localStorage (5MB limit)
      base64Data: undefined,
      content: doc.content ? doc.content.slice(0, 60000) : ''
    }))
  };
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`localStorage quota warning on key ${key}, using in-memory cache:`, err);
  }
}

export const StorageService = {
  getAIConfig(): AIProviderConfig {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
    const defaultGeminiKey =
      localStorage.getItem(STORAGE_KEYS.API_KEY)?.trim() || env.VITE_GEMINI_API_KEY?.trim() || '';
    const defaultGeminiModel =
      localStorage.getItem(STORAGE_KEYS.MODEL_NAME)?.trim() || 'gemini-2.5-flash';

    const defaults: AIProviderConfig = {
      provider:
        (env.VITE_AI_PROVIDER as AIProviderId) || (defaultGeminiKey ? 'gemini' : 'local'),
      geminiKey: defaultGeminiKey,
      geminiModel: defaultGeminiModel,
      deepseekKey: env.VITE_DEEPSEEK_API_KEY?.trim() || '',
      deepseekModel: 'deepseek-chat',
      openrouterKey: env.VITE_OPENROUTER_API_KEY?.trim() || '',
      openrouterModel: 'deepseek/deepseek-r1',
      openaiKey: env.VITE_OPENAI_API_KEY?.trim() || '',
      openaiModel: 'gpt-4o',
      customBaseUrl: 'https://api.openai.com/v1'
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AI_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaults,
          ...parsed,
          geminiKey: parsed.geminiKey || defaultGeminiKey,
          geminiModel: parsed.geminiModel || defaultGeminiModel
        };
      }
    } catch {
      // Fallback
    }

    return defaults;
  },

  saveAIConfig(config: AIProviderConfig): void {
    safeSetItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify(config));
    if (config.geminiKey) {
      safeSetItem(STORAGE_KEYS.API_KEY, config.geminiKey);
    }
    if (config.geminiModel) {
      safeSetItem(STORAGE_KEYS.MODEL_NAME, config.geminiModel);
    }
  },

  getActiveProvider(): AIProviderId {
    return this.getAIConfig().provider;
  },

  getApiKey(): string {
    const config = this.getAIConfig();
    switch (config.provider) {
      case 'gemini':
        return config.geminiKey;
      case 'deepseek':
        return config.deepseekKey;
      case 'openrouter':
        return config.openrouterKey;
      case 'openai':
        return config.openaiKey;
      case 'local':
      default:
        return '';
    }
  },

  setApiKey(key: string): void {
    const config = this.getAIConfig();
    config.geminiKey = key.trim();
    this.saveAIConfig(config);
    safeSetItem(STORAGE_KEYS.API_KEY, key.trim());
  },

  getModelName(): string {
    const config = this.getAIConfig();
    switch (config.provider) {
      case 'gemini':
        return config.geminiModel || 'gemini-2.5-flash';
      case 'deepseek':
        return config.deepseekModel || 'deepseek-chat';
      case 'openrouter':
        return config.openrouterModel || 'deepseek/deepseek-r1';
      case 'openai':
        return config.openaiModel || 'gpt-4o';
      case 'local':
      default:
        return 'local-nlp';
    }
  },

  setModelName(model: string): void {
    const config = this.getAIConfig();
    switch (config.provider) {
      case 'gemini':
        config.geminiModel = model;
        break;
      case 'deepseek':
        config.deepseekModel = model;
        break;
      case 'openrouter':
        config.openrouterModel = model;
        break;
      case 'openai':
        config.openaiModel = model;
        break;
    }
    this.saveAIConfig(config);
  },

  getAllExams(): Exam[] {
    if (memoryExamsCache && memoryExamsCache.length > 0) {
      return memoryExamsCache;
    }

    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXAMS);
      if (!data) {
        const initial = [SAMPLE_EXAM, SAMPLE_EXAM_PHYSICS];
        memoryExamsCache = initial;
        safeSetItem(STORAGE_KEYS.EXAMS, JSON.stringify(initial.map(sanitizeExamForStorage)));
        safeSetItem(STORAGE_KEYS.CURRENT_EXAM_ID, SAMPLE_EXAM.id);
        this.saveSubmissions(SAMPLE_EXAM.id, SAMPLE_STUDENT_SUBMISSIONS);
        return initial;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryExamsCache = parsed;
        return parsed;
      }
    } catch {
      // Fallback
    }

    const fallback = [SAMPLE_EXAM, SAMPLE_EXAM_PHYSICS];
    memoryExamsCache = fallback;
    return fallback;
  },

  getCurrentExam(): Exam {
    const exams = this.getAllExams();
    let currentId: string | null = null;
    try {
      currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_EXAM_ID);
    } catch {
      // ignore
    }
    const found = exams.find(e => e.id === currentId);
    return found || exams[0] || SAMPLE_EXAM;
  },

  saveExam(exam: Exam): void {
    const exams = [...this.getAllExams()];
    const index = exams.findIndex(e => e.id === exam.id);
    if (index >= 0) {
      exams[index] = exam;
    } else {
      exams.unshift(exam);
    }
    memoryExamsCache = exams;
    safeSetItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams.map(sanitizeExamForStorage)));
    safeSetItem(STORAGE_KEYS.CURRENT_EXAM_ID, exam.id);
  },

  deleteExam(examId: string): Exam[] {
    let exams = this.getAllExams().filter(e => e.id !== examId);
    if (exams.length === 0) {
      exams = [SAMPLE_EXAM];
    }
    memoryExamsCache = exams;
    safeSetItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams.map(sanitizeExamForStorage)));
    try {
      localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS_PREFIX + examId);
    } catch {
      // ignore
    }
    memorySubmissionsCache.delete(examId);
    safeSetItem(STORAGE_KEYS.CURRENT_EXAM_ID, exams[0].id);
    return exams;
  },

  setCurrentExamId(id: string): void {
    safeSetItem(STORAGE_KEYS.CURRENT_EXAM_ID, id);
  },

  getSubmissions(examId: string): StudentSubmission[] {
    if (memorySubmissionsCache.has(examId)) {
      return memorySubmissionsCache.get(examId)!;
    }
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS_PREFIX + examId);
      if (!data) {
        if (examId === SAMPLE_EXAM.id) {
          this.saveSubmissions(SAMPLE_EXAM.id, SAMPLE_STUDENT_SUBMISSIONS);
          return SAMPLE_STUDENT_SUBMISSIONS;
        }
        return [];
      }
      const parsed = JSON.parse(data);
      memorySubmissionsCache.set(examId, parsed);
      return parsed;
    } catch {
      return examId === SAMPLE_EXAM.id ? SAMPLE_STUDENT_SUBMISSIONS : [];
    }
  },

  saveSubmissions(examId: string, submissions: StudentSubmission[]): void {
    memorySubmissionsCache.set(examId, submissions);
    // Strip overly large scanImageUrl if > 250KB to avoid storage overflow
    const compact = submissions.map(s => ({
      ...s,
      scanImageUrl: s.scanImageUrl && s.scanImageUrl.length > 250000 ? undefined : s.scanImageUrl
    }));
    safeSetItem(STORAGE_KEYS.SUBMISSIONS_PREFIX + examId, JSON.stringify(compact));
  },

  resetToDemo(): void {
    const initial = [SAMPLE_EXAM, SAMPLE_EXAM_PHYSICS];
    memoryExamsCache = initial;
    safeSetItem(STORAGE_KEYS.EXAMS, JSON.stringify(initial.map(sanitizeExamForStorage)));
    safeSetItem(STORAGE_KEYS.CURRENT_EXAM_ID, SAMPLE_EXAM.id);
    this.saveSubmissions(SAMPLE_EXAM.id, SAMPLE_STUDENT_SUBMISSIONS);
    this.saveSubmissions(SAMPLE_EXAM_PHYSICS.id, []);
  }
};
