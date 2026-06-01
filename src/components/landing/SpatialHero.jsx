"use client";
import { ArrowRight, Upload } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import InputModeSwitch from "./InputModeSwitch";
import HomeCard from "./HomeCard";
import LivingCanvas from "./LivingCanvas";
import SuggestionChip from "../SuggestionChip";

function SuggestedRepos({ repos, loading, setMode, setRepoUrl, onAnalyze, className = "" }) {
  return (
    <div className={`hero-spatial-suggest ${className}`.trim()}>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-c-text-3 mb-2.5 text-center lg:text-left">
        Try a repo
      </p>
      <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
        {repos.slice(0, 3).map((repo, i) => (
          <SuggestionChip
            key={repo}
            onClick={() => {
              setMode("url");
              const url = `https://github.com/${repo}`;
              setRepoUrl(url);
              onAnalyze(url);
            }}
            disabled={loading}
            className="hero-try-chip"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {repo}
          </SuggestionChip>
        ))}
      </div>
    </div>
  );
}

export default function SpatialHero({
  hero,
  mode,
  setMode,
  repoUrl,
  setRepoUrl,
  inputRef,
  inputHighlight,
  loading,
  loadingMsg,
  error,
  setError,
  onAnalyze,
  needsGithub,
  onConnectGithub,
  fileRef,
  dragOver,
  setDragOver,
  onUploadFile,
  onUploadFolder,
}) {
  return (
    <section
      id="overview"
      className="hero-spatial-section relative z-[2] overflow-x-hidden scroll-mt-[80px]"
    >
      <div className="hero-spatial-inner relative z-[1] w-full max-w-[1280px] mx-auto">
        {/* Mobile: full viewport stage — only headline + input, vertically centered */}
        <div className="hero-spatial-stage landing-section-x">
          <div className="hero-spatial-focus w-full max-w-[580px] min-w-0 text-center lg:text-left mx-auto lg:mx-0">
            <div className="hero-spatial-block hero-spatial-block--title">
              <h1 className="landing-h1 hero-spatial-title mb-0 lg:mb-5 text-c-text">
                {hero.tagline}
                <span style={{ color: "var(--c-accent)" }}>{hero.taglineAccent}</span>
                {hero.taglineSuffix ?? "."}
              </h1>
            </div>

            <div className="hero-spatial-block hero-spatial-block--subtitle">
              <p className="landing-body text-c-text-2 max-w-[520px] mb-0 mx-auto lg:mx-0 hidden lg:block">
                {hero.subtitle}
              </p>
              <p className="hero-spatial-subtitle text-c-text-2 max-w-[300px] mx-auto lg:hidden">
                {hero.subtitleShort ?? hero.subtitle}
              </p>
            </div>

            <div className="hero-spatial-block hero-spatial-input-block w-full max-w-[520px] mx-auto lg:mx-0">
              <InputModeSwitch mode={mode} setMode={setMode} />

              <div
                className={`hero-input-stack mb-0 ${
                  mode === "upload" ? "hero-input-stack--upload" : "hero-input-stack--url"
                }`}
              >
                <div
                  className={`hero-input-pane ${
                    mode === "url" ? "hero-input-pane--visible" : "hero-input-pane--hidden"
                  }`}
                >
                  <div
                    className="flex items-center min-w-0 max-w-full rounded-c-md overflow-hidden border"
                    style={{
                      backgroundColor: "var(--c-surface)",
                      borderColor: inputHighlight ? "var(--c-accent-line)" : "var(--c-line-2)",
                      boxShadow: inputHighlight
                        ? "0 0 0 3px var(--c-accent-soft), var(--shadow-2)"
                        : "var(--shadow-2)",
                      transition:
                        "border-color 220ms var(--ease-out-strong), box-shadow 220ms var(--ease-out-strong)",
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      value={repoUrl || ""}
                      onChange={(e) => {
                        setRepoUrl(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
                      placeholder={hero.inputPlaceholder}
                      disabled={loading}
                      aria-label="GitHub repository URL"
                      className="flex-1 bg-transparent border-none outline-none px-3.5 sm:px-4 py-3 sm:py-3.5 text-[13px] sm:text-[14px] font-mono min-w-0"
                      style={{
                        color: "var(--c-text)",
                        caretColor: "var(--c-accent)",
                      }}
                    />
                    <button
                      onClick={() => onAnalyze()}
                      disabled={loading || !repoUrl.trim()}
                      className="btn-press relative flex items-center justify-center gap-1.5 text-[12px] sm:text-[13px] font-semibold px-3 sm:px-4 py-2.5 mr-1 sm:mr-1.5 rounded-c-sm whitespace-nowrap disabled:opacity-40 min-w-[84px] sm:min-w-[108px] shrink-0 overflow-hidden"
                      style={{
                        backgroundColor: "var(--c-accent)",
                        color: "var(--c-bg)",
                        transition:
                          "background-color 160ms cubic-bezier(0.16, 1, 0.3, 1), transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {loading ? (
                          <motion.span
                            key="loading"
                            className="hero-analyze-state"
                            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20" />
                              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={loadingMsg}
                                className="text-[12px] truncate max-w-[120px]"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                              >
                                {loadingMsg}
                              </motion.span>
                            </AnimatePresence>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="idle"
                            className="hero-analyze-state"
                            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          >
                            {hero.analyzeButton}
                            <ArrowRight size={14} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </div>

                <div
                  className={`hero-input-pane ${
                    mode === "upload" ? "hero-input-pane--visible" : "hero-input-pane--hidden"
                  }`}
                >
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const items = e.dataTransfer.items;
                      if (items?.[0]?.webkitGetAsEntry?.()?.isDirectory) {
                        onUploadFolder(e.dataTransfer.items);
                      } else {
                        onUploadFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-c-md p-8 text-center cursor-pointer ${
                      loading ? "pointer-events-none opacity-60" : ""
                    }`}
                    style={{
                      backgroundColor: "var(--c-surface)",
                      borderColor: dragOver ? "var(--c-accent)" : "var(--c-line-2)",
                      transition: "border-color 200ms var(--ease-out-strong)",
                    }}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={(e) => onUploadFile(e.target.files[0])}
                    />
                    <Upload size={22} className="mx-auto mb-2 text-c-accent" strokeWidth={1.75} />
                    <p className="text-[13px] font-medium text-c-text mb-1">
                      {loading ? "Uploading…" : "Drop .zip or folder"}
                    </p>
                    <p className="text-[11px] font-mono text-c-text-3">Max 50 MB</p>
                  </div>
                </div>
              </div>

              {error ? (
                <p className="mt-2 text-[12px] leading-snug text-c-coral">{error}</p>
              ) : null}
            </div>

            <SuggestedRepos
              className="hero-spatial-block lg:hidden"
              repos={hero.suggestedRepos}
              loading={loading}
              setMode={setMode}
              setRepoUrl={setRepoUrl}
              onAnalyze={onAnalyze}
            />
          </div>
        </div>

        {/* Below the fold on mobile (topology card); desktop includes repo chips here */}
        <div className="hero-spatial-rest landing-section-x">
          <div className="hero-spatial-below w-full max-w-[580px] mx-auto lg:mx-0 text-center lg:text-left">
            <SuggestedRepos
              className="hidden lg:block lg:mt-4"
              repos={hero.suggestedRepos}
              loading={loading}
              setMode={setMode}
              setRepoUrl={setRepoUrl}
              onAnalyze={onAnalyze}
            />

            {needsGithub ? (
              <div className="mt-5 flex items-center gap-3 px-4 py-3 rounded-c-sm border bg-c-surface border-c-line max-w-[520px] mx-auto lg:mx-0">
                <span className="text-[12.5px] flex-1 text-c-text-2">Private repo. Connect GitHub.</span>
                <button
                  type="button"
                  onClick={onConnectGithub}
                  className="btn-press px-3 py-1.5 rounded-c-xs text-[12px] font-semibold bg-c-accent text-c-bg"
                >
                  Connect
                </button>
              </div>
            ) : null}
          </div>

          <div className="hero-spatial-visual w-full max-w-[min(100%,520px)] lg:max-w-[720px] min-w-0 mx-auto lg:mx-0 lg:justify-self-end">
            <HomeCard
              className="hero-topology-shell w-full rounded-c-lg overflow-hidden border"
              style={{
                borderColor: "var(--c-line)",
                boxShadow: "var(--shadow-3)",
              }}
            >
              <div className="hero-topology-canvas relative w-full">
                <LivingCanvas variant="hero" />
              </div>
            </HomeCard>
          </div>
        </div>
      </div>
    </section>
  );
}
