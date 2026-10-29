import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Docentia ErrorBoundary caught an unhandled exception:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      // Clear potentially corrupted exam draft without deleting user credentials or billing
      sessionStorage.clear();
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6 text-[#1d1d1f]">
          <div className="max-w-md w-full bg-white rounded-[28px] border border-[#d6d6d6] p-8 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center p-3">
              <img
                src="/assets/mascot/lechuza-mark.svg"
                alt="Docentia"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b64400]/10 text-[#b64400] text-xs font-semibold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                Interrupción de Sesión
              </span>
              <h2 className="text-[24px] font-semibold tracking-tight text-[#1d1d1f]">
                Algo ha interrumpido el proceso
              </h2>
              <p className="text-[14px] text-[#707070] leading-relaxed">
                Docentia ha detectado una excepción en el navegador. Tus datos de examen y calificaciones almacenadas están protegidos.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-6 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reanudar sesión</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="w-full py-2.5 px-6 rounded-full border border-[#d6d6d6] text-[#1d1d1f] hover:bg-[#f5f5f7] text-[14px] font-medium flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4 text-[#707070]" />
                <span>Volver al inicio limpio</span>
              </button>
            </div>

            {this.state.error && (
              <details className="text-left text-xs text-[#707070] border border-[#d6d6d6] rounded-[16px] p-3.5 bg-[#fafafc]">
                <summary className="cursor-pointer font-medium text-[#1d1d1f] select-none">
                  Detalles técnicos del error
                </summary>
                <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap overflow-x-auto text-[#b64400]">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
