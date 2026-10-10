import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: LEGAL.terms.en.title };

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
