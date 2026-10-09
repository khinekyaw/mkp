"use server";

import { cookies } from "next/headers";
import { toLocale } from "./i18n";
import { SITE_LOCALE_COOKIE } from "./site-copy";

/** Remembers the visitor's site language for a year. */
export async function setSiteLocaleAction(locale: string) {
  (await cookies()).set(SITE_LOCALE_COOKIE, toLocale(locale), { path: "/", maxAge: 31_536_000, sameSite: "lax" });
}
