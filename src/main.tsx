import { StrictMode, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0F0F0F', color: '#F0F0F0',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '2rem', fontFamily: 'monospace',
        }}>
          <div style={{ color: '#00A86B', fontSize: '2rem', marginBottom: '1rem' }}>SUMAK</div>
          <div style={{ color: '#EF4444', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Error al iniciar la aplicación
          </div>
          <div style={{
            background: '#1A1A1A', border: '1px solid #2E2E2E', borderRadius: '8px',
            padding: '1rem 1.5rem', maxWidth: '600px', whiteSpace: 'pre-wrap',
            fontSize: '0.85rem', color: '#AAAAAA', lineHeight: 1.6,
          }}>
            {this.state.error.message}
          </div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#888' }}>
            Abre la consola del navegador (F12) para más detalles.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
