import React, { useState } from 'react';
import {
  X,
  Key,
  ExternalLink,
  Check,
  Sparkles,
  ShieldCheck,
  Trash2,
  Cpu
} from 'lucide-react';
import { StorageService } from '../services/storageService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: (key: string, model: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved
}) => {
  const [apiKey, setApiKey] = useState(StorageService.getApiKey());
  const [modelName, setModelName] = useState(StorageService.getModelName());
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    StorageService.setApiKey(apiKey);
    StorageService.setModelName(modelName);
    onKeySaved(apiKey.trim(), modelName);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    StorageService.setApiKey('');
    setApiKey('');
    onKeySaved('', modelName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0C0D0E]/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#F6F5F0] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#0C0D0E]">
        
        {/* Obsidian Header */}
        <div className="bg-[#0C0D0E] text-[#F6F5F0] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-[#FF4400] text-white flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400 block">
                MOTOR NEURAL MULTIMODAL
              </span>
              <h3 className="font-serif italic text-2xl text-white leading-none">
                Configuración de Gemini API
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-600 block">
              MODELO DE RAZONAMIENTO Y VISIÓN OCR
            </label>
            <select
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-lg bg-white border border-[#0C0D0E]/20 focus:outline-none focus:ring-2 focus:ring-[#0C0D0E]"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recomendado · Rápido y Visión OCR)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (Máxima precisión académica y STEM)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (Estándar multimodal)</option>
            </select>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-600">
                GOOGLE AI STUDIO API KEY
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF4400] hover:underline flex items-center space-x-1 text-[11px] font-bold"
              >
                <span>Obtener clave gratuita</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-lg bg-white border border-[#0C0D0E]/20 focus:outline-none focus:ring-2 focus:ring-[#0C0D0E]"
            />

            <div className="flex items-center space-x-1.5 text-[11px] text-zinc-600 pt-1">
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                Almacenamiento estrictamente local en tu navegador (<code className="font-mono">localStorage</code>). Si se deja en blanco, la plataforma opera con el motor sintético local.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#0C0D0E]/10">
            {apiKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 font-bold"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Desconectar clave</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-200/60 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0C0D0E] hover:bg-[#FF4400] rounded-lg transition"
              >
                {isSaved ? <Check className="h-4 w-4" /> : null}
                <span>{isSaved ? '¡Configuración Guardada!' : 'Guardar Motor'}</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
