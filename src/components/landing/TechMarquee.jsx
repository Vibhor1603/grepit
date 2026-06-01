"use client";
import MarqueeTrack from "./MarqueeTrack";

const CDN = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";

export const TECH_ITEMS = [
  { name: "JavaScript", icon: `${CDN}/javascript/javascript-original.svg` },
  { name: "TypeScript", icon: `${CDN}/typescript/typescript-original.svg` },
  { name: "Python", icon: `${CDN}/python/python-original.svg` },
  { name: "Go", icon: `${CDN}/go/go-original.svg` },
  { name: "Rust", icon: `${CDN}/rust/rust-original.svg` },
  { name: "Java", icon: `${CDN}/java/java-original.svg` },
  { name: "React", icon: `${CDN}/react/react-original.svg` },
  { name: "Next.js", icon: `${CDN}/nextjs/nextjs-original.svg` },
  { name: "Vue", icon: `${CDN}/vuejs/vuejs-original.svg` },
  { name: "Django", icon: `${CDN}/django/django-plain.svg` },
  { name: "Rails", icon: `${CDN}/rails/rails-plain.svg` },
  { name: "Flutter", icon: `${CDN}/flutter/flutter-original.svg` },
  { name: "Docker", icon: `${CDN}/docker/docker-original.svg` },
  { name: "GraphQL", icon: `${CDN}/graphql/graphql-plain.svg` },
  { name: "Kotlin", icon: `${CDN}/kotlin/kotlin-original.svg` },
  { name: "Swift", icon: `${CDN}/swift/swift-original.svg` },
  { name: "Ruby", icon: `${CDN}/ruby/ruby-original.svg` },
  { name: "PHP", icon: `${CDN}/php/php-original.svg` },
  { name: "Terraform", icon: `${CDN}/terraform/terraform-original.svg` },
  { name: "Elixir", icon: `${CDN}/elixir/elixir-original.svg` },
];

function TechPill({ tech }) {
  return (
    <div className="tech-pill flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2 rounded-c-sm border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tech.icon} alt="" width={18} height={18} className="opacity-85" loading="lazy" decoding="async" />
      <span className="text-[11px] font-medium whitespace-nowrap text-c-text-2">{tech.name}</span>
    </div>
  );
}

function buildTrack(items, offset = 0) {
  const rotated = [...items.slice(offset), ...items.slice(0, offset)];
  return [...rotated, ...rotated];
}

export default function TechMarquee() {
  const trackForward = buildTrack(TECH_ITEMS, 0);
  const trackReverse = buildTrack(TECH_ITEMS, Math.floor(TECH_ITEMS.length / 3));

  return (
    <section
      id="languages"
      className="relative z-[2] pt-16 md:pt-20 lg:pt-24 pb-28 md:pb-36 lg:pb-44 overflow-hidden scroll-mt-[80px]"
      aria-label="Supported languages and frameworks"
    >
      <div className="marquee-fade-left pointer-events-none absolute inset-y-0 left-0 w-12 md:w-24 z-10" />
      <div className="marquee-fade-right pointer-events-none absolute inset-y-0 right-0 w-12 md:w-24 z-10" />

      <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] mb-8 md:mb-10 px-6 text-c-text-3">
        <span className="text-c-accent font-semibold">40+</span> languages and frameworks
      </p>

      <div className="flex flex-col gap-3 md:gap-4">
        <MarqueeTrack duration="52s">
          <div className="flex gap-3 md:gap-4 pr-3 md:pr-4">
            {trackForward.map((tech, i) => (
              <TechPill key={`${tech.name}-fwd-${i}`} tech={tech} />
            ))}
          </div>
        </MarqueeTrack>

        <MarqueeTrack reverse duration="58s">
          <div className="flex gap-3 md:gap-4 pr-3 md:pr-4">
            {trackReverse.map((tech, i) => (
              <TechPill key={`${tech.name}-rev-${i}`} tech={tech} />
            ))}
          </div>
        </MarqueeTrack>
      </div>
    </section>
  );
}
