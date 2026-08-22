import { describe, expect, it } from "vitest";
import { authConfig } from "@/auth.config";

describe("authConfig", () => {
  it("trusts the host so /api/auth/* does not fail with UntrustedHost in production builds", () => {
    expect(authConfig.trustHost).toBe(true);
  });

  it("keeps the custom sign-in page", () => {
    expect(authConfig.pages.signIn).toBe("/login");
  });
});
