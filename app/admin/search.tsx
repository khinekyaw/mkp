import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";

/** Plain GET search form: works without JavaScript and keeps the query in the URL. */
export function SearchForm({ q, placeholder, label }: { q?: string; placeholder: string; label: string }) {
  return (
    <form className="flex max-w-md gap-2" role="search">
      <Input name="q" defaultValue={q} placeholder={placeholder} aria-label={label} />
      <button type="submit" className={buttonVariants({ variant: "outline" })}>
        {label}
      </button>
    </form>
  );
}

export const th = "px-3 py-2 text-left text-xs font-medium text-muted-foreground";
export const td = "px-3 py-2.5 align-top";
