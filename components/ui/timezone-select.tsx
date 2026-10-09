import { Select } from "./select";

// Common zones first; the full IANA list follows.
const FEATURED = ["Asia/Yangon", "Asia/Bangkok", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Jakarta", "Asia/Ho_Chi_Minh", "Asia/Manila", "Asia/Kolkata"];

export function TimezoneSelect(props: React.ComponentProps<typeof Select>) {
  const all = Intl.supportedValuesOf("timeZone").filter((z) => !FEATURED.includes(z));
  return (
    <Select {...props}>
      <optgroup label="Southeast & South Asia">
        {FEATURED.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </optgroup>
      <optgroup label="All timezones">
        {all.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </optgroup>
    </Select>
  );
}
