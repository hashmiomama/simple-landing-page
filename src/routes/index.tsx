import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Mountain, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/app-config";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({ meta: pageMeta(APP_NAME, APP_DESCRIPTION) }),
  component: Index,
});

const pillars = [
  {
    icon: Compass,
    title: "Find real opportunities",
    text: "Internships, scholarships, hackathons and more — checked before they reach you.",
    tone: "bg-lavender",
  },
  {
    icon: Mountain,
    title: "Explore on your own",
    text: "Solo experiences for when you'd rather go at your own pace.",
    tone: "bg-accent",
  },
  {
    icon: UsersRound,
    title: "Plan things together",
    text: "Small, shared-interest activities without the pressure of a social feed.",
    tone: "bg-lavender-soft",
  },
];

function Index() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-wash" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-5 pb-20 pt-16 text-center sm:px-8 sm:pb-28 sm:pt-24">
          <p className="animate-rise mx-auto mb-6 inline-block rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            For young adults in Pakistan
          </p>
          <h1 className="animate-rise text-4xl font-extrabold leading-[1.08] [animation-delay:80ms] sm:text-6xl">
            {APP_TAGLINE}
          </h1>
          <p className="animate-rise mx-auto mt-6 max-w-xl text-lg text-muted-foreground [animation-delay:160ms]">
            {APP_DESCRIPTION}
          </p>
          <div className="animate-rise mt-10 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/register">
                Create your account <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link to="/opportunities">Browse opportunities</Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="pillars-heading" className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <h2 id="pillars-heading" className="sr-only">
          What you can do
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, text, tone }) => (
            <div key={title} className="rounded-3xl border bg-card p-7 shadow-soft">
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <span>
            © {new Date().getFullYear()} {APP_NAME}
          </span>
          <span>Socialise on your terms.</span>
        </div>
      </footer>
    </>
  );
}
