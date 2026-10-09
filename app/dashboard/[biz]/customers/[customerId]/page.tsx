import { ArrowLeft, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingList } from "@/components/dashboard/booking-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { getCustomer } from "@/lib/dashboard/queries";
import { getSiteCopy } from "@/lib/site-locale";
import { CustomerForm } from "./customer-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.customer };
}

export default async function CustomerPage({ params }: PageProps<"/dashboard/[biz]/customers/[customerId]">) {
  const { biz, customerId } = await params;
  const [{ business }, { t }] = await Promise.all([requireBusiness(biz), getSiteCopy()]);
  const c = t.dash.customers;
  const data = await getCustomer(business.id, customerId);
  if (!data) notFound();
  const { customer, bookings } = data;
  const phone = /^959\d{7,9}$/.test(customer.phone) ? `0${customer.phone.slice(2)}` : `+${customer.phone}`;
  const stats = {
    total: bookings.filter((b) => b.status !== "cancelled").length,
    noShows: bookings.filter((b) => b.status === "no_show").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <>
      <Link href={`/dashboard/${business.slug}/customers`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {c.title}
      </Link>
      <PageHeader
        title={customer.name}
        description={
          <a href={`tel:+${customer.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
            <Phone className="size-3.5" /> {phone}
          </a>
        }
      />
      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        {[
          [c.stats.visits, stats.total],
          [c.stats.noShows, stats.noShows],
          [c.stats.cancelled, stats.cancelled],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-background p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{c.appointments}</CardTitle>
          </CardHeader>
          <BookingList bookings={bookings} slug={business.slug} timezone={business.timezone} className="border-t" />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{c.details}</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm slug={business.slug} customer={{ id: customer.id, name: customer.name, email: customer.email, notes: customer.notes }} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
