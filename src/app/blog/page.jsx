import LandingNav from "../../components/landing/LandingNav";
import SiteFooter from "../../components/landing/SiteFooter";
import LandingBackdrop from "../../components/landing/LandingBackdrop";
import ScrollReveal from "../../components/landing/ScrollReveal";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import { ArrowRight, Clock, User } from "lucide-react";

export const metadata = {
  title: "Blog | Engineering Insights & Product Updates | grepit",
  description: "Read the latest about codebase intelligence, software architecture, and AI-powered developer tools from the grepit engineering team.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog | Engineering Insights & Product Updates | grepit",
    description: "Read the latest about codebase intelligence, software architecture, and AI-powered developer tools from the grepit engineering team.",
    url: "https://grepit.co/blog",
  },
  twitter: {
    title: "Blog | Engineering Insights & Product Updates | grepit",
    description: "Read the latest about codebase intelligence, software architecture, and AI-powered developer tools from the grepit engineering team.",
  },
};

const BLOG_POSTS = [
  {
    id: "under-the-hood",
    title: "Under the Hood: How grepit Maps Codebases in Under 60 Seconds",
    excerpt: "A deep dive into our AST-based analysis engine, graph traversal algorithms, and how we visualize complex dependencies without manual effort.",
    date: "June 4, 2026",
    author: "Engineering Team",
    readTime: "8 min read",
    category: "Technical",
    slug: "under-the-hood-grepit-architecture",
  },
  {
    id: "onboarding-velocity",
    title: "The Developer Onboarding Crisis and How AI is Solving It",
    excerpt: "Why traditional documentation fails new engineers and how 'Start Here' reading paths can reduce time-to-first-PR by up to 70%.",
    date: "May 28, 2026",
    author: "Product Team",
    readTime: "6 min read",
    category: "Insights",
    slug: "developer-onboarding-crisis-ai",
  },
  {
    id: "security-audits",
    title: "Automating Security: Identifying Architectural Risks via Code Graphs",
    excerpt: "How grepit identifies potential vulnerabilities by analyzing data flow across service boundaries and identifying unsanitized input vectors.",
    date: "May 21, 2026",
    author: "Security Research",
    readTime: "10 min read",
    category: "Security",
    slug: "automating-security-code-graphs",
  }
];

export default function BlogPage() {
  return (
    <div className={`min-h-screen selection:bg-c-accent-soft ${GeistSans.className}`} style={{ backgroundColor: "var(--c-bg)" }}>
      <LandingBackdrop />
      <LandingNav />
      
      <main className="relative pt-32 pb-28">
        <div className="max-w-[1240px] mx-auto landing-section-x">
          <ScrollReveal>
            <div className="max-w-4xl mb-24">
              <p className="landing-eyebrow mb-6" style={{ color: "var(--c-accent)" }}>Engineering Blog</p>
              <h1 className="landing-h1 mb-8" style={{ color: "var(--c-text)" }}>
                Insights into <span style={{ color: "var(--c-accent)" }}>Codebase Intelligence</span>
              </h1>
              <p className="landing-body text-c-text-2 max-w-2xl">
                Deep dives into architecture, software topology, and the future of how developers understand complex systems.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-16 md:gap-x-12">
            {/* Featured Post */}
            <div className="col-span-12 mb-8">
              <ScrollReveal delay={0.1}>
                <div 
                  className="group relative p-8 md:p-12 rounded-c-xl border premium-surface overflow-hidden"
                  style={{ 
                    backgroundColor: "var(--c-surface)", 
                    borderColor: "var(--c-line-2)",
                    boxShadow: "var(--shadow-2)"
                  }}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <div className="text-8xl font-mono tracking-tighter">{"{...}"}</div>
                  </div>
                  
                  <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="landing-eyebrow text-c-accent bg-c-accent-soft px-3 py-1 rounded-full text-[10px]">Featured</span>
                      <span className="text-[12px] font-mono text-c-text-3 uppercase tracking-wider">{BLOG_POSTS[0].category}</span>
                    </div>
                    
                    <h2 className="landing-h2 mb-6 group-hover:text-c-accent transition-colors">
                      {BLOG_POSTS[0].title}
                    </h2>
                    
                    <p className="landing-body-sm text-c-text-2 mb-10 leading-relaxed">
                      {BLOG_POSTS[0].excerpt}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-6 mb-8 text-[13px] text-c-text-3 font-mono uppercase tracking-tight">
                      <span className="flex items-center gap-2"><User size={14} className="text-c-accent" /> {BLOG_POSTS[0].author}</span>
                      <span className="flex items-center gap-2"><Clock size={14} className="text-c-accent" /> {BLOG_POSTS[0].readTime}</span>
                    </div>

                    <Link 
                      href={`/blog/${BLOG_POSTS[0].slug}`}
                      className="landing-cta-primary inline-flex items-center gap-2"
                    >
                      Read full article <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Grid Posts */}
            {BLOG_POSTS.slice(1).map((post, idx) => (
              <div key={post.id} className="col-span-12 md:col-span-6">
                <ScrollReveal delay={0.2 + (idx * 0.1)}>
                  <div 
                    className="group h-full flex flex-col p-8 rounded-c-lg border premium-surface"
                    style={{ 
                      backgroundColor: "var(--c-surface)", 
                      borderColor: "var(--c-line-2)",
                      boxShadow: "var(--shadow-1)"
                    }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[11px] font-mono text-c-accent uppercase tracking-widest">{post.category}</span>
                      <span className="text-[11px] font-mono text-c-text-4">{post.date}</span>
                    </div>
                    
                    <h3 className="landing-h3 mb-4 group-hover:text-c-accent transition-colors leading-tight">
                      {post.title}
                    </h3>
                    
                    <p className="text-[14.5px] leading-relaxed text-c-text-3 mb-8 flex-grow">
                      {post.excerpt}
                    </p>
                    
                    <Link 
                      href={`/blog/${post.slug}`}
                      className="text-[13px] font-semibold flex items-center gap-1.5 hover:gap-3 transition-all"
                      style={{ color: "var(--c-text)" }}
                    >
                      Read more <ArrowRight size={14} className="text-c-accent" />
                    </Link>
                  </div>
                </ScrollReveal>
              </div>
            ))}
          </div>

          <ScrollReveal delay={0.5}>
            <div className="mt-32 pt-16 border-t" style={{ borderColor: "var(--c-line)" }}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 rounded-c-xl" style={{ backgroundColor: "var(--c-bg-deep)" }}>
                <div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--c-text)" }}>Never miss an update</h3>
                  <p className="text-sm text-c-text-3">Get technical insights and product features delivered to your inbox.</p>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                  <input 
                    type="email" 
                    placeholder="engineer@company.com" 
                    className="flex-grow md:w-64 bg-c-bg border border-c-line-2 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-c-accent transition-colors"
                  />
                  <button className="landing-cta-primary whitespace-nowrap">Subscribe</button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
