export function traceError(prefix: string, error: unknown): number {
  console.error(prefix, error);
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    switch (code) {
      case "P2003":
        return 400; // FK violation -> invalid/unknown reference
      case "P2002":
        return 409; // unique constraint -> duplicate
      case "P2025":
        return 404; // record not found
      case "P2024":
      case "P2034":
        return 409; // timeout / transaction conflict
      default:
        return 500;
    }
  }
  return 500;
}