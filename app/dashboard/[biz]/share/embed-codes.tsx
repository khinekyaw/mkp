"use client";

import { useState } from "react";
import { CopyButton } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useSiteCopy } from "@/components/i18n/site-locale";

type Mode = "inline" | "button" | "iframe";

export function EmbedCodes({ businessId, origin, locales }: { businessId: string; origin: string; locales: string[] }) {
  const { t } = useSiteCopy();
  const sh = t.dash.share;
  const [mode, setMode] = useState<Mode>("inline");
  const [lang, setLang] = useState("");
  const langAttr = lang ? `\n  data-lang="${lang}"` : "";
  const code =
    mode === "iframe"
      ? `<iframe src="${origin}/embed/${businessId}${lang ? `?lang=${lang}` : ""}"\n  title="Book an appointment"\n  style="width:100%;max-width:560px;height:720px;border:0"></iframe>`
      : `<script src="${origin}/embed.js"\n  data-business="${businessId}"${mode === "button" ? '\n  data-mode="button"' : ""}${langAttr}\n  async></script>`;
  const hint = sh.hints[mode];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          aria-label={sh.embedType}
          value={mode}
          onChange={setMode}
          options={[
            { value: "inline", label: sh.inline },
            { value: "button", label: sh.button },
            { value: "iframe", label: sh.iframe },
          ]}
        />
        {locales.length > 1 ? (
          <Select aria-label={t.dash.common.language} value={lang} onChange={(e) => setLang(e.target.value)} className="w-40">
            <option value="">{sh.defaultLanguage}</option>
            <option value="en">{t.dash.common.english}</option>
            <option value="my">{t.dash.common.burmese}</option>
          </Select>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">{code}</pre>
      <CopyButton value={code} className="w-fit" />
    </div>
  );
}
