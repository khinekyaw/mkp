"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { Popover } from "radix-ui";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { FONT_GROUPS, fontPreviewHref, POPULAR_FONTS } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; group: string };

/**
 * Searchable list of popular Google Fonts, each shown in its own typeface.
 * Typing a name that isn't listed offers it as-is, so any Google Font works.
 * An empty value means the system font.
 */
export function FontPicker({ id, value, onChange }: { id: string; value: string; onChange: (font: string) => void }) {
  const { locale, t } = useSiteCopy();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: Option[] = [];
    if (!q || t.fonts.systemDefault.toLowerCase().includes(q)) list.push({ value: "", label: t.fonts.systemDefault, group: t.fonts.defaultGroup });
    for (const g of FONT_GROUPS) {
      for (const f of g.fonts) if (!q || f.toLowerCase().includes(q)) list.push({ value: f, label: f, group: t.fonts.groups[g.key] });
    }
    // Typed names come last so Enter picks a listed match first.
    const custom = query.trim();
    if (custom && !POPULAR_FONTS.some((f) => f.toLowerCase() === q)) {
      list.push({ value: custom, label: t.fonts.use(custom), group: t.fonts.otherGroup });
    }
    return list;
  }, [query, t]);

  function choose(o: Option) {
    onChange(o.value);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(options.length - 1, Math.max(0, active + (e.key === "ArrowDown" ? 1 : -1)));
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && options[active]) {
      e.preventDefault();
      choose(options[active]);
    }
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setQuery("");
        setActive(0);
      }}
    >
      <Popover.Trigger
        id={id}
        className="flex h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border bg-background px-3 text-left text-sm outline-none focus-visible:border-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/15"
      >
        <span className={cn("truncate", !value && "text-muted-foreground")} style={value ? { fontFamily: `"${value}", var(--font)` } : undefined}>
          {value || t.fonts.systemDefault}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          lang={locale}
          className="z-50 grid w-72 overflow-hidden rounded-lg border bg-background shadow-lg outline-none"
        >
          {/* Loads every listed font, trimmed to the letters of their names. */}
          <link rel="stylesheet" href={fontPreviewHref()} />
          <div className="relative border-b">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={t.fonts.search}
              aria-label={t.fonts.search}
              spellCheck={false}
              className="h-10 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div ref={listRef} role="listbox" aria-label={t.studio.font} className="max-h-72 overflow-y-auto p-1 [scrollbar-width:thin]">
            {options.map((o, i) => (
              <div key={`${o.group}-${o.value}`}>
                {i === 0 || options[i - 1].group !== o.group ? (
                  <p className="px-2 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">{o.group}</p>
                ) : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  data-index={i}
                  onClick={() => choose(o)}
                  onMouseMove={() => setActive(i)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[15px]",
                    i === active && "bg-muted",
                  )}
                  style={o.value && o.label === o.value ? { fontFamily: `"${o.value}", var(--font)` } : undefined}
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value ? <Check className="size-4 shrink-0 text-primary" /> : null}
                </button>
              </div>
            ))}
          </div>
          <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
            {t.fonts.notListed}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
