import "server-only";
import { cookies } from "next/headers";
import { toLocale, type Locale } from "./i18n";
import { SITE_COPY, SITE_LOCALE_COOKIE } from "./site-copy";

/** The visitor's chosen site language (English until they switch). */
export async function getSiteLocale(): Promise<Locale> {
  return toLocale((await cookies()).get(SITE_LOCALE_COOKIE)?.value);
}

export async function getSiteCopy() {
  const locale = await getSiteLocale();
  return { locale, t: SITE_COPY[locale] };
}
