import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use local bundled worker via Vite ?url import (zero external CDN or CORS dependency)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Keep large base64 payloads in memory so localStorage never overflows its 5MB quota
const inMemoryBase64Store = new Map<string, { base64Data: string; mimeType: string }>();

export interface ExtractedDocumentResult {
  text: string;
  pageCount: number;
  base64Data?: string;
  mimeType: string;
}

export const DocumentParserService = {
  storeBlobInMemory(docId: string, base64Data: string, mimeType: string) {
    inMemoryBase64Store.set(docId, { base64Data, mimeType });
  },

  getBlobFromMemory(docId: string): { base64Data: string; mimeType: string } | undefined {
    return inMemoryBase64Store.get(docId);
  },

  /**
   * Reads a File and extracts text + base64 representation safely
   */
  async parseFile(file: File): Promise<ExtractedDocumentResult> {
    const mimeType = file.type || this.inferMimeType(file.name);
    let base64Data: string | undefined;

    try {
      if (file.size < 15 * 1024 * 1024) {
        base64Data = await this.fileToBase64(file);
      }
    } catch (e) {
      console.warn('Could not read base64 of file:', e);
    }

    if (mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfResult = await Promise.race([
          this.extractPdfText(file),
          new Promise<{ text: string; pageCount: number }>((_, reject) =>
            setTimeout(() => reject(new Error('PDF extraction timeout')), 12000)
          )
        ]);
        return {
          text: pdfResult.text,
          pageCount: pdfResult.pageCount,
          base64Data,
          mimeType: 'application/pdf'
        };
      } catch (err) {
        console.warn('Fallback to multimodal/raw PDF reading:', err);
        return {
          text: `Documento académico cargado: ${file.name} (${(file.size / 1024).toFixed(1)} KB).\nContenido preparado para análisis y generación de cuestiones de evaluación.`,
          pageCount: Math.max(1, Math.round(file.size / 45000)),
          base64Data,
          mimeType: 'application/pdf'
        };
      }
    }

    if (mimeType.startsWith('image/')) {
      return {
        text: `Material visual didáctico: ${file.name} (${(file.size / 1024).toFixed(1)} KB).`,
        pageCount: 1,
        base64Data,
        mimeType
      };
    }

    // Plain text, Markdown, CSV, Word XML/text
    try {
      const rawText = await file.text();
      const cleaned = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').trim();
      const estimatedPages = Math.max(1, Math.ceil(cleaned.split(/\s+/).length / 350));

      return {
        text: cleaned.length > 10 ? cleaned : `Documento: ${file.name}`,
        pageCount: estimatedPages,
        base64Data,
        mimeType: mimeType || 'text/plain'
      };
    } catch {
      return {
        text: `Documento cargado: ${file.name}`,
        pageCount: 1,
        base64Data,
        mimeType: mimeType || 'text/plain'
      };
    }
  },

  /**
   * Extracts real text page-by-page from a PDF file using pdfjs-dist
   */
  async extractPdfText(file: File): Promise<{ text: string; pageCount: number }> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    const pageTexts: string[] = [];
    const maxPagesToRead = Math.min(numPages, 40);

    for (let pageNum = 1; pageNum <= maxPagesToRead; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      const pageStr = strings.join(' ').replace(/\s+/g, ' ').trim();
      if (pageStr) {
        pageTexts.push(`[Página ${pageNum}]\n${pageStr}`);
      }
    }

    const fullText = pageTexts.join('\n\n');
    return {
      text:
        fullText.length > 20
          ? fullText
          : `Documento PDF escaneado (${numPages} páginas): ${file.name}. Listo para procesamiento multimodal con IA.`,
      pageCount: numPages
    };
  },

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  inferMimeType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.md')) return 'text/markdown';
    return 'text/plain';
  }
};
