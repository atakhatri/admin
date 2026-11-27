import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error, info) {
    console.error('Admin Hub ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="auth-stage">
          <section className="auth-card" role="alert">
            <h1 className="auth-title">Something went wrong</h1>
            <p className="auth-copy">
              The dashboard encountered an unexpected error while loading your workspace.
            </p>
            <pre className="error-code-box">{this.state.message}</pre>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload Dashboard
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
