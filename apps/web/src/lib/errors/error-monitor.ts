export interface FrontendErrorEvent {
  source: "react-boundary" | "window-error" | "unhandled-rejection";
  message: string;
  stack?: string;
  componentStack?: string | null;
  path: string;
  timestamp: string;
}

export interface FrontendErrorMonitor {
  capture(event: FrontendErrorEvent): void;
}

class ConsoleFrontendErrorMonitor implements FrontendErrorMonitor {
  capture(event: FrontendErrorEvent): void {
    // This is the provider seam for Sentry or another approved monitor.
    // Production does not display or persist diagnostic data in the UI.
    if (import.meta.env.DEV) console.error("Frontend error", event);
  }
}

export const frontendErrorMonitor: FrontendErrorMonitor =
  new ConsoleFrontendErrorMonitor();

export function installGlobalErrorMonitoring(): () => void {
  const onError = (event: ErrorEvent) => {
    frontendErrorMonitor.capture({
      source: "window-error",
      message: event.message,
      stack: event.error instanceof Error ? event.error.stack : undefined,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error ? event.reason : undefined;
    frontendErrorMonitor.capture({
      source: "unhandled-rejection",
      message: error?.message ?? "Unhandled promise rejection",
      stack: error?.stack,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
