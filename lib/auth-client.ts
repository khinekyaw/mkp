import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    // Password accepted but a second factor is required: finish on /two-factor.
    twoFactorClient({
      // Runs inside the auth client, outside React, so there's no router to use.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      onTwoFactorRedirect: () => window.location.assign(`/two-factor${window.location.search}`),
    }),
    adminClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
