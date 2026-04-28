import { ArrowRight, CheckCircle2, Play, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SeoHead } from "@/components/SeoHead";
import logoImg from "@/assets/laundrylord-logo.webp";

const operatorPainPoints = [
  "Track renters, balances, machines, and maintenance in one place",
  "Send renters to a self-serve payment portal instead of chasing texts",
  "Keep laundry machine assignments tied to the actual renter record",
  "Import existing renter lists without rebuilding everything by hand",
];

const operatorKeywords = [
  "laundry rental software",
  "apartment laundry software",
  "laundry room management software",
  "washer and dryer rental software",
  "laundry rental operator software",
];

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <SeoHead
        title="Laundry Rental Software for Washer and Dryer Operators"
        description="LaundryLord is laundry rental software for washer and dryer rental operators who need renter tracking, machine assignment, billing visibility, and a renter payment portal."
        canonicalPath="/"
        keywords={operatorKeywords.join(", ")}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "LaundryLord",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: "https://laundrylord.club/",
          description:
            "Laundry rental software for washer and dryer rental operators managing renters, machines, maintenance, and billing.",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        }}
      />

      <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoImg} alt="LaundryLord" className="h-10 w-10 rounded-xl object-contain" />
            <div>
              <div className="font-semibold tracking-tight">LaundryLord</div>
              <div className="text-xs text-slate-500">Laundry rental software</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/demo">Explore demo</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-900">
              <Search className="h-4 w-4" />
              Built for laundry rental operators, not generic property software
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                Laundry rental software for operators managing washer and dryer rentals.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                LaundryLord helps laundry rental operators track renters, assign machines, manage balances,
                and give renters a clean payment portal without stitching together spreadsheets and generic tools.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/demo">
                  Explore Demo <Play className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/laundry-rental-software">
                  See use case page <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 pt-2">
              {operatorPainPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-stone-200 bg-white shadow-sm">
            <CardContent className="space-y-6 p-7">
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-500">Why operators search for this</div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Replace manual laundry rental workflows with one operating system.
                </h2>
              </div>
              <div className="grid gap-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-1 flex items-center gap-2 font-medium text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-sky-600" />
                    Operator control
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    Keep renter, machine, payment, and maintenance history together instead of split across notes, email, and spreadsheets.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-1 flex items-center gap-2 font-medium text-slate-900">
                    <Search className="h-4 w-4 text-rose-600" />
                    Better visibility
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    See overdue balances, upcoming charges, machine placement, and maintenance activity without assembling reports manually.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-stone-200 shadow-none">
                <CardContent className="p-6">
                  <h2 className="mb-2 text-xl font-semibold tracking-tight">For laundry rental businesses</h2>
                  <p className="text-sm leading-6 text-slate-600">
                    LaundryLord is designed around renter accounts, machine assignments, balances, and operator workflows.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-stone-200 shadow-none">
                <CardContent className="p-6">
                  <h2 className="mb-2 text-xl font-semibold tracking-tight">For apartment laundry operators</h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Use it as apartment laundry software when you manage washer and dryer rentals across buildings and units.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-stone-200 shadow-none">
                <CardContent className="p-6">
                  <h2 className="mb-2 text-xl font-semibold tracking-tight">For renter payment follow-through</h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Give renters a payment portal and keep your team focused on collections, installs, and machine operations.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
