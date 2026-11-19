import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "../redirect";
import { hasRole, primaryRole } from "../roles";
import { loginSchema, registerSchema, resetPasswordSchema } from "../schemas";

describe("roles", () => {
  it("only lets admins through an admin check", () => {
    expect(hasRole(["member"], "admin")).toBe(false);
    expect(hasRole(["member", "admin"], "admin")).toBe(true);
  });

  it("uses the highest-privilege role as the main role", () => {
    expect(primaryRole(["member", "admin"])).toBe("admin");
    expect(primaryRole(["member", "organisation"])).toBe("organisation");
    expect(primaryRole([])).toBeNull();
  });
});

describe("register validation", () => {
  const valid = { email: "aisha@example.com", password: "karachi24", confirmPassword: "karachi24" };

  it("accepts a valid sign-up", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(registerSchema.safeParse({ ...valid, password: "abc1234", confirmPassword: "abc1234" }).success).toBe(false);
  });

  it("requires a letter and a number in the password", () => {
    expect(registerSchema.safeParse({ ...valid, password: "abcdefgh", confirmPassword: "abcdefgh" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "12345678", confirmPassword: "12345678" }).success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    expect(registerSchema.safeParse({ ...valid, confirmPassword: "karachi25" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "aisha@" }).success).toBe(false);
  });
});

describe("login and reset validation", () => {
  it("requires a password to sign in", () => {
    expect(loginSchema.safeParse({ email: "aisha@example.com", password: "" }).success).toBe(false);
  });

  it("applies the same password rules when resetting", () => {
    expect(resetPasswordSchema.safeParse({ password: "short1", confirmPassword: "short1" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "newpass99", confirmPassword: "newpass99" }).success).toBe(true);
  });
});

describe("redirect after sign-in", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirectPath("/saved")).toBe("/saved");
  });

  it("refuses other sites and falls back to home", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.example")).toBe("/dashboard");
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
  });
});
