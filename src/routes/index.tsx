import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tidewell — Calmer weeks for small teams" },
      {
        name: "description",
        content: "Tidewell helps small teams plan calmer, clearer weeks in one simple place.",
      },
      { property: "og:title", content: "Tidewell — Calmer weeks for small teams" },
      {
        property: "og:description",
        content: "Tidewell helps small teams plan calmer, clearer weeks in one simple place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: CalendarCheck,
    title: "Plan the week",
    text: "Lay out priorities on Monday and see them through by Friday.",
  },
  {
    icon: Users,
    title: "Share the load",
    text: "Everyone sees who owns what, without the endless check-ins.",
  },
  {
    icon: Sparkles,
    title: "Keep it light",
    text: "No setup, no clutter. Just the essentials, beautifully simple.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="font-display text-2xl font-semibold">
          Tidewell<span className="text-primary">.</span>
        </a>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hidden transition-colors hover:text-foreground sm:inline">
            Features
          </a>
          <Button size="sm" className="rounded-full px-4">
            Get started
          </Button>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-glow" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-20 text-center sm:pt-28">
            <p className="animate-rise mb-6 inline-block rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
              Now open for early access
            </p>
            <h1 className="animate-rise text-5xl font-semibold leading-[1.05] [animation-delay:80ms] sm:text-7xl">
              Calmer weeks for <em className="text-primary">small teams</em>
            </h1>
            <p className="animate-rise mx-auto mt-6 max-w-xl text-lg text-muted-foreground [animation-delay:160ms]">
              Tidewell brings your plans, people and priorities into one quiet place — so the
              work gets done without the noise.
            </p>
            <div className="animate-rise mt-10 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
              <Button size="xl" className="shadow-soft">
                Start for free <ArrowRight />
              </Button>
              <Button size="xl" variant="ghost" asChild>
                <a href="#features">See how it works</a>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-28">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border bg-card p-8 shadow-soft">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="rounded-3xl bg-foreground px-8 py-16 text-center text-background">
            <h2 className="text-4xl font-semibold sm:text-5xl">Ready for a quieter Monday?</h2>
            <p className="mx-auto mt-4 max-w-md opacity-70">
              Join the early access list and be first to try Tidewell.
            </p>
            <Button size="xl" className="mt-8">
              Join early access
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 border-t px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} Tidewell</span>
        <span>Made with care.</span>
      </footer>
    </div>
  );
}
