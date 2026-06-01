"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import HomeCard from "./HomeCard";

/**
 * StartHereCinematic — single cinematic moment that demonstrates Grepit's
 * defining feature: an auto-generated onboarding traversal.
 *
 * Decisions:
 *   - No eyebrow rule + dot.
 *   - Quiet rail. The active step's color tints only the rail and the role
 *     badge; the rest stays neutral (no chromatic noise).
 *   - macOS traffic-light dots in the snippet header.
 */

const STEPS = [
  {
    n: "01",
    file: "src/app/layout.tsx",
    why: "root layout, providers, fonts",
    snippet: `export default function RootLayout({\n  children,\n}: { children: React.ReactNode }) {\n  return (\n    <ClerkProvider>\n      <html lang="en">\n        <body className={inter.className}>\n          <Providers>{children}</Providers>\n        </body>\n      </html>\n    </ClerkProvider>\n  );\n}`,
    role: "boot surface",
  },
  {
    n: "02",
    file: "src/middleware.ts",
    why: "Clerk auth gate + route protection",
    snippet: `import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";\n\nconst isProtected = createRouteMatcher([\n  "/dashboard(.*)",\n  "/api/protected(.*)",\n]);\n\nexport default clerkMiddleware((auth, req) => {\n  if (isProtected(req)) auth().protect();\n});`,
    role: "auth gate",
  },
  {
    n: "03",
    file: "src/server/db/schema.ts",
    why: "Drizzle schema: users, subscriptions",
    snippet: `export const subscriptions = pgTable("subscriptions", {\n  id: uuid("id").defaultRandom().primaryKey(),\n  userId: text("user_id").notNull().unique(),\n  plan: planEnum("plan").default("free"),\n  status: statusEnum("status").default("active"),\n  stripeCustomerId: text("stripe_customer_id"),\n  createdAt: timestamp("created_at").defaultNow(),\n});`,
    role: "data layer",
  },
  {
    n: "04",
    file: "src/server/api/router.ts",
    why: "tRPC routers grouped by domain",
    snippet: `export const appRouter = createTRPCRouter({\n  user: userRouter,\n  billing: billingRouter,\n  org: orgRouter,\n  workspace: workspaceRouter,\n});\n\nexport type AppRouter = typeof appRouter;`,
    role: "api surface",
  },
  {
    n: "05",
    file: "src/app/(dashboard)/page.tsx",
    why: "first authenticated surface",
    snippet: `export default async function DashboardPage() {\n  const { userId } = auth();\n  if (!userId) redirect("/sign-in");\n\n  const [user, subscription] = await Promise.all([\n    api.user.me(),\n    api.billing.subscription(),\n  ]);\n\n  return <Shell user={user} subscription={subscription} />;\n}`,
    role: "first authenticated view",
  },
  {
    n: "06",
    file: "src/server/actions/stripe.ts",
    why: "webhook consumer + subscription writes",
    snippet: `export async function handleStripeWebhook(event: Stripe.Event) {\n  switch (event.type) {\n    case "checkout.session.completed":\n      return upsertSubscription(event.data.object);\n    case "customer.subscription.updated":\n      return syncSubscriptionState(event.data.object);\n  }\n}`,
    role: "billing surface",
  },
];

const AUTO_CYCLE_MS = 3400;

export default function StartHereCinematic() {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "-15%" });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!inView || paused) return;
    const t = setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length);
    }, AUTO_CYCLE_MS);
    return () => clearInterval(t);
  }, [inView, paused]);

  const headerInView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section
      ref={ref}
      className="relative z-[1] py-28 md:py-36 landing-section-x"
    >
      <div className="relative max-w-[1240px] mx-auto">
        {/* Heading — no eyebrow, no dot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <h2
              className="font-semibold tracking-[-0.024em] leading-[1.04]"
              style={{ fontSize: "clamp(34px, 4vw, 52px)", color: "var(--c-text)" }}
            >
              An onboarding path{" "}
              <span className="text-c-lime-pastel">through the system.</span>
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 lg:pt-6"
          >
            <p
              className="text-[16px] leading-[1.6] max-w-[480px]"
              style={{ color: "var(--c-text-2)" }}
            >
              Grepit auto-generates a reading order through the repo: boot surface, auth gate,
              data layer, API, and billing. Each step opens the file with context on why it matters.
            </p>
          </motion.div>
        </div>

        {/* Cinematic surface */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <HomeCard
            className="rounded-c-lg border"
            style={{
              borderColor: "var(--c-line)",
              boxShadow: "var(--shadow-2)",
            }}
          >
            <div
              className="grid grid-cols-1 lg:grid-cols-12 gap-px"
              style={{ backgroundColor: "var(--c-line)" }}
            >
              {/* LEFT — timeline rail */}
              <div
                className="lg:col-span-5 p-7 md:p-8"
                style={{ backgroundColor: "var(--c-surface)" }}
              >
                <div className="flex items-baseline justify-between mb-5">
                  <p
                    className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
                    style={{ color: "var(--c-text-3)" }}
                  >
                    onboarding traversal
                  </p>
                  <p
                    className="font-mono text-[10.5px] tabular-nums"
                    style={{ color: "var(--c-text-3)" }}
                  >
                    {String(active + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                  </p>
                </div>

                <ul className="relative">
                  <span
                    className="absolute top-3 bottom-3 left-[7px] w-px"
                    style={{ backgroundColor: "var(--c-line-2)" }}
                  />
                  <span
                    className="absolute top-3 left-[7px] w-px"
                    style={{
                      height: `${(active / (STEPS.length - 1)) * 100}%`,
                      backgroundColor: "var(--c-accent)",
                      transition: "height 520ms cubic-bezier(0.23,1,0.32,1)",
                    }}
                  />

                  {STEPS.map((s, i) => {
                    const isActive = active === i;
                    const isPast = i < active;
                    return (
                      <li key={s.n} className="relative pl-7 py-2">
                        <button
                          onMouseEnter={() => setActive(i)}
                          onFocus={() => setActive(i)}
                          onClick={() => setActive(i)}
                          className="text-left w-full block"
                        >
                          <span
                            className="absolute left-0 top-3 w-[15px] h-[15px] rounded-full border flex items-center justify-center"
                            style={{
                              backgroundColor: isActive ? "var(--c-accent)" : "var(--c-surface)",
                              borderColor: isActive
                                ? "var(--c-accent)"
                                : isPast
                                ? "var(--c-accent-line)"
                                : "var(--c-line-2)",
                              transform: isActive ? "scale(1.1)" : "scale(1)",
                              transition:
                                "background-color 200ms var(--ease-out-strong), border-color 200ms var(--ease-out-strong), transform 200ms var(--ease-out-strong)",
                            }}
                          >
                            {isActive && (
                              <span
                                className="w-1 h-1 rounded-full"
                                style={{ backgroundColor: "var(--c-bg)" }}
                              />
                            )}
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span
                              className="font-mono text-[10.5px] tabular-nums"
                              style={{
                                color: isActive
                                  ? "var(--c-accent)"
                                  : isPast
                                  ? "var(--c-text-2)"
                                  : "var(--c-text-3)",
                                transition: "color 200ms var(--ease-out-strong)",
                              }}
                            >
                              {s.n}
                            </span>
                            <span
                              className="font-mono text-[12.5px] truncate"
                              style={{
                                color: isActive ? "var(--c-text)" : "var(--c-text-2)",
                                transition: "color 200ms var(--ease-out-strong)",
                              }}
                            >
                              {s.file}
                            </span>
                          </div>
                          <p
                            className="text-[11.5px] mt-0.5"
                            style={{
                              color: isActive ? "var(--c-text-2)" : "var(--c-text-3)",
                              transition: "color 200ms var(--ease-out-strong)",
                            }}
                          >
                            {s.why}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* RIGHT — preview pane */}
              <div
                className="lg:col-span-7 p-7 md:p-8 relative min-h-[420px]"
                style={{ backgroundColor: "var(--c-bg)" }}
              >
                <div
                  className="flex items-center justify-between gap-3 pb-4 mb-4 border-b"
                  style={{ borderColor: "var(--c-line)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--c-coral)", opacity: 0.6 }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--c-accent)", opacity: 0.6 }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--c-success)", opacity: 0.6 }} />
                    </span>
                    <span
                      className="font-mono text-[11.5px] truncate"
                      style={{ color: "var(--c-text-2)" }}
                    >
                      {STEPS[active].file}
                    </span>
                  </div>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.14em] flex-shrink-0"
                    style={{
                      color: "var(--c-accent)",
                      transition: "color 320ms var(--ease-out-strong)",
                    }}
                  >
                    {STEPS[active].role}
                  </span>
                </div>

                <motion.pre
                  key={active}
                  initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                  className="font-mono text-[12px] leading-[1.65] overflow-x-auto whitespace-pre"
                  style={{ color: "var(--c-text-2)" }}
                >
                  <code>{STEPS[active].snippet}</code>
                </motion.pre>

                <div
                  className="absolute bottom-7 left-7 right-7 md:bottom-8 md:left-8 md:right-8 pt-4 border-t flex items-center justify-between font-mono text-[10.5px]"
                  style={{ borderColor: "var(--c-line)", color: "var(--c-text-3)" }}
                >
                  <span>preview · static excerpt</span>
                  <span>auto-cycle {paused ? "paused" : "on"}</span>
                </div>
              </div>
            </div>
          </HomeCard>
        </motion.div>

        <p
          className="mt-7 font-mono text-[11px] text-center"
          style={{ color: "var(--c-text-3)" }}
        >
          example onboarding · live data shown when you analyze a repository
        </p>
      </div>
    </section>
  );
}
