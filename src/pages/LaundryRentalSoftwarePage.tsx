import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SeoHead } from "@/components/SeoHead";

const featureBlocks = [
  {
    title: "Renter records",
    body: "Track rent, deposits, install fees, balances, status, and notes for every laundry rental customer.",
  },
  {
    title: "Machine assignment",
    body: "See which washer, dryer, or set is assigned to each renter and keep inventory connected to the right account.",
  },
  {
    title: "Billing visibility",
    body: "Review upcoming, overdue, failed, and paid charges so operators can follow up faster.",
  },
  {
    title: "Maintenance workflow",
    body: "Keep maintenance issues tied to the renter and machine so service history does not disappear in text threads.",
  },
];

export default function LaundryRentalSoftwarePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SeoHead
        title="Laundry Rental Software"
        description="Laundry rental software for washer and dryer rental operators who need renter records, machine assignment tracking, maintenance history, and payment visibility."
        canonicalPath="/laundry-rental-software"
        keywords="laundry rental software, washer and dryer rental software, laundry rental operator software"
      />

      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="max-w-3xl space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Solution page</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Laundry rental software built for operators running washer and dryer rentals.
          </h1>
          <p className="text-lg leading-8 text-slate-600">
            If you are searching for laundry rental software, you usually need a better way to manage renter accounts,
            machine assignments, balances, and repeat billing without relying on spreadsheets or generic property tools.
            LaundryLord is built around those operator workflows.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild>
              <Link to="/demo">
                Explore Demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {featureBlocks.map((block) => (
            <Card key={block.title} className="border-stone-200 shadow-none">
              <CardContent className="p-6">
                <h2 className="mb-2 text-xl font-semibold tracking-tight">{block.title}</h2>
                <p className="text-sm leading-6 text-slate-600">{block.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-12 max-w-3xl space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Who this is for
          </h2>
          <p className="text-base leading-7 text-slate-600">
            LaundryLord fits operators who place washers and dryers in apartments, multifamily housing, or other resident settings
            and need one place to manage the operational side of those rentals.
          </p>
          <p className="text-base leading-7 text-slate-600">
            It is especially useful when your team needs a simple renter payment portal, machine-by-renter visibility, and a cleaner
            process for imports, service issues, and follow-up on unpaid balances.
          </p>
        </section>
      </main>
    </div>
  );
}
