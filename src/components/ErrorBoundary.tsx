import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Keep error handling quiet without leaking sensitive details to console
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto my-12 max-w-xl rounded-xl border border-red-200 bg-white p-6 text-slate-900"
        >
          <h2 className="text-lg font-semibold text-red-900">
            Something went wrong displaying this view
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            An unexpected display error occurred. Your preferences remain safe, and you can reload the dashboard to continue.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 inline-flex min-h-[40px] items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Recover Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
