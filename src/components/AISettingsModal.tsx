import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ExternalLink,
  Check,
  Cpu,
  Sparkles,
  Zap,
  Globe,
  Server,
  ShieldCheck,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { SoundService } from '../services/soundService';
import { AIProviderConfig, AIProviderId } from '../types';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderChanged?: (provider: AIProviderId, model: string) => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  onProviderChanged
}) => {
  const [config, setConfig] = useState<AIProviderConfig>(StorageService.getAIConfig());
  const [activeTab, setActiveTab] = useState<AIProviderId>(config.provider);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    latencyMs?: number;
  } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = StorageService.getAIConfig();
      setConfig(current);
      setActiveTab(current.provider);
      setTestResult(null);
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await GeminiService.testConnection(activeTab, config);
      setTestResult(res);
      if (res.success) {
        SoundService.playSuccess();
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const updated: AIProviderConfig = {
      ...config,
      provider: activeTab
    };
    StorageService.saveAIConfig(updated);
    setConfig(updated);
    setIsSaved(true);
    SoundService.playSuccess();

    const activeModel =
      activeTab === 'gemini'
        ? updated.geminiModel
        : activeTab === 'deepseek'
        ? updated.deepseekModel
        : activeTab === 'openrouter'
        ? updated.openrouterModel
        : activeTab === 'openai'
        ? updated.openaiModel
        : 'local-nlp';

    onProviderChanged?.(activeTab, activeModel);

    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 700);
  };

  const handleClearCurrentKey = () => {
    const next = { ...config };
    if (activeTab === 'gemini') next.geminiKey = '';
    if (activeTab === 'deepseek') next.deepseekKey = '';
    if (activeTab === 'openrouter') next.openrouterKey = '';
    if (activeTab === 'openai') next.openaiKey = '';
    setConfig(next);
    setTestResult(null);
  };

  const providerTabs: {
    id: AIProviderId;
    name: string;
    badge: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      badge: 'Multimodal',
      icon: Sparkles
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      badge: 'Razonamiento',
      icon: Zap
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      badge: 'Multi-Modelo',
      icon: Globe
    },
    {
      id: 'openai',
      name: 'OpenAI / Custom',
      badge: 'Estándar',
      icon: Server
    },
    {
      id: 'local',
      name: 'Motor Local',
      badge: '0 € · Offline',
      icon: Cpu
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#1d1d1f]/40 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#ffffff] rounded-[28px] max-w-2xl w-full overflow-hidden border border-[#d6d6d6] shadow-[0_20px_60px_rgba(0,0,0,0.14)] flex flex-col max-h-[92vh]">
        
        {/* Apple España Modal Header */}
        <div className="px-8 pt-7 pb-5 border-b border-[#d6d6d6] flex items-center justify-between">
          <div>
            <span className="apple-badge-ember mb-1.5">
              Configuración de Inteligencia Artificial
            </span>
            <h3 className="text-[26px] font-semibold text-[#1d1d1f] tracking-tight leading-none mt-1">
              Proveedores y Motores de IA
            </h3>
            <p className="text-[14px] text-[#707070] mt-1.5">
              Elige el proveedor que alimentará la síntesis de exámenes y la corrección de rúbricas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-full transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Provider Segmented Nav */}
        <div className="px-8 pt-4 pb-2 bg-[#fafafc] border-b border-[#d6d6d6] overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max p-1 bg-[#f5f5f7] rounded-full border border-[#d6d6d6]/60">
            {providerTabs.map(tab => {
              const Icon = tab.icon;
              const isCurrent = activeTab === tab.id;
              const isConfigured =
                tab.id === 'local'
                  ? true
                  : tab.id === 'gemini'
                  ? Boolean(config.geminiKey)
                  : tab.id === 'deepseek'
                  ? Boolean(config.deepseekKey)
                  : tab.id === 'openrouter'
                  ? Boolean(config.openrouterKey)
                  : Boolean(config.openaiKey);

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    SoundService.playClick();
                    setActiveTab(tab.id);
                    setTestResult(null);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition ${
                    isCurrent
                      ? 'bg-[#ffffff] text-[#1d1d1f] shadow-xs'
                      : 'text-[#707070] hover:text-[#1d1d1f]'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      isCurrent ? 'text-[#0071e3]' : 'text-[#707070]'
                    }`}
                  />
                  <span>{tab.name}</span>
                  {isConfigured && tab.id !== 'local' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-[#ffffff]">
          
          {/* TAB 1: GOOGLE GEMINI */}
          {activeTab === 'gemini' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-[20px] bg-[#fafafc] border border-[#d6d6d6] text-[13px] text-[#474747] leading-relaxed">
                <strong className="text-[#1d1d1f]">Motor Oficial Recomendado:</strong> Google Gemini ofrece visión multimodal nativa directa. Es capaz de leer PDFs pesados de apuntes y fotos de exámenes manuscritos de alumnos con alta fidelidad y velocidad.
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
                  Modelo de Gemini
                </label>
                <select
                  value={config.geminiModel}
                  onChange={e => setConfig({ ...config, geminiModel: e.target.value })}
                  className="w-full text-[14px] px-3.5 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                >
                  <option value="gemini-2.5-flash">
                    gemini-2.5-flash (Recomendado · Rápido y Visión Multimodal)
                  </option>
                  <option value="gemini-2.5-pro">
                    gemini-2.5-pro (Máxima precisión y razonamiento STEM)
                  </option>
                  <option value="gemini-1.5-flash">
                    gemini-1.5-flash (Estándar de alto rendimiento)
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
                    Google AI Studio API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-[#0066cc] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Obtener clave gratuita</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={config.geminiKey}
                    onChange={e => setConfig({ ...config, geminiKey: e.target.value.trim() })}
                    className="w-full text-[14px] px-4 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707070] hover:text-[#1d1d1f]"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEEPSEEK */}
          {activeTab === 'deepseek' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-[20px] bg-[#fafafc] border border-[#d6d6d6] text-[13px] text-[#474747] leading-relaxed">
                <strong className="text-[#1d1d1f]">DeepSeek API Oficial:</strong> Los modelos DeepSeek-V3 y DeepSeek-R1 ofrecen un razonamiento matemático y formulación de enunciados de altísimo nivel académico a un coste por token sumamente económico.
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
                  Modelo DeepSeek
                </label>
                <select
                  value={config.deepseekModel}
                  onChange={e => setConfig({ ...config, deepseekModel: e.target.value })}
                  className="w-full text-[14px] px-3.5 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                >
                  <option value="deepseek-chat">
                    deepseek-chat (DeepSeek-V3 · Alta velocidad y síntesis curricular)
                  </option>
                  <option value="deepseek-reasoner">
                    deepseek-reasoner (DeepSeek-R1 · Cadena de razonamiento para problemas complejos)
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
                    DeepSeek Platform API Key
                  </label>
                  <a
                    href="https://platform.deepseek.com/api_keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-[#0066cc] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Consola de DeepSeek</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={config.deepseekKey}
                    onChange={e => setConfig({ ...config, deepseekKey: e.target.value.trim() })}
                    className="w-full text-[14px] px-4 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707070] hover:text-[#1d1d1f]"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OPENROUTER */}
          {activeTab === 'openrouter' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-[20px] bg-[#fafafc] border border-[#d6d6d6] text-[13px] text-[#474747] leading-relaxed">
                <strong className="text-[#1d1d1f]">OpenRouter Aggregator:</strong> Con una sola API key puedes utilizar cualquier modelo de última generación del mercado: Claude 3.5 Sonnet, GPT-4o, DeepSeek R1 o Llama 3.3.
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
                  Modelo Seleccionado en OpenRouter
                </label>
                <div className="space-y-2">
                  <select
                    value={config.openrouterModel}
                    onChange={e => setConfig({ ...config, openrouterModel: e.target.value })}
                    className="w-full text-[14px] px-3.5 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                  >
                    <option value="deepseek/deepseek-r1">
                      deepseek/deepseek-r1 (Razonamiento profundo Open-Weights)
                    </option>
                    <option value="anthropic/claude-3.5-sonnet">
                      anthropic/claude-3.5-sonnet (Máxima calidad de redacción y rúbricas)
                    </option>
                    <option value="openai/gpt-4o">
                      openai/gpt-4o (Multimodal omni de OpenAI)
                    </option>
                    <option value="meta-llama/llama-3.3-70b-instruct">
                      meta-llama/llama-3.3-70b-instruct (Rápido y económico)
                    </option>
                    <option value="google/gemini-2.5-flash">
                      google/gemini-2.5-flash (Vía OpenRouter)
                    </option>
                  </select>

                  <input
                    type="text"
                    placeholder="O escribe otro ID (ej. mistralai/mistral-large-2411)"
                    value={config.openrouterModel}
                    onChange={e => setConfig({ ...config, openrouterModel: e.target.value.trim() })}
                    className="w-full text-[13px] px-3 py-1.5 rounded-[12px] bg-[#ffffff] border border-[#d6d6d6] text-[#707070] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
                    OpenRouter API Key
                  </label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-[#0066cc] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Generar clave en OpenRouter</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-or-v1-..."
                    value={config.openrouterKey}
                    onChange={e => setConfig({ ...config, openrouterKey: e.target.value.trim() })}
                    className="w-full text-[14px] px-4 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707070] hover:text-[#1d1d1f]"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OPENAI / CUSTOM */}
          {activeTab === 'openai' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-[20px] bg-[#fafafc] border border-[#d6d6d6] text-[13px] text-[#474747] leading-relaxed">
                <strong className="text-[#1d1d1f]">OpenAI o Endpoint Compatible:</strong> Utiliza la API directa de OpenAI o apunta la URL base a cualquier servidor local (Ollama en <code>http://localhost:11434/v1</code>, vLLM o LMStudio).
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={config.openaiModel}
                    onChange={e => setConfig({ ...config, openaiModel: e.target.value.trim() })}
                    placeholder="gpt-4o, gpt-4o-mini, llama3..."
                    className="w-full text-[14px] px-3.5 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f] font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
                    Base URL (Opcional)
                  </label>
                  <input
                    type="text"
                    value={config.customBaseUrl}
                    onChange={e => setConfig({ ...config, customBaseUrl: e.target.value.trim() })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full text-[14px] px-3.5 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
                    API Key
                  </label>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-[#0066cc] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Plataforma OpenAI</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={config.openaiKey}
                    onChange={e => setConfig({ ...config, openaiKey: e.target.value.trim() })}
                    className="w-full text-[14px] px-4 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#d6d6d6] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707070] hover:text-[#1d1d1f]"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MOTOR LOCAL */}
          {activeTab === 'local' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 rounded-[20px] bg-[#fafafc] border border-[#d6d6d6] space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-[15px]">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Modo Local Autónomo Activo (0 €)</span>
                </div>
                <p className="text-[14px] text-[#474747] leading-relaxed">
                  Docentia cuenta con un motor semántico NLP integrado en el navegador. Extrae oraciones declarativas, conceptos clave y definiciones de tus propios textos para crear preguntas y solucionarios de forma 100% privada sin consumir cuota ni requerir conexión a internet.
                </p>
              </div>

              <div className="p-4 rounded-[16px] border border-[#d6d6d6] text-[13px] text-[#707070] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>
                  Tus datos y apuntes nunca salen de tu ordenador.
                </span>
              </div>
            </div>
          )}

          {/* Test Connection Result Box */}
          {testResult && (
            <div
              className={`p-4 rounded-[18px] border text-[13px] flex items-start gap-3 transition animate-fadeIn ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{testResult.message}</p>
                {testResult.latencyMs !== undefined && (
                  <span className="text-[11px] opacity-75">
                    Latencia: {testResult.latencyMs} ms
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-[12px] text-[#707070] pt-1">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              Todas las claves se guardan cifradas únicamente en tu navegador (<code>localStorage</code>) y se envían de forma directa al proveedor.
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-8 py-5 border-t border-[#d6d6d6] bg-[#fafafc] flex items-center justify-between gap-3">
          <div>
            {activeTab !== 'local' && (
              <button
                type="button"
                onClick={handleClearCurrentKey}
                className="text-[13px] text-[#b64400] hover:underline flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Borrar clave</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'local' && (
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="apple-pill-ghost text-[14px] py-2 px-4"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Probando...</span>
                  </>
                ) : (
                  <span>Probar conexión</span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="apple-pill-primary text-[14px] py-2 px-5"
            >
              {isSaved ? <Check className="h-4 w-4" /> : null}
              <span>{isSaved ? '¡Guardado!' : 'Activar y Guardar'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
