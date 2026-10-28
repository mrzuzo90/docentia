import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SoundService } from '../services/soundService';

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
    '¡Hola profe! Sube tu PDF y preparo el examen.',
    '¡Listo para redactar test y problemas con rúbrica!',
    '¡Haz clic en mí para darme ánimos antes del examen!',
    '¡Todo el solucionario saldrá listo para copiar y pegar!'
  ],
  exam: [
    '¡Solucionario ponderado sobre 10 puntos listo!',
    '¡Puedes repartir el peso entre test y ejercicios!',
    '¡Un clic y copias el examen directo a Word o Docs!',
    '¡Cada pregunta incluye su justificación académica!'
  ],
  scanner: [
    '¡Lente OCR calibrada para letra manuscrita!',
    '¡Evalúo del 0 al 10 cada sección automáticamente!',
    '¡Si una caligrafía es dudosa, te avisaré al instante!',
    '¡Comparo cada respuesta contra tu solucionario!'
  ],
  trophy: [
    '¡Acta de evaluación calculada con éxito!',
    '¡Sobresaliente en rigor psicométrico!',
    '¡Exporta las notas a CSV o Excel cuando quieras!',
    '¡Buen trabajo corrigiendo esta convocatoria!'
  ]
};

/**
 * Rigged, interactive Duolingo-style 2D Mascot ("Profe Búho") with:
 * - Continuous discreet idle animation (squash-and-stretch breathing, wing wave, hat tassel sway, floating props)
 * - Automatic natural eye blinking + click-to-wink/happy-arc expressions
 * - Real-time 2D cursor eye-tracking (pupils & glasses follow the user's pointer)
 * - Interactive click jump + floating sticker speech bubble & XP burst
 */
export const DuoMascot: React.FC<DuoMascotProps> = ({
  variant,
  className = '',
  interactive = true,
  customSpeech
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [eyeOffset, setEyeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [expression, setExpression] = useState<MascotExpression>('focused');
  const [speechIndex, setSpeechIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  // Discreet natural blinking loop every 3.4 - 5.2 seconds
  useEffect(() => {
    let timeoutId: number;
    const scheduleBlink = () => {
      const nextDelay = 3200 + Math.random() * 2200;
      timeoutId = window.setTimeout(() => {
        setIsBlinking(true);
        window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150);
      }, nextDelay);
    };
    scheduleBlink();
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Real-time 2D cursor eye-tracking
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
      const maxOffset = 5.5;

      if (distance < 1) {
        setEyeOffset({ x: 0, y: 0 });
        return;
      }

      const factor = Math.min(distance / 260, 1);
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

    // Trigger jump animation
    setIsJumping(false);
    window.requestAnimationFrame(() => {
      setIsJumping(true);
    });
    window.setTimeout(() => setIsJumping(false), 700);

    // Trigger celebratory badge burst
    setShowBurst(true);
    window.setTimeout(() => setShowBurst(false), 950);

    // Cycle expression & speech bubble message
    const expressions: MascotExpression[] = ['happy', 'wink', 'star', 'focused'];
    setExpression(prev => {
      const nextIdx = (expressions.indexOf(prev) + 1) % expressions.length;
      return expressions[nextIdx];
    });

    setSpeechIndex(prev => (prev + 1) % VARIANT_SPEECHES[variant].length);
    setClickCount(prev => prev + 1);
  }, [interactive, variant]);

  const activeSpeech = customSpeech || VARIANT_SPEECHES[variant][speechIndex];

  // Helper to render interactive pupils or expressive eyes inside two eye centers
  const renderEyes = (leftCx: number, rightCx: number, cy: number, radius: number = 22) => {
    const pupilRadius = Math.round(radius * 0.44);
    const highlightRadius = Math.max(2.5, Math.round(radius * 0.16));
    const px = eyeOffset.x;
    const py = eyeOffset.y;

    return (
      <g
        style={{
          transform: isBlinking ? 'scaleY(0.08)' : 'scaleY(1)',
          transformOrigin: `${(leftCx + rightCx) / 2}px ${cy}px`,
          transition: 'transform 90ms ease-in-out'
        }}
      >
        {/* White Eye Sockets */}
        <circle cx={leftCx} cy={cy} r={radius} fill="#ffffff" stroke="#000437" strokeWidth="4" />
        <circle cx={rightCx} cy={cy} r={radius} fill="#ffffff" stroke="#000437" strokeWidth="4" />
        {/* Scholar Glasses Bridge */}
        <line
          x1={leftCx + radius}
          y1={cy}
          x2={rightCx - radius}
          y2={cy}
          stroke="#000437"
          strokeWidth="4"
        />

        {expression === 'happy' ? (
          <>
            <path
              d={`M${leftCx - 9} ${cy + 2} C${leftCx - 5} ${cy - 9}, ${leftCx + 5} ${cy - 9}, ${leftCx + 9} ${cy + 2}`}
              stroke="#000437"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={`M${rightCx - 9} ${cy + 2} C${rightCx - 5} ${cy - 9}, ${rightCx + 5} ${cy - 9}, ${rightCx + 9} ${cy + 2}`}
              stroke="#000437"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : expression === 'wink' ? (
          <>
            {/* Left eye winking */}
            <path
              d={`M${leftCx - 9} ${cy} C${leftCx - 4} ${cy - 8}, ${leftCx + 4} ${cy - 8}, ${leftCx + 9} ${cy}`}
              stroke="#000437"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right eye tracking */}
            <circle cx={rightCx + px} cy={cy + py} r={pupilRadius} fill="#000437" />
            <circle
              cx={rightCx + px + 3.5}
              cy={cy + py - 3.5}
              r={highlightRadius}
              fill="#ffffff"
            />
          </>
        ) : expression === 'star' ? (
          <>
            <circle cx={leftCx + px} cy={cy + py} r={pupilRadius} fill="#000437" />
            <circle cx={rightCx + px} cy={cy + py} r={pupilRadius} fill="#000437" />
            {/* Golden Star Sparkle in Eyes */}
            <polygon
              points={`${leftCx + px},${cy + py - 6} ${leftCx + px + 2},${cy + py - 2} ${leftCx + px + 6},${cy + py} ${leftCx + px + 2},${cy + py + 2} ${leftCx + px},${cy + py + 6} ${leftCx + px - 2},${cy + py + 2} ${leftCx + px - 6},${cy + py} ${leftCx + px - 2},${cy + py - 2}`}
              fill="#ffc800"
            />
            <polygon
              points={`${rightCx + px},${cy + py - 6} ${rightCx + px + 2},${cy + py - 2} ${rightCx + px + 6},${cy + py} ${rightCx + px + 2},${cy + py + 2} ${rightCx + px},${cy + py + 6} ${rightCx + px - 2},${cy + py + 2} ${rightCx + px - 6},${cy + py} ${rightCx + px - 2},${cy + py - 2}`}
              fill="#ffc800"
            />
          </>
        ) : (
          <>
            <circle cx={leftCx + px} cy={cy + py} r={pupilRadius} fill="#000437" />
            <circle cx={rightCx + px} cy={cy + py} r={pupilRadius} fill="#000437" />
            <circle
              cx={leftCx + px + 3.5}
              cy={cy + py - 3.5}
              r={highlightRadius}
              fill="#ffffff"
            />
            <circle
              cx={rightCx + px + 3.5}
              cy={cy + py - 3.5}
              r={highlightRadius}
              fill="#ffffff"
            />
          </>
        )}
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      onClick={handleMascotClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={e => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleMascotClick();
        }
      }}
      title={interactive ? 'Haz clic para interactuar con Profe Búho' : undefined}
      className={`relative inline-flex flex-col items-center justify-center select-none group ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Interactive Duolingo Sticker Speech Bubble */}
      {interactive && (isHovered || clickCount > 0) && (
        <div className="duo-bubble-pop mb-2 z-20 max-w-[250px] bg-[#ffffff] border-2 border-[#afafaf] group-hover:border-[#58cc02] rounded-[12px] px-3.5 py-2 text-center relative transition-colors">
          <p className="text-[13px] font-bold text-[#4b4b4b] leading-snug">
            {activeSpeech}
          </p>
          <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-[0.053em] text-[#1cb0f6]">
            clic para cambiar pose · {clickCount > 0 ? `+${clickCount * 10} XP` : 'interactivo'}
          </span>
          {/* Speech Bubble Pointer Triangle */}
          <div className="w-3 h-3 bg-[#ffffff] border-r-2 border-b-2 border-[#afafaf] group-hover:border-[#58cc02] rotate-45 mx-auto -mb-3.5 mt-1" />
        </div>
      )}

      {/* Celebratory Sticker Burst on Click */}
      {showBurst && (
        <div className="pointer-events-none absolute -top-3 inset-x-0 flex items-center justify-between px-4 z-30 animate-bounce">
          <span className="px-2.5 py-1 rounded-[12px] bg-[#ffc800] border-2 border-[#000437] text-[#000437] text-[12px] font-black">
            +10 XP
          </span>
          <span className="px-2.5 py-1 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[#000437] text-[12px] font-black">
            ¡SOBRESALIENTE!
          </span>
        </div>
      )}

      {/* VARIANT 1: PROFESSOR OWL (Hero & Generator) */}
      {variant === 'professor' && (
        <svg
          viewBox="0 0 380 295"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto overflow-visible"
        >
          {/* Synchronized Ground Shadow */}
          <ellipse
            cx="212"
            cy="274"
            rx="74"
            ry="11"
            fill="#000437"
            className="duo-anim-shadow"
          />

          {/* Floating Sparkles & Storybook Sheet */}
          <g className="duo-anim-float-slow">
            <circle cx="52" cy="54" r="10" fill="#ffc800" stroke="#000437" strokeWidth="3.5" />
            <rect
              x="44"
              y="96"
              width="110"
              height="138"
              rx="16"
              transform="rotate(-8 44 96)"
              fill="#ffffff"
              stroke="#000437"
              strokeWidth="4"
            />
            <rect
              x="64"
              y="118"
              width="68"
              height="10"
              rx="5"
              transform="rotate(-8 64 118)"
              fill="#1cb0f6"
            />
            <rect
              x="68"
              y="140"
              width="54"
              height="8"
              rx="4"
              transform="rotate(-8 68 140)"
              fill="#afafaf"
            />
            <rect
              x="70"
              y="158"
              width="62"
              height="8"
              rx="4"
              transform="rotate(-8 70 158)"
              fill="#afafaf"
            />
            <circle cx="84" cy="194" r="14" fill="#58cc02" stroke="#000437" strokeWidth="3.5" />
            <path
              d="M78 194L82.5 198.5L91 189.5"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          <g className="duo-anim-float-delayed">
            <rect
              x="312"
              y="38"
              width="22"
              height="22"
              rx="6"
              transform="rotate(15 312 38)"
              fill="#ce82ff"
              stroke="#000437"
              strokeWidth="3.5"
            />
            <circle cx="336" cy="198" r="8" fill="#ff86d0" stroke="#000437" strokeWidth="3.5" />
          </g>

          {/* Mascot Feet */}
          <rect
            x="168"
            y="246"
            width="32"
            height="16"
            rx="8"
            fill="#ff9600"
            stroke="#000437"
            strokeWidth="4"
          />
          <rect
            x="224"
            y="246"
            width="32"
            height="16"
            rx="8"
            fill="#ff9600"
            stroke="#000437"
            strokeWidth="4"
          />

          {/* Main Breathing + Jumping Owl Body Group */}
          <g className={isJumping ? 'duo-anim-jump' : 'duo-anim-breathe'}>
            {/* Chubby Owl Mascot Body */}
            <rect
              x="140"
              y="70"
              width="144"
              height="182"
              rx="68"
              fill="#58cc02"
              stroke="#000437"
              strokeWidth="4"
            />

            {/* Owl Ear Tufts */}
            <path
              d="M155 82C144 60 164 50 182 70"
              fill="#58cc02"
              stroke="#000437"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M269 82C280 60 260 50 242 70"
              fill="#58cc02"
              stroke="#000437"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Belly Feather Patch */}
            <rect
              x="166"
              y="168"
              width="92"
              height="68"
              rx="44"
              fill="#a5ed6e"
              stroke="#000437"
              strokeWidth="3.5"
            />
            <path
              d="M192 190C198 196 204 196 210 190"
              stroke="#58cc02"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M216 190C222 196 228 196 234 190"
              stroke="#58cc02"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M204 208C210 214 216 214 222 208"
              stroke="#58cc02"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Left Wing waving (faster on hover) */}
            <g className={isHovered ? 'duo-anim-wing-l-excited' : 'duo-anim-wing-l'}>
              <path
                d="M142 142C112 132 104 162 126 184L142 190"
                fill="#58cc02"
                stroke="#000437"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>

            {/* Interactive Tracking Eyes + Glasses */}
            {renderEyes(186, 238, 124, 24)}

            {/* Rosy Cheeks when hovered or happy */}
            {(isHovered || expression === 'happy' || expression === 'star') && (
              <>
                <ellipse cx="164" cy="146" rx="9" ry="5" fill="#ff86d0" />
                <ellipse cx="260" cy="146" rx="9" ry="5" fill="#ff86d0" />
              </>
            )}

            {/* Beak (opens slightly on hover/happy) */}
            <path
              d={
                isHovered || expression === 'happy'
                  ? 'M200 139H224L212 160L200 139Z'
                  : 'M202 140H222L212 155L202 140Z'
              }
              fill="#ffc800"
              stroke="#000437"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Secondary Overlapping Motion: Academic Mortarboard Hat */}
            <g className="duo-anim-hat">
              <polygon
                points="212,28 148,52 212,74 276,52"
                fill="#ce82ff"
                stroke="#000437"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <line
                x1="264"
                y1="56"
                x2="274"
                y2="86"
                stroke="#ffc800"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="274" cy="88" r="6" fill="#ffc800" stroke="#000437" strokeWidth="3" />
            </g>

            {/* Right Wing + Giant Pencil */}
            <g className="duo-anim-prop-r">
              <path
                d="M282 146C314 140 322 170 296 192L280 196"
                fill="#58cc02"
                stroke="#000437"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <g transform="rotate(22 308 162)">
                <rect
                  x="296"
                  y="102"
                  width="20"
                  height="88"
                  rx="4"
                  fill="#ffc800"
                  stroke="#000437"
                  strokeWidth="3.5"
                />
                <rect
                  x="296"
                  y="88"
                  width="20"
                  height="16"
                  rx="4"
                  fill="#ff86d0"
                  stroke="#000437"
                  strokeWidth="3.5"
                />
                <polygon
                  points="296,190 316,190 306,210"
                  fill="#ffffff"
                  stroke="#000437"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
              </g>
            </g>
          </g>
        </svg>
      )}

      {/* VARIANT 2: EXAM & SOLUCIONARIO MASCOT */}
      {variant === 'exam' && (
        <svg
          viewBox="0 0 380 270"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto overflow-visible"
        >
          <ellipse
            cx="236"
            cy="252"
            rx="88"
            ry="10"
            fill="#000437"
            className="duo-anim-shadow"
          />

          <g className="duo-anim-float-slow">
            <circle cx="58" cy="52" r="10" fill="#ff86d0" stroke="#000437" strokeWidth="3.5" />
            <circle cx="332" cy="58" r="12" fill="#ffc800" stroke="#000437" strokeWidth="3.5" />
          </g>

          {/* Big Solucionario Card */}
          <g className="duo-anim-float-delayed">
            <rect
              x="68"
              y="34"
              width="156"
              height="196"
              rx="18"
              fill="#ffffff"
              stroke="#000437"
              strokeWidth="4"
            />
            <circle cx="100" cy="76" r="12" fill="#58cc02" stroke="#000437" strokeWidth="3" />
            <path d="M95 76L98.5 79.5L106 72" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <rect
              x="122"
              y="70"
              width="76"
              height="12"
              rx="6"
              fill="#d7ffb8"
              stroke="#000437"
              strokeWidth="2.5"
            />

            <circle cx="100" cy="116" r="12" fill="#1cb0f6" stroke="#000437" strokeWidth="3" />
            <path d="M95 116L98.5 119.5L106 112" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <rect x="122" y="110" width="64" height="12" rx="6" fill="#afafaf" />

            <circle cx="100" cy="156" r="12" fill="#ce82ff" stroke="#000437" strokeWidth="3" />
            <path d="M95 156L98.5 159.5L106 152" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <rect x="122" y="150" width="72" height="12" rx="6" fill="#afafaf" />
          </g>

          {/* Animated Mascot Peeking on the Right */}
          <g className={isJumping ? 'duo-anim-jump' : 'duo-anim-breathe'}>
            <rect
              x="212"
              y="92"
              width="120"
              height="142"
              rx="58"
              fill="#58cc02"
              stroke="#000437"
              strokeWidth="4"
            />
            <rect
              x="236"
              y="174"
              width="72"
              height="48"
              rx="32"
              fill="#a5ed6e"
              stroke="#000437"
              strokeWidth="3"
            />
            {renderEyes(250, 294, 140, 19)}
            <polygon
              points="264,155 280,155 272,169"
              fill="#ffc800"
              stroke="#000437"
              strokeWidth="3"
            />

            {/* Gold 10/10 Badge */}
            <g className="duo-anim-prop-r">
              <circle cx="208" cy="196" r="26" fill="#ffc800" stroke="#000437" strokeWidth="4" />
              <text
                x="208"
                y="203"
                textAnchor="middle"
                fontFamily="Nunito, sans-serif"
                fontWeight="900"
                fontSize="20"
                fill="#000437"
              >
                10
              </text>
            </g>
          </g>
        </svg>
      )}

      {/* VARIANT 3: OPTICAL OCR SCANNER MASCOT */}
      {variant === 'scanner' && (
        <svg
          viewBox="0 0 380 270"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto overflow-visible"
        >
          <ellipse
            cx="248"
            cy="252"
            rx="84"
            ry="10"
            fill="#000437"
            className="duo-anim-shadow"
          />

          {/* Handwritten Exam Sheet */}
          <rect
            x="52"
            y="42"
            width="148"
            height="186"
            rx="18"
            fill="#ffffff"
            stroke="#000437"
            strokeWidth="4"
          />
          <rect x="76" y="74" width="96" height="10" rx="5" fill="#d7ffb8" />
          <rect x="76" y="98" width="76" height="10" rx="5" fill="#afafaf" />
          <rect x="76" y="148" width="100" height="10" rx="5" fill="#afafaf" />
          <rect x="76" y="172" width="64" height="10" rx="5" fill="#ff9600" />

          {/* Moving Green Laser Scan Beam */}
          <g className="duo-anim-scan-beam">
            <line
              x1="38"
              y1="126"
              x2="214"
              y2="126"
              stroke="#58cc02"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>

          {/* Inspector Owl Mascot + Magnifying Glass */}
          <g className={isJumping ? 'duo-anim-jump' : 'duo-anim-breathe'}>
            <rect
              x="216"
              y="82"
              width="120"
              height="148"
              rx="58"
              fill="#58cc02"
              stroke="#000437"
              strokeWidth="4"
            />
            <rect
              x="240"
              y="168"
              width="72"
              height="48"
              rx="32"
              fill="#a5ed6e"
              stroke="#000437"
              strokeWidth="3"
            />
            {renderEyes(254, 298, 130, 19)}
            <polygon
              points="268,145 284,145 276,158"
              fill="#ffc800"
              stroke="#000437"
              strokeWidth="3"
            />

            {/* Animated Magnifying Glass */}
            <g className="duo-anim-prop-r">
              <circle
                cx="176"
                cy="144"
                r="38"
                fill="#1cb0f6"
                fillOpacity="0.24"
                stroke="#000437"
                strokeWidth="5"
              />
              <path
                d="M156 126C162 118 172 116 182 120"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <line
                x1="204"
                y1="170"
                x2="232"
                y2="198"
                stroke="#ff9600"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <line
                x1="204"
                y1="170"
                x2="232"
                y2="198"
                stroke="#000437"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          </g>
        </svg>
      )}

      {/* VARIANT 4: TROPHY & CELEBRATION OWL */}
      {variant === 'trophy' && (
        <svg
          viewBox="0 0 380 270"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto overflow-visible"
        >
          <ellipse
            cx="216"
            cy="252"
            rx="86"
            ry="10"
            fill="#000437"
            className="duo-anim-shadow"
          />

          <g className="duo-anim-float-slow">
            <circle cx="62" cy="56" r="10" fill="#ce82ff" stroke="#000437" strokeWidth="3.5" />
            <circle cx="328" cy="50" r="12" fill="#ff86d0" stroke="#000437" strokeWidth="3.5" />
          </g>

          <g className={isJumping ? 'duo-anim-jump' : 'duo-anim-breathe'}>
            {/* Golden Trophy Cup on Left */}
            <g className="duo-anim-prop-r">
              <path
                d="M76 72H172V122C172 148 150 170 124 170C98 170 76 148 76 122V72Z"
                fill="#ffc800"
                stroke="#000437"
                strokeWidth="4"
              />
              <rect
                x="110"
                y="170"
                width="28"
                height="30"
                fill="#ffc800"
                stroke="#000437"
                strokeWidth="4"
              />
              <rect
                x="84"
                y="200"
                width="80"
                height="22"
                rx="10"
                fill="#ce82ff"
                stroke="#000437"
                strokeWidth="4"
              />
              <circle cx="124" cy="118" r="19" fill="#ffffff" stroke="#000437" strokeWidth="3.5" />
              <path
                d="M116 118L122 124L133 111"
                stroke="#58cc02"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Cheerful Mascot Next to Trophy */}
            <rect
              x="194"
              y="78"
              width="124"
              height="152"
              rx="60"
              fill="#58cc02"
              stroke="#000437"
              strokeWidth="4"
            />
            <rect
              x="220"
              y="164"
              width="72"
              height="50"
              rx="32"
              fill="#a5ed6e"
              stroke="#000437"
              strokeWidth="3"
            />
            {renderEyes(234, 278, 126, 20)}
            <polygon
              points="248,142 264,142 256,156"
              fill="#ffc800"
              stroke="#000437"
              strokeWidth="3"
            />
          </g>
        </svg>
      )}
    </div>
  );
};

/**
 * Interactive Floating Mascot Companion Dock ("Profe Búho en vivo")
 * Sits discreetly in the bottom-left corner, follows the cursor with its eyes,
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
    idle: '/assets/mascot/profesor-buho-idle.svg',
    celebrating: '/assets/mascot/profesor-buho-celebrating.svg',
    scanning: '/assets/mascot/profesor-buho-scanning.svg'
  };

  return (
    <div className="no-print fixed bottom-5 left-5 z-40 flex flex-col items-start">
      {isExpanded && (
        <div className="duo-bubble-pop mb-3 w-72 sm:w-80 bg-[#ffffff] border-2 border-[#000437] rounded-[12px] p-4">
          <div className="flex items-center justify-between border-b-2 border-[#afafaf]/40 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <img
                src="/assets/mascot/badge-owl-avatar.svg"
                alt="Avatar Profe Búho"
                className="w-7 h-7"
              />
              <div>
                <h4 className="text-[14px] font-bold text-[#4b4b4b] leading-none">
                  Profe Búho · Asistente
                </h4>
                <span className="text-[11px] font-bold uppercase tracking-[0.053em] text-[#58cc02]">
                  Mascota Interactiva ({creditsBalance} Cr.)
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

          {/* Live SVG Asset Preview */}
          <div className="bg-[#d7ffb8]/40 border-2 border-[#58cc02] rounded-[12px] p-2 flex flex-col items-center">
            <img
              src={assetFileMap[poseAsset]}
              alt={`Profe Búho - ${poseAsset}`}
              className="w-36 h-28 object-contain select-none"
            />
            <div className="flex items-center gap-1.5 mt-2">
              {(['idle', 'celebrating', 'scanning'] as const).map(pose => (
                <button
                  key={pose}
                  type="button"
                  onClick={() => setPoseAsset(pose)}
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
        onClick={() => setIsExpanded(prev => !prev)}
        className="group flex items-center gap-2.5 bg-[#ffffff] hover:bg-[#d7ffb8]/40 border-2 border-[#000437] rounded-[12px] px-3 py-2 transition-transform active:translate-y-0.5"
      >
        <img
          src="/assets/mascot/badge-owl-avatar.svg"
          alt="Profe Búho"
          className="w-9 h-9 object-contain"
        />
        <div className="text-left pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
              Profe Búho
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
