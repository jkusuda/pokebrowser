import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the /terms and /privacy pages. Renders a dark hero band with
 * an embossed title (text-emboss reads as white, so it only works on dark), a
 * "Back to home" link, and a chunky white content card. Section headings inside
 * the card use dark text since embossed white would be invisible on white.
 */
export function LegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <main className="w-full min-h-screen bg-pb-bg font-sans flex flex-col items-center px-4 py-10 md:py-16">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Hero band */}
        <div className="bg-pb-forest border-4 border-black rounded-[10px] shadow-[6px_6px_0_black] px-6 py-7 flex flex-col gap-3 items-center text-center">
          <Link href="/" className="self-start">
            <Button variant="game" tone="neutral" size="sm" className="text-[11px]">
              ← Back to home
            </Button>
          </Link>
          <h1 className="text-emboss-lg text-3xl md:text-5xl">{title}</h1>
          <p className="text-pb-grass font-bold text-xs md:text-sm uppercase tracking-widest">
            Effective {effectiveDate}
          </p>
        </div>

        {/* Content */}
        <Card variant="game" tone="white" shadow="lg" size="lg" className="gap-7">
          {children}
        </Card>

        {/* Cross-link + contact footer */}
        <div className="flex flex-wrap gap-3 justify-center pb-4">
          <Link href="/terms">
            <Button variant="game" tone="mint" size="sm" className="text-[11px]">
              Terms of Service
            </Button>
          </Link>
          <Link href="/privacy">
            <Button variant="game" tone="mint" size="sm" className="text-[11px]">
              Privacy Policy
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

/** A titled section block. */
export function LegalSection({
  heading,
  children,
  className,
}: {
  heading: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <h2 className="text-lg md:text-2xl font-black uppercase tracking-wide text-pb-forest">
        {heading}
      </h2>
      <div className="flex flex-col gap-3 text-sm md:text-base font-semibold text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/** Intro/summary paragraph shown above the first section. */
export function LegalIntro({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm md:text-base font-semibold text-gray-700 leading-relaxed border-l-4 border-pb-grass-deep pl-4">
      {children}
    </p>
  );
}

/** Bulleted list. */
export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 flex flex-col gap-1.5">{children}</ul>;
}

/** Small print / legal disclaimer block. */
export function LegalFinePrint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-gray-500 leading-relaxed bg-gray-50 border-2 border-gray-200 rounded-[6px] p-3">
      {children}
    </p>
  );
}

/** Inline contact email link, styled consistently. */
export function ContactEmail({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className="text-pb-pine underline font-bold break-all">
      {email}
    </a>
  );
}
