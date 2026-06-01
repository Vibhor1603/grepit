"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { ViboLogo } from "../ViboLogo";
import ThemeToggle from "../ThemeToggle";

const NAV_LINKS = [
  ["Overview", "#overview"],
  ["Product", "#pipeline"],
  ["Pricing", "#pricing"],
  ["FAQ", "/faq"],
];

export default function LandingNav() {
  const router = useRouter();
  const { user, isSignedIn, isLoaded } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-[100] flex items-center landing-nav-x safe-top"
        style={{
          height: "var(--landing-nav-h, 56px)",
          backgroundColor: scrolled || menuOpen ? "var(--c-vibrancy)" : "transparent",
          borderBottom: scrolled || menuOpen ? "1px solid var(--c-vibrancy-edge)" : "1px solid transparent",
          backdropFilter: scrolled || menuOpen ? "saturate(180%) blur(20px)" : "none",
          WebkitBackdropFilter: scrolled || menuOpen ? "saturate(180%) blur(20px)" : "none",
          transition:
            "background-color 240ms var(--ease-out-strong), border-color 240ms var(--ease-out-strong), backdrop-filter 240ms var(--ease-out-strong)",
        }}
      >
        <div className="w-full max-w-[1280px] mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center cursor-pointer flex-shrink-0 min-h-[44px]"
            aria-label="grepit home"
          >
            <ViboLogo size="sm" />
          </button>

          <div className="hidden lg:flex gap-8 ml-8 font-mono landing-type-label uppercase tracking-[0.14em]">
            {NAV_LINKS.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="nav-link min-h-[44px] inline-flex items-center"
                style={{ color: "var(--c-text-3)" }}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {!isLoaded ? (
              <span className="w-[88px] h-[36px]" aria-hidden />
            ) : isSignedIn ? (
              <>
                <span className="hidden xl:inline font-mono landing-type-caption mr-1 ml-1 text-c-text-2 truncate max-w-[120px]">
                  {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0]}
                </span>
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="landing-nav-btn text-c-text-2 hidden lg:inline-flex"
                >
                  Profile
                </button>
                <SignOutButton>
                  <button type="button" className="landing-nav-btn text-c-text-3 hidden lg:inline-flex">
                    Sign out
                  </button>
                </SignOutButton>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/sign-in")}
                  className="landing-nav-btn text-c-text-2 hidden sm:inline-flex"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/sign-in?mode=signup")}
                  className="landing-cta-primary"
                >
                  Get started
                </button>
              </>
            )}

            <button
              type="button"
              className="lg:hidden landing-nav-icon-btn ml-0.5"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen ? (
        <div
          className="fixed inset-0 z-[99] lg:hidden"
          style={{ top: "var(--landing-nav-h, 56px)" }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="relative mx-4 mt-3 rounded-c-lg border p-2 shadow-3"
            style={{
              backgroundColor: "var(--c-surface)",
              borderColor: "var(--c-line-2)",
            }}
          >
            {NAV_LINKS.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="flex items-center min-h-[48px] px-4 rounded-c-sm font-mono landing-type-body uppercase tracking-[0.12em] text-c-text-2 hover:bg-c-surface-2"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            {isSignedIn ? (
              <>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); router.push("/profile"); }}
                  className="w-full flex items-center min-h-[48px] px-4 rounded-c-sm font-mono landing-type-body uppercase tracking-[0.12em] text-c-text-2 hover:bg-c-surface-2 text-left"
                >
                  Profile
                </button>
                <SignOutButton>
                  <button
                    type="button"
                    className="w-full flex items-center min-h-[48px] px-4 rounded-c-sm font-mono landing-type-body uppercase tracking-[0.12em] text-c-text-3 hover:bg-c-surface-2 text-left"
                  >
                    Sign out
                  </button>
                </SignOutButton>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); router.push("/sign-in"); }}
                  className="w-full flex items-center min-h-[48px] px-4 rounded-c-sm font-mono landing-type-body uppercase tracking-[0.12em] text-c-text-2 hover:bg-c-surface-2 text-left"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); router.push("/sign-in?mode=signup"); }}
                  className="landing-cta-primary landing-cta-primary--block"
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
