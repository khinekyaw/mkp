import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { soleOwnedBusinesses } from "./business/ownership";
import { db, schema } from "./db";
import { sendSafely } from "./notifications/mailer";
import { existingAccountEmail, passwordResetEmail, verifyEmailEmail } from "./notifications/templates";
import { appUrl } from "./url";

// `next build` evaluates modules without runtime secrets; never serves requests.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

export const auth = betterAuth({
  appName: "Booking Widget",
  // Unset in development: inferred from each request, so any local port works.
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? (isBuild ? "http://localhost:3000" : undefined),
  // Zero-config locally; a real production server refuses to run without BETTER_AUTH_SECRET.
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV !== "production" || isBuild ? "dev-only-secret-change-me-dev-only-secret" : undefined),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
      rateLimit: schema.rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Team invites and notifications go by email, so an address must be proven before it gets a session.
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendSafely(passwordResetEmail({ to: user.email, name: user.name, url }));
    },
    // Sign-up answers the same either way (no account probing), so tell the real owner by email.
    onExistingUserSignUp: async ({ user }) => {
      await sendSafely(
        existingAccountEmail({ to: user.email, name: user.name, signInUrl: appUrl("/sign-in"), resetUrl: appUrl("/forgot-password") }),
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // An unverified sign-in attempt mails a fresh link, so expired links recover themselves.
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendSafely(verifyEmailEmail({ to: user.email, name: user.name, url }));
    },
  },
  user: {
    // The new address gets a verification link; the change applies once it's opened.
    changeEmail: { enabled: true },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        // A clinic must never be left without an owner: transfer or delete it first.
        if ((await soleOwnedBusinesses(user.id)).length) {
          throw new APIError("BAD_REQUEST", { message: "SOLE_OWNER", code: "SOLE_OWNER" });
        }
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // Kept in Postgres so every server instance shares the counters.
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 10 * 60, max: 10 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
      "/request-password-reset": { window: 60 * 60, max: 5 },
      "/send-verification-email": { window: 60 * 60, max: 5 },
      "/two-factor/*": { window: 10 * 60, max: 10 },
    },
  },
  advanced: {
    // Same source of truth as lib/rate-limit.ts clientIp().
    ipAddress: { ipAddressHeaders: [process.env.TRUSTED_IP_HEADER ?? "x-real-ip"] },
  },
  plugins: [
    twoFactor({ issuer: "Booking Widget" }),
    // Platform roles for the super-admin: ban, impersonate, revoke sessions.
    admin({ impersonationSessionDuration: 60 * 60 }),
    // Must stay last so Server Actions can set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
