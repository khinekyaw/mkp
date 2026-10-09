"use client";

import { useState } from "react";
import { CopyButton } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";

type Mode = "inline" | "button" | "iframe";

export function EmbedCodes({ businessId, origin, locales }: { businessId: string; origin: string; locales: string[] }) {
  const [mode, setMode] = useState<Mode>("inline");
  const [lang, setLang] = useState("");
  const langAttr = lang ? `\n  data-lang="${lang}"` : "";
  const code =
    mode === "iframe"
      ? `<iframe src="${origin}/embed/${businessId}${lang ? `?lang=${lang}` : ""}"\n  title="Book an appointment"\n  style="width:100%;max-width:560px;height:720px;border:0"></iframe>`
      : `<script src="${origin}/embed.js"\n  data-business="${businessId}"${mode === "button" ? '\n  data-mode="button"' : ""}${langAttr}\n  async></script>`;
  const hint = {
    inline: "Shows the booking form where you paste the tag.",
    button: "Adds a floating “Book appointment” button that opens the form.",
    iframe: "For site builders that don't allow scripts. Doesn't auto-resize.",
  }[mode];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          aria-label="Embed type"
          value={mode}
          onChange={setMode}
          options={[
            { value: "inline", label: "Inline" },
            { value: "button", label: "Floating button" },
            { value: "iframe", label: "iframe" },
          ]}
        />
        {locales.length > 1 ? (
          <Select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value)} className="w-40">
            <option value="">Default language</option>
            <option value="en">English</option>
            <option value="my">Burmese</option>
          </Select>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">{code}</pre>
      <CopyButton value={code} className="w-fit" />
    </div>
  );
}
