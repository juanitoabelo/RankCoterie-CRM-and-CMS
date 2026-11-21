type StructuredLogLevel = "debug" | "info" | "warn" | "error";

type StructuredLogEntry = {
  level: StructuredLogLevel;
  message: string;
  context?: Record<string, unknown>;
};

export function logStructured(entry: StructuredLogEntry): void {
  const output = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });

  if (entry.level === "error") {
    console.error(output);
    return;
  }
  if (entry.level === "warn") {
    console.warn(output);
    return;
  }
  console.log(output);
}
