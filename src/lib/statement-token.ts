import { randomBytes } from "crypto";

export function generateStatementToken(): string {
  return randomBytes(16).toString("hex");
}
