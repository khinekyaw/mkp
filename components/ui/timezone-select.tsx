"use client";

import { useSiteCopy } from "@/components/i18n/site-locale";
import { Select } from "./select";

// Common zones first; the full IANA list follows.
const FEATURED = ["Asia/Yangon", "Asia/Bangkok", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Jakarta", "Asia/Ho_Chi_Minh", "Asia/Manila", "Asia/Kolkata"];

export function TimezoneSelect(props: React.ComponentProps<typeof Select>) {
  const { t } = useSiteCopy();
  const all = Intl.supportedValuesOf("timeZone").filter((z) => !FEATURED.includes(z));
  return (
    <Select {...props}>
      <optgroup label={t.dash.settings.tzFeatured}>
        {FEATURED.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </optgroup>
      <optgroup label={t.dash.settings.tzAll}>
        {all.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </optgroup>
    </Select>
  );
}
