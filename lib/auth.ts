import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "./db";
import { sendSafely } from "./notifications/mailer";
import { passwordResetEmail } from "./notifications/templates";

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
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendSafely(passwordResetEmail({ to: user.email, name: user.name, url }));
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // Must stay last so Server Actions can set auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
