"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useSiteCopy } from "@/components/i18n/site-locale";
import type { DetectThemeResult } from "@/lib/theme";

const EXAMPLES = ["stripe.com", "linear.app", "vercel.com", "github.com"];

export function DetectForm({
  onDetected,
  initialUrl = "",
  autoRun = false,
  showExamples = true,
}: {
  onDetected: (result: DetectThemeResult) => void;
  initialUrl?: string;
  /** Run detection on mount (e.g. right after onboarding). */
  autoRun?: boolean;
  showExamples?: boolean;
}) {
  const { t } = useSiteCopy();
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function detect(target: string) {
    if (!target.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t.studio.failed);
      onDetected(json as DetectThemeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.studio.failed);
    } finally {
      setLoading(false);
    }
  }

  const ran = useRef(false);
  useEffect(() => {
    if (autoRun && initialUrl && !ran.current) {
      ran.current = true;
      detect(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    detect(url);
  }

  return (
    <Card>
      <CardContent className="grid gap-3">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            aria-label={t.studio.websiteUrl}
            placeholder="yourclinic.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !url.trim()}>
            {loading ? <Spinner /> : <Sparkles />}
            {loading ? t.studio.reading : t.studio.detect}
          </Button>
        </form>
        {showExamples ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {t.studio.try}
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={loading}
              onClick={() => {
                setUrl(ex);
                detect(ex);
              }}
              className="cursor-pointer rounded-sm border px-1.5 py-0.5 font-mono text-[11px] transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
        ) : null}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
