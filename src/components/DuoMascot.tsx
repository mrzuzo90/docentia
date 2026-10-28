import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SoundService } from '../services/soundService';

export type MascotVariant = 'professor' | 'exam' | 'scanner' | 'trophy' | 'security';
export type MascotExpression = 'focused' | 'happy' | 'wink' | 'star';

interface DuoMascotProps {
  variant: MascotVariant;
  className?: string;
  interactive?: boolean;
  customSpeech?: string;
}

const VARIANT_SPEECHES: Record<MascotVariant, string[]> = {
  professor: [
    'Generación de evaluaciones con rigor psicométrico y trazabilidad.',
    'Ponderación y reparto exacto de puntos entre bloques temáticos.',
    'Formato listo para exportar a Word, PDF y Moodle XML.',
    'Rúbricas automáticas orientadas a criterios de corrección transparentes.'
  ],
  exam: [
    'Solucionario oficial con justificación pedagógica detallada.',
    'Ponderación automática sobre 10,00 puntos normalizados.',
    'Permutación determinista de modelos A y B contra copias.',
    'Edición inline de cada enunciado, opción y baremo.'
  ],
  scanner: [
    'Lectura óptica OCR adaptada a grafías manuscritas de alumnos.',
    'Detección inteligente de ambigüedad para revisión docente.',
    'Comparativa contra solucionario oficial con microajuste de nota.',
    'Registro de incidencias y trazabilidad de cada respuesta.'
  ],
  trophy: [
    'Acta oficial calculada con distribución estadística completa.',
    'Tasa de aprobados, nota media y desviación estándar de la clase.',
    'Exportación inmediata a formatos CSV y hojas de cálculo.',
    'Cierre de convocatoria riguroso y homologable.'
  ],
  security: [
    'Sensor de foco activo y detección de cambio de pestañas.',
    'Bloqueo contextual anti-copia y neutralización de capturas.',
    'Entrega cifrada directa al acta de calificaciones docente.',
    'Garantía de autoría individual en evaluación web segura.'
  ]
};

/**
 * Sober Geometric Owl — Apple Style Companion:
 * - Minimalist geometric line-art with cyan/electric blue neural network chest
 * - Serene micro-animations (slow gentle breathing, observant calm gaze)
 * - Restrained typography and whispering guidance in SF Pro Text
 * - Tailored variants for every section of the platform
 */
export const DuoMascot: React.FC<DuoMascotProps> = ({
  variant,
  className = '',
  interactive = true,
  customSpeech
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tiltOffset, setTiltOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [speechIndex, setSpeechIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);

  // Subtle 3D tilt tracking cursor position serenely
  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.hypot(dx, dy);
      const maxOffset = 3.5;

      if (distance < 1) {
        setTiltOffset({ x: 0, y: 0 });
        return;
      }

      const factor = Math.min(distance / 320, 1);
      const nx = (dx / distance) * maxOffset * factor;
      const ny = (dy / distance) * maxOffset * factor;

      setTiltOffset({ x: nx, y: ny });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  const handleMascotClick = useCallback(() => {
    if (!interactive) return;

    SoundService.playClick();
    setSpeechIndex(prev => (prev + 1) % VARIANT_SPEECHES[variant].length);
    setClickCount(prev => prev + 1);
  }, [interactive, variant]);

  const getAssetPath = (): string => {
    switch (variant) {
      case 'professor':
        return '/assets/mascot/lechuza-sober.svg';
      case 'scanner':
        return '/assets/mascot/lechuza-scanner.svg';
      case 'exam':
        return '/assets/mascot/lechuza-academic.svg';
      case 'trophy':
        return '/assets/mascot/lechuza-trophy.svg';
      case 'security':
        return '/assets/mascot/lechuza-security.svg';
      default:
        return '/assets/mascot/lechuza-sober.svg';
    }
  };

  const activeSpeech = customSpeech || VARIANT_SPEECHES[variant][speechIndex];

  return (
    <div
      ref={containerRef}
      onClick={handleMascotClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setTiltOffset({ x: 0, y: 0 });
      }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={e => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleMascotClick();
        }
      }}
      title={interactive ? 'Lechuza Académica · Clic para ver notas metodológicas' : undefined}
      className={`relative inline-flex flex-col items-center justify-center select-none group ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Apple-grade Whispered Speech Pill (Frosted, 20px radius, zero cartoon lip) */}
      {interactive && (isHovered || clickCount > 0) && (
        <div className="mb-4 z-20 max-w-[280px] bg-[#ffffff]/95 backdrop-blur-md border border-[#d6d6d6] rounded-[20px] px-4 py-2.5 text-center transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <p className="text-[14px] font-normal text-[#1d1d1f] leading-snug tracking-[-0.015em]">
            {activeSpeech}
          </p>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#707070]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]" />
            <span>Docentia Intelligence</span>
          </div>
        </div>
      )}

      {/* Mascot Visual Stage with Serene Tilt */}
      <div
        className="relative w-full flex flex-col items-center"
        style={{
          transform: `perspective(800px) rotateX(${-tiltOffset.y * 1.5}deg) rotateY(${tiltOffset.x * 1.5}deg) scale(${
            isHovered ? 1.02 : 1
          })`,
          transition: 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        <img
          src={getAssetPath()}
          alt={`Lechuza Académica - ${variant}`}
          className="w-full h-auto object-contain max-h-[340px] select-none transition-transform"
          draggable={false}
        />
      </div>
    </div>
  );
};

/**
 * Floating Apple-Style Assistant Dock
 * Sits quietly in bottom-left corner with minimalist mark and whispered status.
 */
interface DuoCompanionDockProps {
  activeTab: 'upload' | 'exam' | 'grading' | 'gradebook';
  pendingReviewsCount: number;
  creditsBalance: number;
}

export const DuoCompanionDock: React.FC<DuoCompanionDockProps> = ({
  activeTab,
  pendingReviewsCount,
  creditsBalance
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const tabTips: Record<typeof activeTab, string> = {
    upload: 'Carga tus apuntes o temario oficial en el Paso 1 y configura las especificaciones en el Paso 2.',
    exam: 'Revisa las soluciones justificadas y distribuye los pesos con total exactitud decimal.',
    grading:
      pendingReviewsCount > 0
        ? `Se han detectado ${pendingReviewsCount} exámenes con grafía ambigua pendientes de confirmación docente.`
        : 'Sube las hojas resueltas para aplicar la corrección óptica OCR inmediata.',
    gradebook: 'Distribución estadística y acta de calificaciones ponderadas del 0,00 al 10,00.'
  };

  return (
    <div className="no-print fixed bottom-6 left-6 z-40 flex flex-col items-start">
      {isExpanded && (
        <div className="mb-3 w-80 bg-[#ffffff]/95 backdrop-blur-md border border-[#d6d6d6] rounded-[24px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between border-b border-[#d6d6d6]/60 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/mascot/lechuza-mark.svg"
                alt="Marca Lechuza"
                className="w-7 h-7 object-contain"
              />
              <div>
                <h4 className="text-[14px] font-semibold text-[#1d1d1f] leading-none">
                  Docentia
                </h4>
                <span className="text-[12px] font-normal text-[#707070]">
                  Asistente Académico · {creditsBalance} créditos
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-[12px] font-normal text-[#707070] hover:text-[#1d1d1f] px-2 py-0.5 rounded-full border border-[#d6d6d6] transition-colors"
            >
              Cerrar
            </button>
          </div>

          <p className="text-[14px] font-normal text-[#1d1d1f] leading-relaxed">
            {tabTips[activeTab]}
          </p>
        </div>
      )}

      {/* Minimalist Frosted Pill Dock Button */}
      <button
        type="button"
        onClick={() => {
          SoundService.playClick();
          setIsExpanded(prev => !prev);
        }}
        className="group flex items-center gap-2.5 bg-[#ffffff]/90 hover:bg-[#ffffff] backdrop-blur-md border border-[#d6d6d6] rounded-full px-3.5 py-2 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
      >
        <img
          src="/assets/mascot/lechuza-mark.svg"
          alt="Lechuza Académica"
          className="w-6 h-6 object-contain transition-transform group-hover:scale-105"
        />
        <div className="text-left pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-[#1d1d1f]">
              Asistente Docente
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0071e3]" />
          </div>
        </div>
      </button>
    </div>
  );
};

export const DocentiaCompanion = DuoMascot;
