import React from 'react';

interface DuoMascotProps {
  variant: 'professor' | 'exam' | 'scanner' | 'trophy';
  className?: string;
}

/**
 * Duolingo-style flat 2D mascot & character illustrations with bold black (#000437)
 * outlines, rounded geometric shapes, and the secondary character palette (pink,
 * purple, yellow, orange, blue) floating directly on pure white (#ffffff).
 */
export const DuoMascot: React.FC<DuoMascotProps> = ({ variant, className = '' }) => {
  if (variant === 'professor') {
    return (
      <svg
        viewBox="0 0 380 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full max-w-[340px] h-auto select-none ${className}`}
        aria-hidden="true"
      >
        {/* Floating decorative geometric sparkles (Yellow & Purple secondary art palette) */}
        <circle cx="52" cy="54" r="10" fill="#ffc800" stroke="#000437" strokeWidth="3.5" />
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

        {/* Document / Storybook Page behind mascot */}
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

        {/* Mascot Feet */}
        <rect
          x="168"
          y="238"
          width="32"
          height="16"
          rx="8"
          fill="#ff9600"
          stroke="#000437"
          strokeWidth="4"
        />
        <rect
          x="224"
          y="238"
          width="32"
          height="16"
          rx="8"
          fill="#ff9600"
          stroke="#000437"
          strokeWidth="4"
        />

        {/* Chubby Owl Mascot Body */}
        <rect
          x="140"
          y="64"
          width="144"
          height="182"
          rx="68"
          fill="#58cc02"
          stroke="#000437"
          strokeWidth="4"
        />

        {/* Owl Ear Tufts */}
        <path
          d="M155 76C144 54 164 44 182 64"
          fill="#58cc02"
          stroke="#000437"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M269 76C280 54 260 44 242 64"
          fill="#58cc02"
          stroke="#000437"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Belly Feather Patch */}
        <rect
          x="166"
          y="162"
          width="92"
          height="68"
          rx="44"
          fill="#a5ed6e"
          stroke="#000437"
          strokeWidth="3.5"
        />
        <path d="M192 184C198 190 204 190 210 184" stroke="#58cc02" strokeWidth="4" strokeLinecap="round" />
        <path d="M216 184C222 190 228 190 234 184" stroke="#58cc02" strokeWidth="4" strokeLinecap="round" />
        <path d="M204 202C210 208 216 208 222 202" stroke="#58cc02" strokeWidth="4" strokeLinecap="round" />

        {/* Left Wing waving */}
        <path
          d="M142 136C112 126 104 156 126 178L142 184"
          fill="#58cc02"
          stroke="#000437"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Right Wing holding giant yellow pencil */}
        <path
          d="M282 140C314 134 322 164 296 186L280 190"
          fill="#58cc02"
          stroke="#000437"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Giant Eyes + Scholar Glasses */}
        <circle cx="186" cy="118" r="24" fill="#ffffff" stroke="#000437" strokeWidth="4" />
        <circle cx="238" cy="118" r="24" fill="#ffffff" stroke="#000437" strokeWidth="4" />
        <line x1="210" y1="118" x2="214" y2="118" stroke="#000437" strokeWidth="4" />
        <circle cx="188" cy="118" r="10" fill="#000437" />
        <circle cx="240" cy="118" r="10" fill="#000437" />
        <circle cx="192" cy="114" r="3.5" fill="#ffffff" />
        <circle cx="244" cy="114" r="3.5" fill="#ffffff" />

        {/* Beak */}
        <path
          d="M202 134H222L212 150L202 134Z"
          fill="#ffc800"
          stroke="#000437"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Playful Academic Mortarboard Hat (Purple & Yellow art colors) */}
        <polygon
          points="212,24 148,48 212,70 276,48"
          fill="#ce82ff"
          stroke="#000437"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <line x1="264" y1="52" x2="274" y2="82" stroke="#ffc800" strokeWidth="4" strokeLinecap="round" />
        <circle cx="274" cy="84" r="6" fill="#ffc800" stroke="#000437" strokeWidth="3" />

        {/* Giant Pencil in right wing */}
        <g transform="rotate(22 308 156)">
          <rect
            x="296"
            y="96"
            width="20"
            height="88"
            rx="4"
            fill="#ffc800"
            stroke="#000437"
            strokeWidth="3.5"
          />
          <rect
            x="296"
            y="82"
            width="20"
            height="16"
            rx="4"
            fill="#ff86d0"
            stroke="#000437"
            strokeWidth="3.5"
          />
          <polygon
            points="296,184 316,184 306,204"
            fill="#ffffff"
            stroke="#000437"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  }

  if (variant === 'exam') {
    return (
      <svg
        viewBox="0 0 380 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full max-w-[320px] h-auto select-none ${className}`}
        aria-hidden="true"
      >
        <circle cx="58" cy="52" r="10" fill="#ff86d0" stroke="#000437" strokeWidth="3.5" />
        <circle cx="328" cy="68" r="12" fill="#ffc800" stroke="#000437" strokeWidth="3.5" />

        {/* Big Solucionario Card */}
        <rect
          x="74"
          y="34"
          width="156"
          height="196"
          rx="18"
          fill="#ffffff"
          stroke="#000437"
          strokeWidth="4"
        />
        {/* Checkmark rows */}
        <circle cx="106" cy="76" r="12" fill="#58cc02" stroke="#000437" strokeWidth="3" />
        <path d="M101 76L104.5 79.5L112 72" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <rect x="128" y="70" width="76" height="12" rx="6" fill="#d7ffb8" stroke="#000437" strokeWidth="2.5" />

        <circle cx="106" cy="116" r="12" fill="#1cb0f6" stroke="#000437" strokeWidth="3" />
        <path d="M101 116L104.5 119.5L112 112" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <rect x="128" y="110" width="64" height="12" rx="6" fill="#afafaf" />

        <circle cx="106" cy="156" r="12" fill="#ce82ff" stroke="#000437" strokeWidth="3" />
        <path d="M101 156L104.5 159.5L112 152" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <rect x="128" y="150" width="72" height="12" rx="6" fill="#afafaf" />

        {/* Mini Mascot peeking on the right */}
        <rect
          x="212"
          y="96"
          width="116"
          height="134"
          rx="56"
          fill="#58cc02"
          stroke="#000437"
          strokeWidth="4"
        />
        <circle cx="250" cy="144" r="18" fill="#ffffff" stroke="#000437" strokeWidth="3.5" />
        <circle cx="290" cy="144" r="18" fill="#ffffff" stroke="#000437" strokeWidth="3.5" />
        <circle cx="250" cy="144" r="8" fill="#000437" />
        <circle cx="290" cy="144" r="8" fill="#000437" />
        <polygon points="262,158 278,158 270,170" fill="#ffc800" stroke="#000437" strokeWidth="3" />

        {/* Gold 10/10 Badge */}
        <circle cx="212" cy="196" r="26" fill="#ffc800" stroke="#000437" strokeWidth="4" />
        <text
          x="212"
          y="203"
          textAnchor="middle"
          fontFamily="Nunito, sans-serif"
          fontWeight="900"
          fontSize="20"
          fill="#000437"
        >
          10
        </text>
      </svg>
    );
  }

  if (variant === 'scanner') {
    return (
      <svg
        viewBox="0 0 380 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full max-w-[320px] h-auto select-none ${className}`}
        aria-hidden="true"
      >
        {/* Handwritten Exam Sheet */}
        <rect
          x="56"
          y="42"
          width="148"
          height="182"
          rx="18"
          fill="#ffffff"
          stroke="#000437"
          strokeWidth="4"
        />
        <line x1="42" y1="126" x2="218" y2="126" stroke="#58cc02" strokeWidth="5" strokeLinecap="round" />
        <rect x="80" y="74" width="96" height="10" rx="5" fill="#d7ffb8" />
        <rect x="80" y="98" width="76" height="10" rx="5" fill="#afafaf" />
        <rect x="80" y="148" width="100" height="10" rx="5" fill="#afafaf" />
        <rect x="80" y="172" width="64" height="10" rx="5" fill="#ff9600" />

        {/* Mascot holding giant Magnifying Glass */}
        <rect
          x="216"
          y="82"
          width="116"
          height="144"
          rx="56"
          fill="#58cc02"
          stroke="#000437"
          strokeWidth="4"
        />
        <circle cx="254" cy="130" r="18" fill="#ffffff" stroke="#000437" strokeWidth="3.5" />
        <circle cx="294" cy="130" r="18" fill="#ffffff" stroke="#000437" strokeWidth="3.5" />
        <circle cx="254" cy="130" r="8" fill="#000437" />
        <circle cx="294" cy="130" r="8" fill="#000437" />
        <polygon points="266,144 282,144 274,156" fill="#ffc800" stroke="#000437" strokeWidth="3" />

        {/* Magnifying Glass */}
        <circle cx="176" cy="144" r="38" fill="#1cb0f6" fillOpacity="0.22" stroke="#000437" strokeWidth="5" />
        <line x1="204" y1="170" x2="232" y2="198" stroke="#ff9600" strokeWidth="9" strokeLinecap="round" />
        <line x1="204" y1="170" x2="232" y2="198" stroke="#000437" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 380 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full max-w-[320px] h-auto select-none ${className}`}
      aria-hidden="true"
    >
      <circle cx="72" cy="60" r="10" fill="#ce82ff" stroke="#000437" strokeWidth="3.5" />
      <circle cx="314" cy="54" r="12" fill="#ff86d0" stroke="#000437" strokeWidth="3.5" />

      {/* Golden Trophy Cup */}
      <path
        d="M136 56H244V112C244 142 220 166 190 166C160 166 136 142 136 112V56Z"
        fill="#ffc800"
        stroke="#000437"
        strokeWidth="4"
      />
      <rect x="174" y="166" width="32" height="34" fill="#ffc800" stroke="#000437" strokeWidth="4" />
      <rect x="144" y="200" width="92" height="24" rx="10" fill="#ce82ff" stroke="#000437" strokeWidth="4" />
      <circle cx="190" cy="108" r="22" fill="#ffffff" stroke="#000437" strokeWidth="3.5" />
      <path
        d="M182 108L188 114L200 101"
        stroke="#58cc02"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
