import { fmtLocalDate } from "@/lib/format";
import { LEGAL, LEGAL_UPDATED } from "@/lib/legal";
import { getSiteCopy } from "@/lib/site-locale";

export async function LegalPage({ doc }: { doc: keyof typeof LEGAL }) {
  const { locale, t } = await getSiteCopy();
  const d = LEGAL[doc][locale];
  return (
    <article className="mx-auto grid max-w-2xl gap-8 px-4 py-12 sm:py-16">
      <header className="grid gap-3">
        <h1 className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">{d.title}</h1>
        <p className="text-xs text-muted-foreground">{t.legal.updated(fmtLocalDate(LEGAL_UPDATED, { day: "numeric", month: "long", year: "numeric" }, locale))}</p>
        <p className="text-[15px] leading-relaxed">{d.intro}</p>
      </header>
      {d.sections.map((s) => (
        <section key={s.heading} className="grid gap-2">
          <h2 className="text-lg font-medium">{s.heading}</h2>
          {s.body.map((p) => (
            <p key={p} className="text-[15px] leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
