"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function useIssueDate() {
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    );
  }, []);
  return date;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      <Masthead />
      <main className="mx-auto max-w-[1180px] px-8 pb-32">{children}</main>
      <Colophon />
    </div>
  );
}

function Masthead() {
  const issueDate = useIssueDate();
  return (
    <header className="mx-auto max-w-[1180px] px-8 pt-8 reveal reveal-1 print:hidden">
      <div className="flex items-baseline justify-between border-b border-ink/15 pb-3 mb-6">
        <span className="label" suppressHydrationWarning>{issueDate}</span>
        <span className="label">Local artwork pipeline</span>
      </div>

      <div className="flex items-end justify-between gap-8 pb-6">
        <Link href="/" className="block group" suppressHydrationWarning>
          <h1 className="display text-[64px] sm:text-[88px] leading-[0.85] tracking-ultra-tight">
            Print
            <span className="display-italic block -mt-2 text-terra">Ready</span>
          </h1>
        </Link>
        <div className="hidden md:flex flex-col items-end gap-2 pb-2">
          <span className="label">Concept → print-ready listing</span>
          <span className="marginalia text-right max-w-[280px]">
            One concept in, upscaled titled print folders and listing SEO out.
          </span>
        </div>
      </div>

      <div className="border-t-2 border-b border-ink/80 py-1 mb-10">
        <div className="border-t border-ink/80" />
      </div>
    </header>
  );
}

function Colophon() {
  return (
    <footer className="border-t border-ink/15 mt-24 print:hidden">
      <div className="mx-auto max-w-[1180px] px-8 py-10">
        <div className="ornament mb-6">
          <span className="display-italic text-xl">·  ·  ·</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-[15px]">
          <div>
            <div className="label mb-2">Colophon</div>
            <p className="text-ink-mid leading-relaxed">
              Set in <em className="display-italic">Fraunces</em> and{" "}
              <em>Newsreader</em>. A standalone companion to The Etsy SEO Generator.
            </p>
          </div>
          <div>
            <div className="label mb-2">Print sizes</div>
            <p className="text-ink-mid leading-relaxed">
              Portrait: 4×6, 5×7, 8×10, 11×14 · Landscape: 12×9, 20×16, 24×18, 36×24, A2 — all at 300 DPI.
            </p>
          </div>
          <div>
            <div className="label mb-2">Pipeline</div>
            <p className="text-ink-mid leading-relaxed">
              Draft → generate → review → title + SEO → upscale + crop → run index. Fully local.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
