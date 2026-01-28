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
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Layers,
  LineChart,
  Menu,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Tag,
  Truck,
  Users,
  X,
} from "lucide-react";

// ============================================================================
// DESIGN SYSTEM TOKENS
// See /design-system.md for full documentation
// ============================================================================

const theme = {
  // Layout
  container: "mx-auto max-w-6xl px-4 md:px-6",
  
  // Section spacing
  section: "py-20 md:py-28",
  sectionTight: "py-10 md:py-14",
  sectionHero: "py-10 md:py-14",
  
  // Border radius
  radius: {
    sm: "rounded-xl",
    md: "rounded-2xl",
    lg: "rounded-3xl",
    pill: "rounded-full",
  },
  
  // Shadows
  shadow: {
    card: "shadow-[0_18px_40px_-32px_rgba(47,36,58,0.45)]",
    cardStrong: "shadow-[0_32px_64px_-24px_rgba(47,36,58,0.4)]",
    cardHover: "transition hover:-translate-y-1 hover:shadow-[0_22px_48px_-34px_rgba(47,36,58,0.5)]",
    pill: "shadow-[0_4px_12px_-4px_rgba(47,36,58,0.18)]",
    subtle: "shadow-[0_2px_8px_-2px_rgba(47,36,58,0.1)]",
  },
  
  // Typography
  text: {
    h1: "text-4xl md:text-[3.5rem] lg:text-6xl font-bold tracking-[-0.02em] leading-[1.1] text-balance",
    h2: "text-3xl md:text-4xl font-semibold tracking-tight",
    h3: "text-xl md:text-2xl font-semibold",
    body: "text-base md:text-lg leading-relaxed",
    bodySm: "text-sm",
    caption: "text-xs font-medium",
    micro: "text-[11px] font-medium",
    eyebrow: "text-xs font-semibold uppercase tracking-[0.28em]",
    label: "text-sm font-semibold",
    nav: "text-[13px]",
  },
  
  // Colors (tokens defined in src/index.css :root)
  colors: {
    bg: "bg-[color:var(--base)]",
    ink: "text-[color:var(--ink)]",
    inkSoft: "text-[color:var(--ink-70)]",
    inkMuted: "text-[color:var(--ink-55)]",
    accent: "bg-[color:var(--landing-accent)] text-[color:var(--base)]",
    accentSoft: "bg-[color:var(--accent-soft)] text-[color:var(--landing-accent)]",
    border: "border-[color:var(--ink-12)]",
    borderStrong: "border-[color:var(--ink-12)]",
    surface: "bg-[color:var(--surface)]",
    surfaceSoft: "bg-[color:var(--surface-soft)]",
  },
  
  // Spacing
  gap: {
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
    xl: "gap-6",
    "2xl": "gap-8",
    "3xl": "gap-10",
    "4xl": "gap-12",
  },
  
  // Component patterns
  components: {
    card: "border p-6",
    cardLg: "border p-8",
    pill: "px-3 py-1.5",
    pillSm: "px-2.5 py-1",
  },
};

const logos = [
  { name: "Mebelcenter", image: "/mebelcenter..svg" },
  { name: "All Power", image: "/allpower.avif" },
  { name: "Domex", image: "/domex.png" },
  { name: "HobbyFarms", image: "/hobbyfarms.png" },
  { name: "Transcargo", image: "/transcargo.png" },
  { name: "AiByLekov", image: "/aibylekov.png" },
];

interface FeatureItem {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

const features: FeatureItem[] = [
  {
    title: "Unified catalog",
    description:
      "Merge supplier feeds, variants, and availability into one clean listing.",
    icon: Layers,
  },
  {
    title: "Client-specific pricing",
    description:
      "Set negotiated tiers, volume discounts, and validity windows per buyer.",
    icon: BadgeCheck,
  },
  {
    title: "Quote workflows",
    description:
      "Collect requests, route approvals, and move to order in minutes.",
    icon: ClipboardCheck,
  },
  {
    title: "BG compliant proformas",
    description:
      "Generate PDFs with EIK, VAT ID, IBAN, and MOL fields ready for audits.",
    icon: FileCheck2,
  },
  {
    title: "Supplier coordination",
    description:
      "Keep warehouse stock, lead times, and delivery schedules in sync.",
    icon: Truck,
  },
  {
    title: "Clear reporting",
    description:
      "Track margin, repeat orders, and pipeline without manual spreadsheets.",
    icon: LineChart,
  },
];

const workflowSteps = [
  {
    title: "Import catalog",
    detail: "Upload supplier files once and keep listings up to date.",
  },
  {
    title: "Buyer requests quote",
    detail: "Clients pick items, quantities, and delivery terms.",
  },
  {
    title: "Approve",
    detail: "Sales locks pricing and confirms lead times.",
  },
  {
    title: "Proforma",
    detail: "Send compliant PDFs and confirm the order.",
  },
];

const metrics = [
  {
    value: "31%",
    label: "faster quote turnaround",
    detail: "Average time from request to approved proforma.",
  },
  {
    value: "22 hrs",
    label: "catalog refresh",
    detail: "From supplier file to buyer-ready listings.",
  },
  {
    value: "15%",
    label: "repeat order lift",
    detail: "Improvement within the first quarter.",
  },
];

const testimonials = [
  {
    quote:
      "We replaced spreadsheets, plugins, and email threads with a single workflow. Quotes now close the same day.",
    name: "Mila Georgieva",
    company: "Sofia Trade House",
  },
  {
    quote:
      "Client pricing finally lives in one place. Our buyers get the right terms without back-and-forth.",
    name: "Atanas Iliev",
    company: "Danube Distribution",
  },
  {
    quote:
      "Proforma documents are compliant by default, so accounting is no longer a bottleneck.",
    name: "Hristo Petrov",
    company: "Balkan Wholesale",
  },
];

const faqs = [
  {
    question: "Is this built for wholesalers or retail stores?",
    answer:
      "This platform is purpose-built for wholesalers. It replaces the retail-store-plus-plugins model with dedicated wholesale workflows.",
  },
  {
    question: "How do buyers access pricing?",
    answer:
      "Buyers can use a branded portal or be invited into private accounts with negotiated price tiers.",
  },
  {
    question: "What BG compliance fields are included?",
    answer:
      "Proforma PDFs include EIK, VAT ID, IBAN, and MOL fields aligned with Bulgarian and EU trade standards.",
  },
  {
    question: "Can we manage multiple supplier catalogs?",
    answer:
      "Yes. Supplier files are normalized into a single catalog with shared reporting.",
  },
  {
    question: "How fast can we launch?",
    answer:
      "Most teams go live within days after import and portal branding.",
  },
  {
    question: "Do you help with onboarding?",
    answer:
      "We provide assisted import, data mapping, and training for your sales team.",
  },
];

const screenshots = {
  dashboard: "/landing/dashboard.png",
  orders: "/landing/orders.png",
  clients: "/landing/clients.png",
  complaints: "/landing/complaints.png",
  csv: "/landing/csv-import.png",
};

// Removed callout pills - using floating cards instead

const statusBadge = {
  label: "Live data",
  className: "top-3 right-3",
};

const ImageFallback = ({ title }: { title: string }) => (
  <div
    className={`${theme.radius.lg} ${theme.colors.surfaceSoft} ${theme.colors.inkSoft} flex h-full w-full items-center justify-center text-sm`}
  >
    {title}
  </div>
);

const ImageWithFallback = ({
  src,
  alt,
  className,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <ImageFallback title={alt} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={`min-h-screen ${theme.colors.bg} ${theme.colors.ink}`}>
      {/* Floating navbar - centered with no visible wrapper */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-6xl">
        <header
          className={`rounded-2xl transition-all duration-300 ease-out ${
            scrolled
              ? "bg-white border border-[color:var(--ink-12)] shadow-[0_8px_32px_-8px_rgba(47,36,58,0.15)]"
              : "bg-white border border-[color:var(--ink-08)] shadow-[0_4px_16px_-4px_rgba(47,36,58,0.08)]"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-3">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="rounded-xl bg-[color:var(--landing-accent)] flex h-9 w-9 items-center justify-center shadow-[0_2px_8px_-2px_rgba(68,64,84,0.3)] transition-all duration-300 group-hover:shadow-[0_4px_12px_-2px_rgba(68,64,84,0.4)] group-hover:-translate-y-0.5">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              <span className="text-[15px] font-semibold text-[color:var(--ink)]">FurniTrade</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 lg:flex">
              <a 
                className="px-4 py-2 rounded-full text-[13px] font-medium text-[color:var(--ink)] transition-all duration-300 ease-out hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--landing-accent)]" 
                href="#features"
              >
                Features
              </a>
              <a 
                className="px-4 py-2 rounded-full text-[13px] font-medium text-[color:var(--ink)] transition-all duration-300 ease-out hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--landing-accent)]" 
                href="#highlights"
              >
                Product
              </a>
              <a 
                className="px-4 py-2 rounded-full text-[13px] font-medium text-[color:var(--ink)] transition-all duration-300 ease-out hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--landing-accent)]" 
                href="#workflow"
              >
                Workflow
              </a>
              <a 
                className="px-4 py-2 rounded-full text-[13px] font-medium text-[color:var(--ink)] transition-all duration-300 ease-out hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--landing-accent)]" 
                href="#roi"
              >
                Impact
              </a>
              <a 
                className="px-4 py-2 rounded-full text-[13px] font-medium text-[color:var(--ink)] transition-all duration-300 ease-out hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--landing-accent)]" 
                href="#faq"
              >
                FAQ
              </a>
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-4">
              <Link 
                to="/auth/login" 
                className="text-[13px] font-medium text-[color:var(--ink)] hover:text-[color:var(--landing-accent)] transition-colors duration-300 relative group"
              >
                Log in
                <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-[color:var(--landing-accent)] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
              </Link>
              <Button 
                className="bg-[color:var(--landing-accent)] hover:bg-[#363043] text-white font-semibold rounded-lg px-5 shadow-[0_2px_10px_-2px_rgba(68,64,84,0.35)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_6px_16px_-2px_rgba(68,64,84,0.4)]" 
                size="sm" 
                asChild
              >
                <Link to="/auth/signup">Start free trial</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-[color:var(--ink)] hover:bg-[color:var(--accent-soft)] transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${
              mobileMenuOpen ? "max-h-[400px] pb-6" : "max-h-0"
            }`}
          >
            <nav className="flex flex-col gap-1 pt-2 border-t border-[color:var(--ink-08)]">
              <a 
                className="px-4 py-3 rounded-xl text-[14px] font-medium text-[color:var(--ink)] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--landing-accent)] transition-all duration-200" 
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                className="px-4 py-3 rounded-xl text-[14px] font-medium text-[color:var(--ink)] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--landing-accent)] transition-all duration-200" 
                href="#highlights"
                onClick={() => setMobileMenuOpen(false)}
              >
                Product
              </a>
              <a 
                className="px-4 py-3 rounded-xl text-[14px] font-medium text-[color:var(--ink)] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--landing-accent)] transition-all duration-200" 
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
              >
                Workflow
              </a>
              <a 
                className="px-4 py-3 rounded-xl text-[14px] font-medium text-[color:var(--ink)] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--landing-accent)] transition-all duration-200" 
                href="#roi"
                onClick={() => setMobileMenuOpen(false)}
              >
                Impact
              </a>
              <a 
                className="px-4 py-3 rounded-xl text-[14px] font-medium text-[color:var(--ink)] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--landing-accent)] transition-all duration-200" 
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </a>
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[color:var(--ink-08)]">
                <Link 
                  to="/auth/login" 
                  className="px-4 py-3 rounded-xl text-[14px] font-medium text-[color:var(--ink)] hover:bg-[color:var(--accent-soft)] transition-all duration-200 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Button 
                  className="bg-[color:var(--landing-accent)] hover:bg-[#363043] text-white font-semibold rounded-lg shadow-[0_2px_10px_-2px_rgba(68,64,84,0.35)]" 
                  asChild
                >
                  <Link to="/auth/signup" onClick={() => setMobileMenuOpen(false)}>Start free trial</Link>
                </Button>
              </div>
            </nav>
          </div>
        </header>
      </div>

      <main className="pt-20">
        <section className="relative overflow-hidden bg-[color:var(--base)]">
          
          {/* Curved decorative lines - using --ink-08, loosely connecting badges */}
          <svg className="absolute top-1/4 left-0 w-full h-64 pointer-events-none hidden lg:block" preserveAspectRatio="none">
            {/* Main flowing curve */}
            <path
              d="M 0 80 Q 200 50, 450 70 T 900 55 T 1400 75"
              stroke="rgba(47,36,58,0.08)"
              strokeWidth="1.5"
              fill="none"
            />
            {/* Secondary subtle curve */}
            <path
              d="M 50 130 Q 300 100, 550 115 T 1050 105 T 1300 120"
              stroke="rgba(47,36,58,0.06)"
              strokeWidth="1"
              fill="none"
            />
            {/* Third gentle curve - connecting badges area */}
            <path
              d="M 400 160 Q 600 140, 800 150 T 1100 145"
              stroke="rgba(68,64,84,0.10)"
              strokeWidth="1"
              fill="none"
              strokeDasharray="4 6"
            />
          </svg>

          <div
            className={`${theme.container} ${theme.sectionHero} relative grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12`}
          >
            <div className="space-y-5">
              {/* Badge - premium pill with subtle glow */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[color:var(--surface)] border border-[color:var(--ink-12)] shadow-[0_2px_8px_-2px_rgba(47,36,58,0.08),_0_1px_2px_-1px_rgba(47,36,58,0.06)] hover:shadow-[0_4px_12px_-4px_rgba(47,36,58,0.12)] transition-shadow duration-200">
                <div className="h-5 w-5 rounded-full bg-[color:var(--accent-soft)] flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-[color:var(--landing-accent)]" />
                </div>
                <span className="text-[11px] font-semibold tracking-wide text-[color:var(--ink)]">Built for modern wholesale teams</span>
              </div>

              <div>
                <h1 className="text-[2rem] sm:text-4xl md:text-[3.5rem] lg:text-6xl font-bold tracking-[-0.02em] leading-[1.1] text-balance text-[color:var(--ink)]">
                  A calmer wholesale workflow, built to{" "}
                  <span className="underline decoration-[color:var(--landing-accent)] decoration-[3px] underline-offset-[5px]">close deals faster</span>.
                </h1>
                <p className={`${theme.text.body} ${theme.colors.inkSoft} max-w-[340px] sm:max-w-[380px] mt-3`}>
                  Quotes, pricing, orders, and BG-compliant proformas — all in one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button 
                  className="bg-[color:var(--landing-accent)] hover:bg-[#363043] text-[color:var(--base)] font-semibold shadow-[0_4px_14px_-4px_rgba(68,64,84,0.4)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_-6px_rgba(68,64,84,0.5)]" 
                  size="lg" 
                  asChild
                >
                  <Link to="/auth/signup">Start free trial</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-[color:var(--ink)] border border-[color:var(--ink-12)] bg-transparent hover:bg-[color:var(--surface)] gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-4px_rgba(47,36,58,0.15)]"
                >
                  Watch demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Trust signals - refined pill style */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[color:var(--surface)] border border-[color:var(--ink-08)] shadow-[0_1px_3px_-1px_rgba(47,36,58,0.08)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--landing-accent)]" />
                  <span className="text-[11px] font-medium text-[color:var(--ink-55)]">No credit card</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[color:var(--surface)] border border-[color:var(--ink-08)] shadow-[0_1px_3px_-1px_rgba(47,36,58,0.08)]">
                  <FileCheck2 className="h-3.5 w-3.5 text-[color:var(--landing-accent)]" />
                  <span className="text-[11px] font-medium text-[color:var(--ink-55)]">BG & EU compliant</span>
                </div>
              </div>
            </div>

            <div className="relative lg:scale-[1.06] lg:origin-left">
              {/* Floating chip - above screenshot (success green accent) */}
              <div className="hidden md:flex justify-start mb-3 ml-4 lg:ml-10">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 shadow-[0_6px_16px_-6px_rgba(16,185,129,0.25)] px-2.5 py-1 flex items-center gap-1.5 rotate-[-3deg]">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span className="text-[9px] font-semibold text-emerald-700">Quote approved</span>
                </div>
              </div>

              {/* Main screenshot - stronger cardStrong shadow + inner glow */}
              <div
                className="rounded-3xl border-2 border-[color:var(--ink-12)] bg-[color:var(--surface)] overflow-hidden ring-1 ring-inset ring-[color:var(--ink-08)]"
                style={{
                  boxShadow: '0 36px 72px -28px rgba(47,36,58,0.45), 0 0 0 1px rgba(47,36,58,0.04), inset 0 1px 0 rgba(255,255,255,0.5)'
                }}
              >
                <ImageWithFallback
                  src={screenshots.dashboard}
                  alt="Platform dashboard"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
                
                {/* Live data chip - inside screenshot top right */}
                <div className="absolute top-3 right-3">
                  <div className="rounded-lg bg-[color:var(--surface)] border border-[color:var(--ink-08)] px-2 py-1 text-[8px] font-semibold text-[color:var(--ink-55)] shadow-[0_4px_14px_-4px_rgba(47,36,58,0.2)] flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--status-live)] animate-pulse" />
                    {statusBadge.label}
                  </div>
                </div>
              </div>

              {/* Floating chip - below screenshot (refined style) */}
              <div className="hidden md:flex justify-end mt-3 mr-4 lg:mr-10">
                <div className="rounded-xl bg-[color:var(--surface)] border border-[color:var(--ink-12)] shadow-[0_8px_20px_-8px_rgba(47,36,58,0.2)] px-3 py-1.5 flex items-center gap-2 rotate-[2deg]">
                  <div className="h-5 w-5 rounded-md bg-[color:var(--accent-soft)] flex items-center justify-center">
                    <Tag className="h-2.5 w-2.5 text-[color:var(--landing-accent)]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-semibold text-[color:var(--ink)]">Tier B pricing</span>
                    <span className="text-[8px] text-[color:var(--ink-55)]">12% discount applied</span>
                  </div>
                </div>
              </div>

              {/* Floating card - left side (larger, more rotation) */}
              <div className="absolute -left-2 lg:-left-5 top-20 hidden lg:block rotate-[-6deg]">
                <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--ink-12)] shadow-[0_20px_44px_-24px_rgba(47,36,58,0.4)] px-3 py-2 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-[color:var(--accent-soft)] flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-[color:var(--landing-accent)]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[color:var(--ink)]">Client added</p>
                    <p className="text-[8px] text-[color:var(--ink-55)]">Custom pricing set</p>
                  </div>
                </div>
              </div>

              {/* Floating card - right side (smaller, varied rotation) */}
              <div className="absolute -right-1 lg:-right-4 bottom-28 hidden lg:block rotate-[7deg]">
                <div className="rounded-xl bg-[color:var(--surface)] border border-[color:var(--ink-08)] shadow-[0_14px_32px_-18px_rgba(47,36,58,0.35)] px-2.5 py-1.5 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-md bg-[color:var(--accent-soft)] flex items-center justify-center">
                    <FileText className="h-3 w-3 text-[color:var(--landing-accent)]" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-[color:var(--ink)]">Proforma ready</p>
                    <p className="text-[7px] text-[color:var(--ink-55)]">BG-compliant</p>
                  </div>
                </div>
              </div>

              {/* Extra badge - orders metric with trend */}
              <div className="absolute top-4 left-1/4 hidden xl:block rotate-[4deg]">
                <div className="rounded-xl bg-[color:var(--landing-accent)] px-3 py-1.5 shadow-[0_6px_16px_-4px_rgba(68,64,84,0.4)] flex items-center gap-2">
                  <div className="h-5 w-5 rounded-md bg-white/20 flex items-center justify-center">
                    <ArrowRight className="h-3 w-3 text-white rotate-[-45deg]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white leading-none">+24</span>
                    <span className="text-[7px] font-medium text-white/70">orders today</span>
                  </div>
                </div>
              </div>

              {/* Extra "Syncing" badge - white style like Live data */}
              <div className="absolute bottom-8 left-8 hidden xl:block rotate-[-2deg]">
                <div className="rounded-lg bg-[color:var(--surface)] border border-[color:var(--ink-08)] px-2.5 py-1 shadow-[0_4px_12px_-4px_rgba(47,36,58,0.15)] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--status-live)] animate-pulse" />
                  <span className="text-[8px] font-semibold text-[color:var(--ink-55)]">Syncing</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`border-y ${theme.colors.border} bg-[color:var(--surface)] overflow-hidden`}>
          <div className="py-12 md:py-16">
            {/* Header */}
            <div className={`${theme.container} text-center mb-10`}>
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-[color:var(--ink)] mb-3 relative inline-block">
                Trusted by industry leaders
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[color:var(--landing-accent)] opacity-30 rounded-full" />
              </h3>
              <p className="text-[14px] text-[color:var(--ink-70)] max-w-md mx-auto mt-3">
                Powering wholesale operations for companies across Europe
              </p>
            </div>
            
            {/* Marquee container with fade edges */}
            <div className="relative">
              {/* Left fade */}
              <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-[color:var(--surface)] via-[color:var(--surface)]/80 to-transparent z-10 pointer-events-none" />
              {/* Right fade */}
              <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-[color:var(--surface)] via-[color:var(--surface)]/80 to-transparent z-10 pointer-events-none" />
              
              {/* Marquee track - 6 duplications for seamless infinite scroll */}
              <div className="marquee-container overflow-hidden">
                <div className="marquee-track flex items-center gap-16 md:gap-20 lg:gap-24 py-4 hover:[animation-play-state:paused]">
                  {/* Repeat logos 6 times for truly seamless scroll */}
                  {[...Array(6)].map((_, setIndex) => (
                    logos.map((logo) => (
                      <div
                        key={`set${setIndex}-${logo.name}`}
                        className="flex-shrink-0 group px-2"
                      >
                        <div className="h-10 md:h-12 flex items-center justify-center opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 ease-out">
                          <img 
                            src={logo.image} 
                            alt={logo.name}
                            className="h-full w-auto max-w-[100px] md:max-w-[120px] object-contain"
                          />
                        </div>
                      </div>
                    ))
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Marquee animation styles */}
          <style>{`
            .marquee-track {
              animation: marquee 45s linear infinite;
              width: fit-content;
            }
            
            @keyframes marquee {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-16.666%);
              }
            }
            
            /* Slower on mobile */
            @media (max-width: 768px) {
              .marquee-track {
                animation-duration: 35s;
              }
            }
            
            @media (prefers-reduced-motion: reduce) {
              .marquee-track {
                animation: none;
              }
            }
          `}</style>
        </section>

        <section id="features" className={`${theme.section}`}>
          <div className={`${theme.container} space-y-10`}>
            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <div className="space-y-4">
                <Badge className={`${theme.radius.pill} ${theme.colors.accentSoft} ${theme.text.caption}`}>
                  Platform overview
                </Badge>
                <h2 className={theme.text.h2}>
                  Built for wholesalers, not retail stores
                </h2>
                <p className={`${theme.text.body} ${theme.colors.inkSoft}`}>
                  Replace spreadsheets and retail plugins with a single
                  wholesale-native workspace.
                </p>
              </div>
              <div
                className={`${theme.radius.lg} ${theme.colors.surfaceSoft} border ${theme.colors.border} p-6`}
              >
                <p className={`${theme.text.caption} ${theme.colors.inkMuted}`}>
                  Wholesale workspace signals
                </p>
                <div className="mt-4 space-y-3">
                  <div className={`${theme.radius.pill} h-3 w-3/4 bg-[color:var(--ink-12)]`} />
                  <div className={`${theme.radius.pill} h-3 w-full bg-[color:var(--ink-12)]`} />
                  <div className={`${theme.radius.pill} h-3 w-5/6 bg-[color:var(--ink-12)]`} />
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={feature.title}
                    className={`${theme.radius.md} ${theme.shadow.card} ${theme.colors.surface} border ${theme.colors.border} p-6 ${theme.shadow.cardHover}`}
                  >
                    <div
                      className={`${theme.radius.sm} mb-4 inline-flex h-12 w-12 items-center justify-center ${theme.colors.accentSoft}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className={theme.text.h3}>{feature.title}</h3>
                    <p className={`mt-2 ${theme.text.bodySm} ${theme.colors.inkSoft}`}>
                      {feature.description}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="highlights" className={`${theme.section} ${theme.colors.surfaceSoft} border-y ${theme.colors.border}`}>
          <div className={`${theme.container} space-y-16`}>
            {[
              {
                title: "Orders",
                description:
                  "Track approvals, delivery dates, and order status without email threads.",
                image: screenshots.orders,
              },
              {
                title: "Clients & pricing",
                description:
                  "Keep negotiated tiers and client terms in one place, visible to your team.",
                image: screenshots.clients,
              },
              {
                title: "Complaints",
                description:
                  "Log issues with suppliers or buyers and keep a clear resolution timeline.",
                image: screenshots.complaints,
              },
              {
                title: "CSV import",
                description:
                  "Normalize supplier files and refresh your catalog with clean mappings.",
                image: screenshots.csv,
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className={`grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center ${
                  index % 2 === 1 ? "lg:grid-cols-[1.05fr_0.95fr]" : ""
                }`}
              >
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <Badge
                    className={`${theme.radius.pill} ${theme.colors.accentSoft} ${theme.text.caption}`}
                  >
                    {item.title}
                  </Badge>
                  <h3 className={`mt-4 ${theme.text.h2}`}>{item.title}</h3>
                  <p className={`${theme.text.body} ${theme.colors.inkSoft} mt-4`}>
                    {item.description}
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <PackageCheck className="h-5 w-5" />
                    <p className={`${theme.text.bodySm} ${theme.colors.inkMuted}`}>
                      Built for wholesale operations, not retail workflows.
                    </p>
                  </div>
                </div>
                <Card
                  className={`${theme.radius.lg} ${theme.shadow.card} ${theme.colors.surface} border ${theme.colors.border} p-3`}
                >
                  <div
                    className={`${theme.radius.lg} ${theme.colors.surfaceSoft} border ${theme.colors.border} overflow-hidden`}
                  >
                    <div className="relative aspect-[16/10]">
                      <ImageWithFallback
                        src={item.image}
                        alt={`${item.title} screenshot`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </section>

        <section className={`${theme.section}`}>
          <div className={`${theme.container} space-y-10`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <Badge className={`${theme.radius.pill} ${theme.colors.accentSoft} ${theme.text.caption}`}>
                  Buyers & suppliers
                </Badge>
                <h2 className={theme.text.h2}>
                  Clear experiences for both sides of the relationship
                </h2>
              </div>
              <p className={`${theme.text.body} ${theme.colors.inkSoft} max-w-md`}>
                Give buyers a polished portal while suppliers and sales teams stay
                in control of pricing and inventory.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card
                className={`${theme.radius.lg} ${theme.shadow.card} ${theme.colors.surface} border ${theme.colors.border} p-8`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`${theme.radius.sm} flex h-12 w-12 items-center justify-center ${theme.colors.accentSoft}`}
                  >
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <p className={theme.text.h3}>For buyers</p>
                    <p className={`${theme.text.bodySm} ${theme.colors.inkMuted}`}>
                      Faster approvals, fewer surprises.
                    </p>
                  </div>
                </div>
                <ul className="mt-6 space-y-3">
                  {[
                    "Browse accurate availability and lead times",
                    "Request quotes with project notes and delivery details",
                    "Track approvals and order status in one place",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        className={`${theme.radius.pill} mt-2 h-2 w-2 bg-[color:var(--landing-accent)]`}
                      />
                      <span className={`${theme.text.bodySm} ${theme.colors.inkSoft}`}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className={`${theme.colors.ink} border border-[color:var(--ink-12)] mt-6 bg-transparent hover:bg-[color:var(--surface)]`}
                >
                  View buyer portal
                </Button>
              </Card>

              <Card
                className={`${theme.radius.lg} ${theme.shadow.card} ${theme.colors.surface} border ${theme.colors.border} p-8`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`${theme.radius.sm} flex h-12 w-12 items-center justify-center ${theme.colors.accentSoft}`}
                  >
                    <Truck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className={theme.text.h3}>For suppliers</p>
                    <p className={`${theme.text.bodySm} ${theme.colors.inkMuted}`}>
                      Clean coordination across accounts.
                    </p>
                  </div>
                </div>
                <ul className="mt-6 space-y-3">
                  {[
                    "Ingest multiple supplier files without manual cleanup",
                    "Sync pricing across warehouses and showrooms",
                    "Share proformas with compliance-ready fields",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        className={`${theme.radius.pill} mt-2 h-2 w-2 bg-[color:var(--landing-accent)]`}
                      />
                      <span className={`${theme.text.bodySm} ${theme.colors.inkSoft}`}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className={`${theme.colors.ink} border border-[color:var(--ink-12)] mt-6 bg-transparent hover:bg-[color:var(--surface)]`}
                >
                  Explore supplier tools
                </Button>
              </Card>
            </div>
          </div>
        </section>

        <section id="workflow" className={`${theme.section} ${theme.colors.surfaceSoft} border-y ${theme.colors.border}`}>
          <div className={`${theme.container} space-y-10`}>
            <div className="text-center space-y-4">
              <Badge className={`${theme.radius.pill} ${theme.colors.accentSoft} ${theme.text.caption}`}>
                Workflow
              </Badge>
              <h2 className={theme.text.h2}>A predictable wholesale flow</h2>
              <p className={`${theme.text.body} ${theme.colors.inkSoft}`}>
                Every step from import to proforma is tracked and visible.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {workflowSteps.map((step, index) => (
                <Card
                  key={step.title}
                  className={`${theme.radius.md} ${theme.shadow.card} ${theme.colors.surface} border ${theme.colors.border} p-6`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`${theme.radius.pill} ${theme.colors.accentSoft} px-3 py-1 ${theme.text.caption}`}
                    >
                      Step {index + 1}
                    </span>
                    <ArrowRight className={`h-4 w-4 ${theme.colors.inkMuted}`} />
                  </div>
                  <h3 className={`mt-4 ${theme.text.h3}`}>{step.title}</h3>
                  <p className={`${theme.text.bodySm} ${theme.colors.inkMuted} mt-2`}>
                    {step.detail}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="roi" className={`${theme.section}`}>
          <div className={`${theme.container} space-y-10`}>
            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <div className="space-y-4">
                <Badge className={`${theme.radius.pill} ${theme.colors.accentSoft} ${theme.text.caption}`}>
                  ROI
                </Badge>
                <h2 className={theme.text.h2}>Operational impact you can measure</h2>
                <p className={`${theme.text.body} ${theme.colors.inkSoft}`}>
                  Move faster with clearer data and fewer manual handoffs.
                </p>
              </div>
              <div className={`${theme.radius.lg} ${theme.colors.surface} border ${theme.colors.border} p-6`}>
                <div className="flex items-center gap-3">
                  <span
                    className={`${theme.radius.sm} flex h-12 w-12 items-center justify-center ${theme.colors.accentSoft}`}
                  >
                    <LineChart className="h-5 w-5" />
                  </span>
                  <div>
                    <p className={theme.text.label}>Forecast accuracy</p>
                    <p className={`${theme.text.bodySm} ${theme.colors.inkMuted}`}>
                      Pipeline health across top accounts.
                    </p>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {["Wholesale", "Hospitality", "Design studios"].map((row) => (
                    <div key={row} className="flex items-center justify-between">
                      <span className={`${theme.text.bodySm} ${theme.colors.inkSoft}`}>
                        {row}
                      </span>
                      <span
                        className={`${theme.radius.pill} h-2 w-24 bg-[color:var(--ink-12)]`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {metrics.map((metric) => (
                <Card
                  key={metric.label}
                  className={`${theme.radius.lg} ${theme.shadow.card} ${theme.colors.surface} border ${theme.colors.border} p-6`}
                >
                  <p className="text-3xl font-semibold">{metric.value}</p>
                  <p className={`${theme.text.bodySm} ${theme.colors.inkSoft} mt-2`}>
                    {metric.label}
                  </p>
                  <p className={`${theme.text.bodySm} ${theme.colors.inkMuted} mt-2`}>
                    {metric.detail}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className={`${theme.section} ${theme.colors.surfaceSoft} border-y ${theme.colors.border}`}>
          <div className={`${theme.container} space-y-10`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <Badge className={`${theme.radius.pill} ${theme.colors.accentSoft} ${theme.text.caption}`}>
                  Testimonials
                </Badge>
                <h2 className={theme.text.h2}>Trusted by wholesale teams</h2>
              </div>
              <Button
                variant="outline"
                className={`${theme.colors.ink} border border-[color:var(--ink-12)] bg-transparent hover:bg-[color:var(--surface)]`}
              >
                Read customer stories
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <Card
                  key={testimonial.name}
                  className={`${theme.radius.lg} ${theme.shadow.card} ${theme.colors.surface} border ${theme.colors.border} p-6`}
                >
                  <p className={`${theme.text.bodySm} ${theme.colors.inkSoft}`}>
                    {testimonial.quote}
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <div
                      className={`${theme.radius.pill} h-10 w-10 border ${theme.colors.border}`}
                    />
                    <div>
                      <p className={theme.text.label}>{testimonial.name}</p>
                      <p className={`${theme.text.caption} ${theme.colors.inkMuted}`}>
                        {testimonial.company}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className={`${theme.section}`}>
          <div className={`${theme.container} grid gap-10 lg:grid-cols-[0.9fr_1.1fr]`}>
            <div className="space-y-4">
              <Badge className={`${theme.radius.pill} ${theme.colors.accentSoft} ${theme.text.caption}`}>
                FAQ
              </Badge>
              <h2 className={theme.text.h2}>Questions, answered</h2>
              <p className={`${theme.text.body} ${theme.colors.inkSoft}`}>
                Everything you need to know before modernizing your wholesale
                workflow.
              </p>
              <Card
                className={`${theme.radius.md} ${theme.colors.surface} border ${theme.colors.border} p-6`}
              >
                <p className={theme.text.label}>Want a guided walkthrough?</p>
                <p className={`${theme.text.bodySm} ${theme.colors.inkMuted} mt-2`}>
                  Book a 20-minute demo with a product specialist.
                </p>
                <Button className={`${theme.colors.accent} mt-4`}>Book a demo</Button>
              </Card>
            </div>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.question}
                  value={faq.question}
                  className={`${theme.radius.md} ${theme.colors.surface} border ${theme.colors.border} px-4`}
                >
                  <AccordionTrigger
                    className={`text-left ${theme.text.bodySm} ${theme.colors.ink}`}
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className={`${theme.text.bodySm} ${theme.colors.inkMuted}`}>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className={`${theme.section} ${theme.colors.surfaceSoft} border-t ${theme.colors.border}`}>
          <div className={theme.container}>
            <Card
              className={`${theme.radius.lg} ${theme.shadow.card} ${theme.colors.surface} border ${theme.colors.border} p-10`}
            >
              <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                <div className="space-y-4">
                  <Badge className={`${theme.radius.pill} ${theme.colors.accentSoft} ${theme.text.caption}`}>
                    Ready to launch
                  </Badge>
                  <h2 className={theme.text.h2}>
                    Replace manual workflows with a single wholesale platform.
                  </h2>
                  <p className={`${theme.text.body} ${theme.colors.inkSoft}`}>
                    Start your free trial, import your catalog, and invite buyers
                    to a branded portal today.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className={theme.colors.accent} size="lg" asChild>
                    <Link to="/auth/signup">Start free trial</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className={`${theme.colors.ink} border border-[color:var(--ink-12)] bg-transparent hover:bg-[color:var(--surface)]`}
                    size="lg"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Download overview
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <footer className={`border-t ${theme.colors.border} ${theme.colors.surfaceSoft}`}>
        <div className={`${theme.container} grid gap-8 py-12 md:grid-cols-4`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`${theme.radius.sm} ${theme.colors.surface} flex h-9 w-9 items-center justify-center border border-[color:var(--ink-12)]`}
              >
                <Sparkles className="h-5 w-5" />
              </span>
              <span className={theme.text.label}>FurniTrade</span>
            </div>
            <p className={`${theme.text.bodySm} ${theme.colors.inkMuted}`}>
              The B2B platform built for distributors, importers, and
              wholesale buyers.
            </p>
          </div>
          <div>
            <p className={theme.text.label}>Product</p>
            <ul className={`mt-3 space-y-2 ${theme.text.bodySm} ${theme.colors.inkMuted}`}>
              <li>
                <a href="#features" className="hover:text-[color:var(--ink)]">
                  Features
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-[color:var(--ink)]">
                  Workflow
                </a>
              </li>
              <li>
                <a href="#roi" className="hover:text-[color:var(--ink)]">
                  Impact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className={theme.text.label}>Company</p>
            <ul className={`mt-3 space-y-2 ${theme.text.bodySm} ${theme.colors.inkMuted}`}>
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <p className={theme.text.label}>Resources</p>
            <ul className={`mt-3 space-y-2 ${theme.text.bodySm} ${theme.colors.inkMuted}`}>
              <li>Compliance</li>
              <li>Security</li>
              <li>Support</li>
            </ul>
          </div>
        </div>
        <div className={`border-t ${theme.colors.border} py-6 text-center ${theme.text.caption} ${theme.colors.inkMuted}`}>
          (c) 2026 FurniTrade. Made in Sofia, Bulgaria.
        </div>
      </footer>
    </div>
  );
}
