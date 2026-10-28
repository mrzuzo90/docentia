import { Exam, SourceDocument, StudentSubmission } from '../types';

/**
 * Generates a realistic visual scanned exam SVG Data URL so the split-screen
 * OCR workbench displays an authentic paper scan with handwriting, marks, and smudges.
 */
export function createSimulatedScanDataUrl(params: {
  studentName: string;
  studentId: string;
  examTitle: string;
  dateStr: string;
  q1Choice: string;
  q2Choice: string;
  q2CrossedOut?: string;
  q3Choice: string;
  q4Choice: string;
  ex1Lines: string[];
  ex2Lines: string[];
  hasSmudgeInEx2?: boolean;
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const renderBubble = (qIdx: number, opt: string, x: number, y: number, selected: boolean, crossed: boolean) => {
    return `
      <g transform="translate(${x}, ${y})">
        <circle cx="10" cy="10" r="8" fill="${selected ? '#dbeafe' : '#ffffff'}" stroke="#475569" stroke-width="1.3"/>
        <text x="10" y="13.5" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#334155">${opt}</text>
        ${
          selected
            ? `<path d="M 4 4 L 16 16 M 16 4 L 4 16" stroke="#1e3a8a" stroke-width="2.2" stroke-linecap="round"/>`
            : ''
        }
        ${
          crossed
            ? `<path d="M 2 10 Q 10 2 18 10 Q 10 18 2 10 M 1 5 L 19 15 M 2 14 L 18 6" stroke="#1e293b" stroke-width="2.5" fill="none"/>
               <circle cx="10" cy="10" r="11" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="3,2" fill="none"/>`
            : ''
        }
      </g>
    `;
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 860" width="620" height="860">
    <defs>
      <filter id="paper-texture" x="0" y="0" width="100%" height="100%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/>
      </filter>
      <filter id="ink-blur">
        <feGaussianBlur stdDeviation="2.1"/>
      </filter>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="0.8"/>
      </pattern>
    </defs>

    <!-- Paper background -->
    <rect x="10" y="10" width="600" height="840" rx="4" fill="#fcfaf5" stroke="#cbd5e1" stroke-width="1.5" filter="url(#paper-texture)"/>
    <rect x="25" y="180" width="570" height="650" fill="url(#grid)" />

    <!-- Official Header Box -->
    <rect x="30" y="28" width="560" height="105" fill="#ffffff" stroke="#334155" stroke-width="1.5"/>
    <line x1="30" y1="68" x2="590" y2="68" stroke="#94a3b8" stroke-width="1"/>
    <line x1="430" y1="28" x2="430" y2="133" stroke="#334155" stroke-width="1.2"/>

    <text x="42" y="48" font-family="serif" font-size="11" font-weight="bold" fill="#0f172a">${esc(params.examTitle.toUpperCase().slice(0, 52))}</text>
    <text x="42" y="62" font-family="sans-serif" font-size="8.5" fill="#475569">DPTO. DE CIENCIAS EXPERIMENTALES • HOJA OFICIAL DE RESPUESTAS</text>

    <!-- Student Handwritten Metadata -->
    <text x="42" y="88" font-family="sans-serif" font-size="8.5" font-weight="bold" fill="#475569">ALUMNO/A:</text>
    <text x="100" y="89" font-family="'Comic Sans MS', 'Bradley Hand', cursive, sans-serif" font-size="13" font-style="italic" fill="#1e3a8a">${esc(params.studentName)}</text>

    <text x="42" y="116" font-family="sans-serif" font-size="8.5" font-weight="bold" fill="#475569">EXPEDIENTE:</text>
    <text x="108" y="116" font-family="monospace" font-size="11" fill="#1e3a8a">${esc(params.studentId)}</text>

    <text x="250" y="116" font-family="sans-serif" font-size="8.5" font-weight="bold" fill="#475569">FECHA:</text>
    <text x="292" y="116" font-family="monospace" font-size="11" fill="#1e3a8a">${esc(params.dateStr)}</text>

    <!-- Stamp Box -->
    <text x="510" y="48" font-family="sans-serif" font-size="8" font-weight="bold" text-anchor="middle" fill="#64748b">SELLO ESCANEO OCR</text>
    <rect x="455" y="60" width="110" height="55" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-dasharray="3,2"/>
    <text x="510" y="85" font-family="monospace" font-size="8" text-anchor="middle" fill="#0f172a">SCAN-ID #2026-A4</text>
    <text x="510" y="100" font-family="monospace" font-size="7.5" text-anchor="middle" fill="#059669">300 DPI • GRAYSCALE</text>

    <!-- SECTION I: MULTIPLE CHOICE -->
    <rect x="30" y="148" width="560" height="22" fill="#1e293b"/>
    <text x="40" y="163" font-family="sans-serif" font-size="9.5" font-weight="bold" fill="#ffffff">SECCIÓN I: PREGUNTAS TIPO TEST (4.0 PUNTOS)</text>

    <g transform="translate(40, 182)">
      <!-- Q1 -->
      <text x="0" y="15" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e293b">Pregunta 1:</text>
      ${['A', 'B', 'C', 'D'].map((o, i) => renderBubble(1, o, 80 + i * 42, 2, params.q1Choice === o, false)).join('')}

      <!-- Q2 -->
      <text x="280" y="15" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e293b">Pregunta 2:</text>
      ${['A', 'B', 'C', 'D'].map((o, i) => renderBubble(2, o, 360 + i * 42, 2, params.q2Choice === o, params.q2CrossedOut === o)).join('')}
      ${
        params.q2CrossedOut
          ? `<rect x="352" y="-3" width="180" height="32" rx="4" fill="none" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4,2"/>
             <text x="355" y="40" font-family="monospace" font-size="8" font-weight="bold" fill="#b45309">⚠ OCR: Doble marca / Tachón detectado</text>`
          : ''
      }

      <!-- Q3 -->
      <text x="0" y="62" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e293b">Pregunta 3:</text>
      ${['A', 'B', 'C', 'D'].map((o, i) => renderBubble(3, o, 80 + i * 42, 48, params.q3Choice === o, false)).join('')}

      <!-- Q4 -->
      <text x="280" y="62" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e293b">Pregunta 4:</text>
      ${['A', 'B', 'C', 'D'].map((o, i) => renderBubble(4, o, 360 + i * 42, 48, params.q4Choice === o, false)).join('')}
    </g>

    <!-- SECTION II: EXERCISES -->
    <rect x="30" y="275" width="560" height="22" fill="#1e293b"/>
    <text x="40" y="290" font-family="sans-serif" font-size="9.5" font-weight="bold" fill="#ffffff">SECCIÓN II: EJERCICIOS DE DESARROLLO (6.0 PUNTOS)</text>

    <!-- Exercise 1 Box -->
    <rect x="30" y="308" width="560" height="230" fill="none" stroke="#94a3b8" stroke-width="1"/>
    <text x="40" y="326" font-family="sans-serif" font-size="9.5" font-weight="bold" fill="#334155">EJERCICIO 1: Transcripción y Complementariedad de Cadenas [3.0 pts]</text>
    <line x1="30" y1="334" x2="590" y2="334" stroke="#cbd5e1" stroke-width="1"/>

    ${params.ex1Lines
      .map(
        (line, idx) =>
          `<text x="45" y="${362 + idx * 32}" font-family="'Comic Sans MS', 'Bradley Hand', cursive, sans-serif" font-size="12.5" font-style="italic" fill="#1e3a8a">${esc(line)}</text>`
      )
      .join('')}

    <!-- Exercise 2 Box -->
    <rect x="30" y="555" width="560" height="270" fill="none" stroke="#94a3b8" stroke-width="1"/>
    <text x="40" y="573" font-family="sans-serif" font-size="9.5" font-weight="bold" fill="#334155">EJERCICIO 2: Código Genético Universal y Mutaciones [3.0 pts]</text>
    <line x1="30" y1="581" x2="590" y2="581" stroke="#cbd5e1" stroke-width="1"/>

    ${params.ex2Lines
      .map(
        (line, idx) =>
          `<text x="45" y="${610 + idx * 32}" font-family="'Comic Sans MS', 'Bradley Hand', cursive, sans-serif" font-size="12.5" font-style="italic" fill="#1e3a8a" ${
            params.hasSmudgeInEx2 && idx >= 2 ? 'filter="url(#ink-blur)" opacity="0.55"' : ''
          }>${esc(line)}</text>`
      )
      .join('')}

    ${
      params.hasSmudgeInEx2
        ? `<g>
             <rect x="38" y="655" width="535" height="95" rx="6" fill="#fef3c7" fill-opacity="0.35" stroke="#d97706" stroke-width="1.8" stroke-dasharray="6,4"/>
             <ellipse cx="260" cy="700" rx="95" ry="22" fill="#1e3a8a" opacity="0.18" filter="url(#ink-blur)"/>
             <path d="M 120 695 Q 240 675 380 708 M 150 712 Q 290 690 420 715" stroke="#1e3a8a" stroke-width="3" opacity="0.35" filter="url(#ink-blur)" fill="none"/>
             <rect x="42" y="756" width="380" height="20" rx="3" fill="#b45309"/>
             <text x="50" y="769" font-family="monospace" font-size="8.5" font-weight="bold" fill="#ffffff">⚠ ALERTA OCR: Caligrafía ilegible / mancha de tinta en líneas 3-4</text>
           </g>`
        : ''
    }
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_SOURCE_DOCUMENT: SourceDocument = {
  id: 'doc-biologia-1',
  name: 'UD04_Genetica_Molecular_y_Biotecnologia_2Bach.pdf',
  size: 418200,
  pageCount: 6,
  type: 'application/pdf',
  uploadedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  content: `[Página 1]
UNIDAD DIDÁCTICA 4: GENÉTICA MOLECULAR, EXPRESIÓN GÉNICA Y MUTACIONES
Materia: Biología • Nivel: 2º Bachillerato (Preparación PAU / EBAU)

1. Estructura y Función de los Ácidos Nucleicos:
El ADN (ácido desoxirribonucleico) es la molécula portadora de la información genética hereditaria en todos los organismos celulares. Su estructura de doble hélice dextrógira fue postulada por Watson y Crick en 1953 a partir de las difracciones de rayos X de Rosalind Franklin.
Está constituido por dos cadenas polinucleotídicas antiparalelas (5'→3' y 3'→5') y complementarias. La Adenina (A) se une con la Timina (T) mediante dos puentes de hidrógeno (A=T), mientras que la Citosina (C) se empareja con la Guanina (G) mediante tres puentes de hidrógeno (C≡G), lo que confiere mayor estabilidad térmica a las regiones ricas en pares GC.

[Página 2]
2. Dogma Central de la Biología Molecular y Transcripción:
El flujo de información genética sigue la vía: ADN → (Transcripción) → ARNm → (Traducción) → Proteína.
En eucariotas, la transcripción es catalizada por la ARN polimerasa II, que lee la hebra molde de ADN en dirección 3'→5' y sintetiza el ARN mensajero en dirección 5'→3'.
El transcrito primario (pre-ARNm) experimenta tres procesos de maduración postranscripcional en el núcleo:
- Capping: Adición de la caperuza 7-metilguanosina trifosfato en el extremo 5'.
- Poliadenilación: Adición de una cola poli-A (150-250 ribonucleótidos de adenina) en el extremo 3'.
- Splicing (corte y empalme): Eliminación de las secuencias intrónicas (intrones, no codificantes) y unión precisa de los exones (secuencias codificantes) mediante el espliceosoma.

[Página 3]
3. El Código Genético y la Traducción Ribosomal:
El código genético establece la correspondencia entre los 64 tripletes o codones posibles del ARNm y los 20 aminoácidos proteicos. Sus propiedades fundamentales son:
- Es universal: compartido por todos los organismos conocidos (procariontes, eucariontes y virus), con mínimas excepciones en el ADN mitocondrial. Esta universalidad es la base de la ingeniería genética (ej. síntesis de insulina humana en bacterias E. coli).
- Es degenerado (redundante): existen 61 codones con sentido para solo 20 aminoácidos, por lo que múltiples codones sinónimos codifican un mismo aminoácido (variando frecuentemente en la tercera base o tambaleo).
- Es no solapante y sin comas: se lee de tres en tres nucleótidos de forma continua.
- Codón de inicio: AUG (codifica Metionina en eucariotas y Formilmetionina en procariotas).
- Codones de terminación (Stop): UAA (ocre), UAG (ámbar) y UGA (ópalo).

[Página 4]
4. Mutaciones Génicas o Puntuales:
Son alteraciones en la secuencia de nucleótidos de un gen:
- Sustituciones de bases (transiciones o transversiones): solo afectan a un codón. Por la degeneración del código, pueden ser silenciosas (mismo aminoácido), missense (cambio de un aminoácido) o nonsense (aparece un codón Stop prematuro).
- Inserciones o deleciones de nucleótidos (no múltiplos de 3): provocan un corrimiento en la pauta o marco de lectura (frameshift), alterando todos los tripletes posteriores al punto de mutación y originando proteínas completamente disfuncionales.`
};

export const SAMPLE_SOURCE_PHYSICS: SourceDocument = {
  id: 'doc-fisica-1',
  name: 'UD02_Dinamica_Newtoniana_y_Energia_Mecanica.pdf',
  size: 295400,
  pageCount: 4,
  type: 'application/pdf',
  uploadedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  content: `[Página 1]
UNIDAD 2: DINÁMICA CLÁSICA Y CONSERVACIÓN DE LA ENERGÍA MECÁNICA
Materia: Física y Química • Nivel: 1º Bachillerato

1. Leyes de Newton del Movimiento:
- Primera Ley (Principio de Inercia): Todo cuerpo permanece en reposo o en Movimiento Rectilíneo Uniforme (MRU) si la resultante de las fuerzas externas que actúan sobre él es nula (ΣF = 0).
- Segunda Ley (Ley Fundamental de la Dinámica): La fuerza neta aplicada sobre un cuerpo es directamente proporcional a la aceleración que adquiere (ΣF = m · a). En forma general, F = dp/dt.
- Tercera Ley (Principio de Acción y Reacción): Si un cuerpo A ejerce una fuerza sobre un cuerpo B, este ejerce sobre A una fuerza de igual módulo y dirección, pero de sentido opuesto, aplicadas en cuerpos distintos.

[Página 2]
2. Trabajo y Teorema de las Fuerzas Vivas:
El trabajo realizado por una fuerza constante se define como W = F · Δr · cos(θ).
El Teorema de la Energía Cinética establece que el trabajo neto realizado por todas las fuerzas que actúan sobre una partícula es igual a la variación de su energía cinética: W_total = ΔEc = ½ m v_f² - ½ m v_0².
En presencia de fuerzas de rozamiento (no conservativas), la energía mecánica no se conserva: ΔEm = W_nc = -F_r · d.`
};

export const SAMPLE_EXAM: Exam = {
  id: 'exam-genetica-2026',
  title: 'Evaluación Parcial: Genética Molecular y Expresión Génica',
  subject: 'Biología',
  targetLevel: '2º Bachillerato',
  institution: 'IES Ramiro de Maeztu • Departamento de Ciencias Naturales',
  durationMinutes: 60,
  testPenalty: 0,
  status: 'grading',
  instructions: 'Duración: 60 minutos. En la Parte I (Test), marque únicamente una respuesta por pregunta. En la Parte II (Ejercicios), justifique razonadamente todos los pasos e indique siempre la polaridad 5\' y 3\' de las cadenas.',
  createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  documents: [SAMPLE_SOURCE_DOCUMENT],
  totalScore: 10,
  testSectionWeight: 4.0,
  exerciseSectionWeight: 6.0,
  testQuestions: [
    {
      id: 'q1',
      question: '¿Cuántos puentes de hidrógeno estabilizan el par de bases Citosina-Guanina (C≡G) en la estructura bicatenaria del ADN?',
      options: {
        A: 'Un enlace fosfodiéster covalente',
        B: 'Dos puentes de hidrógeno',
        C: 'Tres puentes de hidrógeno',
        D: 'Cuatro interacciones hidrofóbicas'
      },
      correctAnswer: 'C',
      explanation: 'El par Citosina-Guanina forma tres puentes de hidrógeno (C≡G), frente a los dos puentes del par Adenina-Timina (A=T), otorgando mayor estabilidad térmica a la molécula.',
      points: 1.0,
      sourceDocumentName: 'Tema_7_Genetica_Molecular.pdf (Pág. 1)',
      sourceExcerpt: 'La Adenina (A) se une con la Timina (T) mediante dos puentes de hidrógeno (A=T), mientras que la Citosina (C) se empareja con la Guanina (G) mediante tres puentes de hidrógeno (C≡G), lo que confiere mayor estabilidad térmica a las regiones ricas en pares GC.',
      isSourceVerified: true
    },
    {
      id: 'q2',
      question: '¿Qué propiedad del código genético explica que existan mutaciones puntuales por sustitución que sean "silenciosas" (sin cambio en el aminoácido)?',
      options: {
        A: 'Que el código genético es solapado y discontinuo.',
        B: 'Que el código genético es degenerado (existen codones sinónimos).',
        C: 'Que la ARN polimerasa corrige automáticamente todos los codones en el ribosoma.',
        D: 'Que cada codón puede codificar simultáneamente tres aminoácidos distintos.'
      },
      correctAnswer: 'B',
      explanation: 'Al ser degenerado (61 codones con sentido para 20 aminoácidos), varios tripletes sinónimos codifican el mismo aminoácido, especialmente cuando el cambio ocurre en la tercera posición del codón.',
      points: 1.0,
      sourceDocumentName: 'Tema_7_Genetica_Molecular.pdf (Pág. 3)',
      sourceExcerpt: 'Es degenerado (redundante): existen 61 codones con sentido para solo 20 aminoácidos, por lo que múltiples codones sinónimos codifican un mismo aminoácido (variando frecuentemente en la tercera base o tambaleo).',
      isSourceVerified: true
    },
    {
      id: 'q3',
      question: 'En células eucariotas, el proceso de maduración denominado "splicing" sobre el pre-ARNm consiste en:',
      options: {
        A: 'La metilación de las histonas en el nucleosoma.',
        B: 'La escisión de los exones y el empalme de los intrones.',
        C: 'La eliminación de los intrones no codificantes y la unión de los exones.',
        D: 'La adición de desoxirribosa al extremo 3\' del ARN transferente.'
      },
      correctAnswer: 'C',
      explanation: 'El complejo espliceosoma elimina los intrones (secuencias intercaladas no codificantes) y empalma los exones para constituir el ARNm maduro funcional.',
      points: 1.0,
      sourceDocumentName: 'Tema_7_Genetica_Molecular.pdf (Pág. 2)',
      sourceExcerpt: 'Splicing (corte y empalme): Eliminación de las secuencias intrónicas (intrones, no codificantes) y unión precisa de los exones (secuencias codificantes) mediante el espliceosoma.',
      isSourceVerified: true
    },
    {
      id: 'q4',
      question: '¿Cuál de los siguientes tripletes de ARNm actúa como codón de inicio universal de la traducción y qué aminoácido incorpora en eucariotas?',
      options: {
        A: '5\'-UAA-3\' — Incorpora Leucina',
        B: '5\'-AUG-3\' — Incorpora Metionina',
        C: '5\'-UGA-3\' — Incorpora Triptófano',
        D: '5\'-TAC-3\' — Incorpora Valina'
      },
      correctAnswer: 'B',
      explanation: 'El triplete 5\'-AUG-3\' en el ARNm es el codón de iniciación universal y codifica el aminoácido Metionina.',
      points: 1.0,
      sourceDocumentName: 'Tema_7_Genetica_Molecular.pdf (Pág. 3)',
      sourceExcerpt: 'Codón de inicio: AUG (codifica Metionina en eucariotas y Formilmetionina en procariotas). Codones de terminación (Stop): UAA, UAG y UGA.',
      isSourceVerified: true
    }
  ],
  exercises: [
    {
      id: 'ex1',
      title: 'Transcripción, Complementariedad y Mutación del Codón de Inicio',
      statement: 'Dada la siguiente secuencia de la hebra molde de un fragmento génico de ADN:\n3\'- TAC CGA TTT ACT -5\'\n\na) Escriba la secuencia completa del ARNm transcrito indicando expresamente sus extremos 5\' y 3\'. (1.0 pt)\nb) Indique las secuencias y polaridades de los anticodones de los ARNt que intervendrán en la traducción. (1.0 pt)\nc) Justifique qué efecto biológico tendría la sustitución de la Citosina en posición 3 de la hebra molde por una Timina (3\'-TAT...). (1.0 pt)',
      rubricCriteria: [
        'Secuencia de ARNm exacta y bien orientada: 5\'-AUG GCU AAA UGA-3\' (1.0 pt)',
        'Anticodones antiparalelos correctos: 3\'-UAC-5\', 3\'-CGA-5\', 3\'-UUU-5\' y mención de que UGA es codón Stop sin ARNt (1.0 pt)',
        'Justificación de la mutación: el triplete 3\'-TAT-5\' transcribe a 5\'-AUA-3\' (Isoleucina), perdiéndose el codón AUG de inicio e impidiendo el arranque ribosomal (1.0 pt)'
      ],
      solutionSteps: `a) Hebra molde ADN: 3'- TAC CGA TTT ACT - 5'
Por complementariedad antiparalela (A->U, T->A, C->G, G->C), el ARNm transcrito es:
5'- AUG GCU AAA UGA - 3'

b) Anticodones de los ARNt correspondientes:
- Codón 5'-AUG-3' → Anticodón 3'-UAC-5'
- Codón 5'-GCU-3' → Anticodón 3'-CGA-5'
- Codón 5'-AAA-3' → Anticodón 3'-UUU-5'
- El cuarto triplete (5'-UGA-3') es un codón de parada (Stop), por lo que no es reconocido por ningún ARNt sino por factores de liberación.

c) Efecto de la mutación 3'-TAC-5' → 3'-TAT-5':
El primer codón del ARNm pasaría de 5'-AUG-3' a 5'-AUA-3'. Al desaparecer el codón de inicio AUG, la subunidad menor del ribosoma no reconoce el sitio de arranque de la traducción y el péptido no llega a sintetizarse.`,
      points: 3.0,
      sourceDocumentName: 'Tema_7_Genetica_Molecular.pdf (Págs. 2-3)',
      sourceExcerpt: 'La ARN polimerasa II lee la hebra molde de ADN en dirección 3\'→5\' y sintetiza el ARN mensajero en dirección 5\'→3\'. El código genético se lee en codones de 3 nucleótidos...',
      isSourceVerified: true
    },
    {
      id: 'ex2',
      title: 'Universalidad del Código Genético y Mutaciones por Corrimiento de Pauta',
      statement: 'En relación con las propiedades del código genético y las alteraciones del material hereditario:\n\na) Defina qué significa que el código genético sea "universal" y exponga una aplicación biotecnológica directa derivada de esta propiedad. (1.5 pts)\nb) Compare las consecuencias fenotípicas sobre la proteína resultante entre una mutación puntual por sustitución de una base y una deleción de un único nucleótido al principio del gen. (1.5 pts)',
      rubricCriteria: [
        'Definición rigurosa de universalidad: correspondencia idéntica codón-aminoácido en prácticamente todos los seres vivos (0.75 pts)',
        'Aplicación biotecnológica concreta: expresión de genes humanos (ej. insulina, hormona del crecimiento) en bacterias o levaduras transgénicas (0.75 pts)',
        'Comparativa sustitución vs deleción: explicación del desplazamiento del marco de lectura (frameshift) en la deleción frente al efecto localizado de la sustitución (1.5 pts)'
      ],
      solutionSteps: `a) Universalidad y Biotecnología:
La universalidad implica que un mismo codón del ARNm codifica el mismo aminoácido en procariotas, eucariotas y virus. Gracias a ello es posible la tecnología del ADN recombinante: un gen humano (como el gen de la insulina) puede insertarse mediante un plásmido en Escherichia coli, y la maquinaria traduccional bacteriana sintetizará exactamente la proteína humana funcional.

b) Sustitución frente a Deleción de un nucleótido:
- Una sustitución reemplaza un nucleótido por otro, afectando únicamente a un triplete (puede ser silenciosa por degeneración del código, o cambiar un único aminoácido en la cadena).
- Una deleción de un nucleótido provoca un corrimiento de la pauta de lectura (frameshift) a partir del punto de mutación: todos los tripletes posteriores cambian su agrupación, alterando toda la secuencia de aminoácidos subsiguiente y generando casi invariablemente un codón de parada prematuro y una proteína truncada no funcional.`,
      points: 3.0,
      sourceDocumentName: 'Tema_7_Genetica_Molecular.pdf (Págs. 3-4)',
      sourceExcerpt: 'Es universal: compartido por todos los organismos conocidos... Esta universalidad es la base de la ingeniería genética. Las inserciones o deleciones provocan un corrimiento en la pauta de lectura (frameshift)...',
      isSourceVerified: true
    }
  ]
};

export const SAMPLE_EXAM_PHYSICS: Exam = {
  id: 'exam-fisica-2026',
  title: 'Control de Evaluación: Dinámica Newtoniana y Trabajo Mecánico',
  subject: 'Física y Química',
  targetLevel: '1º Bachillerato',
  institution: 'IES Ramiro de Maeztu • Departamento de Física y Química',
  durationMinutes: 50,
  testPenalty: 0.25,
  status: 'ready',
  instructions: 'Tiempo: 50 minutos. Se permite el uso de calculadora científica no programable. Exprese todas las magnitudes en el Sistema Internacional (SI) indicando sus unidades.',
  createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  documents: [SAMPLE_SOURCE_PHYSICS],
  totalScore: 10,
  testSectionWeight: 3.0,
  exerciseSectionWeight: 7.0,
  testQuestions: [
    {
      id: 'fq-q1',
      question: 'Si sobre un cuerpo en movimiento rectilíneo la resultante de todas las fuerzas exteriores es nula (ΣF = 0), podemos afirmar que:',
      options: {
        A: 'El cuerpo se detendrá progresivamente debido a su inercia.',
        B: 'Su velocidad permanece constante en módulo, dirección y sentido (MRU).',
        C: 'Su aceleración es proporcional a su masa inercial.',
        D: 'El trabajo neto de las fuerzas conservativas es negativo.'
      },
      correctAnswer: 'B',
      explanation: 'Por la Primera Ley de Newton (Principio de Inercia), si ΣF = 0, la aceleración es nula y el cuerpo mantiene su estado de reposo o de MRU a velocidad constante.',
      points: 1.5
    },
    {
      id: 'fq-q2',
      question: 'Según el Teorema de las Fuerzas Vivas (Teorema de la Energía Cinética), el trabajo neto total realizado sobre una partícula equivale a:',
      options: {
        A: 'La variación de su energía potencial gravitatoria cambiada de signo.',
        B: 'La variación de su energía cinética (ΔEc = Ec_final - Ec_inicial).',
        C: 'El producto de la fuerza normal por el desplazamiento.',
        D: 'La potencia media dividida por el intervalo de tiempo.'
      },
      correctAnswer: 'B',
      explanation: 'El trabajo total de todas las fuerzas (conservativas y no conservativas) que actúan sobre un cuerpo es igual a la variación de su energía cinética.',
      points: 1.5
    }
  ],
  exercises: [
    {
      id: 'fq-ex1',
      title: 'Plano Inclinado con Rozamiento y Conservación de la Energía',
      statement: 'Un bloque de masa m = 4 kg se lanza hacia arriba por un plano inclinado 30º respecto a la horizontal con una velocidad inicial v₀ = 10 m/s. El coeficiente de rozamiento dinámico entre el bloque y el plano es μ = 0.25. (Dato: g = 9.8 m/s²).\n\na) Dibuje el diagrama de sólido libre y calcule la aceleración de frenado del bloque. (3.5 pts)\nb) Determine mediante consideraciones energéticas la distancia máxima que recorre sobre el plano y el calor disipado por rozamiento. (3.5 pts)',
      rubricCriteria: [
        'Descomposición vectorial correcta: Px = mg·sen30º, Py = N = mg·cos30º y Fr = μ·N (1.5 pts)',
        'Cálculo de la aceleración a = -g(sen30º + μ·cos30º) = -7.02 m/s² (2.0 pts)',
        'Aplicación de ΔEm = W_rozamiento y obtención de d = 7.12 m y W_nc = -60.4 J (3.5 pts)'
      ],
      solutionSteps: `a) Diagrama y aceleración:
Eje Y: N - m·g·cos(30º) = 0 ⇒ N = 4 · 9.8 · 0.866 = 33.95 N
Fuerza de rozamiento: Fr = μ · N = 0.25 · 33.95 = 8.49 N
Eje X (sentido subida positivo): -m·g·sen(30º) - Fr = m · a
-(4 · 9.8 · 0.5) - 8.49 = 4 · a ⇒ -19.6 - 8.49 = 4a ⇒ a = -7.02 m/s²

b) Balance energético:
Ec_0 = ½ · 4 · 10² = 200 J
En el punto más alto (v = 0): Ec_f = 0, Ep_f = m·g·d·sen(30º) = 19.6 · d
Como ΔEm = W_rozamiento ⇒ (19.6·d - 200) = -Fr · d = -8.49 · d
28.09 · d = 200 ⇒ d = 7.12 metros.
Energía disipada: |W_roz| = 8.49 N · 7.12 m = 60.45 J.`,
      points: 7.0
    }
  ]
};

export const SAMPLE_STUDENT_SUBMISSIONS: StudentSubmission[] = [
  {
    id: 'sub-lucia',
    examId: 'exam-genetica-2026',
    studentName: 'Lucía Gómez Fernández',
    studentIdCode: 'EXP-2026-014',
    submissionDate: new Date(Date.now() - 3600000 * 5).toISOString(),
    scanPdfName: 'Scan_01_Lucia_Gomez.pdf',
    scanImageUrl: createSimulatedScanDataUrl({
      studentName: 'Lucía Gómez Fernández',
      studentId: 'EXP-2026-014',
      examTitle: SAMPLE_EXAM.title,
      dateStr: '26/10/2026',
      q1Choice: 'C',
      q2Choice: 'B',
      q3Choice: 'C',
      q4Choice: 'B',
      ex1Lines: [
        "a) ARNm transcrito: 5' - AUG GCU AAA UGA - 3'",
        "b) Anticodones ARNt: 3'-UAC-5', 3'-CGA-5', 3'-UUU-5' (UGA es Stop)",
        "c) Si cambia C por T en molde -> 3'-TAT-5', el ARNm pasa a 5'-AUA-3'.",
        "   Se pierde el codón de inicio AUG y el ribosoma no inicia la síntesis."
      ],
      ex2Lines: [
        "a) Universal: los mismos codones codifican idénticos aminoácidos en",
        "   todos los seres vivos. Aplicación: insulina humana en bacterias E. coli.",
        "b) La sustitución solo altera 1 triplete (puede ser silenciosa), mientras",
        "   que la deleción desplaza la pauta de lectura (frameshift) en todo el gen."
      ],
      hasSmudgeInEx2: false
    }),
    status: 'graded',
    gradeReport: {
      id: 'rep-lucia',
      submissionId: 'sub-lucia',
      studentName: 'Lucía Gómez Fernández',
      testSectionScore: 4.0,
      testSectionMax: 4.0,
      testSectionScoreOutOf10: 10.0,
      exerciseSectionScore: 5.5,
      exerciseSectionMax: 6.0,
      exerciseSectionScoreOutOf10: 9.17,
      finalScore: 9.5,
      overallFeedback: 'Excelente dominio de la asignatura. Pleno de aciertos en la sección de tipo test (10/10 en la sección). En los ejercicios de desarrollo muestra un rigor sobresaliente en la orientación antiparalela de las cadenas 5\' y 3\'.',
      needsManualReview: false,
      manualReviewReasons: [],
      gradedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      corrections: [
        {
          questionId: 'q1',
          type: 'test',
          questionTitle: 'Pregunta 1 (Puentes de hidrógeno C≡G)',
          studentAnswer: 'Opción C',
          ocrExtractedText: 'Marca detectada en casilla [C] con trazo nítido (99.4% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 1.0,
          maxScore: 1.0,
          feedback: 'Respuesta correcta. Tres puentes de hidrógeno entre Citosina y Guanina.',
          needsManualReview: false
        },
        {
          questionId: 'q2',
          type: 'test',
          questionTitle: 'Pregunta 2 (Degeneración del código)',
          studentAnswer: 'Opción B',
          ocrExtractedText: 'Marca detectada en casilla [B] con trazo nítido (99.1% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 1.0,
          maxScore: 1.0,
          feedback: 'Correcto. Existencia de codones sinónimos.',
          needsManualReview: false
        },
        {
          questionId: 'q3',
          type: 'test',
          questionTitle: 'Pregunta 3 (Maduración / Splicing)',
          studentAnswer: 'Opción C',
          ocrExtractedText: 'Marca detectada en casilla [C] (99.6% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 1.0,
          maxScore: 1.0,
          feedback: 'Correcto. Eliminación de intrones y empalme de exones.',
          needsManualReview: false
        },
        {
          questionId: 'q4',
          type: 'test',
          questionTitle: 'Pregunta 4 (Codón de inicio AUG)',
          studentAnswer: 'Opción B',
          ocrExtractedText: 'Marca detectada en casilla [B] (98.9% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 1.0,
          maxScore: 1.0,
          feedback: 'Correcto. Triplete 5\'-AUG-3\' (Metionina).',
          needsManualReview: false
        },
        {
          questionId: 'ex1',
          type: 'exercise',
          questionTitle: 'Ejercicio 1: Transcripción y Complementariedad',
          studentAnswer: 'a) 5\'-AUG GCU AAA UGA-3\'. b) 3\'-UAC-5\', 3\'-CGA-5\', 3\'-UUU-5\' (UGA Stop). c) Pasa a 5\'-AUA-3\', no hay codón AUG de inicio.',
          ocrExtractedText: `a) ARNm transcrito: 5' - AUG GCU AAA UGA - 3'\nb) Anticodones ARNt: 3'-UAC-5', 3'-CGA-5', 3'-UUU-5' (UGA es Stop)\nc) Si cambia C por T en molde -> 3'-TAT-5', el ARNm pasa a 5'-AUA-3'. Se pierde el codón de inicio AUG y el ribosoma no inicia la síntesis.`,
          ocrConfidence: 'high',
          scoreAwarded: 3.0,
          maxScore: 3.0,
          feedback: 'Cumple los 3 criterios de la rúbrica al 100%. Excelente indicación de que el codón UGA carece de ARNt.',
          needsManualReview: false
        },
        {
          questionId: 'ex2',
          type: 'exercise',
          questionTitle: 'Ejercicio 2: Universalidad y Mutaciones',
          studentAnswer: 'Universalidad e insulina en E. coli. Comparación sustitución vs deleción (frameshift).',
          ocrExtractedText: `a) Universal: los mismos codones codifican idénticos aminoácidos en todos los seres vivos. Aplicación: insulina humana en bacterias E. coli.\nb) La sustitución solo altera 1 triplete (puede ser silenciosa), mientras que la deleción desplaza la pauta de lectura (frameshift) en todo el gen.`,
          ocrConfidence: 'high',
          scoreAwarded: 2.5,
          maxScore: 3.0,
          feedback: 'Muy bien resuelto. Se descuentan 0.50 pts porque en el apartado b no especifica la aparición de codones de parada prematuros (nonsense) tras el frameshift.',
          needsManualReview: false
        }
      ]
    }
  },
  {
    id: 'sub-carlos',
    examId: 'exam-genetica-2026',
    studentName: 'Carlos Morales Ruiz',
    studentIdCode: 'EXP-2026-029',
    submissionDate: new Date(Date.now() - 3600000 * 3).toISOString(),
    scanPdfName: 'Scan_02_Carlos_Morales.pdf',
    scanImageUrl: createSimulatedScanDataUrl({
      studentName: 'Carlos Morales Ruiz',
      studentId: 'EXP-2026-029',
      examTitle: SAMPLE_EXAM.title,
      dateStr: '26/10/2026',
      q1Choice: 'C',
      q2Choice: 'B',
      q2CrossedOut: 'A',
      q3Choice: 'B',
      q4Choice: 'B',
      ex1Lines: [
        "a) Cadena de ARNm: 5' AUG GCU AAA UGA 3'",
        "b) Anticodones: UAC, CGA, UUU",
        "c) Si cambia a T sale AUA y entonces no empieza la proteína",
        "   porque hace falta la metionina inicial."
      ],
      ex2Lines: [
        "a) Universal significa que vale igual para animales, plantas y bacterias.",
        "   Se usa para fabricar vacunas y transgénicos en laboratorio.",
        "b) En la deleción se borra una base y se corre el marco [ilegible...]",
        "   [mancha de tinta] ... cambiando todos los aa siguientes..."
      ],
      hasSmudgeInEx2: true
    }),
    status: 'needs_review',
    gradeReport: {
      id: 'rep-carlos',
      submissionId: 'sub-carlos',
      studentName: 'Carlos Morales Ruiz',
      testSectionScore: 2.0,
      testSectionMax: 4.0,
      testSectionScoreOutOf10: 5.0,
      exerciseSectionScore: 3.8,
      exerciseSectionMax: 6.0,
      exerciseSectionScoreOutOf10: 6.33,
      finalScore: 5.8,
      overallFeedback: 'Calificación provisional: 5.8 / 10. ATENCIÓN DOCENTE: El motor OCR ha marcado 2 incidencias que requieren validación manual: doble marca con tachón en la Pregunta 2 del test, y mancha de tinta / baja legibilidad en las líneas 3 y 4 del Ejercicio 2.',
      needsManualReview: true,
      manualReviewReasons: [
        'Pregunta 2 (Test): Tachón detectado en casilla [A] y marca simultánea en [B]. Requiere validación visual del docente.',
        'Ejercicio 2 (Desarrollo): Líneas 3-4 presentan mancha de tinta y caligrafía borrosa (confianza OCR < 45%).'
      ],
      gradedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      corrections: [
        {
          questionId: 'q1',
          type: 'test',
          questionTitle: 'Pregunta 1 (Puentes de hidrógeno C≡G)',
          studentAnswer: 'Opción C',
          ocrExtractedText: 'Marca detectada en casilla [C] (98.2% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 1.0,
          maxScore: 1.0,
          feedback: 'Correcto (3 puentes de hidrógeno).',
          needsManualReview: false
        },
        {
          questionId: 'q2',
          type: 'test',
          questionTitle: 'Pregunta 2 (Degeneración del código)',
          studentAnswer: 'Opción B (Con tachón previo en A)',
          ocrExtractedText: '[INCIDENCIA OCR]: Casilla [A] tachada con trazos circulares densos; casilla [B] marcada con aspa.',
          ocrConfidence: 'low',
          scoreAwarded: 0.0,
          maxScore: 1.0,
          feedback: 'Se asigna 0.00 pts por precaución ante doble marca. Si el docente da por buena la rectificación a la opción B, corresponde otorgar 1.00 pt.',
          needsManualReview: true,
          reviewReason: 'Tachadura en opción A y marca en opción B. Confirmar si se acepta la rectificación del alumno.'
        },
        {
          questionId: 'q3',
          type: 'test',
          questionTitle: 'Pregunta 3 (Maduración / Splicing)',
          studentAnswer: 'Opción B (Incorrecta)',
          ocrExtractedText: 'Marca detectada en casilla [B] (97.5% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 0.0,
          maxScore: 1.0,
          feedback: 'Respuesta errónea. El alumno seleccionó B (escisión de exones) cuando el splicing elimina los intrones (opción C).',
          needsManualReview: false
        },
        {
          questionId: 'q4',
          type: 'test',
          questionTitle: 'Pregunta 4 (Codón de inicio AUG)',
          studentAnswer: 'Opción B',
          ocrExtractedText: 'Marca detectada en casilla [B] (99.0% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 1.0,
          maxScore: 1.0,
          feedback: 'Correcto (5\'-AUG-3\').',
          needsManualReview: false
        },
        {
          questionId: 'ex1',
          type: 'exercise',
          questionTitle: 'Ejercicio 1: Transcripción y Complementariedad',
          studentAnswer: 'a) 5\' AUG GCU AAA UGA 3\'. b) UAC, CGA, UUU. c) Sale AUA y no empieza por falta de metionina.',
          ocrExtractedText: `a) Cadena de ARNm: 5' AUG GCU AAA UGA 3'\nb) Anticodones: UAC, CGA, UUU\nc) Si cambia a T sale AUA y entonces no empieza la proteína porque hace falta la metionina inicial.`,
          ocrConfidence: 'high',
          scoreAwarded: 2.5,
          maxScore: 3.0,
          feedback: 'Conceptualmente correcto en los tres apartados. Se descuentan 0.50 pts por omitir la polaridad 3\' y 5\' en los anticodones del apartado b.',
          needsManualReview: false
        },
        {
          questionId: 'ex2',
          type: 'exercise',
          questionTitle: 'Ejercicio 2: Universalidad y Mutaciones',
          studentAnswer: 'Apartado a legible; apartado b parcialmente ilegible por mancha de tinta.',
          ocrExtractedText: `a) Universal significa que vale igual para animales, plantas y bacterias. Se usa para fabricar vacunas y transgénicos en laboratorio.\nb) En la deleción se borra una base y se corre el marco [FRAGMENTO ILEGIBLE - BAJA DENSIDAD DE TRAZO] ... cambiando todos los aa siguientes...`,
          ocrConfidence: 'illegible',
          scoreAwarded: 1.3,
          maxScore: 3.0,
          feedback: 'El apartado a) es correcto (1.3 pts). El desarrollo del apartado b) presenta un borrón de tinta en la zona central que impide verificar la comparación completa con el solucionario.',
          needsManualReview: true,
          reviewReason: 'Mancha de tinta y caligrafía borrosa en las líneas 3 y 4 del Ejercicio 2. Inspeccionar el escaneo a la izquierda para calificar el apartado b.'
        }
      ]
    }
  },
  {
    id: 'sub-elena',
    examId: 'exam-genetica-2026',
    studentName: 'Elena Navarro Santos',
    studentIdCode: 'EXP-2026-008',
    submissionDate: new Date(Date.now() - 3600000 * 2).toISOString(),
    scanPdfName: 'Scan_03_Elena_Navarro.pdf',
    scanImageUrl: createSimulatedScanDataUrl({
      studentName: 'Elena Navarro Santos',
      studentId: 'EXP-2026-008',
      examTitle: SAMPLE_EXAM.title,
      dateStr: '26/10/2026',
      q1Choice: 'B',
      q2Choice: 'B',
      q3Choice: 'C',
      q4Choice: 'B',
      ex1Lines: [
        "a) Hebra ARNm: 5'- AUG GCU AAA UGA -3'",
        "b) ARNt anticodones: 3'-UAC-5', 3'-CGA-5', 3'-UUU-5'",
        "c) La mutación genera el triplete AUA en vez de AUG, por lo que",
        "   no se une el ARNt iniciador de metionina."
      ],
      ex2Lines: [
        "a) Es universal porque cada codón significa el mismo aminoácido en",
        "   cualquier especie. Permite obtener proteínas recombinantes.",
        "b) La sustitución cambia solo una base puntual; la deleción altera",
        "   el marco de lectura completo produciendo una proteína inservible."
      ],
      hasSmudgeInEx2: false
    }),
    status: 'graded',
    gradeReport: {
      id: 'rep-elena',
      submissionId: 'sub-elena',
      studentName: 'Elena Navarro Santos',
      testSectionScore: 3.0,
      testSectionMax: 4.0,
      testSectionScoreOutOf10: 7.5,
      exerciseSectionScore: 4.8,
      exerciseSectionMax: 6.0,
      exerciseSectionScoreOutOf10: 8.0,
      finalScore: 7.8,
      overallFeedback: 'Buen trabajo global (Notable). En la sección test obtiene 7.50/10 (confundió el número de puentes C-G con los de A-T en la pregunta 1). En la sección de desarrollo obtiene 8.00/10 con respuestas claras y bien estructuradas.',
      needsManualReview: false,
      manualReviewReasons: [],
      gradedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      corrections: [
        {
          questionId: 'q1',
          type: 'test',
          questionTitle: 'Pregunta 1 (Puentes de hidrógeno C≡G)',
          studentAnswer: 'Opción B (Incorrecta)',
          ocrExtractedText: 'Marca detectada en casilla [B] (99.2% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 0.0,
          maxScore: 1.0,
          feedback: 'Incorrecto. Marcó dos puentes de hidrógeno (propio de A=T) en lugar de tres (C≡G).',
          needsManualReview: false
        },
        {
          questionId: 'q2',
          type: 'test',
          questionTitle: 'Pregunta 2 (Degeneración del código)',
          studentAnswer: 'Opción B',
          ocrExtractedText: 'Marca detectada en casilla [B] (99.5% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 1.0,
          maxScore: 1.0,
          feedback: 'Correcto.',
          needsManualReview: false
        },
        {
          questionId: 'q3',
          type: 'test',
          questionTitle: 'Pregunta 3 (Maduración / Splicing)',
          studentAnswer: 'Opción C',
          ocrExtractedText: 'Marca detectada en casilla [C] (99.1% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 1.0,
          maxScore: 1.0,
          feedback: 'Correcto.',
          needsManualReview: false
        },
        {
          questionId: 'q4',
          type: 'test',
          questionTitle: 'Pregunta 4 (Codón de inicio AUG)',
          studentAnswer: 'Opción B',
          ocrExtractedText: 'Marca detectada en casilla [B] (99.4% confianza).',
          ocrConfidence: 'high',
          scoreAwarded: 1.0,
          maxScore: 1.0,
          feedback: 'Correcto.',
          needsManualReview: false
        },
        {
          questionId: 'ex1',
          type: 'exercise',
          questionTitle: 'Ejercicio 1: Transcripción y Complementariedad',
          studentAnswer: 'a) 5\'-AUG GCU AAA UGA-3\'. b) 3\'-UAC-5\', 3\'-CGA-5\', 3\'-UUU-5\'. c) AUA en vez de AUG.',
          ocrExtractedText: `a) Hebra ARNm: 5'- AUG GCU AAA UGA -3'\nb) ARNt anticodones: 3'-UAC-5', 3'-CGA-5', 3'-UUU-5'\nc) La mutación genera el triplete AUA en vez de AUG, por lo que no se une el ARNt iniciador de metionina.`,
          ocrConfidence: 'high',
          scoreAwarded: 2.8,
          maxScore: 3.0,
          feedback: 'Resolución muy precisa y notación de extremos correcta.',
          needsManualReview: false
        },
        {
          questionId: 'ex2',
          type: 'exercise',
          questionTitle: 'Ejercicio 2: Universalidad y Mutaciones',
          studentAnswer: 'Universalidad y proteínas recombinantes. Sustitución vs deleción.',
          ocrExtractedText: `a) Es universal porque cada codón significa el mismo aminoácido en cualquier especie. Permite obtener proteínas recombinantes.\nb) La sustitución cambia solo una base puntual; la deleción altera el marco de lectura completo produciendo una proteína inservible.`,
          ocrConfidence: 'high',
          scoreAwarded: 2.0,
          maxScore: 3.0,
          feedback: 'Conceptos bien expuestos, aunque de forma más sintética que en el solucionario modelo (no cita un ejemplo concreto como la insulina).',
          needsManualReview: false
        }
      ]
    }
  }
];
