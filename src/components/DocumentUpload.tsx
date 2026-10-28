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

  const handleRemoveDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = documents.filter(d => d.id !== id);
    onDocumentsChange(updated);
    if (selectedDocId === id) {
      setSelectedDocId(updated[0]?.id || null);
    }
  };

  const handleLoadSample = (sample: SourceDocument) => {
    const existing = documents.find(d => d.name === sample.name);
    if (!existing) {
      const updated = [...documents, sample];
      onDocumentsChange(updated);
      setSelectedDocId(sample.id);
    } else {
      setSelectedDocId(existing.id);
    }
  };

  const handleUpdateOrCreateContent = (text: string) => {
    if (selectedDoc) {
      const updated = documents.map(d =>
        d.id === selectedDoc.id
          ? {
              ...d,
              content: text,
              pageCount: Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 350))
            }
          : d
      );
      onDocumentsChange(updated);
    } else if (text.trim()) {
      const doc: SourceDocument = {
        id: `doc-direct-${Date.now()}`,
        name: 'Apuntes_Directos.txt',
        size: new Blob([text]).size,
        pageCount: Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 350)),
        type: 'text/plain',
        content: text,
        uploadedAt: new Date().toISOString()
      };
      onDocumentsChange([doc]);
      setSelectedDocId(doc.id);
    }
  };

  const scrollToGenerator = () => {
    if (onProceedToGenerate) {
      onProceedToGenerate();
    } else {
      const el = document.getElementById('step-2-generator');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const totalWords = documents.reduce(
    (acc, d) => acc + (d.content ? d.content.trim().split(/\s+/).length : 0),
    0
  );
  const totalPages = documents.reduce((acc, d) => acc + (d.pageCount || 1), 0);

  return (
    <div className="bg-[#ffffff] border border-[#d6d6d6] rounded-[28px] overflow-hidden">
      {/* Section Header */}
      <div className="px-7 py-6 bg-[#ffffff] border-b border-[#d6d6d6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="apple-badge-ember">
              Paso 1
            </span>
            <h2 className="text-[22px] sm:text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
              Sube tus apuntes o documentos fuente
            </h2>
          </div>
          <p className="text-[15px] text-[#707070] mt-1">
            Formatos PDF, TXT o redacción directa del temario oficial a evaluar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-[#d6d6d6] text-[13px] text-[#707070] bg-[#fafafc]">
            {documents.length} doc(s) · ~{totalPages} págs ({totalWords.toLocaleString()} pal.)
          </span>
          <button
            type="button"
            onClick={scrollToGenerator}
            className="apple-pill-primary text-[14px] py-2 px-5"
          >
            <span>Configurar examen</span>
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Corpus Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#d6d6d6]">
        
        {/* Left 5 cols: Dropzone + File List */}
        <div className="lg:col-span-5 p-7 space-y-5 bg-[#ffffff]">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-[20px] p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#0071e3] bg-[#0071e3]/5'
                : 'border-[#d6d6d6] hover:border-[#1d1d1f] bg-[#fafafc]'
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
                <Loader2 className="h-6 w-6 text-[#0071e3] animate-spin mx-auto" />
                <p className="text-[15px] font-medium text-[#1d1d1f]">
                  Leyendo {parsingFileName}...
                </p>
                <p className="text-[13px] text-[#707070]">Extrayendo el texto del documento</p>
              </div>
            ) : (
              <>
                <div className="mx-auto w-11 h-11 rounded-full bg-[#ffffff] border border-[#d6d6d6] text-[#0071e3] flex items-center justify-center mb-3">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-[16px] font-medium text-[#1d1d1f]">
                  Subir documentos (PDF, TXT, imágenes)
                </p>
                <p className="text-[13px] text-[#707070] mt-1">
                  Arrastra tus archivos aquí o haz clic para seleccionarlos
                </p>
              </>
            )}
          </div>

          {/* Quick Actions: Sample Curriculum & Manual Entry */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleLoadSample(SAMPLE_SOURCE_DOCUMENT)}
              className="apple-pill-ghost text-[13px] py-1.5 px-3.5"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#707070]" />
              <span>Ejemplo Biología</span>
            </button>

            <button
              type="button"
              onClick={() => handleLoadSample(SAMPLE_SOURCE_PHYSICS)}
              className="apple-pill-ghost text-[13px] py-1.5 px-3.5"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#707070]" />
              <span>Ejemplo Física</span>
            </button>

            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="apple-pill-wash text-[13px] py-1.5 px-3.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo texto</span>
            </button>
          </div>

          {/* Manual Text Form */}
          {showManualInput && (
            <div className="p-4 rounded-[20px] bg-[#fafafc] border border-[#d6d6d6] space-y-3">
              <input
                type="text"
                placeholder="Título del tema (ej. Tema 5: La Revolución Industrial)"
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                className="w-full text-[14px] px-3.5 py-2 bg-[#ffffff] border border-[#d6d6d6] rounded-[12px] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
              />
              <textarea
                rows={4}
                placeholder="Pega aquí el contenido del tema, definiciones o problemas modelo..."
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                className="w-full text-[14px] px-3.5 py-2 bg-[#ffffff] border border-[#d6d6d6] rounded-[12px] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="apple-pill-ghost text-[12px] py-1 px-3"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddManualText}
                  disabled={!manualText.trim()}
                  className="apple-pill-primary text-[12px] py-1 px-3.5"
                >
                  Guardar apuntes
                </button>
              </div>
            </div>
          )}

          {/* Uploaded Documents List */}
          <div className="space-y-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#707070] block">
              Documentos cargados ({documents.length})
            </span>

            {documents.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-[#d6d6d6] rounded-[16px] text-[14px] text-[#707070]">
                Sube un archivo PDF o añade un texto para comenzar.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {documents.map(doc => {
                  const isSelected = selectedDoc?.id === doc.id;
                  const wordCount = doc.content ? doc.content.trim().split(/\s+/).length : 0;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`p-3 rounded-[16px] border cursor-pointer transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#f5f5f7] border-[#1d1d1f] text-[#1d1d1f]'
                          : 'bg-[#ffffff] border-[#d6d6d6] hover:border-[#707070] text-[#1d1d1f]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-full ${
                            isSelected
                              ? 'bg-[#1d1d1f] text-[#ffffff]'
                              : 'bg-[#f5f5f7] text-[#707070]'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium truncate">{doc.name}</p>
                          <p className="text-[12px] text-[#707070]">
                            {(doc.size / 1024).toFixed(0)} KB · {doc.pageCount || 1} pág(s) · {wordCount} pal.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => handleRemoveDoc(doc.id, e)}
                        className="p-1.5 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#e8e8ed] shrink-0 transition"
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
        <div className="lg:col-span-7 p-7 flex flex-col bg-[#fafafc]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-[#0071e3]" />
              <span className="text-[15px] font-medium text-[#1d1d1f]">
                {selectedDoc
                  ? `Temario: ${selectedDoc.name}`
                  : 'Editor de texto docente'}
              </span>
            </div>
            <span className="text-[12px] font-medium text-[#707070] bg-[#ffffff] border border-[#d6d6d6] px-3 py-1 rounded-full">
              {selectedDoc ? 'Listo para el generador' : 'Escribe o pega aquí'}
            </span>
          </div>

          <textarea
            value={selectedDoc ? selectedDoc.content : ''}
            onChange={e => handleUpdateOrCreateContent(e.target.value)}
            rows={11}
            className="flex-1 w-full p-4 rounded-[18px] bg-[#ffffff] border border-[#d6d6d6] text-[14px] text-[#1d1d1f] leading-relaxed focus:outline-none focus:border-[#0071e3] resize-y"
            placeholder="Pega aquí tus apuntes, definiciones o preguntas modelo para generar la prueba..."
          />
        </div>
      </div>
    </div>
  );
};
