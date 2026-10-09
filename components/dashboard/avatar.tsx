import { cn } from "@/lib/utils";

// Soft tints so a list of people reads apart at a glance; picked by name so a
// person keeps the same color everywhere.
const TINTS = [
  "bg-tone-green-soft text-tone-green",
  "bg-tone-blue-soft text-tone-blue",
  "bg-tone-amber-soft text-tone-amber",
  "bg-sage-soft text-sage-deep",
  "bg-tone-red-soft text-tone-red",
];

/** Initials without honorifics: "Dr. Su Su Hlaing" → "SH". */
export function initials(name: string) {
  const words = name.replace(/^(Dr\.?|Daw|U|Ko|Ma|Mr\.?|Mrs\.?|Ms\.?)\s+/i, "").trim().split(/\s+/);
  const first = words[0]?.[0] ?? "?";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        size === "sm" ? "size-7 text-[10px]" : size === "lg" ? "size-10 text-sm" : "size-8 text-[11px]",
        TINTS[hash % TINTS.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
