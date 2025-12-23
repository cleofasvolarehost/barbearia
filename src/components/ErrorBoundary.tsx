import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 min-h-screen flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full">
            <h1 className="text-3xl font-bold mb-4">Oops! Algo deu errado.</h1>
            <p className="mb-4">Ocorreu um erro inesperado na aplicação.</p>
            <div className="bg-white p-6 rounded-lg shadow-md border border-red-100 overflow-auto">
              <p className="font-mono text-sm text-red-600 whitespace-pre-wrap">
                {this.state.error?.toString()}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
