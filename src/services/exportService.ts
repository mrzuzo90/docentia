import { Exam, StudentGradeReport } from '../types';

export const ExportService = {
  /**
   * Copies both Rich HTML (for Word / Google Docs / Pages) and Plain Text to clipboard
   */
  async copyRichExamToClipboard(exam: Exam, mode: 'student' | 'solucionario' | 'aiken'): Promise<void> {
    if (mode === 'aiken') {
      const aiken = this.generateAikenFormat(exam);
      await navigator.clipboard.writeText(aiken);
      return;
    }

    const plainText = mode === 'student'
      ? this.generateStudentExamText(exam)
      : this.generateSolucionarioText(exam);

    const htmlText = mode === 'student'
      ? this.generateStudentExamHTML(exam)
      : this.generateSolucionarioHTML(exam);

    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        const htmlBlob = new Blob([htmlText], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          })
        ]);
        return;
      }
    } catch {
      // Fallback to standard text copy
    }
    await navigator.clipboard.writeText(plainText);
  },

  /**
   * Downloads a native .doc file that opens directly in Microsoft Word / LibreOffice / Google Docs
   */
  downloadWordDocument(exam: Exam, mode: 'student' | 'solucionario'): void {
    const bodyHtml = mode === 'student'
      ? this.generateStudentExamHTML(exam)
      : this.generateSolucionarioHTML(exam);

    const fullDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${exam.title}</title></head>
      <body style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #111827; line-height: 1.45;">
        ${bodyHtml}
      </body>
    </html>`;

    const blob = new Blob(['\ufeff', fullDoc], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const prefix = mode === 'student' ? 'Examen_Alumno' : 'Solucionario_Docente';
    link.href = url;
    link.download = `${prefix}_${exam.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Generates Rich HTML for Student Exam (ideal for Word / Google Docs paste)
   */
  generateStudentExamHTML(exam: Exam): string {
    const testTotal = exam.testQuestions.reduce((a, b) => a + b.points, 0).toFixed(2);
    const exTotal = exam.exercises.reduce((a, b) => a + b.points, 0).toFixed(2);

    let html = `
      <div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 750px; margin: 0 auto; color: #0f172a;">
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #0f172a; margin-bottom: 16px;">
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #0f172a;" colspan="2">
              <div style="font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; font-weight: bold;">
                ${exam.institution || 'CENTRO EDUCATIVO • DEPARTAMENTO DIDÁCTICO'}
              </div>
              <div style="font-size: 15pt; font-weight: bold; margin-top: 2px;">${exam.title}</div>
              <div style="font-size: 10pt; color: #334155; margin-top: 2px;">
                <strong>Materia:</strong> ${exam.subject} &nbsp;|&nbsp; <strong>Nivel:</strong> ${exam.targetLevel} &nbsp;|&nbsp; <strong>Duración:</strong> ${exam.durationMinutes || 60} min
              </div>
            </td>
            <td style="padding: 10px 14px; border-left: 2px solid #0f172a; border-bottom: 1px solid #0f172a; width: 130px; text-align: center; vertical-align: middle;">
              <div style="font-size: 8pt; text-transform: uppercase; font-weight: bold; color: #475569;">CALIFICACIÓN</div>
              <div style="font-size: 16pt; font-weight: bold; margin-top: 8px;">____ / 10</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 14px; font-size: 10pt;" colspan="2">
              <strong>Apellidos y Nombre:</strong> ______________________________________________________
            </td>
            <td style="padding: 8px 14px; border-left: 2px solid #0f172a; font-size: 10pt;">
              <strong>Fecha:</strong> ____/____/2026
            </td>
          </tr>
        </table>
    `;

    if (exam.instructions) {
      html += `
        <p style="font-size: 9.5pt; background-color: #f8fafc; border-left: 3px solid #334155; padding: 8px 12px; margin-bottom: 18px; font-style: italic;">
          <strong>Instrucciones generales:</strong> ${exam.instructions}
          ${exam.testPenalty ? ` (Penalización por error en test: -${exam.testPenalty} pts por fallo).` : ' (Las preguntas tipo test no descuentan puntuación).'}
        </p>
      `;
    }

    if (exam.testQuestions.length > 0) {
      html += `
        <h3 style="font-size: 11pt; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin-top: 20px; margin-bottom: 12px;">
          PARTE I. CUESTIONARIO TIPO TEST (${testTotal} puntos)
        </h3>
      `;

      exam.testQuestions.forEach((q, idx) => {
        html += `
          <div style="margin-bottom: 14px; page-break-inside: avoid;">
            <p style="margin: 0 0 6px 0; font-size: 10.5pt;">
              <strong>${idx + 1}. ${q.question}</strong>
              <span style="float: right; font-weight: bold; color: #475569;">[${q.points.toFixed(2)} pts]</span>
            </p>
            <table style="width: 100%; border: none; margin-left: 12px; font-size: 10pt;">
              <tr>
                <td style="padding: 3px 6px; width: 50%;">☐ <strong>A)</strong> ${q.options.A}</td>
                <td style="padding: 3px 6px; width: 50%;">☐ <strong>B)</strong> ${q.options.B}</td>
              </tr>
              <tr>
                <td style="padding: 3px 6px; width: 50%;">☐ <strong>C)</strong> ${q.options.C}</td>
                <td style="padding: 3px 6px; width: 50%;">☐ <strong>D)</strong> ${q.options.D}</td>
              </tr>
            </table>
          </div>
        `;
      });
    }

    if (exam.exercises.length > 0) {
      html += `
        <h3 style="font-size: 11pt; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin-top: 24px; margin-bottom: 12px;">
          PARTE II. EJERCICIOS Y PROBLEMAS DE DESARROLLO (${exTotal} puntos)
        </h3>
      `;

      exam.exercises.forEach((ex, idx) => {
        html += `
          <div style="margin-bottom: 22px; page-break-inside: avoid;">
            <p style="margin: 0 0 6px 0; font-size: 11pt;">
              <strong>EJERCICIO ${idx + 1}: ${ex.title}</strong>
              <span style="float: right; font-weight: bold; color: #1e3a8a;">[${ex.points.toFixed(2)} puntos]</span>
            </p>
            <p style="margin: 0 0 10px 0; font-size: 10.5pt; white-space: pre-line;">${ex.statement}</p>
            <div style="border: 1px dashed #94a3b8; height: 140px; padding: 8px; font-size: 8.5pt; color: #94a3b8;">
              Espacio reservado para el desarrollo y justificación de la respuesta...
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    return html;
  },

  /**
   * Generates Rich HTML for Solucionario
   */
  generateSolucionarioHTML(exam: Exam): string {
    const testTotal = exam.testQuestions.reduce((a, b) => a + b.points, 0).toFixed(2);
    const exTotal = exam.exercises.reduce((a, b) => a + b.points, 0).toFixed(2);

    let html = `
      <div style="font-family: 'Calibri', 'Arial', sans-serif; max-width: 750px; margin: 0 auto; color: #0f172a;">
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px;">
          <div style="font-size: 9pt; font-weight: bold; color: #059669; text-transform: uppercase;">DOCUMENTO CONFIDENCIAL DOCENTE • SOLUCIONARIO Y BAREMO</div>
          <h1 style="font-size: 16pt; margin: 4px 0;">${exam.title}</h1>
          <div style="font-size: 10pt; color: #475569;">Materia: ${exam.subject} | Nivel: ${exam.targetLevel} | Total: ${exam.totalScore} puntos</div>
        </div>
    `;

    if (exam.testQuestions.length > 0) {
      html += `<h2 style="font-size: 12pt; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">1. Clave de Respuestas — Tipo Test (${testTotal} pts)</h2>`;
      exam.testQuestions.forEach((q, idx) => {
        html += `
          <div style="margin-bottom: 12px; padding: 8px 12px; background-color: #f8fafc; border-left: 3px solid #059669;">
            <div><strong>Pregunta ${idx + 1} [${q.points.toFixed(2)} pts]:</strong> ${q.question}</div>
            <div style="color: #047857; font-weight: bold; margin-top: 4px;">✔ Respuesta Correcta: Opción ${q.correctAnswer} — ${q.options[q.correctAnswer]}</div>
            <div style="font-size: 9.5pt; color: #475569; margin-top: 2px;"><em>Justificación:</em> ${q.explanation}</div>
          </div>
        `;
      });
    }

    if (exam.exercises.length > 0) {
      html += `<h2 style="font-size: 12pt; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px;">2. Rúbricas y Solución Modelo — Desarrollo (${exTotal} pts)</h2>`;
      exam.exercises.forEach((ex, idx) => {
        html += `
          <div style="margin-bottom: 18px; border: 1px solid #cbd5e1; padding: 12px;">
            <div style="font-size: 11pt; font-weight: bold;">Ejercicio ${idx + 1}: ${ex.title} [${ex.points.toFixed(2)} puntos]</div>
            <p style="font-size: 10pt; color: #334155; white-space: pre-line;">${ex.statement}</p>
            <div style="font-size: 10pt; font-weight: bold; margin-top: 8px;">Criterios de Calificación (Rúbrica):</div>
            <ul style="font-size: 9.5pt; margin-top: 4px;">
              ${ex.rubricCriteria.map(c => `<li>${c}</li>`).join('')}
            </ul>
            <div style="font-size: 10pt; font-weight: bold; color: #047857; margin-top: 8px;">Resolución Modelo Paso a Paso:</div>
            <pre style="font-family: monospace; font-size: 9.5pt; background-color: #f0fdf4; padding: 8px; white-space: pre-wrap;">${ex.solutionSteps}</pre>
          </div>
        `;
      });
    }

    html += `</div>`;
    return html;
  },

  /**
   * Generates clean formatted student exam in plain text
   */
  generateStudentExamText(exam: Exam): string {
    let text = `================================================================================
${(exam.institution || 'CENTRO EDUCATIVO • DEPARTAMENTO DIDÁCTICO').toUpperCase()}
${exam.title.toUpperCase()}
Materia: ${exam.subject} | Nivel: ${exam.targetLevel} | Duración: ${exam.durationMinutes || 60} min
================================================================================
Apellidos y Nombre: ____________________________________________________________
DNI / Expediente: _______________________   Fecha: ____/____/2026   Calificación: ____ / 10
================================================================================

INSTRUCCIONES:
${exam.instructions || 'Lea atentamente cada enunciado. Responda con claridad y justifique sus razonamientos en las preguntas de desarrollo.'}

--------------------------------------------------------------------------------
PARTE I: CUESTIONARIO TIPO TEST (${exam.testQuestions.reduce((a, b) => a + b.points, 0).toFixed(2)} puntos)
--------------------------------------------------------------------------------\n\n`;

    exam.testQuestions.forEach((q, idx) => {
      text += `${idx + 1}. ${q.question} [${q.points.toFixed(2)} pts]\n`;
      text += `   [ ] A) ${q.options.A}\n`;
      text += `   [ ] B) ${q.options.B}\n`;
      text += `   [ ] C) ${q.options.C}\n`;
      text += `   [ ] D) ${q.options.D}\n\n`;
    });

    text += `--------------------------------------------------------------------------------
PARTE II: EJERCICIOS Y PROBLEMAS DE DESARROLLO (${exam.exercises.reduce((a, b) => a + b.points, 0).toFixed(2)} puntos)
--------------------------------------------------------------------------------\n\n`;

    exam.exercises.forEach((ex, idx) => {
      text += `EJERCICIO ${idx + 1}: ${ex.title} [${ex.points.toFixed(2)} puntos]\n`;
      text += `${ex.statement}\n\n`;
      text += `Respuesta:\n\n\n\n--------------------------------------------------------------------------------\n\n`;
    });

    return text;
  },

  /**
   * Generates complete teacher answer key (solucionario) in plain text
   */
  generateSolucionarioText(exam: Exam): string {
    let text = `================================================================================
SOLUCIONARIO OFICIAL, RÚBRICAS Y BAREMO DE CORRECCIÓN
Examen: ${exam.title}
Materia: ${exam.subject} | Nivel: ${exam.targetLevel}
================================================================================\n\n`;

    text += `### 1. SECCIÓN TIPO TEST (Total: ${exam.testQuestions.reduce((a, b) => a + b.points, 0).toFixed(2)} puntos)\n\n`;
    exam.testQuestions.forEach((q, idx) => {
      text += `Pregunta ${idx + 1} [Peso: ${q.points.toFixed(2)} pts]:\n`;
      text += `Enunciado: ${q.question}\n`;
      text += `✔ RESPUESTA CORRECTA: Opción ${q.correctAnswer} (${q.options[q.correctAnswer]})\n`;
      text += `Justificación didáctica: ${q.explanation}\n\n`;
    });

    text += `--------------------------------------------------------------------------------\n`;
    text += `### 2. SECCIÓN EJERCICIOS DE DESARROLLO (Total: ${exam.exercises.reduce((a, b) => a + b.points, 0).toFixed(2)} puntos)\n\n`;

    exam.exercises.forEach((ex, idx) => {
      text += `Ejercicio ${idx + 1}: ${ex.title} [Peso: ${ex.points.toFixed(2)} puntos]\n`;
      text += `Enunciado:\n${ex.statement}\n\n`;
      text += `Rúbrica de evaluación y criterios de calificación:\n`;
      ex.rubricCriteria.forEach((crit, cIdx) => {
        text += `  • Criterio ${cIdx + 1}: ${crit}\n`;
      });
      text += `\nResolución modelo paso a paso:\n${ex.solutionSteps}\n\n`;
      text += `--------------------------------------------------------------------------------\n`;
    });

    return text;
  },

  /**
   * Export in Aiken format (standard for Moodle / Canvas import of multiple choice)
   */
  generateAikenFormat(exam: Exam): string {
    let text = ``;
    exam.testQuestions.forEach(q => {
      text += `${q.question.replace(/\n/g, ' ')}\n`;
      text += `A) ${q.options.A}\n`;
      text += `B) ${q.options.B}\n`;
      text += `C) ${q.options.C}\n`;
      text += `D) ${q.options.D}\n`;
      text += `ANSWER: ${q.correctAnswer}\n\n`;
    });
    return text;
  },

  /**
   * Export grades to CSV including both 0-10 section evaluations and weighted totals
   */
  exportGradesToCSV(reports: StudentGradeReport[]): string {
    const headers = [
      'Alumno/a',
      'Eval. Sección Test (0-10)',
      'Puntos Test Ponderados',
      'Eval. Sección Ejercicios (0-10)',
      'Puntos Ejercicios Ponderados',
      'Calificación Final (0-10)',
      'Calificación Cualitativa',
      'Revisión Manual Requerida',
      'Incidencias OCR / Observaciones',
      'Fecha Evaluación'
    ];

    const getQualitative = (score: number) => {
      if (score >= 9.0) return 'Sobresaliente';
      if (score >= 7.0) return 'Notable';
      if (score >= 5.0) return 'Aprobado';
      return 'Insuficiente';
    };

    const rows = reports.map(r => {
      const testOut10 = r.testSectionScoreOutOf10 ?? (r.testSectionMax > 0 ? (r.testSectionScore / r.testSectionMax) * 10 : 0);
      const exOut10 = r.exerciseSectionScoreOutOf10 ?? (r.exerciseSectionMax > 0 ? (r.exerciseSectionScore / r.exerciseSectionMax) * 10 : 0);

      return [
        `"${r.studentName}"`,
        testOut10.toFixed(2),
        `${r.testSectionScore.toFixed(2)}/${r.testSectionMax.toFixed(2)}`,
        exOut10.toFixed(2),
        `${r.exerciseSectionScore.toFixed(2)}/${r.exerciseSectionMax.toFixed(2)}`,
        r.finalScore.toFixed(2),
        `"${getQualitative(r.finalScore)}"`,
        r.needsManualReview ? 'PENDIENTE REVISIÓN' : 'Validado',
        `"${(r.manualReviewReasons.length > 0 ? r.manualReviewReasons.join(' | ') : r.overallFeedback).replace(/"/g, '""')}"`,
        new Date(r.gradedAt).toLocaleDateString('es-ES')
      ];
    });

    return ['\ufeff' + headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  },

  /**
   * Downloads gradebook report as a CSV file ready for Excel
   */
  downloadGradebookCSV(exam: Exam, reports: StudentGradeReport[]): void {
    const csv = this.exportGradesToCSV(reports);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Acta_Calificaciones_${exam.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Copies gradebook CSV content directly to clipboard
   */
  async copyGradebookCSV(_exam: Exam, reports: StudentGradeReport[]): Promise<void> {
    const csv = this.exportGradesToCSV(reports);
    await navigator.clipboard.writeText(csv);
  },

  /**
   * Generates standard Moodle XML (<quiz>) based on official Moodle specification.
   * Includes multichoice questions with fractions and essay questions with graderinfo.
   */
  generateMoodleXML(exam: Exam): string {
    const xmlText = (val: string) =>
      val.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] || c));
    const field = (name: string, val: string) => `<${name} format="plain_text"><text>${xmlText(val)}</text></${name}>`;

    const questions: string[] = [];

    // Multichoice Questions
    exam.testQuestions.forEach((q, idx) => {
      const name = xmlText(`${exam.title} · Test ${String(idx + 1).padStart(2, '0')}`);
      const common = `<name><text>${name}</text></name>${field('questiontext', q.question)}<defaultgrade>${q.points}</defaultgrade><penalty>${exam.testPenalty || 0}</penalty><hidden>0</hidden>`;
      const choices = (['A', 'B', 'C', 'D'] as const).map(letter => {
        const fraction = letter === q.correctAnswer ? 100 : 0;
        return `<answer fraction="${fraction}" format="plain_text"><text>${xmlText(q.options[letter])}</text></answer>`;
      }).join('');
      questions.push(`<question type="multichoice">${common}${field('generalfeedback', q.explanation)}<single>true</single><shuffleanswers>1</shuffleanswers><answernumbering>abc</answernumbering>${choices}</question>`);
    });

    // Essay / Development Questions
    exam.exercises.forEach((ex, idx) => {
      const name = xmlText(`${exam.title} · Ejercicio ${String(idx + 1).padStart(2, '0')}: ${ex.title}`);
      const common = `<name><text>${name}</text></name>${field('questiontext', `${ex.title}\n\n${ex.statement}`)}<defaultgrade>${ex.points}</defaultgrade><penalty>0</penalty><hidden>0</hidden>`;
      const rubricText = `Solucionario y Rúbrica Oficial (sobre ${ex.points} pts):\n${ex.solutionSteps}\n\nCriterios de evaluación orientativos:\n${ex.rubricCriteria.map(c => `• ${c}`).join('\n')}`;
      questions.push(`<question type="essay">${common}<responseformat>editor</responseformat><responserequired>1</responserequired><responsefieldlines>15</responsefieldlines><attachments>0</attachments><attachmentsrequired>0</attachmentsrequired>${field('graderinfo', rubricText)}</question>`);
    });

    return `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n${questions.join('\n')}\n</quiz>\n`;
  },

  /**
   * Downloads a .xml file ready to import directly into Moodle Question Bank
   */
  downloadMoodleXML(exam: Exam): void {
    const xml = this.generateMoodleXML(exam);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Moodle_Banco_Preguntas_${exam.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
