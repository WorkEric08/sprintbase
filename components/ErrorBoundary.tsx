import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Última linha de defesa: evita tela em branco se algo quebrar na renderização. */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro não tratado:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-triangle-exclamation text-red-500 text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ops! Algo deu errado.</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Ocorreu um erro inesperado. Seus dados continuam salvos; tente recarregar.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
