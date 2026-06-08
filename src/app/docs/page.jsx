import LandingNav from "../../components/landing/LandingNav";
import SiteFooter from "../../components/landing/SiteFooter";
import LandingBackdrop from "../../components/landing/LandingBackdrop";
import ScrollReveal from "../../components/landing/ScrollReveal";
import { GeistSans } from "geist/font/sans";
import { BookOpen, Search, Code, Shield, Cpu, Zap, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Documentation | grepit Code Intelligence",
  description: "Learn how to use grepit to analyze repositories, visualize architecture, and search your codebase with AI. Comprehensive guides and technical references.",
  alternates: {
    canonical: "/docs",
  },
  openGraph: {
    title: "Documentation | grepit Code Intelligence",
    description: "Learn how to use grepit to analyze repositories, visualize architecture, and search your codebase with AI.",
    url: "https://grepit.co/docs",
  },
  twitter: {
    title: "Documentation | grepit Code Intelligence",
    description: "Learn how to use grepit to analyze repositories, visualize architecture, and search your codebase with AI.",
  },
};

const DOCS_CATEGORIES = [
  {
    title: "Quickstart",
    icon: <Zap size={20} />,
    links: [
      { name: "Getting Started", description: "Analyze your first repository in 60 seconds." },
      { name: "Core Concepts", description: "Understanding the Grepit worldview." }
    ]
  },
  {
    title: "Intelligence",
    icon: <Cpu size={20} />,
    links: [
      { name: "Architecture Maps", description: "Navigating spatial dependency graphs." },
      { name: "AI Code Search", description: "Natural language queries for your source." },
      { name: "Grounded Citations", description: "Verifying AI answers with line-level links." }
    ]
  },
  {
    title: "Onboarding",
    icon: <BookOpen size={20} />,
    links: [
      { name: "Start Here Paths", description: "Automated reading orders for new devs." },
      { name: "Feature Tracing", description: "Following logic across service boundaries." }
    ]
  },
  {
    title: "Safety & Quality",
    icon: <Shield size={20} />,
    links: [
      { name: "Security Audits", description: "Automated vulnerability detection." },
      { name: "Performance Analysis", description: "Identifying bottlenecks in logic." }
    ]
  }
];

export default function DocsPage() {
  return (
    <div className={`min-h-screen selection:bg-c-accent-soft ${GeistSans.className}`} style={{ backgroundColor: "var(--c-bg)" }}>
      <LandingBackdrop />
      <LandingNav />
      
      <main className="relative pt-32 pb-28">
        <div className="max-w-[1240px] mx-auto landing-section-x">
          <ScrollReveal>
            <div className="max-w-4xl mb-24">
              <p className="landing-eyebrow mb-6" style={{ color: "var(--c-accent)" }}>Technical Documentation</p>
              <h1 className="landing-h1 mb-8" style={{ color: "var(--c-text)" }}>
                Master <span style={{ color: "var(--c-accent)" }}>Codebase Intelligence</span>
              </h1>
              
              <div className="relative max-w-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-c-text-4 group-focus-within:text-c-accent transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Search documentation..." 
                  className="w-full bg-c-surface border border-c-line-2 rounded-c-lg py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-c-accent transition-all premium-surface"
                  style={{ boxShadow: "var(--shadow-1)" }}
                />
              </div>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* Sidebar Navigation (Desktop) */}
            <aside className="hidden lg:block lg:col-span-3 h-fit sticky top-24">
              <nav className="space-y-8">
                {DOCS_CATEGORIES.map((cat) => (
                  <div key={cat.title}>
                    <p className="landing-eyebrow text-[10px] mb-4" style={{ color: "var(--c-text-4)" }}>{cat.title}</p>
                    <ul className="space-y-3">
                      {cat.links.map((link) => (
                        <li key={link.name}>
                          <a href="#" className="text-[14px] text-c-text-3 hover:text-c-accent transition-colors block">
                            {link.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </aside>

            {/* Main Content Grid */}
            <div className="col-span-12 lg:col-span-9">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {DOCS_CATEGORIES.flatMap(cat => cat.links.map(link => ({ ...link, catIcon: cat.icon }))).map((link, idx) => (
                  <ScrollReveal key={link.name} delay={0.1 + (idx * 0.05)}>
                    <div 
                      className="group p-8 rounded-c-xl border premium-surface h-full flex flex-col"
                      style={{ 
                        backgroundColor: "var(--c-surface)", 
                        borderColor: "var(--c-line-2)",
                        boxShadow: "var(--shadow-1)"
                      }}
                    >
                      <div className="mb-6 p-3 rounded-lg w-fit bg-c-bg border border-c-line-2 group-hover:border-c-accent-line transition-colors">
                        <div className="text-c-accent group-hover:scale-110 transition-transform">
                          {link.catIcon}
                        </div>
                      </div>
                      
                      <h3 className="landing-h3 mb-3 text-[18px] group-hover:text-c-accent transition-colors">
                        {link.name}
                      </h3>
                      
                      <p className="text-[14px] leading-relaxed text-c-text-3 mb-6 flex-grow">
                        {link.description}
                      </p>
                      
                      <a 
                        href="#" 
                        className="text-[12px] font-mono uppercase tracking-widest flex items-center gap-2 text-c-text-4 group-hover:text-c-text transition-colors"
                      >
                        Explore <ArrowRight size={14} className="text-c-accent" />
                      </a>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
