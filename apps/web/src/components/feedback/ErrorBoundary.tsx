import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui/Button";
import { frontendErrorMonitor } from "../../lib/errors/error-monitor";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    frontendErrorMonitor.capture({
      source: "react-boundary",
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md space-y-4 rounded-md border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            Something unexpected happened.
          </h1>
          <p className="text-sm text-slate-600">
            The page could not be displayed. You can try again or return to the
            dashboard.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => this.setState({ hasError: false })}>
              Try again
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
            >
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
