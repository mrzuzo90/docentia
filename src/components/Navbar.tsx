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
  Flame,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Exam, UserBillingAccount } from '../types';
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
  totalSubmissionsCount
}) => {
  const [isExamMenuOpen, setIsExamMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => SoundService.isMuted());
  const [streakDays, setStreakDays] = useState(() => SoundService.getStreak());

  const navItems = [
    {
      id: 'upload' as const,
      label: '1. CREAR EXAMEN',
      countLabel: `${currentExam.documents.length} doc`,
      icon: UploadCloud
    },
    {
      id: 'exam' as const,
      label: '2. SOLUCIONARIO',
      countLabel: `${currentExam.testQuestions.length + currentExam.exercises.length} ítems`,
      icon: FileText
    },
    {
      id: 'grading' as const,
      label: '3. CORREGIR OCR',
      countLabel: pendingReviewsCount > 0 ? `${pendingReviewsCount} dudoso` : `${totalSubmissionsCount}`,
      icon: ScanLine,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined
    },
    {
      id: 'gradebook' as const,
      label: '4. NOTAS 0-10',
      countLabel: 'Acta',
      icon: BarChart3
    }
  ];

  const handleTabSwitch = (tab: 'upload' | 'exam' | 'grading' | 'gradebook') => {
    SoundService.playClick();
    setActiveTab(tab);
  };

  return (
    <header className="no-print sticky top-0 z-30 bg-[#ffffff] border-b-2 border-[#afafaf]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand Logo (Duolingo Feather 700 style + Mascot Icon) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleTabSwitch('upload')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            {/* Animated Sticker Dinosaur Mascot Badge (Profe Pachy) */}
            <img
              src="/assets/mascot/badge-pachy-avatar.png"
              alt="Mascota Profe Pachy (Paquicefalosaurio)"
              className="w-10 h-10 shrink-0 transition-transform hover:scale-110 drop-shadow-xs"
            />
            <div>
              <span
                className="block font-feather font-extrabold text-[28px] leading-none tracking-[-0.02em] text-[#58cc02]"
              >
                docentia
              </span>
              <span className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                AULA INTELIGENTE
              </span>
            </div>
          </button>

          {/* Exam Selector Pill (Nav Language Pill style) */}
          <div className="relative hidden xl:block ml-2">
            <button
              type="button"
              onClick={() => {
                SoundService.playClick();
                setIsExamMenuOpen(!isExamMenuOpen);
              }}
              className="duo-nav-pill py-2 px-3.5 text-[14px]"
            >
              <span className="max-w-[140px] truncate">{currentExam.subject}</span>
              <ChevronDown className="w-4 h-4 text-[#777777]" />
            </button>

            {isExamMenuOpen && (
              <div
                className="absolute left-0 mt-2 w-80 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] p-3 z-50 space-y-2"
                onMouseLeave={() => setIsExamMenuOpen(false)}
              >
                <div className="flex items-center justify-between px-2 pb-2 border-b-2 border-[#afafaf]/40">
                  <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                    MIS EXÁMENES ({exams.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      SoundService.playClick();
                      setIsExamMenuOpen(false);
                      onCreateNewExam();
                    }}
                    className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#1cb0f6] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    NUEVO
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5">
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
                        className={`flex items-center justify-between p-2.5 rounded-[12px] cursor-pointer border-2 transition ${
                          isSelected
                            ? 'bg-[#d7ffb8] border-[#58cc02] text-[#4b4b4b]'
                            : 'bg-[#ffffff] border-transparent hover:border-[#afafaf] text-[#4b4b4b]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-[15px] font-bold truncate">{ex.title}</div>
                          <div className="text-[13px] text-[#777777] truncate">
                            {ex.subject} · {ex.targetLevel}
                          </div>
                        </div>
                        {exams.length > 1 && (
                          <button
                            type="button"
                            onClick={e => onDeleteExam(ex.id, e)}
                            className="p-1.5 text-[#777777] hover:text-[#4b4b4b]"
                            title="Eliminar examen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t-2 border-[#afafaf]/40">
                  <button
                    type="button"
                    onClick={() => {
                      SoundService.playClick();
                      setIsExamMenuOpen(false);
                      onLoadDemo();
                    }}
                    className="w-full py-2 px-3 rounded-[12px] border-2 border-[#afafaf] text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] hover:text-[#4b4b4b] flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    RESTAURAR DEMO
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Navigation Pills (Duolingo Sticker Nav Pills with 3D Lip) */}
        <nav className="flex items-center gap-2 overflow-x-auto py-1">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabSwitch(item.id)}
                className={`duo-nav-pill py-2 px-3.5 whitespace-nowrap ${
                  isActive ? 'duo-nav-pill-active' : ''
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#58cc02]' : 'text-[#777777]'
                  }`}
                />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-[12px] bg-[#58cc02] text-[#ffffff] text-[13px] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Gamification, Wallet & Subscription Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Teacher Streak Pill (Duolingo Gamification) */}
          <button
            type="button"
            onClick={() => setStreakDays(SoundService.incrementStreak())}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] border-2 border-[#afafaf] hover:border-[#4b4b4b] bg-[#ffffff] text-[#4b4b4b] text-[14px] font-bold uppercase tracking-[0.053em] transition active:translate-y-0.5"
            title="Racha de días evaluando con Docentia (Haz clic para celebrar)"
          >
            <Flame className="w-4 h-4 text-[#ff9600] fill-[#ff9600]" />
            <span>{streakDays}</span>
          </button>

          {/* WebAudio Sound Effects Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(SoundService.toggleMute())}
            className="p-2 rounded-[12px] border-2 border-[#afafaf] hover:border-[#4b4b4b] bg-[#ffffff] text-[#777777] hover:text-[#4b4b4b] transition active:translate-y-0.5"
            title={isMuted ? 'Activar efectos de sonido UI' : 'Silenciar efectos de sonido UI'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#afafaf]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#58cc02]" />
            )}
          </button>

          {pendingReviewsCount > 0 && (
            <button
              type="button"
              onClick={() => handleTabSwitch('grading')}
              className="duo-btn-outlined border-[#58cc02] text-[#4b4b4b] bg-[#d7ffb8] py-2 px-3 text-[13px]"
              title="Exámenes con letra dudosa que requieren revisión del profesor"
            >
              <AlertTriangle className="w-4 h-4 text-[#58cc02]" />
              <span className="hidden sm:inline">REVISAR:</span>
              <span>{pendingReviewsCount}</span>
            </button>
          )}

          {/* Outlined Secondary Account/Credits Button (Spark Blue #1cb0f6 + 2px #afafaf border) */}
          <button
            type="button"
            onClick={() => {
              SoundService.playClick();
              onOpenPricingModal('ledger');
            }}
            className="duo-btn-outlined py-2 px-3.5"
            title="Ver mi billetera de créditos y extracto"
          >
            <Coins className="w-4 h-4 text-[#1cb0f6]" />
            <span>{billingAccount.creditsBalance} CR.</span>
          </button>

          {/* Primary Filled Green CTA (#58cc02 fill, white text, 15px uppercase 700) */}
          <button
            type="button"
            onClick={() => {
              SoundService.playClick();
              onOpenPricingModal('plans');
            }}
            className="duo-btn-primary py-2.5 px-4"
          >
            <span>PLANES</span>
          </button>
        </div>

      </div>
    </header>
  );
};
