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
  ChevronDown
} from 'lucide-react';
import { Exam, UserBillingAccount } from '../types';

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

  return (
    <header className="no-print sticky top-0 z-30 bg-[#ffffff] border-b-2 border-[#afafaf]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand Logo (Duolingo Feather 700 style + Mascot Icon) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            {/* Sticker Owl Mascot Badge */}
            <svg
              width="40"
              height="40"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              <rect
                x="4"
                y="4"
                width="92"
                height="92"
                rx="22"
                fill="#58cc02"
                stroke="#000437"
                strokeWidth="5"
              />
              <circle cx="35" cy="46" r="15" fill="#ffffff" stroke="#000437" strokeWidth="4" />
              <circle cx="65" cy="46" r="15" fill="#ffffff" stroke="#000437" strokeWidth="4" />
              <circle cx="35" cy="46" r="6.5" fill="#000437" />
              <circle cx="65" cy="46" r="6.5" fill="#000437" />
              <polygon
                points="50,53 41,66 59,66"
                fill="#ffc800"
                stroke="#000437"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            </svg>
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
              onClick={() => setIsExamMenuOpen(!isExamMenuOpen)}
              className="duo-nav-pill py-2 px-3.5 text-[14px]"
            >
              <span className="max-w-[160px] truncate">{currentExam.subject}</span>
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

        {/* Center Navigation Pills (Duolingo Sticker Nav Pills) */}
        <nav className="flex items-center gap-2 overflow-x-auto py-1">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
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

        {/* Right Wallet & Subscription Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {pendingReviewsCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('grading')}
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
            onClick={() => onOpenPricingModal('ledger')}
            className="duo-btn-outlined py-2 px-3.5"
            title="Ver mi billetera de créditos y extracto"
          >
            <Coins className="w-4 h-4 text-[#1cb0f6]" />
            <span>{billingAccount.creditsBalance} CRÉDITOS</span>
          </button>

          {/* Primary Filled Green CTA (#58cc02 fill, white text, 15px uppercase 700) */}
          <button
            type="button"
            onClick={() => onOpenPricingModal('plans')}
            className="duo-btn-primary py-2.5 px-4"
          >
            <span>PLANES / RECARGAR</span>
          </button>
        </div>

      </div>
    </header>
  );
};
