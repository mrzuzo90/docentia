import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SoundService } from '../services/soundService';
import confetti from 'canvas-confetti';

export type MascotVariant = 'professor' | 'exam' | 'scanner' | 'trophy';
export type MascotExpression = 'focused' | 'happy' | 'wink' | 'star';

interface DuoMascotProps {
  variant: MascotVariant;
  className?: string;
  interactive?: boolean;
  customSpeech?: string;
}

const VARIANT_SPEECHES: Record<MascotVariant, string[]> = {
  professor: [
    '¡Hola profe! Soy Profe Pachy, tu paquicefalosaurio sabio.',
    '¡Listo para redactar test y problemas con rúbrica!',
    '¡Haz clic en mí para celebrar antes de evaluar!',
    '¡Todo el solucionario saldrá listo para copiar y pegar!'
  ],
  exam: [
    '¡Solucionario oficial ponderado sobre 10 puntos listo!',
    '¡Puedes repartir el peso exacto entre test y ejercicios!',
    '¡Un clic y copias el examen directo a Word o Moodle!',
    '¡Cada pregunta incluye su justificación pedagógica!'
  ],
  scanner: [
    '¡Lente OCR calibrada para letra manuscrita de alumnos!',
    '¡Evalúo del 0 al 10 cada sección automáticamente!',
    '¡Si una caligrafía es dudosa, te avisaré al instante!',
    '¡Comparo cada respuesta contra el solucionario oficial!'
  ],
  trophy: [
    '¡Acta de evaluación calculada con éxito!',
    '¡Sobresaliente en rigor psicométrico y didáctico!',
    '¡Exporta las notas a CSV o Excel cuando quieras!',
    '¡Gran trabajo corrigiendo esta convocatoria!'
  ]
};

/**
 * Authentic Chibi Mascot ("Profe Pachy", Paquicefalosaurio sabio) powered by consistent Nanobanana PNG assets:
 * - Continuous discreet idle breathing animation (squash-and-stretch)
 * - 2D cursor parallax tilt (mascot leans towards user pointer)
 * - Interactive click jump + boing sound + confetti burst + +10 XP badge
 * - Live pose celebration on interaction
 */
export const DuoMascot: React.FC<DuoMascotProps> = ({
  variant,
  className = '',
  interactive = true,
  customSpeech
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [eyeOffset, setEyeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [tempCelebrating, setTempCelebrating] = useState(false);
  const [speechIndex, setSpeechIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  // Parallax tilt tracking mouse position
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
      const maxOffset = 5.0;

      if (distance < 1) {
        setEyeOffset({ x: 0, y: 0 });
        return;
      }

      const factor = Math.min(distance / 280, 1);
      const nx = (dx / distance) * maxOffset * factor;
      const ny = (dy / distance) * maxOffset * factor;

      setEyeOffset({ x: nx, y: ny });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  const handleMascotClick = useCallback(() => {
    if (!interactive) return;

    SoundService.playMascotBoing();

    // Trigger celebratory confetti burst
    confetti({
      particleCount: 28,
      spread: 60,
      origin: { y: 0.72 },
      colors: ['#58cc02', '#1cb0f6', '#ffc800', '#d7ffb8']
    });

    // Trigger jump animation
    setIsJumping(false);
    window.requestAnimationFrame(() => {
      setIsJumping(true);
    });
    window.setTimeout(() => setIsJumping(false), 650);

    // Temporarily switch pose to celebration if idle
    if (variant === 'professor' || variant === 'exam') {
      setTempCelebrating(true);
      window.setTimeout(() => setTempCelebrating(false), 1400);
    }

    // Trigger celebratory badge burst
    setShowBurst(true);
    window.setTimeout(() => setShowBurst(false), 950);

    setSpeechIndex(prev => (prev + 1) % VARIANT_SPEECHES[variant].length);
    setClickCount(prev => prev + 1);
  }, [interactive, variant]);

  const getBaseAssetPath = (): string => {
    switch (variant) {
      case 'professor':
      case 'exam':
        return '/assets/mascot/pachy-profe-idle.png';
      case 'scanner':
        return '/assets/mascot/pachy-profe-scanning.png';
      case 'trophy':
        return '/assets/mascot/pachy-profe-celebrating.png';
      default:
        return '/assets/mascot/pachy-profe-idle.png';
    }
  };

  const activeAsset = tempCelebrating
    ? '/assets/mascot/pachy-profe-celebrating.png'
    : getBaseAssetPath();

  const activeSpeech = customSpeech || VARIANT_SPEECHES[variant][speechIndex];

  return (
    <div
      ref={containerRef}
      onClick={handleMascotClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setEyeOffset({ x: 0, y: 0 });
      }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={e => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleMascotClick();
        }
      }}
      title={interactive ? '¡Haz clic para interactuar con Profe Pachy!' : undefined}
      className={`relative inline-flex flex-col items-center justify-center select-none group ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Interactive Duolingo Sticker Speech Bubble */}
      {interactive && (isHovered || clickCount > 0) && (
        <div className="duo-bubble-pop mb-2 z-20 max-w-[260px] bg-[#ffffff] border-2 border-[#afafaf] group-hover:border-[#58cc02] rounded-[12px] px-3.5 py-2 text-center relative transition-colors shadow-sm">
          <p className="text-[13px] font-bold text-[#4b4b4b] leading-snug">
            {activeSpeech}
          </p>
          <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-[0.053em] text-[#1cb0f6]">
            {clickCount > 0 ? `+${clickCount * 10} XP acumulados` : '¡Hazme clic para celebrar!'}
          </span>
          {/* Speech Bubble Pointer Triangle */}
          <div className="w-3 h-3 bg-[#ffffff] border-r-2 border-b-2 border-[#afafaf] group-hover:border-[#58cc02] rotate-45 mx-auto -mb-3.5 mt-1" />
        </div>
      )}

      {/* Celebratory Sticker Burst on Click */}
      {showBurst && (
        <div className="pointer-events-none absolute -top-4 inset-x-0 flex items-center justify-between px-3 z-30 animate-bounce">
          <span className="px-2.5 py-1 rounded-[12px] bg-[#ffc800] border-2 border-[#000437] text-[#000437] text-[12px] font-black shadow-md">
            +10 XP
          </span>
          <span className="px-2.5 py-1 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[#000437] text-[12px] font-black shadow-md">
            ¡SOBRESALIENTE!
          </span>
        </div>
      )}

      {/* Mascot Visual Stage with Parallax & Breathing */}
      <div
        className={`relative w-full flex flex-col items-center ${
          isJumping ? 'duo-mascot-jump' : 'duo-mascot-breathing'
        }`}
        style={{
          transform: isJumping
            ? undefined
            : `perspective(600px) rotateX(${-eyeOffset.y * 1.8}deg) rotateY(${eyeOffset.x * 1.8}deg) scale(${isHovered ? 1.04 : 1})`,
          transition: isJumping ? undefined : 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        <img
          src={activeAsset}
          alt={`Profe Pachy - ${variant}`}
          className="w-full h-auto object-contain max-h-[300px] select-none filter drop-shadow-md transition-transform"
          draggable={false}
        />

        {/* Synchronized Tactile Ground Shadow */}
        <div
          className="w-3/5 h-3 mx-auto -mt-2 rounded-full bg-[#000437]/15 blur-xs transition-transform duration-300"
          style={{
            transform: isJumping ? 'scale(0.55)' : isHovered ? 'scale(1.12)' : 'scale(1)'
          }}
        />
      </div>
    </div>
  );
};

/**
 * Interactive Floating Mascot Companion Dock ("Profe Búho en vivo")
 * Sits discreetly in the bottom-left corner, follows the cursor,
 * reacts to the current workflow tab, and lets the user trigger poses/animations.
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
  const [poseAsset, setPoseAsset] = useState<'idle' | 'celebrating' | 'scanning'>('idle');

  // Automatically sync pose with current section
  useEffect(() => {
    if (activeTab === 'grading') {
      setPoseAsset('scanning');
    } else if (activeTab === 'gradebook' || activeTab === 'exam') {
      setPoseAsset('celebrating');
    } else {
      setPoseAsset('idle');
    }
  }, [activeTab]);

  const tabTips: Record<typeof activeTab, string> = {
    upload: 'Sube tus PDFs en el Paso 1 y elige el número de preguntas en el Paso 2.',
    exam: 'Ajusta el peso de cada ejercicio y copia el Solucionario con un clic.',
    grading:
      pendingReviewsCount > 0
        ? `¡Atención! Tienes ${pendingReviewsCount} examen con caligrafía dudosa para revisar.`
        : 'Sube los exámenes resueltos para evaluarlos del 0 al 10 con OCR.',
    gradebook: 'Consulta la nota media de la clase y descarga el acta en CSV/Excel.'
  };

  const assetFileMap = {
    idle: '/assets/mascot/pachy-profe-idle.png',
    celebrating: '/assets/mascot/pachy-profe-celebrating.png',
    scanning: '/assets/mascot/pachy-profe-scanning.png'
  };

  return (
    <div className="no-print fixed bottom-5 left-5 z-40 flex flex-col items-start">
      {isExpanded && (
        <div className="duo-bubble-pop mb-3 w-72 sm:w-80 bg-[#ffffff] border-2 border-[#000437] rounded-[12px] p-4 shadow-xl">
          <div className="flex items-center justify-between border-b-2 border-[#afafaf]/40 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <img
                src="/assets/mascot/badge-pachy-avatar.png"
                alt="Avatar Profe Pachy"
                className="w-7 h-7 object-contain"
              />
              <div>
                <h4 className="text-[14px] font-bold text-[#4b4b4b] leading-none">
                  Profe Pachy · Asistente
                </h4>
                <span className="text-[11px] font-bold uppercase tracking-[0.053em] text-[#58cc02]">
                  Paquicefalosaurio Chibi ({creditsBalance} Cr.)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-[12px] font-bold text-[#777777] hover:text-[#000437] px-2 py-0.5 rounded-[12px] border-2 border-[#afafaf]"
            >
              Cerrar
            </button>
          </div>

          {/* Live Mascot Asset Preview & Pose Switcher */}
          <div className="bg-[#d7ffb8]/30 border-2 border-[#58cc02] rounded-[12px] p-3 flex flex-col items-center">
            <img
              src={assetFileMap[poseAsset]}
              alt={`Profe Pachy - ${poseAsset}`}
              className="w-36 h-36 object-contain select-none filter drop-shadow-sm duo-mascot-breathing"
            />
            <div className="flex items-center gap-1.5 mt-2.5">
              {(['idle', 'celebrating', 'scanning'] as const).map(pose => (
                <button
                  key={pose}
                  type="button"
                  onClick={() => {
                    SoundService.playClick();
                    setPoseAsset(pose);
                  }}
                  className={`px-2.5 py-1 rounded-[12px] text-[11px] font-bold uppercase tracking-[0.053em] border-2 transition ${
                    poseAsset === pose
                      ? 'bg-[#58cc02] text-[#ffffff] border-[#000437]'
                      : 'bg-[#ffffff] text-[#777777] border-[#afafaf] hover:border-[#4b4b4b]'
                  }`}
                >
                  {pose === 'idle' ? 'Docente' : pose === 'celebrating' ? '¡10/10!' : 'Escáner'}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 text-[13px] font-bold text-[#4b4b4b] leading-snug">
            {tabTips[activeTab]}
          </p>
        </div>
      )}

      {/* Discreet Floating Mascot Sticker Pill */}
      <button
        type="button"
        onClick={() => {
          SoundService.playClick();
          setIsExpanded(prev => !prev);
        }}
        className="group flex items-center gap-2.5 bg-[#ffffff] hover:bg-[#d7ffb8]/40 border-2 border-[#000437] rounded-[12px] px-3 py-2 transition-transform active:translate-y-0.5 shadow-md"
      >
        <img
          src="/assets/mascot/badge-pachy-avatar.png"
          alt="Profe Pachy"
          className="w-9 h-9 object-contain transition-transform group-hover:scale-110"
        />
        <div className="text-left pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
              Profe Pachy
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#58cc02]" />
          </div>
          <p className="text-[11px] font-bold text-[#1cb0f6] leading-none">
            {isExpanded ? 'Ocultar mascota' : 'Interactuar · Ver poses'}
          </p>
        </div>
      </button>
    </div>
  );
};
