export function parseError(err: unknown, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}
