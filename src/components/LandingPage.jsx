"use client";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

import { SITE_CONFIG } from "../lib/landing-config";
import { usePlan } from "../hooks/usePlan";
import {
  trackAnalysisStarted,
  trackAnalysisFailed,
  trackCheckoutStarted,
} from "../lib/analytics";

import LandingNav from "./landing/LandingNav";
import SpatialHero from "./landing/SpatialHero";
import TrustSection from "./landing/TrustSection";
import TechMarquee from "./landing/TechMarquee";
import ScrollReveal from "./landing/ScrollReveal";
import LandingBackdrop from "./landing/LandingBackdrop";
import { useMobileNotice } from "./MobileNotice";

const ValueCompare = dynamic(() => import("./landing/ValueCompare"), { ssr: true });
const EngineerMindset = dynamic(() => import("./landing/EngineerMindset"), { ssr: false });
const ProductShowcase = dynamic(() => import("./landing/ProductShowcase"), { ssr: false });
const TokenSavings = dynamic(() => import("./landing/TokenSavings"));
const AnalysisChoreography = dynamic(() => import("./landing/AnalysisChoreography"));
const StartHereCinematic = dynamic(() => import("./landing/StartHereCinematic"));
const TestimonialMarquee = dynamic(() => import("./landing/TestimonialMarquee"));
const Pricing = dynamic(() => import("./landing/Pricing"));
const FAQSnippet = dynamic(() => import("./landing/FAQSnippet"));
const CTAFinal = dynamic(() => import("./landing/CTAFinal"));
const SiteFooter = dynamic(() => import("./landing/SiteFooter"));

const AUTH_ERRORS = {
  AccessDenied: "GitHub denied access.",
  Callback: "GitHub sign-in could not be completed. Try again.",
  Configuration: "Auth is misconfigured. Check GitHub OAuth settings.",
  Default: "Sign-in did not complete. Try again.",
  OAuthAccountNotLinked: "This email is linked to a different sign-in method.",
  OAuthCallback: "GitHub returned an invalid callback.",
  OAuthCreateAccount: "GitHub sign-in could not create a session.",
  SessionRequired: "Please sign in to continue.",
};

async function parseJsonResponse(res) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Server returned an invalid response (HTTP ${res.status}).`);
  }
}

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [needsGithub, setNeedsGithub] = useState(false);
  const [subscribing, setSubscribing] = useState(null);
  const [mode, setMode] = useState("url");
  const [dragOver, setDragOver] = useState(false);
  const [inputHighlight, setInputHighlight] = useState(false);

  const fileRef = useRef(null);
  const inputRef = useRef(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isSignedIn } = useUser();
  const { plan: currentUserPlan } = usePlan();
  const { promptMobileNotice } = useMobileNotice();

  const { hero } = SITE_CONFIG;

  useEffect(() => {
    const onShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingMsg("");
      return;
    }
    const stages = [
      "Connecting…",
      "Fetching tree…",
      "Indexing…",
      "Building map…",
      "Almost there…",
    ];
    let idx = 0;
    setLoadingMsg(stages[0]);
    const t = setInterval(() => {
      idx = Math.min(idx + 1, stages.length - 1);
      setLoadingMsg(stages[idx]);
    }, 2800);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    const e = searchParams.get("error");
    if (e && !isSignedIn) setError(AUTH_ERRORS[e] ?? AUTH_ERRORS.Default);
  }, [searchParams, isSignedIn]);

  useEffect(() => {
    const resumeParam = searchParams.get("resume");
    if (resumeParam && isSignedIn) {
      setRepoUrl(resumeParam);
      setTimeout(() => handleAnalyze(resumeParam), 800);
      return;
    }
    if (typeof window === "undefined") return;
    const pending = sessionStorage.getItem("grepit-pending-repo");
    if (pending && isSignedIn) {
      sessionStorage.removeItem("grepit-pending-repo");
      setRepoUrl(pending);
      setTimeout(() => handleAnalyze(pending), 1000);
      return;
    }
    const pendingUpload = sessionStorage.getItem("grepit-pending-upload");
    if (pendingUpload && isSignedIn) {
      sessionStorage.removeItem("grepit-pending-upload");
      setTimeout(() => {
        scrollToInput();
        setError("You're signed in. Please re-select your file to start the analysis.");
      }, 400);
    }
  }, [isSignedIn]); // eslint-disable-line

  const scrollToInput = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      setInputHighlight(true);
      inputRef.current?.focus();
      setTimeout(() => setInputHighlight(false), 1800);
    }, 480);
  };

  const connectGithubForRepo = async () => {
    const pending = repoUrl.trim();
    if (!pending || !user) return;
    const clientId = process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_GITHUB_OAUTH_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      setError("GitHub OAuth is not configured. Contact the admin.");
      return;
    }
    const state = `${user.id}:${encodeURIComponent(pending)}`;
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", "repo");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    window.location.href = url.toString();
  };

  const saveAndRedirect = async (data) => {
    const saved = JSON.parse(localStorage.getItem("grepit-analyses") || "[]");
    saved.unshift({
      id: data.id,
      name: data.repo_name,
      url: data.repo_url || "local upload",
      date: new Date().toISOString(),
    });
    localStorage.setItem("grepit-analyses", JSON.stringify(saved.slice(0, 20)));
    setLoading(false);
    await promptMobileNotice();
    router.push(`/dashboard?id=${data.id}`);
  };

  const handleAnalyze = async (url) => {
    const target = url || repoUrl.trim();
    if (!target) return;
    if (!isSignedIn) {
      sessionStorage.setItem("grepit-pending-repo", target);
      router.push("/sign-in");
      return;
    }
    if (!target.match(/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/)) {
      setError("Enter a valid repository URL (https://github.com/owner/repository)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      trackAnalysisStarted(target, "github");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: target, repoName: target.split("/").pop() }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await parseJsonResponse(res);
      if (res.status === 403 && data.requiresAuth) {
        setLoading(false);
        if (data.requiresGithub) {
          setNeedsGithub(true);
          setError("");
        } else {
          setError("This is a private repository. Sign in to access it.");
          setTimeout(() => router.push("/sign-in"), 1200);
        }
        return;
      }
      if (!res.ok) throw new Error(data.message || data.error || "Analysis failed");
      saveAndRedirect(data);
    } catch (err) {
      if (err?.name === "AbortError") {
        setError(
          "This is a large codebase and is taking longer than expected. Please try again. Partial results may be cached.",
        );
      } else {
        setError(err.message || "Could not reach the server.");
      }
      trackAnalysisFailed(target, err?.message || "unknown");
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!isSignedIn) {
      sessionStorage.setItem("grepit-pending-upload", "true");
      router.push("/sign-in");
      return;
    }
    if (!file.name.endsWith(".zip")) {
      setError("Please upload a .zip file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large (max 50MB)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.error || "Upload failed");
      saveAndRedirect(data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFolderUpload = async (items) => {
    if (!isSignedIn) {
      sessionStorage.setItem("grepit-pending-upload", "true");
      router.push("/sign-in");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const files = [];
      const readEntries = async (entry, path = "") => {
        if (entry.isFile) {
          const file = await new Promise((r) => entry.file(r));
          const rel = path + entry.name;
          if (/node_modules|\.git\/|\.next\/|dist\/|build\/|__pycache__|\.DS_Store/i.test(rel)) return;
          if (file.size > 5 * 1024 * 1024) return;
          files.push({ file, path: rel });
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          const entries = await new Promise((r) => reader.readEntries(r));
          for (const child of entries) await readEntries(child, path + entry.name + "/");
        }
      };
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) await readEntries(entry);
      }
      if (files.length === 0) {
        setError("No valid files found in folder");
        setLoading(false);
        return;
      }
      if (files.length > 10000) {
        setError("Too many files (max 10,000). Try a smaller project.");
        setLoading(false);
        return;
      }
      const total = files.reduce((s, f) => s + f.file.size, 0);
      if (total > 50 * 1024 * 1024) {
        setError("Folder too large (max 50MB total)");
        setLoading(false);
        return;
      }
      const fd = new FormData();
      for (const { file, path } of files) fd.append("files", file, path);
      fd.append("folderName", items[0].webkitGetAsEntry?.()?.name || "upload");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.error || "Upload failed");
      saveAndRedirect(data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handlePricingAction = async (planName) => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (planName === "Free" || planName === "free") {
      scrollToInput();
      return;
    }
    const targetPlan = planName.toLowerCase();
    if (currentUserPlan === targetPlan) {
      toast(`You're already on the ${planName} plan.`, { icon: "✓", duration: 7000 });
      return;
    }
    if (currentUserPlan === "pro" && targetPlan === "starter") {
      toast("You can downgrade anytime from your profile page.", { icon: "ℹ️", duration: 7000 });
      return;
    }
    if (currentUserPlan !== "free" && targetPlan !== currentUserPlan) {
      router.push("/profile?upgrade=" + targetPlan);
      setSubscribing(null);
      return;
    }
    setSubscribing(targetPlan);
    trackCheckoutStarted(targetPlan);
    try {
      const res = await fetch("/api/dodo/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not start checkout. Please try again.", { duration: 10000 });
        setSubscribing(null);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Checkout could not be created. Please try again.", { duration: 10000 });
        setSubscribing(null);
      }
    } catch {
      toast.error("Something went wrong. Please try again.", { duration: 10000 });
      setSubscribing(null);
    }
  };

  return (
    <div
      className="min-h-screen relative landing-page-root"
      style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text)" }}
    >
      <LandingBackdrop />
      <div className="landing-page-content">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 9000,
          className: "!rounded-c-sm",
          style: {
            background: "var(--c-surface)",
            color: "var(--c-text)",
            border: "1px solid var(--c-line)",
            borderRadius: "12px",
            fontSize: "13px",
            padding: "12px 18px",
            maxWidth: "440px",
            boxShadow: "var(--shadow-2)",
          },
          success: { iconTheme: { primary: "var(--c-lime)", secondary: "var(--c-bg)" } },
          error: { iconTheme: { primary: "var(--c-coral)", secondary: "var(--c-bg)" } },
        }}
      />

      <LandingNav />

      <SpatialHero
        hero={hero}
        mode={mode}
        setMode={setMode}
        repoUrl={repoUrl}
        setRepoUrl={setRepoUrl}
        inputRef={inputRef}
        inputHighlight={inputHighlight}
        loading={loading}
        loadingMsg={loadingMsg}
        error={error}
        setError={setError}
        onAnalyze={handleAnalyze}
        needsGithub={needsGithub}
        onConnectGithub={connectGithubForRepo}
        fileRef={fileRef}
        dragOver={dragOver}
        setDragOver={setDragOver}
        onUploadFile={handleUpload}
        onUploadFolder={handleFolderUpload}
      />

      <ScrollReveal variant="up" className="landing-float-section">
        <TechMarquee />
      </ScrollReveal>

      <ScrollReveal variant="left" className="landing-float-section">
        <ValueCompare />
      </ScrollReveal>

      <TrustSection />

      <ScrollReveal delay={60} variant="right" className="landing-float-section">
        <EngineerMindset />
      </ScrollReveal>

      <ProductShowcase />

      <ScrollReveal delay={80} className="landing-float-section">
        <TokenSavings />
      </ScrollReveal>

      <ScrollReveal delay={80} variant="left" className="landing-float-section">
        <div id="choreography" className="scroll-mt-[80px]">
          <AnalysisChoreography />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100} variant="right" className="landing-float-section">
        <StartHereCinematic />
      </ScrollReveal>

      <ScrollReveal delay={60} className="landing-float-section">
        <TestimonialMarquee />
      </ScrollReveal>

      <ScrollReveal delay={80} variant="left" className="landing-float-section">
        <div id="pricing" className="scroll-mt-[80px]" />
        <Pricing onSelect={handlePricingAction} subscribing={subscribing} />
      </ScrollReveal>

      <ScrollReveal delay={60} variant="right" className="landing-float-section">
        <FAQSnippet />
      </ScrollReveal>

      <ScrollReveal delay={60} className="landing-float-section">
        <CTAFinal onCta={scrollToInput} />
      </ScrollReveal>

      <SiteFooter />
      </div>
    </div>
  );
}
