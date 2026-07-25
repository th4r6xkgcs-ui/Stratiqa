export interface ErrorMonitor {
  capture(error: unknown, context?: Record<string, unknown>): void;
}

class ConsoleErrorMonitor implements ErrorMonitor {
  capture(error: unknown, context: Record<string, unknown> = {}) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), event: "captured_error", message: error instanceof Error ? error.message : "Unknown error", context }));
  }
}

export const errorMonitor: ErrorMonitor = new ConsoleErrorMonitor();
