import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Check,
  FileCheck2,
  Play,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
} from "lucide-react";

interface FeatureItem {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}

interface PricingTier {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

interface Testimonial {
  quote: string;
  name: string;
  company: string;
}

const features: FeatureItem[] = [
  {
    title: "Smart CSV Import",
    description:
      "Upload distributor files in seconds. Auto-maps prices, stock, categories.",
    icon: Upload,
    accent: "bg-[#0d9488]/10 text-[#0d9488]",
  },
  {
    title: "Branded Public Catalog",
    description:
      "Shareable buyer catalog with your logo - no login needed.",
    icon: Store,
    accent: "bg-[#a8a29e]/20 text-[#4b5563]",
  },
  {
    title: "Quotes to Orders Workflow",
    description:
      "Buyers request quotes -> approve -> convert to order instantly.",
    icon: ArrowLeftRight,
    accent: "bg-[#6b7280]/15 text-[#4b5563]",
  },
  {
    title: "Compliant Proforma Invoices",
    description:
      "Automatic PDFs with ЕИК, ДДС №, IBAN, МОЛ - ready for EU rules.",
    icon: FileCheck2,
    accent: "bg-[#0d9488]/10 text-[#0d9488]",
  },
  {
    title: "Real-time Stock & Pricing",
    description:
      "Live quantity updates, wholesale/retail prices, low-stock alerts.",
    icon: Boxes,
    accent: "bg-[#a8a29e]/20 text-[#4b5563]",
  },
  {
    title: "Analytics & Complaints",
    description:
      "Revenue insights, top products, easy complaint handling.",
    icon: BarChart3,
    accent: "bg-[#6b7280]/15 text-[#4b5563]",
  },
];

const pricing: PricingTier[] = [
  {
    name: "Free Trial",
    price: "EUR 0",
    blurb: "14 days, full access",
    features: [
      "Unlimited products",
      "Public catalog",
      "Quote requests",
      "Basic analytics",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Starter",
    price: "EUR 49/mo",
    blurb: "For growing wholesalers",
    features: [
      "CSV import & mapping",
      "Proforma invoices",
      "Email notifications",
      "Buyer accounts",
    ],
    cta: "Choose Starter",
  },
  {
    name: "Professional",
    price: "EUR 149/mo",
    blurb: "Most popular for teams",
    features: [
      "Multi-warehouse stock",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
    ],
    cta: "Choose Professional",
    highlighted: true,
  },
];

const testimonials: Testimonial[] = [
  {
    quote:
      "Cut catalog update time by 70%. Proforma invoices are perfect for Bulgarian tax compliance.",
    name: "Ivan P.",
    company: "Sofia Importer",
  },
  {
    quote:
      "Buyers love the clean public catalog - more orders with less effort.",
    name: "Maria K.",
    company: "Showroom Owner",
  },
  {
    quote:
      "We replaced three spreadsheets and a legacy ERP with FurniTrade in under a week.",
    name: "Petar L.",
    company: "Varna Wholesale",
  },
  {
    quote:
      "The quotes-to-orders flow feels like Shopify, but built for wholesale realities.",
    name: "Elena M.",
    company: "Burgas Living",
  },
];

const faqs = [
  {
    question: "What is FurniTrade?",
    answer:
      "FurniTrade is a B2B furniture wholesale platform that unifies catalog management, pricing, quotes, orders, and invoicing in one modern dashboard.",
  },
  {
    question: "How does CSV import work?",
    answer:
      "Upload your distributor CSV, map fields once, and FurniTrade automatically syncs products, prices, and stock on every new file.",
  },
  {
    question: "Is it compliant in Bulgaria and the EU?",
    answer:
      "Yes. Proforma invoices include required Bulgarian fields like ЕИК, ДДС №, IBAN, and МОЛ, and are formatted for EU trade workflows.",
  },
  {
    question: "Can buyers request quotes without an account?",
    answer:
      "Yes. Buyers can browse a public catalog, request quotes, and you can approve and convert to orders instantly.",
  },
  {
    question: "Do you support multiple price tiers?",
    answer:
      "You can set wholesale, retail, and custom tiered pricing per buyer or segment, plus volume-based discounts.",
  },
  {
    question: "How fast can we go live?",
    answer:
      "Most teams are live within days. Import your catalog, brand your portal, and invite buyers in minutes.",
  },
];

const logos = [
  "Sofia Living",
  "Euro Furn",
  "Plovdiv Design",
  "Danube Loft",
  "Balkan Atelier",
  "Rila Interiors",
  "Varna Home",
  "Stara Zagora Studio",
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900">
      {/* TODO: Add <title>FurniTrade - B2B Furniture Wholesale Platform</title> and OpenGraph tags in your app head. */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm"
            : "bg-white/30 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d9488]/20 to-[#6b7280]/20">
              <Sparkles className="h-5 w-5 text-[#0d9488]" />
            </span>
            <span>FurniTrade</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
            <a className="transition hover:text-slate-900" href="#features">
              Features
            </a>
            <a className="transition hover:text-slate-900" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-slate-900" href="#buyers">
              For Buyers
            </a>
            <a className="transition hover:text-slate-900" href="#suppliers">
              For Suppliers
            </a>
            <Link className="transition hover:text-slate-900" to="/auth/login">
              Login
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="hidden border-slate-300 text-slate-700 hover:bg-slate-100 md:inline-flex"
              asChild
            >
              <Link to="/auth/login">Login</Link>
            </Button>
            <Button
              className="border border-[#a8a29e]/50 bg-[#6b7280] text-white shadow-sm hover:bg-[#4b5563]"
              asChild
            >
              <Link to="/auth/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-20">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.12),_transparent_55%),radial-gradient(circle_at_20%_20%,_rgba(107,114,128,0.12),_transparent_50%)]" />
          <div className="absolute -left-24 top-24 h-56 w-56 rounded-full bg-[#0d9488]/10 blur-3xl" />
          <div className="absolute right-10 top-10 h-72 w-72 rounded-full bg-[#a8a29e]/20 blur-3xl" />

          <div className="relative mx-auto grid min-h-[80vh] max-w-6xl items-center gap-12 px-4 py-16 md:px-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8">
              <Badge className="bg-[#0d9488]/15 text-[#0d9488]">Built for wholesale furniture</Badge>
              <div className="space-y-5">
                <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl">
                  Your Complete B2B Furniture Wholesale Platform
                </h1>
                <p className="text-lg text-slate-600 md:text-xl">
                  Manage your catalog, prices & stock - Generate Bulgarian-compliant proforma invoices - Convert quotes to orders - all in one modern dashboard.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-[#6b7280] text-white hover:bg-[#4b5563]"
                  asChild
                >
                  <Link to="/auth/signup">Start Free Trial</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-white"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#0d9488]" />
                  No credit card required
                </span>
                <span className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-[#0d9488]" />
                  Bulgarian & EU compliant
                </span>
              </div>
            </div>

            <div className="relative">
              <Card className="glass border-white/50 bg-white/60 p-4 shadow-xl">
                {/* Placeholder: angled dashboard screenshot showing orders table + product grid + proforma button. */}
                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-inner">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="h-3 w-24 rounded-full bg-slate-200" />
                    <div className="flex gap-2">
                      <div className="h-8 w-8 rounded-lg bg-slate-200" />
                      <div className="h-8 w-8 rounded-lg bg-[#0d9488]/20" />
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <div className="rounded-xl border border-white/60 bg-white p-4 shadow-sm">
                      <div className="mb-3 h-3 w-32 rounded-full bg-slate-200" />
                      <div className="grid grid-cols-3 gap-3">
                        <div className="h-12 rounded-lg bg-slate-100" />
                        <div className="h-12 rounded-lg bg-slate-100" />
                        <div className="h-12 rounded-lg bg-slate-100" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/60 bg-white p-4 shadow-sm">
                      <div className="mb-3 h-3 w-28 rounded-full bg-slate-200" />
                      <div className="space-y-2">
                        <div className="h-3 w-full rounded-full bg-slate-100" />
                        <div className="h-3 w-5/6 rounded-full bg-slate-100" />
                        <div className="h-3 w-4/6 rounded-full bg-slate-100" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="absolute -left-6 bottom-10 hidden rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg backdrop-blur md:block">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#0d9488]/15" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      New order #3842
                    </p>
                    <p className="text-xs text-slate-500">from Sofia Furniture Ltd.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-white/60 py-10">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <p className="text-center text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Trusted by furniture wholesalers across Bulgaria & Europe
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 text-center text-sm font-semibold text-slate-500 sm:grid-cols-4 lg:grid-cols-8">
              {logos.map((logo) => (
                <div
                  key={logo}
                  className="rounded-full border border-slate-200 bg-white/70 px-3 py-2"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-24 mx-auto max-w-6xl px-4 py-16 md:px-6"
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="space-y-4">
              <Badge className="bg-[#6b7280]/10 text-[#6b7280]">Platform features</Badge>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Built for modern wholesale workflows
              </h2>
              <p className="text-lg text-slate-600">
                Keep every SKU, buyer, and order in sync across sales teams, warehouses, and showrooms.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Glassmorphism dashboard preview
              </p>
              <div className="mt-4 space-y-3">
                <div className="h-4 w-3/4 rounded-full bg-slate-200" />
                <div className="h-4 w-full rounded-full bg-slate-100" />
                <div className="h-4 w-5/6 rounded-full bg-slate-100" />
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="glass border-white/70 bg-white/70 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className={`mb-4 inline-flex rounded-xl p-3 ${feature.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                  <div className="mt-4 h-20 rounded-xl border border-dashed border-slate-200 bg-white/60" />
                </Card>
              );
            })}
          </div>
        </section>

        <section className="bg-[#fdfdfd]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card
                id="buyers"
                className="glass scroll-mt-24 border-white/60 bg-white/80 p-8 shadow-sm"
              >
                <Badge className="bg-[#0d9488]/10 text-[#0d9488]">For Buyers</Badge>
                <h3 className="mt-4 text-2xl font-semibold">
                  A beautiful buying experience for your customers
                </h3>
                <p className="mt-3 text-slate-600">
                  Buyers browse a curated catalog, request quotes instantly, and track order status in a modern portal.
                </p>
                <Button
                  variant="outline"
                  className="mt-6 border-slate-300 text-slate-700"
                >
                  View Buyer Portal
                </Button>
              </Card>
              <Card
                id="suppliers"
                className="glass scroll-mt-24 border-white/60 bg-white/80 p-8 shadow-sm"
              >
                <Badge className="bg-[#6b7280]/10 text-[#6b7280]">For Suppliers</Badge>
                <h3 className="mt-4 text-2xl font-semibold">
                  Centralize every supplier feed and price list
                </h3>
                <p className="mt-3 text-slate-600">
                  Connect multiple distributor catalogs, normalize pricing, and keep inventory accurate across channels.
                </p>
                <Button
                  variant="outline"
                  className="mt-6 border-slate-300 text-slate-700"
                >
                  Explore Supplier Tools
                </Button>
              </Card>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-white/70 py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(107,114,128,0.12),_transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-4 md:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold md:text-4xl">
                Everything a furniture wholesaler needs - in one clean dashboard
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Track quotes, orders, analytics, and compliance from a single glassmorphism workspace.
              </p>
            </div>
            <Card className="glass mt-10 border-white/70 bg-white/60 p-6 shadow-xl">
              {/* Placeholder: beautiful angled dashboard screenshot - orders + analytics cards */}
              <div className="grid gap-4 rounded-3xl border border-white/60 bg-white/70 p-6 md:grid-cols-[1.4fr_0.6fr]">
                <div className="space-y-4">
                  <div className="h-4 w-40 rounded-full bg-slate-200" />
                  <div className="grid gap-3">
                    {[0, 1, 2].map((row) => (
                      <div
                        key={row}
                        className="h-12 rounded-xl border border-slate-200 bg-white"
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-28 rounded-2xl bg-slate-100" />
                  <div className="h-28 rounded-2xl bg-slate-100" />
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 mx-auto max-w-6xl px-4 py-16 md:px-6"
        >
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge className="bg-[#0d9488]/10 text-[#0d9488]">Pricing</Badge>
              <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
                Plans that scale with your catalog
              </h2>
            </div>
            <p className="max-w-md text-slate-600">
              Transparent pricing with everything you need to run a high-converting wholesale operation.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {pricing.map((tier) => (
              <Card
                key={tier.name}
                className={`glass border-white/70 bg-white/80 p-6 shadow-sm ${
                  tier.highlighted
                    ? "ring-2 ring-[#0d9488]/50"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">
                    {tier.name}
                  </h3>
                  {tier.highlighted ? (
                    <Badge className="bg-[#0d9488]/15 text-[#0d9488]">
                      Most Popular
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-500">{tier.blurb}</p>
                <p className="mt-6 text-3xl font-semibold text-slate-900">
                  {tier.price}
                </p>
                <div className="mt-6 space-y-3 text-sm text-slate-600">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0d9488]/10">
                        <Check className="h-4 w-4 text-[#0d9488]" />
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className={`mt-6 w-full ${
                    tier.highlighted
                      ? "bg-[#0d9488] text-white hover:bg-[#0f766e]"
                      : "bg-[#6b7280] text-white hover:bg-[#4b5563]"
                  }`}
                >
                  {tier.cta}
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-white/70 py-16">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge className="bg-[#6b7280]/10 text-[#6b7280]">Testimonials</Badge>
                <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
                  Wholesalers trust FurniTrade to grow faster
                </h2>
              </div>
              <Button
                variant="outline"
                className="border-slate-300 text-slate-700"
              >
                Read customer stories
              </Button>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {testimonials.map((testimonial) => (
                <Card
                  key={testimonial.name}
                  className="glass border-white/70 bg-white/80 p-6 shadow-sm"
                >
                  <p className="text-base text-slate-700">{testimonial.quote}</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-200" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {testimonial.name}
                      </p>
                      <p className="text-xs text-slate-500">{testimonial.company}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <Badge className="bg-[#0d9488]/10 text-[#0d9488]">FAQ</Badge>
              <h2 className="text-3xl font-semibold md:text-4xl">
                Questions, answered
              </h2>
              <p className="text-lg text-slate-600">
                Everything you need to know before launching your next wholesale catalog.
              </p>
              <Card className="glass border-white/60 bg-white/80 p-6">
                <p className="text-sm font-semibold text-slate-700">
                  Still unsure?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Book a 20-minute walkthrough and see the platform live.
                </p>
                <Button
                  className="mt-4 bg-[#6b7280] text-white hover:bg-[#4b5563]"
                >
                  Book a demo
                </Button>
              </Card>
            </div>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.question}
                  value={faq.question}
                  className="glass border-white/60 bg-white/80 px-4"
                >
                  <AccordionTrigger className="text-left text-slate-800">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="bg-[#0d9488]/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-12 text-center md:flex-row md:text-left">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                Ready to modernize your wholesale business?
              </h2>
              <p className="mt-2 text-slate-600">
                Launch your FurniTrade workspace today and invite your first buyers in minutes.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-[#0d9488] text-white hover:bg-[#0f766e]"
              asChild
            >
              <Link to="/auth/signup">Get Started Free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d9488]/20 to-[#6b7280]/20">
                <Sparkles className="h-5 w-5 text-[#0d9488]" />
              </span>
              FurniTrade
            </div>
            <p className="text-sm text-slate-600">
              The B2B wholesale platform purpose-built for furniture distributors.
            </p>
            <div className="flex gap-3 text-slate-500">
              <span className="h-8 w-8 rounded-full border border-slate-200" />
              <span className="h-8 w-8 rounded-full border border-slate-200" />
              <span className="h-8 w-8 rounded-full border border-slate-200" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <a href="#features" className="hover:text-slate-900">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-slate-900">
                  Pricing
                </a>
              </li>
              <li>
                <Link to="/auth/login" className="hover:text-slate-900">
                  Login
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Security</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          (c) 2026 FurniTrade. Made in Sofia, Bulgaria.
        </div>
      </footer>
    </div>
  );
}
