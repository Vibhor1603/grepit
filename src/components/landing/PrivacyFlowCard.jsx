"use client";

import { useId } from "react";

export default function PrivacyFlowCard() {
  const uid = useId().replace(/:/g, "");
  const flowGradient = `${uid}-privacy-flow`;

  return (
    <div
      className="privacy-corridor"
      role="img"
      aria-label="Privacy visualization: connected repos are authorized, scoped, used minimally for answers, and deletable."
    >
      <svg viewBox="0 0 640 360" className="privacy-corridor__svg" aria-hidden>
        <defs>
          <linearGradient id={flowGradient} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--c-accent-line)" />
            <stop offset="100%" stopColor="var(--c-lime-line)" />
          </linearGradient>
        </defs>

        <rect x="20" y="26" width="600" height="260" rx="18" className="privacy-corridor__frame" />
        <rect x="20" y="286" width="600" height="48" rx="14" className="privacy-corridor__deletion-zone" />

        <path d="M 114 158 H 526" className="privacy-corridor__main-rail" style={{ stroke: `url(#${flowGradient})` }} />
        <path d="M 526 158 L 572 158" className="privacy-corridor__main-rail-end" />

        <g transform="translate(88 158)">
          <rect x="-32" y="-36" width="64" height="72" rx="16" className="privacy-corridor__stage" />
          <rect x="-18" y="-16" width="12" height="16" rx="2.5" className="privacy-corridor__file" />
          <rect x="-2" y="-10" width="12" height="16" rx="2.5" className="privacy-corridor__file" />
          <rect x="14" y="-4" width="12" height="16" rx="2.5" className="privacy-corridor__file" />
          <text y="50" textAnchor="middle" className="privacy-corridor__label">CONNECT</text>
        </g>

        <g transform="translate(236 158)">
          <rect x="-38" y="-44" width="76" height="88" rx="16" className="privacy-corridor__stage privacy-corridor__stage--accent" />
          <circle cx="-8" cy="-4" r="9" className="privacy-corridor__key-ring" />
          <line x1="-1" y1="-4" x2="14" y2="-4" className="privacy-corridor__key-shaft" />
          <line x1="8" y1="-7" x2="8" y2="-1" className="privacy-corridor__key-shaft" />
          <text y="62" textAnchor="middle" className="privacy-corridor__label">AUTHORIZE</text>
        </g>

        <g transform="translate(378 158)">
          <rect x="-38" y="-44" width="76" height="88" rx="16" className="privacy-corridor__stage" />
          <rect x="-16" y="-18" width="32" height="14" rx="3.5" className="privacy-corridor__stack privacy-corridor__stack--top" />
          <rect x="-19" y="-1" width="38" height="14" rx="3.5" className="privacy-corridor__stack" />
          <rect x="-15" y="16" width="30" height="12" rx="3.5" className="privacy-corridor__stack" />
          <text y="62" textAnchor="middle" className="privacy-corridor__label">INDEX</text>
        </g>

        <g transform="translate(526 158)">
          <rect x="-38" y="-44" width="76" height="88" rx="16" className="privacy-corridor__stage privacy-corridor__stage--lime" />
          <rect x="-18" y="-18" width="36" height="30" rx="7" className="privacy-corridor__answer-card" />
          <line x1="-12" y1="-10" x2="12" y2="-10" className="privacy-corridor__answer-line" />
          <line x1="-12" y1="-3" x2="8" y2="-3" className="privacy-corridor__answer-line" />
          <line x1="-12" y1="4" x2="10" y2="4" className="privacy-corridor__answer-line" />
          <text y="62" textAnchor="middle" className="privacy-corridor__label">INFER</text>
        </g>

        <g transform="translate(170 310)">
          <path d="M 0 0 H 300" className="privacy-corridor__delete-rail" />
          <g transform="translate(330 0)">
            <rect x="-16" y="-14" width="32" height="26" rx="7" className="privacy-corridor__trash-body" />
            <line x1="-20" y1="-17" x2="20" y2="-17" className="privacy-corridor__trash-lid" />
          </g>
          <text x="-42" y="4" className="privacy-corridor__delete-label">DELETE</text>
          <text x="430" y="4" className="privacy-corridor__delete-label">ZERO</text>
        </g>
      </svg>
    </div>
  );
}

