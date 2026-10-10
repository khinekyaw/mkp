import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: LEGAL.privacy.en.title };

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}
