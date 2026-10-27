import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  BookOpen,
  Plus,
  Loader2,
  FileCode,
  ArrowDown
} from 'lucide-react';
import { SourceDocument } from '../types';
import { SAMPLE_SOURCE_DOCUMENT, SAMPLE_SOURCE_PHYSICS } from '../services/mockData';
import { DocumentParserService } from '../services/pdfService';

interface DocumentUploadProps {
  documents: SourceDocument[];
  onDocumentsChange: (docs: SourceDocument[]) => void;
  onProceedToGenerate?: () => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  documents,
  onDocumentsChange,
  onProceedToGenerate
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingFileName, setParsingFileName] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(documents[0]?.id || null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDoc = documents.find(d => d.id === selectedDocId) || documents[0] || null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    setIsParsing(true);
    const newDocs: SourceDocument[] = [];

    try {
      for (const file of files) {
        setParsingFileName(file.name);
        const extracted = await DocumentParserService.parseFile(file);
        const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        if (extracted.base64Data) {
          DocumentParserService.storeBlobInMemory(docId, extracted.base64Data, extracted.mimeType);
        }

        const newDoc: SourceDocument = {
          id: docId,
          name: file.name,
          size: file.size,
          type: extracted.mimeType,
          pageCount: extracted.pageCount,
          content: extracted.text,
          mimeType: extracted.mimeType,
          uploadedAt: new Date().toISOString()
        };
        newDocs.push(newDoc);
      }

      const updated = [...documents, ...newDocs];
      onDocumentsChange(updated);
      if (newDocs.length > 0) {
        setSelectedDocId(newDocs[0].id);
      }
    } finally {
      setIsParsing(false);
      setParsingFileName('');
    }
  };

  const handleAddManualText = () => {
    if (!manualText.trim()) return;
    const words = manualText.trim().split(/\s+/).length;
    const doc: SourceDocument = {
      id: `doc-manual-${Date.now()}`,
      name: (manualTitle.trim() || 'Apuntes_Docentes_Manuales') + '.txt',
      size: new Blob([manualText]).size,
      pageCount: Math.max(1, Math.ceil(words / 350)),
      type: 'text/plain',
      content: manualText.trim(),
      uploadedAt: new Date().toISOString()
    };

    const updated = [...documents, doc];
    onDocumentsChange(updated);
    setSelectedDocId(doc.id);
    setManualText('');
    setManualTitle('');
    setShowManualInput(false);
  };

  const handleLoadSample = (sampleDoc: SourceDocument) => {
    if (!documents.some(d => d.id === sampleDoc.id)) {
      const updated = [...documents, sampleDoc];
      onDocumentsChange(updated);
      setSelectedDocId(sampleDoc.id);
    } else {
      setSelectedDocId(sampleDoc.id);
    }
  };

  const handleRemoveDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = documents.filter(d => d.id !== id);
    onDocumentsChange(remaining);
    if (selectedDocId === id) {
      setSelectedDocId(remaining[0]?.id || null);
    }
  };

  const handleUpdateOrCreateContent = (newContent: string) => {
    if (selectedDoc) {
      const updated = documents.map(d =>
        d.id === selectedDoc.id ? { ...d, content: newContent, size: new Blob([newContent]).size } : d
      );
      onDocumentsChange(updated);
    } else if (newContent.trim().length > 0) {
      const newDoc: SourceDocument = {
        id: `doc-direct-${Date.now()}`,
        name: 'Temario_Directo_Docente.txt',
        size: new Blob([newContent]).size,
        pageCount: 1,
        type: 'text/plain',
        content: newContent,
        uploadedAt: new Date().toISOString()
      };
      onDocumentsChange([newDoc]);
      setSelectedDocId(newDoc.id);
    }
  };

  const scrollToGenerator = () => {
    if (onProceedToGenerate) {
      onProceedToGenerate();
    }
    const el = document.getElementById('step-2-generator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const totalWords = documents.reduce(
    (acc, d) => acc + (d.content ? d.content.trim().split(/\s+/).length : 0),
    0
  );
  const totalPages = documents.reduce((acc, d) => acc + (d.pageCount || 1), 0);

  return (
    <div className="duo-card p-0 overflow-hidden">
      {/* Section Header */}
      <div className="px-6 py-5 bg-[#ffffff] border-b-2 border-[#afafaf] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 text-[13px] font-bold uppercase tracking-[0.053em] bg-[#d7ffb8] text-[#4b4b4b] border-2 border-[#58cc02] rounded-[12px]">
              PASO 1
            </span>
            <h2 className="text-[24px] sm:text-[32px] font-bold text-[#4b4b4b] leading-[1.2]">
              Sube tus apuntes o documentos fuente
            </h2>
          </div>
          <p className="duo-body-copy mt-1">
            Sube archivos PDF, TXT o pega tus apuntes directamente en el cuadro de la derecha.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="duo-nav-pill py-1.5 px-3 text-[13px]">
            {documents.length} DOC(S) · ~{totalPages} PÁGS ({totalWords.toLocaleString()} PAL.)
          </span>
          <button
            type="button"
            onClick={scrollToGenerator}
            className="duo-btn-primary py-2.5 px-4"
          >
            <span>IR A CONFIGURAR</span>
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Corpus Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-[#afafaf]">
        
        {/* Left 5 cols: Dropzone + File List */}
        <div className="lg:col-span-5 p-6 space-y-4 bg-[#ffffff]">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[12px] p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#58cc02] bg-[#d7ffb8]'
                : 'border-[#afafaf] hover:border-[#58cc02] bg-[#ffffff]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              multiple
              accept=".pdf,.txt,.md,.csv,.doc,.docx,image/*"
              className="hidden"
            />
            {isParsing ? (
              <div className="py-3 space-y-2">
                <Loader2 className="h-7 w-7 text-[#58cc02] animate-spin mx-auto" />
                <p className="text-[17px] font-bold text-[#4b4b4b]">
                  Leyendo {parsingFileName}...
                </p>
                <p className="text-[15px] text-[#777777]">Extrayendo el texto del documento</p>
              </div>
            ) : (
              <>
                <div className="mx-auto w-12 h-12 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] text-[#58cc02] flex items-center justify-center mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-[19px] font-bold text-[#4b4b4b]">
                  Subir documentos (PDF, TXT, Imágenes)
                </p>
                <p className="duo-body-copy mt-1">
                  Arrastra tus archivos aquí o haz clic para elegirlos
                </p>
              </>
            )}
          </div>

          {/* Quick Actions: Sample Curriculum & Manual Entry */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleLoadSample(SAMPLE_SOURCE_DOCUMENT)}
              className="duo-btn-outlined py-1.5 px-3 text-[13px]"
            >
              <BookOpen className="h-4 w-4" />
              <span>EJEMPLO BIOLOGÍA</span>
            </button>

            <button
              type="button"
              onClick={() => handleLoadSample(SAMPLE_SOURCE_PHYSICS)}
              className="duo-btn-outlined py-1.5 px-3 text-[13px]"
            >
              <BookOpen className="h-4 w-4" />
              <span>EJEMPLO FÍSICA</span>
            </button>

            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="duo-nav-pill py-1.5 px-3 text-[13px]"
            >
              <Plus className="h-4 w-4" />
              <span>NUEVO TEXTO</span>
            </button>
          </div>

          {/* Manual Text Form */}
          {showManualInput && (
            <div className="p-4 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf] space-y-3">
              <input
                type="text"
                placeholder="Título del tema (ej. Tema 5: La Revolución Industrial)"
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                className="w-full text-[15px] px-3 py-2 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] text-[#4b4b4b] focus:outline-none focus:border-[#1cb0f6]"
              />
              <textarea
                rows={4}
                placeholder="Pega aquí el contenido del tema, definiciones o problemas modelo..."
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                className="w-full text-[15px] px-3 py-2 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] text-[#4b4b4b] focus:outline-none focus:border-[#1cb0f6]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="duo-nav-pill py-1.5 px-3 text-[13px]"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={handleAddManualText}
                  disabled={!manualText.trim()}
                  className="duo-btn-primary py-1.5 px-4 text-[13px]"
                >
                  GUARDAR APUNTES
                </button>
              </div>
            </div>
          )}

          {/* Uploaded Documents List */}
          <div className="space-y-2">
            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777] block">
              DOCUMENTOS ACTIVOS ({documents.length})
            </span>

            {documents.length === 0 ? (
              <div className="p-4 text-center border-2 border-dashed border-[#afafaf] rounded-[12px] text-[15px] text-[#777777]">
                Sube un PDF a la izquierda o escribe tu temario directamente a la derecha.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {documents.map(doc => {
                  const isSelected = selectedDoc?.id === doc.id;
                  const wordCount = doc.content ? doc.content.trim().split(/\s+/).length : 0;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`p-3 rounded-[12px] border-2 cursor-pointer transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#d7ffb8] text-[#4b4b4b] border-[#58cc02]'
                          : 'bg-[#ffffff] border-[#afafaf] hover:border-[#4b4b4b] text-[#4b4b4b]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-[12px] border-2 ${
                            isSelected
                              ? 'bg-[#58cc02] border-[#58cc02] text-[#ffffff]'
                              : 'bg-[#ffffff] border-[#afafaf] text-[#777777]'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold truncate">{doc.name}</p>
                          <p className="text-[13px] text-[#777777]">
                            {(doc.size / 1024).toFixed(0)} KB · {doc.pageCount || 1} pág(s) · {wordCount} pal.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => handleRemoveDoc(doc.id, e)}
                        className="p-1.5 rounded-[12px] text-[#777777] hover:text-[#4b4b4b] shrink-0"
                        title="Quitar documento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 7 cols: Live Document Inspector & Direct Editor */}
        <div className="lg:col-span-7 p-6 flex flex-col bg-[#ffffff]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-[#58cc02]" />
              <span className="text-[17px] font-bold text-[#4b4b4b]">
                {selectedDoc
                  ? `Temario activo: ${selectedDoc.name}`
                  : 'Editor directo de apuntes'}
              </span>
            </div>
            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b] bg-[#d7ffb8] border-2 border-[#58cc02] px-3 py-1 rounded-[12px]">
              {selectedDoc ? '✔ LISTO PARA GENERAR' : 'ESCRIBE O PEGA AQUÍ'}
            </span>
          </div>

          <textarea
            value={selectedDoc ? selectedDoc.content : ''}
            onChange={e => handleUpdateOrCreateContent(e.target.value)}
            rows={11}
            className="flex-1 w-full p-4 rounded-[12px] bg-[#ffffff] border-2 border-[#afafaf] text-[15px] text-[#4b4b4b] leading-relaxed focus:outline-none focus:border-[#58cc02] resize-y"
            placeholder="Sube un documento PDF a la izquierda o pega directamente aquí el texto del tema, apuntes o contenidos que deseas evaluar en el examen..."
          />
        </div>
      </div>
    </div>
  );
};
