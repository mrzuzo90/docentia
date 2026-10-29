import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  BarChart3,
  Coins,
  RotateCcw,
  Plus,
  AlertTriangle,
  ScanLine,
  Trash2,
  ChevronDown,
  Volume2,
  VolumeX,
  Cpu
} from 'lucide-react';
import { Exam, UserBillingAccount, AIProviderId } from '../types';
import { SoundService } from '../services/soundService';

interface NavbarProps {
  activeTab: 'upload' | 'exam' | 'grading' | 'gradebook';
  setActiveTab: (tab: 'upload' | 'exam' | 'grading' | 'gradebook') => void;
  exams: Exam[];
  currentExam: Exam;
  onSelectExam: (exam: Exam) => void;
  onCreateNewExam: () => void;
  onDeleteExam: (examId: string, e: React.MouseEvent) => void;
  billingAccount: UserBillingAccount;
  onOpenPricingModal: (initialTab?: 'plans' | 'packs' | 'ledger') => void;
  onOpenCommandPalette?: () => void;
  onLoadDemo: () => void;
  pendingReviewsCount: number;
  totalSubmissionsCount: number;
  onOpenAISettings?: () => void;
  activeAIProvider?: AIProviderId;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  exams,
  currentExam,
  onSelectExam,
  onCreateNewExam,
  onDeleteExam,
  billingAccount,
  onOpenPricingModal,
  onLoadDemo,
  pendingReviewsCount,
  totalSubmissionsCount,
  onOpenAISettings,
  activeAIProvider = 'gemini'
}) => {
  const [isExamMenuOpen, setIsExamMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => SoundService.isMuted());

  const navItems = [
    {
      id: 'upload' as const,
      label: 'Crear examen',
      icon: UploadCloud
    },
    {
      id: 'exam' as const,
      label: 'Solucionario',
      icon: FileText
    },
    {
      id: 'grading' as const,
      label: 'Corrección OCR',
      icon: ScanLine,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined
    },
    {
      id: 'gradebook' as const,
      label: 'Acta de notas',
      icon: BarChart3
    }
  ];

  const handleTabSwitch = (tab: 'upload' | 'exam' | 'grading' | 'gradebook') => {
    SoundService.playClick();
    setActiveTab(tab);
  };

  return (
    <header className="no-print sticky top-0 z-30 bg-[#ffffff]/80 backdrop-blur-md border-b border-[#d6d6d6] transition-all">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        
        {/* Brand Logo (Apple Whispered Mark + Docentia) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleTabSwitch('upload')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <img
              src="/assets/mascot/lechuza-mark.svg"
              alt="Marca Docentia"
              className="w-7 h-7 shrink-0 transition-transform group-hover:scale-105"
            />
            <span className="font-semibold text-[19px] leading-none tracking-[-0.02em] text-[#1d1d1f]">
              docentia
            </span>
          </button>

          {/* Exam Selector Pill (Minimalist hairline pill) */}
          <div className="relative hidden xl:block ml-2">
            <button
              type="button"
              onClick={() => {
                SoundService.playClick();
                setIsExamMenuOpen(!isExamMenuOpen);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#d6d6d6] hover:border-[#1d1d1f] text-[13px] text-[#1d1d1f] bg-[#ffffff]/60 transition-colors"
            >
              <span className="max-w-[140px] truncate">{currentExam.subject}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#707070]" />
            </button>

            {isExamMenuOpen && (
              <div
                className="absolute left-0 mt-2 w-80 bg-[#ffffff] border border-[#d6d6d6] rounded-[20px] p-3 z-50 space-y-2 shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
                onMouseLeave={() => setIsExamMenuOpen(false)}
              >
                <div className="flex items-center justify-between px-2 pb-2 border-b border-[#d6d6d6]/60">
                  <span className="text-[12px] font-medium text-[#707070]">
                    Convocatorias ({exams.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      SoundService.playClick();
                      setIsExamMenuOpen(false);
                      onCreateNewExam();
                    }}
                    className="text-[12px] font-medium text-[#0066cc] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {exams.map(ex => {
                    const isSelected = ex.id === currentExam.id;
                    return (
                      <div
                        key={ex.id}
                        onClick={() => {
                          SoundService.playClick();
                          onSelectExam(ex);
                          setIsExamMenuOpen(false);
                        }}
                        className={`flex items-center justify-between p-2 rounded-[14px] cursor-pointer transition ${
                          isSelected
                            ? 'bg-[#f5f5f7] text-[#1d1d1f] font-medium'
                            : 'hover:bg-[#f5f5f7] text-[#474747]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-[14px] truncate">{ex.title}</div>
                          <div className="text-[12px] text-[#707070] truncate">
                            {ex.subject} · {ex.targetLevel}
                          </div>
                        </div>
                        {exams.length > 1 && (
                          <button
                            type="button"
                            onClick={e => onDeleteExam(ex.id, e)}
                            className="p-1 text-[#707070] hover:text-[#1d1d1f]"
                            title="Eliminar examen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#d6d6d6]/60">
                  <button
                    type="button"
                    onClick={() => {
                      SoundService.playClick();
                      setIsExamMenuOpen(false);
                      onLoadDemo();
                    }}
                    className="w-full py-1.5 px-3 rounded-full border border-[#d6d6d6] text-[12px] font-normal text-[#707070] hover:text-[#1d1d1f] flex items-center justify-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar demo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Navigation Pills (Apple Segments) */}
        <nav className="flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-full overflow-x-auto">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabSwitch(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] transition whitespace-nowrap ${
                  isActive
                    ? 'bg-[#ffffff] text-[#1d1d1f] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#474747] hover:text-[#1d1d1f]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-[#0071e3]' : 'text-[#707070]'
                  }`}
                />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#b64400] text-[#ffffff] text-[11px] font-medium">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Controls (Apple Minimalist Pills) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(SoundService.toggleMute())}
            className="p-2 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition"
            title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#707070]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#1d1d1f]" />
            )}
          </button>

          {/* Pending Reviews Badge Pill */}
          {pendingReviewsCount > 0 && (
            <button
              type="button"
              onClick={() => handleTabSwitch('grading')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b64400]/10 text-[#b64400] text-[12px] font-medium hover:bg-[#b64400]/15 transition"
              title="Exámenes pendientes de revisión manual"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{pendingReviewsCount} por revisar</span>
            </button>
          )}

          {/* AI Engine Selector Pill */}
          <button
            type="button"
            onClick={() => {
              SoundService.playClick();
              onOpenAISettings?.();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#d6d6d6] hover:border-[#1d1d1f] text-[13px] text-[#1d1d1f] bg-[#ffffff] transition"
            title="Configurar motor de IA (Gemini, DeepSeek, OpenRouter, OpenAI, Local)"
          >
            <Cpu className="w-3.5 h-3.5 text-[#0071e3]" />
            <span className="capitalize">{activeAIProvider || 'IA'}</span>
          </button>

          {/* Credits Balance Pill */}
          <button
            type="button"
            onClick={() => {
              SoundService.playClick();
              onOpenPricingModal('ledger');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#d6d6d6] hover:border-[#1d1d1f] text-[13px] text-[#1d1d1f] bg-transparent transition"
            title="Ver saldo de créditos y extracto"
          >
            <Coins className="w-3.5 h-3.5 text-[#707070]" />
            <span>{billingAccount.creditsBalance} cr.</span>
          </button>

          {/* Primary Filled Pill CTA (#0071e3 Electric Blue) */}
          <button
            type="button"
            onClick={() => {
              SoundService.playClick();
              onOpenPricingModal('plans');
            }}
            className="apple-pill-primary text-[14px] py-1.5 px-4"
          >
            <span>Planes</span>
          </button>
        </div>

      </div>
    </header>
  );
};
